import paramiko
import re
import csv
import slycat.web.client
import random
import getpass
import cPickle as pickle

parser = slycat.web.client.ArgumentParser()
parser.add_argument("file", default="-", help="Input CSV file.  Default: %(default)s")
parser.add_argument("--random_sample", default=22, help="port number.  Default: %(default)s")
parser.add_argument("--output_file_name", default="_random_samples.csv", help="cpickle output csv file.  Default: %(default)s")
arguments = parser.parse_args()

file_list=[]
with open(arguments.file) as csvfile:
    reader = csv.DictReader(csvfile)
    with open((str(arguments.random_sample)+arguments.output_file_name), 'w') as csv_output_file:
        writer = csv.DictWriter(csv_output_file, fieldnames=reader.fieldnames)
        writer.writeheader()
        for row in reader:
            writer.writerow(row)

    # for row in reader:
    #     print ', '.join(reader.fieldnames)
