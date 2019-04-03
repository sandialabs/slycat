# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import argparse
import os
import cv2
import glob

parser = argparse.ArgumentParser()
parser.add_argument('--input', default='~/Desktop/movie_images/', help='a parameter.')
arguments = parser.parse_args()

img_array = []
for filename in sorted(glob.glob(arguments.input + '*.jpg')):
    print(filename)
    img = cv2.imread(filename)
    height, width, layers = img.shape
    size = (width,height)
    img_array.append(img)
 
out = cv2.VideoWriter('out.mp4', cv2.VideoWriter_fourcc(*'mp4v'), 1, size)
 
for i in range(len(img_array)):
    out.write(img_array[i])
out.release()