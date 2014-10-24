# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import numpy
import os
import PIL.Image, PIL.ImageDraw, PIL.ImageFont

parser = argparse.ArgumentParser()
parser.add_argument("--category-count", type=int, default=2, help="Category column count.  Default: %(default)s")
parser.add_argument("--data-file", default="parameter-images.csv", help="Output data file.  Default: %(default)s")
parser.add_argument("--image-count", type=int, default=3, help="Image column count.  Default: %(default)s")
parser.add_argument("--image-directory", default="parameter-images", help="Image directory.  Default: %(default)s")
parser.add_argument("--image-height", type=int, default=1000, help="Image height.  Default: %(default)s")
parser.add_argument("--image-hostname", default="localhost", help="Image hostname.  Default: %(default)s")
parser.add_argument("--image-width", type=int, default=1000, help="Image width.  Default: %(default)s")
parser.add_argument("--input-count", type=int, default=3, help="Input column count.  Default: %(default)s")
parser.add_argument("--metadata-count", type=int, default=3, help="Metadata column count.  Default: %(default)s")
parser.add_argument("--output-count", type=int, default=3, help="Output column count.  Default: %(default)s")
parser.add_argument("--rating-count", type=int, default=2, help="Rating column count.  Default: %(default)s")
parser.add_argument("--row-count", type=int, default=100, help="Row count.  Default: %(default)s")
parser.add_argument("--seed", type=int, default=12345, help="Random seed.  Default: %(default)s")
parser.add_argument("--unused-count", type=int, default=3, help="Unused column count.  Default: %(default)s")
arguments = parser.parse_args()

# Create some random data ...
names = []
columns = []

numpy.random.seed(arguments.seed)

for i in range(arguments.category_count):
  names.append("category%s" % i)
  columns.append(numpy.random.randint(5, size=arguments.row_count))

for i in range(arguments.rating_count):
  names.append("rating%s" % i)
  columns.append(numpy.zeros(arguments.row_count))

for i in range(arguments.input_count):
  names.append("input%s" % i)
  columns.append(numpy.random.random(arguments.row_count))

for i in range(arguments.output_count):
  names.append("output%s" % i)
  columns.append(numpy.random.random(arguments.row_count))

for i in range(arguments.unused_count):
  names.append("unused%s" % i)
  columns.append(numpy.random.random(arguments.row_count))

for i in range(arguments.metadata_count):
  names.append("metadata%s" % i)
  columns.append(numpy.array(["metadata"] * arguments.row_count))

for i in range(arguments.image_count):
  names.append("image%s" % i)
  columns.append(numpy.array(["file://%s%s/%s.jpg" % (arguments.image_hostname, os.path.abspath(arguments.image_directory), (arguments.row_count * i) + j) for j in range(arguments.row_count)]))

with open(arguments.data_file, "w") as file:
  file.write(",".join(names) + "\n")
  for row in range(arguments.row_count):
    file.write(",".join([str(column[row]) for column in columns]) + "\n")

# Generate random images ...
font = PIL.ImageFont.truetype("/usr/share/fonts/dejavu/DejaVuSerif-BoldItalic.ttf", 200)
os.mkdir(arguments.image_directory)
for index in numpy.arange(arguments.row_count * arguments.image_count):
  image = PIL.Image.new("RGB", (arguments.image_width, arguments.image_height), "white")
  draw = PIL.ImageDraw.Draw(image)
  draw.text((100, 100), "%s" % index, "black", font)
  image.save(os.path.join(arguments.image_directory, "%s.jpg" % index))


