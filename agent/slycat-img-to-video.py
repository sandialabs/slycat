# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import argparse
import os
import cv2
import glob

parser = argparse.ArgumentParser()
parser.add_argument('--input', default='/Desktop/movie_images/', help='a parameter.')
parser.add_argument('--verbose', default=False, help='a parameter.')
arguments = parser.parse_args()

size = None
def print_verbose(*args):
    if arguments.verbose:
        print(*args)

if os.path.exists(arguments.input):
  img_array = []
  for filename in sorted(glob.glob(arguments.input + '*.jpg')):
      print_verbose(filename)
      img = cv2.imread(filename)
      height, width, layers = img.shape
      print_verbose("Images dimentions {} {}".format(height, width))
      temp_size = (width,height)
      if size is None:
        size = temp_size
      elif size != temp_size:
        raise Exception("you have two format sizes for your images, images sizes must be the same")
      img_array.append(img.astype('uint8'))
else:
  raise FileNotFoundError("bad path")
out = cv2.VideoWriter('out.mp4', cv2.VideoWriter_fourcc(*'H264'), 1, size, True)

for i in range(len(img_array)):
    out.write(img_array[i])
out.release()
