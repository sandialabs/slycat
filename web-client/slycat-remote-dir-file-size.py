# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import paramiko
import re
import csv
import slycat.web.client
import getpass
import cPickle as pickle

parser = slycat.web.client.ArgumentParser()
parser.add_argument("file", default="-", help="Input CSV file.  Default: %(default)s")
parser.add_argument("--port", default=22, help="port number.  Default: %(default)s")
parser.add_argument("--temp_file", default="temp_file", help="cpickle temp file.  Default: %(default)s")
arguments = parser.parse_args()

# with open(filename, 'wb') as fp:
#   pickle.dump(self.fitResults, fp)
try:
    print "trying to find old file"
    with open(arguments.temp_file, 'rb') as fp:
      temp_dict = pickle.load(fp)
except IOError:
    print "failed to find "
    temp_dict = None

if temp_dict:
    print "pre calculated dict found"
    # print temp_dict
else:
    temp_dict = {}

print "host: ", arguments.host
print "port: ", arguments.port
print "file_path: ",arguments.file
print "user: ",arguments.user

# print "password: ", arguments.password
expression = re.compile("file://")
# if "file_list" not in temp_dict:
print "file_list not in pickle file"
file_list=[]
with open(arguments.file) as csvfile:
    reader = csv.DictReader(csvfile)
    for row in reader:
        for item in row:
            if bool(expression.search(row[item])):
                file_list.append(re.sub(r'file:\/\/[a-zA-Z]*\/', "/", row[item]))

with open(arguments.temp_file, 'wb') as fp:
    print "writing out file list"
    temp_dict["file_list"]=file_list
    pickle.dump(temp_dict, fp)

print "number of files ", len(temp_dict["file_list"])
# see if we have a file size map
if "file_size_map" in temp_dict:
    print "file size map found in pickle"
    file_size_map = temp_dict["file_size_map"]
else:
    file_size_map = {}


size = 0
if arguments.password is None:
    arguments.password = getpass.getpass("%s password: " % arguments.user)
try:
    client = paramiko.SSHClient()
    client.load_system_host_keys()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(arguments.host, username=arguments.user, password=arguments.password, port=int(arguments.port))
    not_in_count = 1
    in_count = 0
    for path in temp_dict["file_list"]:
        if path not in file_size_map:
            not_in_count += 1
            stdin, stdout, stderr = client.exec_command("ls -l %s | cut -d \" \" -f5" % path)
            # print path
            for line in stdout:
                file_size_map[path] = int(line.strip('\n'))
                size = size + int(line.strip('\n'))
                # print int(line.strip('\n'))
        else:
            size = size + file_size_map[path]
            in_count += 1
        if ((in_count + not_in_count) % 100) == 0:
            print "in count:%s not in count: %s" %(in_count, not_in_count)

        if ((not_in_count) % 100) == 0:
            print "writing out temp_dict"
            with open(arguments.temp_file, 'wb') as fp:
                temp_dict["file_size_map"] = file_size_map
                pickle.dump(temp_dict, fp)

except KeyboardInterrupt as e:
    print "writing out temp_dict"
    with open(arguments.temp_file, 'wb') as fp:
        temp_dict["file_size_map"] = file_size_map
        pickle.dump(temp_dict, fp)

print "writing out temp_dict"
with open(arguments.temp_file, 'wb') as fp:
    temp_dict["file_size_map"] = file_size_map
    pickle.dump(temp_dict, fp)

print size, " bytes"
