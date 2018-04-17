# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""
This script is designed to take a csv file and randomly selected x number of
rows based on --random_sample_size with a default of 10
"""
import csv
import slycat.web.client
import random

parser = slycat.web.client.ArgumentParser()
parser.add_argument("file", default="-", help="Input CSV file.  Default: %(default)s")
parser.add_argument("--random_sample_size", default=10, help="number of randomly selected rows to output.  Default: %(default)s")
parser.add_argument("--output_file_name", default="_random_samples.csv", help="output csv file name.  Default: %(default)s")
arguments = parser.parse_args()

file_list=[]
print "opening input csv file"
with open(arguments.file) as csvfile:
    reader = csv.DictReader(csvfile)
    print "opening output csv file"
    with open((str(arguments.random_sample_size)+arguments.output_file_name), 'w') as csv_output_file:
        writer = csv.DictWriter(csv_output_file, fieldnames=reader.fieldnames)
        writer.writeheader()
        rows = []
        for row in reader:
            rows.append(row)
        random.shuffle(rows)
        print "writing out to output csv file"
        for x in range(int(arguments.random_sample_size)):
            writer.writerow(rows[x])
print "output file was named %s" % (str(arguments.random_sample_size)+arguments.output_file_name)
