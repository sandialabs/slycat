# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import numpy
import numpy.core.defchararray
import os
import PIL.Image, PIL.ImageDraw, PIL.ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--data-file", default="images.csv", help="Output data file.  Default: %(default)s")
parser.add_argument("--image-count", type=int, default=3, help="Image column count.  Default: %(default)s")
parser.add_argument("--image-directory", default="images", help="Image directory.  Default: %(default)s")
parser.add_argument("--image-height", type=int, default=1000, help="Image height.  Default: %(default)s")
parser.add_argument("--image-hostname", default="localhost", help="Image hostname.  Default: %(default)s")
parser.add_argument("--image-width", type=int, default=1000, help="Image width.  Default: %(default)s")
parser.add_argument("--input-count", type=int, default=3, help="Input column count.  Default: %(default)s")
parser.add_argument("--metadata-count", type=int, default=3, help="Metadata column count.  Default: %(default)s")
parser.add_argument("--output-count", type=int, default=3, help="Output column count.  Default: %(default)s")
parser.add_argument("--row-count", type=int, default=100, help="Row count.  Default: %(default)s")
parser.add_argument("--seed", type=int, default=12345, help="Random seed.  Default: %(default)s")
parser.add_argument("--unused-count", type=int, default=3, help="Unused column count.  Default: %(default)s")
arguments = parser.parse_args()

# Create some random data ...
numpy.random.seed(arguments.seed)
numeric_data = numpy.random.random((arguments.row_count, arguments.input_count + arguments.output_count + arguments.unused_count))
metadata_data = numpy.core.defchararray.add("metadata ", numpy.arange(arguments.row_count * arguments.metadata_count).reshape(arguments.row_count, arguments.metadata_count).astype("string"))
image_data = numpy.core.defchararray.mod("file://%s%s/%%s.jpg" % (arguments.image_hostname, os.path.abspath(arguments.image_directory)), numpy.arange(arguments.row_count * arguments.image_count).reshape(arguments.row_count, arguments.image_count).astype("string"))
string_data = numpy.column_stack((metadata_data, image_data))

columns = [column for column in numeric_data.T] + [column for column in string_data.T]

with open(arguments.data_file, "w") as file:
  file.write(",".join(["n%s" % column for column in range(numeric_data.shape[1])] + ["s%s" % column for column in range(string_data.shape[1])]) + "\n")
  for row in range(numeric_data.shape[0]):
    file.write(",".join([str(column[row]) for column in columns]) + "\n")

# Generate random images ...
font = PIL.ImageFont.truetype("/usr/share/fonts/dejavu/DejaVuSerif-BoldItalic.ttf", 200)
os.mkdir(arguments.image_directory)
for index in numpy.arange(arguments.row_count * arguments.image_count):
  image = PIL.Image.new("RGB", (arguments.image_width, arguments.image_height), "white")
  draw = PIL.ImageDraw.Draw(image)
  draw.text((100, 100), "%s" % index, "black", font)
  image.save(os.path.join(arguments.image_directory, "%s.jpg" % index))


