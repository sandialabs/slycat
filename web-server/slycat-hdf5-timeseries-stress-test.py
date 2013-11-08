import argparse
import h5py
import numpy
import time

parser = argparse.ArgumentParser()
parser.add_argument("--file", default="test.hdf5", help="Test file.  Default: %(default)s")
parser.add_argument("--timings", default="times.npy", help="Timings file.  Default: %(default)s")
parser.add_argument("--sample-count", type=int, default=1250000, help="Timeseries sample count.  Default: %(default)s")
parser.add_argument("--series-count", type=int, default=1000, help="Timeseries count.  Default: %(default)s")
parser.add_argument("--variable-count", type=int, default=100, help="Timeseries variable count.  Default: %(default)s")
arguments = parser.parse_args()

chunk_times = []
file = h5py.File(arguments.file, "w")
for attribute_index in range(arguments.variable_count):
  print "attribute:", attribute_index
  attribute = file.create_dataset("attributes/{}".format(attribute_index), (arguments.sample_count * arguments.series_count,), dtype="float64")
  for offset in range(0, arguments.sample_count * arguments.series_count, arguments.sample_count):
    print "  offset:", offset
    start = time.time()
    attribute[offset : offset + arguments.sample_count] = numpy.random.random(arguments.sample_count)
    chunk_times.append(time.time() - start)

numpy.save(arguments.timings, numpy.array(chunk_times))
