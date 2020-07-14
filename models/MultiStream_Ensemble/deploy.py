import os
import sys

sys.path.append("../")
from glob import glob
from models.MultiStream_Ensemble.utils.helpers import *
import numpy as np
import json
import pickle
import SimpleITK as sitk
import models.settings as S
import tensorflow as tf
import keras


def pickle_load(path):
    with open(path, 'rb') as pk_load:
        dic = pickle.load(pk_load)
    return dic


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
        
        """ Construct a modified tf session.
        """
        config = tf.ConfigProto()
        config.gpu_options.allow_growth = True
        
        init_op =  tf.global_variables_initializer()

        with tf.Session(config=config) as sess:
            sess.run(init_op)

        # keras.backend.tensorflow_backend.set_session(get_session())
        loaded_model = tf.keras.models.load_model(self.current_dir+"/model/model_checkpoint_72.h5", compile=False)

        return loaded_model


    def run(self, model, info):
        self.info = info
        self.case = info["case"]
        print(self.case)
        #####################################
        Image_Types = ['t2_tse_tra', 'ADC', 'BVAL', 'KTrans']
        images = self.read_image(image_types = Image_Types)
        if int(self.case[-2:]) <= 5:
            std_images = self.mean_std_standardization(images, self.mean_std, self.mean_std_ktrans)
        else:
            print('data are not from ProstateX, need to do the different std steps.')
            std_images = self.self_standardization(images)
        patches_list = self.extract_patches(std_images)
        Scores = list()
        for idx in range(5):
            ####### prepare X from patches_list (ctr point + 4 neighbors)
            P0 = patches_list[idx][0][:,:,:,:,:-1]
            P1 = patches_list[idx][1][:,:,:,:,:-1]
            P2 = patches_list[idx][2][:,:,:,:,:-1]
            P3 = patches_list[idx][3][:,:,:,:,:-1]

            X = [P0,P0,P0,P0,P0,P1,P1,P1,P1,P1,P2,P2,P2,P2,P2,P3,P3,P3,P3,P3]
            score=model.predict(X, verbose=1)
            Scores.append(score[0])
            
        Scr = np.mean(Scores)    
        print("successss" * 10)
        print("predictions: {} ".format(Scr)
        description = "{:03.1f}% probability of Significant Prostate Cancer".format(Scr * 100)
        response_dict = {"case": self.info["case"],
                         "description": description,
                         "score": str(Scr)}
        return json.dumps(response_dict)


    def read_image(self, image_types):
        array_dict = dict()
        for image_type in image_types:
            if image_type == 'KTrans':
                pass
            else:
                img_path = glob(os.path.join(S.dicom_folder, self.case, '*'+image_type))
                
                print(img_path)
                assert len(img_path) == 1, print(self.case, "more than one image or zero")
                
                reader = sitk.ImageSeriesReader()
                dicom_names = reader.GetGDCMSeriesFileNames(img_path[0])
                reader.SetFileNames(dicom_names)
                image = reader.Execute()
                shape= image.GetSize()
                spacing =image.GetSpacing()
                ijk = image.TransformPhysicalPointToIndex(self.info["lps"])
                print(ijk)
                arr = np.swapaxes(sitk.GetArrayFromImage(image), 1, 2)
                resampled_arr, rescale_ijk = resample_array(arr, shape, spacing, self.resize_dict, ijk)
                resized_arr, rescale_ijk = slice_array(resampled_arr, rescale_ijk)
                array_dict[image_type] = [resized_arr, rescale_ijk]
 
        return array_dict

		
    def extract_patches(self, arr_dict):
        patch_neighbors = list()
        patch_list = list()
        if int(self.case[-2:]) <= 5:
            reverse = True
        else:
            reverse = False
        # predict itself and another 4 neighboring points
        for idx in range(5):
            for patch_dim in [(42,42,1), (48,48,3), (64,64,3), (96,96,3)]:
                img_patch = dict()
                for key, value in arr_dict.items():
                    img_patch[key] = patch(value[0], patch_dim, value[1], reverse, idx=0) 
                patch_list.append(np.expand_dims(np.concatenate((np.expand_dims(np.moveaxis(img_patch['t2_tse_tra'], 0, -1), axis= -1),
                            np.expand_dims(np.moveaxis(img_patch['ADC'], 0, -1), axis= -1),
                            np.expand_dims(np.moveaxis(img_patch['BVAL'], 0, -1), axis= -1)), axis = -1), axis = 0))
            patch_neighbors.append(patch_list)
        return patch_neighbors


    def mean_std_standardization(self, arr_list, mean_std, mean_std_ktrans):
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
    
    
    def self_standardization(self, arr_list):
        def Outlier_rm(arr, arr_mean, arr_std):
            arr[arr > arr_mean + 2*arr_std] = arr_mean + 2*arr_std
            arr[arr < arr_mean - 2*arr_std] = arr_mean - 2*arr_std

            return arr

        for k, v in arr_list.items():
            v_mean = np.mean(v[0])
            v_std = np.std(v[0])
            v[0] = Outlier_rm(v[0], v_mean, v_std)
            tmp = (v[0] - v_mean)/v_std
            arr_list[k] =[tmp, v[1]]
            
        return arr_list