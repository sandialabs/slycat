import matplotlib.pyplot as pyplot
import numpy
import scipy.signal
import scipy.stats

create = numpy.load("create-times.npy")
write = numpy.load("write-times.npy")
read = numpy.load("read-times.npy")

create_line = scipy.stats.linregress(numpy.arange(len(create)), create)
write_line = scipy.stats.linregress(numpy.arange(len(write)), write)
read_line = scipy.stats.linregress(numpy.arange(len(read)), read)

pyplot.figure()
pyplot.plot(scipy.signal.medfilt(create, 51), color="gray")
pyplot.plot(numpy.arange(len(create)), numpy.arange(len(create)) * create_line[0] + create_line[1], label="create", color="red")
pyplot.xlabel("count")
pyplot.ylabel("seconds")
pyplot.legend()

pyplot.figure()
pyplot.plot(scipy.signal.medfilt(write, 51), color="gray")
pyplot.plot(numpy.arange(len(create)), numpy.arange(len(create)) * write_line[0] + write_line[1], label="write", color="green")
pyplot.xlabel("count")
pyplot.ylabel("seconds")
pyplot.legend()

pyplot.figure()
pyplot.plot(scipy.signal.medfilt(read, 51), color="gray")
pyplot.plot(numpy.arange(len(create)), numpy.arange(len(create)) * read_line[0] + read_line[1], label="read", color="blue")
pyplot.xlabel("count")
pyplot.ylabel("seconds")
pyplot.legend()

pyplot.figure()
pyplot.plot(create, color="gray")
pyplot.plot(numpy.arange(len(create)), numpy.arange(len(create)) * create_line[0] + create_line[1], label="create", color="red")
pyplot.xlabel("count")
pyplot.ylabel("seconds")
pyplot.legend()

pyplot.figure()
pyplot.plot(write, color="gray")
pyplot.plot(numpy.arange(len(create)), numpy.arange(len(create)) * write_line[0] + write_line[1], label="write", color="green")
pyplot.xlabel("count")
pyplot.ylabel("seconds")
pyplot.legend()

pyplot.figure()
pyplot.plot(read, color="gray")
pyplot.plot(numpy.arange(len(create)), numpy.arange(len(create)) * read_line[0] + read_line[1], label="read", color="blue")
pyplot.xlabel("count")
pyplot.ylabel("seconds")
pyplot.legend()

pyplot.show()

