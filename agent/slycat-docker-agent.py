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
        output = self.run_remote_command(command["command"])
        results = {
            "ok": True,
            "command": command["command"],
            "output": output[0],
            "errors": output[1]}
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def submit_batch(self, command):
        output = self.run_remote_command(command["command"])
        results = {
            "ok": True,
            "filename": command["command"],
            "output": output[0],
            "errors": output[1]}
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def checkjob(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }
        try:
            # /job_log.txt
            results["output"], results["errors"] = self.run_remote_command("sacct -j %s --format=jobname,state" % results["jid"])
            myset = [line.split() for line in results["output"]]
            for _ in myset:
                if "slycat-tmp" in _:
                    results["output"] = _[1]
                    break
        except OSError as e:
            sys.stdout.write("%s\n" % json.dumps({"ok": False, "message": e}))
            sys.stdout.flush()
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def cancel_job(self, command):
        output = self.run_remote_command("scancel %s" % command["command"]) # command is jid here
        results = {
            "ok": True,
            "jid": command["command"],
            "output": output[0],
            "errors": output[1]
        }
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
        f.write("#!/bin/bash\n\n")
        f.write("export SLYCAT_HOME=\/home\/slycat\/src\/slycat\n")
        f.write("#SBATCH --account=%s\n" % wckey)
        f.write("#SBATCH --job-name=slycat-tmp\n")
        f.write("#SBATCH --partition=%s\n\n" % partition)
        f.write("#SBATCH --nodes=%s\n" % nnodes)
        f.write("#SBATCH --ntasks-per-node=%s\n" % ntasks_per_node)
        f.write("#SBATCH --time=%s:%s:%s\n" % (time_hours, time_minutes, time_seconds))
        f.write("ipython profile create")
        f.write("echo \"Creating profile ${profile}\"\n")
        f.write("ipcontroller --ip='*' &\n")
        f.write("ipcluster start -n 4 &")
        f.write("echo \"Launching controller\"\n")
        f.write("sleep 1m\n")
        f.write("echo \"Launching job\"\n")
        for c in fn:
            f.write("%s\n" % c)
        f.write("pkill -f ipcontroller \n")
        f.write("pkill -f ipcluster \n")
        f.write("pkill -f python \n")
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

        tmp_file = tempfile.NamedTemporaryFile(delete=False, dir=os.getcwd())
        self.generate_batch(module_name, wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes,
                            time_seconds, fn,
                            tmp_file)
        with open(tmp_file.name, 'r') as myfile:
            data = myfile.read().replace('\n', '')
        results["temp_file"] = data
        self.run_remote_command("chmod 755 %s" % tmp_file.name)
        print "starting"
        print tmp_file.name
        try:
            print (".%s &> /dev/null &" % tmp_file.name)
            self.run_remote_command("sh %s &> /dev/null &" % tmp_file.name)
        except Exception as e:
            print sys.exc_info()
            e.message
        print "running"

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()


if __name__ == "__main__":
    slurm_cluster_agent = Agent()
    slurm_cluster_agent.run()
