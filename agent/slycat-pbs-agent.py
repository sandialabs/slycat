#!/bin/env python

# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

# External dependencies
import PIL.Image

# Python standard library
import argparse

try:
    import cStringIO as StringIO
except ImportError:
    import StringIO

import json
import os
import subprocess
import sys
import tempfile
import agent


class Agent(agent.Agent):
    """

    """

    def run_remote_command(self, command):
        command = command.split(' ')
        p = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return p.communicate()

    def launch(self, command):
        results = {
            "ok": True,
            "command": command["command"]
        }

        results["output"], results["errors"] = self.run_remote_command(command["command"])

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def submit_batch(self, command):
        results = {
            "ok": True,
            "filename": command["command"],
            "output": -1
        }

        results["output"], results["errors"] = self.run_remote_command("qsuv %s" % results["filename"])

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def checkjob(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }

        results["output"], results["errors"] = self.run_remote_command("qstat $PBS_JOBID")

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def cancel_job(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }

        results["output"], results["errors"] = self.run_remote_command(
            "scancel %s" % results["jid"])  # TODO: this is wrong needs to be results["jid"]["jid"]

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def get_job_output(self, command):
        results = {
            "ok": True,
            "jid": command["command"]["jid"]
        }

        path = command["command"]["path"]
        f = path + "slurm-%s.out" % results["jid"]
        if os.path.isfile(f):
            results["output"], results["errors"] = self.run_remote_command("cat %s" % f)
        else:
            results["output"] = "see errors"
            results["errors"] = "the file %s does not exist." % f

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def generate_batch(self, module_name, wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes,
                       time_seconds, fn,
                       tmp_file):
        f = tmp_file

        f.write("#!/bin/csh\n\n")
        f.write("#PBS -l walltime=%s:%s:%s\n" % (time_hours, time_minutes, time_seconds))
        f.write("#PBS -l select=1:ncpus=32:vntype=gpu\n")
        f.write("#PBS -l place=scatter:excl\n")
        f.write("#PBS -N slycat\n")
        f.write("#PBS -q debug\n")
        f.write("#PBS -r n\n")
        f.write("#PBS -A slycat_project\n")
        f.write("#PBS -V\n")
        f.write("#PBS -j oe\n")

        f.write("set slyDir=slycat_tmp\n")
        f.write("cd $WORKDIR\n")

        f.write("if (! -d $WORKDIR/$slyDir) then\n")
        f.write("    mkdir $slyDir\n")
        f.write("endif\n" % wckey)

        f.write("set exechost=`hostname -s`\n")
        f.write("echo \"++Slycat timeseries job running at `date` on $exechost, in directory `pwd` \"\n")
        f.write("unlimit")
        f.write("module load slycat\n")

        f.write("echo \"++ Slycat job: launching ipcontroller at `date`\"\n")
        f.write("ipcontroller --ip='*' &\n")
        f.write("sleep 20\n")
        f.write("echo \"++ Slycat job: launching ipython engines at `date`\"\n")
        f.write("ipengine --location=$exechost &\n")
        f.write("sleep 1\n")
        f.write("ipengine --location=$exechost &\n")
        f.write("sleep 1\n")
        f.write("ipengine --location=$exechost &\n")
        f.write("sleep 1\n")
        f.write("ipengine --location=$exechost &\n")
        f.write("sleep 20\n")
        f.write("set dataDir=/apps/unsupported/slycat/data/diode_clippper/")
        f.write("set inFile=dakota_tabular.dat")
        f.write("set timeFile=clipper_tran_template.cir.prn")
        f.write("echo \"++ Slycat job: launching hdf5 conversion at `date`\"")

        for c in fn:
            f.write("%s\n" % c)

        f.close()

    def run_function(self, command):
        results = {
            "ok": True,
            "output": -1,
            "temp_file": ""
        }
        module_name = command["command"]["module_name"]
        wckey = command["command"]["wckey"]
        nnodes = command["command"]["nnodes"]
        partition = command["command"]["partition"]
        ntasks_per_node = command["command"]["ntasks_per_node"]
        time_hours = command["command"]["time_hours"]
        time_minutes = command["command"]["time_minutes"]
        time_seconds = command["command"]["time_seconds"]
        fn = command["command"]["fn"]
        # uid = command["command"]["uid"]

        tmp_file = tempfile.NamedTemporaryFile(delete=False)
        self.generate_batch(module_name, wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes,
                            time_seconds, fn,
                            tmp_file)
        results["temp_file"] = tmp_file
        results["output"], results["errors"] = self.run_remote_command("sbatch %s" % tmp_file.name)

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()


if __name__ == "__main__":
    slurm_cluster_agent = Agent()
    slurm_cluster_agent.run()
