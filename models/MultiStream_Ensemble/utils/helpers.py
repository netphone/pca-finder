import numpy as np
import scipy.ndimage.interpolation


def resample_array(img_arr, shape, spacing, resize_dict, ijk):
    plane_area = tuple(int(x) for x in np.array(shape[:-1])*np.array(spacing[:-1]))
    resize_shape = resize_dict['resize_dict'][plane_area][shape[:-1]]
    scale = resize_shape[0]/shape[0], resize_shape[1]/shape[1]
    rescale_i, rescale_j = int(ijk[0]*scale[0]), int(ijk[1]*scale[1])
    rescale_k = ijk[2]  #shape[2] - ijk[2] - 1           
    resampled_dcm = scipy.ndimage.interpolation.zoom(img_arr, np.insert(np.array(resize_shape)/img_arr.shape[1:], 0, 1.), order=1)

    return resampled_dcm, [rescale_i, rescale_j, rescale_k]


def slice_array(img_arr, rescale_ijk, tgt_size = (320, 320)):    
    S, W, H = img_arr.shape
    if W < tgt_size[0]:
        pad_W, pad_H = int((tgt_size[0] - W)/2), int((tgt_size[1] - H)/2)
        rescale_ijk[0] += pad_W
        rescale_ijk[1] += pad_H
        target_img = np.zeros((S, 320, 320))
        target_img[:, pad_W:pad_W+W, pad_H:pad_H+H] = img_arr
    else:
        crop_W, crop_H = int((W - tgt_size[0])/ 2), int((H - tgt_size[1])/ 2)
        rescale_ijk[0] -= crop_W
        rescale_ijk[1] -= crop_H
        target_img = img_arr[:, crop_W:crop_W+tgt_size[0], crop_H:crop_H+tgt_size[1]]

    return target_img, rescale_ijk
    
    
def patch_setup(img_size, dim, ijk):
    D, H, W = img_size
    i, j, k = ijk
    start_D, end_D = k - int(dim[2]/2), k + int((dim[2]+1)/2)
    start_H, end_H = i - int(dim[0]/2), i + int((dim[0]+1)/2)
    start_W, end_W = j - int(dim[1]/2), j + int((dim[1]+1)/2)

    if start_D <= 0:
        start_D = 0; end_D = dim[2]
    if end_D >= D:
        start_D = D - dim[2]; end_D = D
    if start_H <= 0:
        start_H = 0; end_H = dim[0]
    if end_H >= H:
        start_H = H - dim[0]; end_H = H
    if start_W <= 0:
        start_W = 0; end_W = dim[1]
    if end_W >= W:
        start_W = W - dim[1]; end_W = W

    if k < start_D or k >= end_D:
        print('k: {}, start_D: {}, end_D: {}'.format(k, start_D, end_D))
    
    return [start_D, end_D, start_H, end_H, start_W, end_W] 
    
    
def patch(image, patch_dim, ijk, reverse=True, idx = 0):
    p_coord0 = patch_setup(image.shape, patch_dim, ijk)
    #if idx == 0:
    img_patch = image[p_coord0[0]:p_coord0[1],p_coord0[2]:p_coord0[3],p_coord0[4]:p_coord0[5]]
    #else:
        #img_patch = image[p_coord0[0]:p_coord0[1],p_coord0[2]+int(np.sin(idx*np.pi/2)):p_coord0[3]+int(np.sin(idx*np.pi/2)),p_coord0[4]+int(np.cos(idx*np.pi/2)):p_coord0[5]int(np.cos(idx*np.pi/2))]
    #if reverse:
        #return img_patch[::-1,:,:]
    #else:
    return img_patch 