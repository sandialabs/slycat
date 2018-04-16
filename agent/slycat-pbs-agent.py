#!/bin/env python

# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

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
import logging
import traceback
import random
import threading

class Agent(agent.Agent):
    """

    """
    def run_remote_command(self, command):
        command = command["command"]
        run_command = None
        # get the command scripts that were sent to the agent
        for command_script in command["scripts"]:
            # compare the payload commands to the registered commands on the agent
            run_command = self.get_script_run_string(command_script)
        if run_command is None or run_command == "":
            results = {"ok": False, "message": "could not create a run command did you register your script with "
                                               "slycat?"}
            sys.stdout.write("%s\n" % json.dumps(results))
            sys.stdout.flush()
            return
        command["run_command"] = run_command
        # if "background_task" in command and command["background_task"]:
        output = ["running task in background", "running task in background"]
        jid = random.randint(10000000, 99999999)
        run_command += " --log_file " + str(jid) + ".log"
        try:
            background_thread = threading.Thread(target=self.run_shell_command, args=(run_command, jid, True,))
            background_thread.start()
        except Exception as e:
            output[0] = traceback.format_exc()
        # else:
        #     output = self.run_shell_command(run_command)
        results = {
            "message": "ran the remote command",
            "ok": True,
            "jid": jid,
            "command": command,
            "output": output[0],
            "errors": output[1],
            "available_scripts": [
                {
                    "name": script["name"],
                    "description": script["description"],
                    "parameters": script["parameters"]
                }
                for script in self.scripts]
        }
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def run_shell_command(self, command, jid=0, log_to_file=False):
        # create log file in the users directory for later polling
        if log_to_file:
            log = self.create_job_logger(jid)
        try:
            if log_to_file:
                log("[STARTED]")
            command = command.split(' ')

            # remove empty list values
            for _ in command:
                if _ == "":
                    command.remove("")
            # open process to run script
            p = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            if log_to_file:
                log("[RUNNING]")
            # execute script
            value = p.communicate()
            if log_to_file:
                log(str(value))
                log("[FINISHED]")
                return value
            else:
                return value
        except Exception as e:
            log("[FAILED]")
            return ["FAILED", "FAILED"]
            # print traceback.format_exc()

    def check_agent_job(self, command):
        results = {
            "ok": True,
            "jid": command["command"]["jid"],
            "status": "[UNKNOWN]",
            "status_list": self._status_list
        }
        try:
            with open(str(command["command"]["jid"])+'.log') as log_file:
                for line in log_file:
                    if line.strip(' \t\n\r') in self._status_list:
                        results["status"] = line.strip(' \t\n\r')
        except IOError:
            sys.stdout.write("%s\n" % json.dumps({"ok": False, "message": "file not found: job id log file is "
                                                                          "probably missung"}))
            sys.stdout.flush()
        except Exception as e:
            self.log.log(logging.INFO, traceback.format_exc())
            sys.stdout.write("%s\n" % json.dumps({"ok": False, "message": e}))
            sys.stdout.flush()
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def launch(self, command):
        results = {
            "ok": True,
            "command": command["command"]
        }

        results["output"], results["errors"] = self.run_shell_command(command["command"])

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def submit_batch(self, command):
        results = {
            "ok": True,
            "filename": command["command"],
            "output": -1
        }

        results["output"], results["errors"] = self.run_shell_command("qsub %s" % results["filename"])

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def checkjob(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }

        results["output"], results["errors"] = self.run_shell_command("qstat $PBS_JOBID")

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def cancel_job(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }

        results["output"], results["errors"] = self.run_shell_command(
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
            results["output"], results["errors"] = self.run_shell_command("cat %s" % f)
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
        f.write("#PBS -q %s\n" % partition)
        f.write("#PBS -r n\n")
        f.write("#PBS -A %s\n" % wckey)
        f.write("#PBS -V\n")
        f.write("#PBS -j oe\n")

        f.write("set slyDir=slycat_tmp\n")
        f.write("cd $WORKDIR\n")

        f.write("if (! -d $WORKDIR/$slyDir) then\n")
        f.write("    mkdir $slyDir\n")
        f.write("endif\n")
        f.write("cd $slyDir\n")

        f.write("set exechost=`hostname -s`\n")
        f.write("echo \"++Slycat timeseries job running at `date` on $exechost, in directory `pwd` \"\n")
        f.write("unlimit\n")
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
        f.write("echo \"++ Slycat job: launching hdf5 conversion at `date`\"\n")

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
        working_dir = command["command"]["working_dir"]
        try:
            self.run_shell_command("mkdir -p %s" % working_dir)
        except Exception:
            pass
        tmp_file = tempfile.NamedTemporaryFile(delete=False, dir=working_dir)
        self.generate_batch(module_name, wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes,
                            time_seconds, fn,
                            tmp_file)
        with open(tmp_file.name, 'r') as myfile:
            data = myfile.read().replace('\n', '')
        results["working_dir"] = working_dir
        results["temp_file"] = data
        results["output"], results["errors"] = self.run_shell_command("qsub %s" % tmp_file.name)

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()


if __name__ == "__main__":
    slurm_cluster_agent = Agent()
    slurm_cluster_agent.run()
