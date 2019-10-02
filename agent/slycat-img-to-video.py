# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import argparse
import os
import cv2
import glob
"""
Takes a directory filled with lexagraphically orderable images and creates a mp4 movie from them
Raises:
  Exception -- image files not found
  Exception -- not all images have the same ratio of pixels
  FileNotFoundError -- the provided input directory was not found
"""

parser = argparse.ArgumentParser()
parser.add_argument('--input', default='/Desktop/png-image-test/', help='path of directory with images')
parser.add_argument('--output-directory', default='', help='path to output created mp4')
parser.add_argument('--name', default='out', help='output file name NOTE: \'.mp4\' will get appended to the name')
parser.add_argument('--verbose', default=False, help='print verbose output')
parser.add_argument('--framerate', default=1, help='framerate')
arguments = parser.parse_args()

# size is a tuple for the (width, hieght) of the images
size = None
def print_verbose(*args):
    """
    create a print function that only prints in verbose mode
    """
    if arguments.verbose:
        print((*args))
# make sure we got a directory that exists
if os.path.exists(arguments.input):
  img_array = []
  # sniff for the file extention
  if glob.glob(arguments.input + '*.jpg'):
    file_names = glob.glob(arguments.input + '*.jpg')
  elif glob.glob(arguments.input + '*.png'):
    file_names = glob.glob(arguments.input + '*.png')
  else:
    raise Exception("did not find .png or .jpg files in folder")

  # create a list of images to turn into the movie and make sure they all have the same dimensions  
  for filename in sorted(file_names):
      print_verbose('Filename: ' + filename)
      img = cv2.imread(filename)
      height, width, layers = img.shape
      print_verbose("Images dimentions {} {}".format(height, width))
      temp_size = (width,height)
      # check for consistent dimmentions
      if size is None:
        size = temp_size
      elif size != temp_size:
        raise Exception("you have two format sizes for your images, images sizes must be the same")
      # cast as uint8 to make sure all images are consistent
      img_array.append(img.astype('uint8'))
else:
  raise FileNotFoundError("The given input path does not exist")
path_of_new_video_file = arguments.output_directory + arguments.name + '.mp4'
# create a web browser compatible video file writer aka H264 codec
out = cv2.VideoWriter( path_of_new_video_file, cv2.VideoWriter_fourcc(*'H264'), arguments.framerate, size, True )

print_verbose('wrinting video to: {}'.format(path_of_new_video_file))
# walk through the images and create the video
for i in range(len(img_array)):
    out.write(img_array[i])
out.release()
print_verbose('Done')
