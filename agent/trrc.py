#
# # #!/bin/env python

# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

"""
test script, test run remote command
execute this script to test ipython, controller, and engines.
This script writes input arg, PID, hostname, and time to a text file.
  file format:  iPy, Arg is: 666, host: nid00151, PID: 15617 at 2019-02-12T14:52:01.205525
"""
import argparse
import ipyparallel
import socket
import datetime

parser = argparse.ArgumentParser()
parser.add_argument("--number", type=int, default=1, help="number to be printed")
parser.add_argument("--profile", default=None, help="Name of the IPython profile to use")
arguments = parser.parse_args()

print("++ trrc starting with arg: %s and profile: %s" % (arguments.number, arguments.profile))

try:
    if arguments.profile is None:
        client = ipyparallel.Client()
    else:
        client = ipyparallel.Client(profile=arguments.profile)
except:
    raise Exception("A running IPython parallel cluster is required to run this script.")

print("++ trrc sees %s client-engine pairs ready for work" % str(len(client)))
# creat a Direct View on the engines
view = client[:]
#view.block = True  #when the call is blocking only a list is rtn'd, otherwise an AsyncResult is rtn'd

def myIDfunction( x ):
    import os, socket, datetime, uuid
    fname = str(uuid.uuid4()) + ".txt"
    fh = open(fname, 'w')
    output = "iPy, Arg is: "+str(x)+", host: "+socket.gethostname()+", PID: "+str(os.getpid())+" at "+datetime.datetime.now().isoformat()+"\n"
    fh.write(output)
    fh.close()
    return output

print("++ trrc is calling apply() on engines")
asyncResult = view.apply(myIDfunction, arguments.number)

asyncResult.wait(9)
if asyncResult.ready():
    print("++ used parallel python walltime is: %s" % asyncResult.wall_time)
    print("++ result metadata is: %s" % asyncResult.metadata)

client.shutdown(hub=True)

print("++ trrc is done")
