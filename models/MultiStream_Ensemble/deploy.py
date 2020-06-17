import os
import sys
sys.path.append("../")
sys.path.append("../..")
from glob import glob
import numpy as np
import json
import pickle
import SimpleITK as sitk
import models.settings as S
import shutil
import tensorflow as tf
from keras import backend as K
import keras.models
from zipfile import ZipFile
#from losses import binary_focal_loss
from keras.utils.generic_utils import get_custom_objects


def binary_focal_loss(gamma=2., alpha=.25):
    """
    Binary form of focal loss.

      FL(p_t) = -alpha * (1 - p_t)**gamma * log(p_t)

      where p = sigmoid(x), p_t = p or 1 - p depending on if the label is 1 or 0, respectively.

    References:
        https://arxiv.org/pdf/1708.02002.pdf
    Usage:
     model.compile(loss=[binary_focal_loss(alpha=.25, gamma=2)], metrics=["accuracy"], optimizer=adam)

    """
    def binary_focal_loss_fixed(y_true, y_pred):
        """
        :param y_true: A tensor of the same shape as `y_pred`
        :param y_pred:  A tensor resulting from a sigmoid
        :return: Output tensor.
        """
        pt_1 = tf.where(tf.equal(y_true, 1), y_pred, tf.ones_like(y_pred))
        pt_0 = tf.where(tf.equal(y_true, 0), y_pred, tf.zeros_like(y_pred))

        epsilon = K.epsilon()
        # clip to prevent NaN's and Inf's
        pt_1 = K.clip(pt_1, epsilon, 1. - epsilon)
        pt_0 = K.clip(pt_0, epsilon, 1. - epsilon)

        return -K.sum(alpha * K.pow(1. - pt_1, gamma) * K.log(pt_1)) \
               -K.sum((1 - alpha) * K.pow(pt_0, gamma) * K.log(1. - pt_0))

    return binary_focal_loss_fixed


def pickle_load(path):
    with open(path, 'rb') as pk_load:
        dic = pickle.load(pk_load)
    return dic

def auc_roc(y_true, y_pred):
    # any tensorflow metric
    value, update_op = tf.contrib.metrics.streaming_auc(y_pred, y_true)

    # find all variables created for this matric
    metric_vars = [i for i in tf.local_variables() if 'auc_roc' in i.name.split('/')[1]]
    # Add metric variables to GLOBAL_VARIABLES collecion.
    # They will be initialized for new session.
    for v in metric_vars:
        tf.add_to_collection(tf.GraphKeys.GLOBAL_VARIABLES, v)
    # force to update metric values
    with tf.control_dependencies([update_op]):
        value = tf.identity(value)
        return value


def get_session():
    """ Construct a modified tf session.
    """
    config = tf.ConfigProto()
    config.gpu_options.allow_growth = True
    return tf.Session(config=config)


