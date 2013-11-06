from matplotlib import pyplot
import argparse
import h5py
import numpy
import os
import sys
import time
import uuid

parser = argparse.ArgumentParser()
parser.add_argument("--count", type=int, default=1000, help="Number of hdf5 files to generate for testing.  Default: %(default)s")
parser.add_argument("--data-store", default="hdf5-test", help="Directory to use for testing.  Default: %(default)s")
parser.add_argument("--create-times", default="create-times.npy", help="Filepath to save create times.  Default: %(default)s")
parser.add_argument("--write-times", default="write-times.npy", help="Filepath to save write times.  Default: %(default)s")
parser.add_argument("--read-times", default="read-times.npy", help="Filepath to save read times.  Default: %(default)s")
parser.add_argument("--size", type=int, default=1000, help="Size of each test file in elements.  Default: %(default)s")
arguments = parser.parse_args()

# Generate a collection of array ids
ids = [uuid.uuid4().hex for i in range(arguments.count)]

# Convert array ids to filesystem paths
paths = [os.path.join(arguments.data_store, id[0:2], id[2:4], id[4:6], id[4:] + ".hdf5") for id in ids]

# Create arrays
creation_times = numpy.zeros(len(paths))
for index, path in enumerate(paths):
  sys.stderr.write("Creating {} of {}\n".format(index, len(paths)))
  start_time = time.time()
  try:
    os.makedirs(os.path.dirname(path))
  except OSError:
    pass
  with h5py.File(path, mode="w") as file:
    pass
  creation_times[index] = time.time() - start_time
numpy.save(arguments.create_times, creation_times)

# Write arrays
write_times = numpy.zeros(len(paths))
for index, path in enumerate(paths):
  sys.stderr.write("Writing {} of {}\n".format(index, len(paths)))
  start_time = time.time()
  with h5py.File(path, mode="r+") as file:
    file["data"] = numpy.random.random(arguments.size)
  write_times[index] = time.time() - start_time
numpy.save(arguments.write_times, write_times)

# Read arrays
read_times = numpy.zeros(len(paths))
for index, path in enumerate(paths):
  sys.stderr.write("Reading {} of {}\n".format(index, len(paths)))
  start_time = time.time()
  with h5py.File(path, mode="r") as file:
    data = numpy.array(file["data"][...])
  read_times[index] = time.time() - start_time
numpy.save(arguments.read_times, read_times)

pyplot.plot(creation_times, label="create")
pyplot.plot(write_times, label="write")
pyplot.plot(read_times, label="read")
pyplot.legend()
pyplot.yscale("log")
pyplot.ylabel("Seconds")
pyplot.xlabel("Count")
pyplot.show()