class Deploy:
    def __init__(self):
        self.current_dir = os.path.dirname(__file__)
        self.resize_dict = pickle_load(self.current_dir+"/utils/resize_dictionary.pkl")
        self.mean_std = pickle_load(self.current_dir+"/model/mean_stds/resize_mean_std.pkl")
        self.mean_std_ktrans = pickle_load(self.current_dir+"/model/mean_stds/resize_mean_std_Ktrans.pkl")


    def build(self):
        keras.backend.tensorflow_backend.set_session(get_session())
        get_custom_objects().update({'auc_roc':auc_roc})
        loaded_model = keras.models.load_model(self.current_dir + "/model/model_checkpoint.h5", custom_objects={'binary_focal_loss_fixed':binary_focal_loss()})
        return loaded_model


    def run(self, model, info):
        self.info = info
        self.case = info["case"]
        #self.case = model
        #####################################
        Image_Types = ['t2_tse_tra', 'ADC', 'BVAL', 'KTrans']
        images = self.read_image(image_types = Image_Types)
        std_images = self.mean_std_standarzation(images, self.mean_std, self.mean_std_ktrans)
        patches_list = self.extract_patches(std_images)
        ####### prepare X from patches_list
        
        X = [patches_list[0],patches_list[0],patches_list[0],patches_list[0],patches_list[0],
             patches_list[1],patches_list[1],patches_list[1],patches_list[1],patches_list[1],
             patches_list[2],patches_list[2],patches_list[2],patches_list[2],patches_list[2],
             patches_list[3],patches_list[3],patches_list[3],patches_list[3],patches_list[3]]
        
        scores = model.predict(X, verbose=1)

        #print("successss" * 10)
        #scores = np.concatenate(predicted_prob).ravel()
        print("predictions: {} ".format(scores))
        description = "{:03.1f}% probability of Significant Prostate Cancer".format(scores[0] * 100)
        response_dict = {"case": self.info["case"],
                         "description": description,
                         "score": str(scores[0])}
        return json.dumps(response_dict)
        #return X
    
    
    def read_image(self, image_types):
        array_dict = dict()
        image_paths = glob(os.path.join(S.dicom_folder, self.case + '*.zip'))
        #image_paths = glob(os.path.join('../data/dicom', self.case + '*.zip'))
        print(image_paths)
        assert len(image_paths) == 1, print(self.case, "more than one image or zero")

        with ZipFile(image_paths[0], 'r') as Zip:
            Zip.extractall('tmp')
        img_Paths = glob(os.path.join('tmp', self.case+'*', '*','*'))
        if len(img_Paths) > 1:
            for image_type in image_types:
                #lps = self.info["lps"]

                for img_path in img_Paths:
                    if image_type == 'KTrans' and 'KTrans' in img_path:
                        #image = sitk.ReadImage(glob(os.path.join(img_path, '*.dcm'))[0])
                        ## RuntimeError: sitk::ERROR: Unable to determine ImageIO reader
                        pass

                    elif image_type in img_path:
                        reader = sitk.ImageSeriesReader()
                        dicom_names = reader.GetGDCMSeriesFileNames(img_path)
                        reader.SetFileNames(dicom_names)
                        image = reader.Execute()
                        shape= image.GetSize()
                        spacing =image.GetSpacing()
                        ijk = image.TransformPhysicalPointToIndex(lps)
                        #ijk = image.TransformPhysicalPointToIndex([-27.0102, 41.5467, -26.0469])
                        #ijk = (154,217,12)
                        arr = np.swapaxes(sitk.GetArrayFromImage(image), 1, 2)
                        resampled_arr, rescale_ijk = resample_array(arr, shape, spacing, self.resize_dict, ijk)
                        resized_arr, rescale_ijk = slice_array(resampled_arr, rescale_ijk)
                        array_dict[image_type] = [resized_arr, rescale_ijk]
        shutil.rmtree('tmp')
        return array_dict


    def mean_std_standarzation(self, arr_list, mean_std, mean_std_ktrans):
        def Outlier_rm(arr, arr_mean, arr_std):
            arr[arr > arr_mean + 2*arr_std] = arr_mean + 2*arr_std
            arr[arr < arr_mean - 2*arr_std] = arr_mean - 2*arr_std

            return arr

        for k, v in arr_list.items():
            v_mean = np.mean(v[0])
            v_std = np.std(v[0])
            v[0] = Outlier_rm(v[0], v_mean, v_std)
            if 't2_tse_tra' in k:
                tmp = (v[0] - mean_std['t2'][0])/mean_std['t2'][1]
            if 'ADC' in k:
                tmp = (v[0] - mean_std['ADC'][0])/mean_std['ADC'][1]
            if 'BVAL' in k:
                tmp = (v[0] - mean_std['ADC'][0])/mean_std['ADC'][1]
            if 'KTrans' in k:
                tmp = (v[0] - mean_std_ktrans['Ktrans'][0])/mean_std_ktrans['Ktrans'][1]
            arr_list[k] = [tmp, v[1]]

        return arr_list


    def extract_patches(self, arr_dict):
        patch_list = list()
        for patch_dim in [(42,42,1), (48,48,3), (64,64,3), (96,96,3)]:
            img_patch = dict()
            for key, value in arr_dict.items():
                img_patch[key] = patch(value[0], patch_dim, value[1])
            patch_list.append(np.concatenate((np.expand_dims(np.moveaxis(img_patch['t2_tse_tra'], 0, -1), axis= -1),
                            np.expand_dims(np.moveaxis(img_patch['ADC'], 0, -1), axis= -1),
                            np.expand_dims(np.moveaxis(img_patch['BVAL'], 0, -1), axis= -1)), axis = -1))

        return patch_list