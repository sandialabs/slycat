#!/bin/env python

# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
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
    def __init__(self):
        """
        add the list of scripts we want to be able to call
        """
        agent.Agent.__init__(self)
        self.command_list = ["module_name", "wckey", "nnodes", "partition", "ntasks_per_node",
                             "time_hours", "time_minutes", "time_seconds", "working_dir"]

    def check_hpc_params(self, command_dict):
        for _ in self.command_list:
            if _ not in command_dict:
                raise Exception("missing %s hpc param" % _)

    def run_remote_command(self, command):
        command = command["command"]
        run_commands = []
        # get the command scripts that were sent to the agent
        jid = random.randint(10000000, 99999999)
        for command_script in command["scripts"]:
            # compare the payload commands to the registered commands on the agent
            if command_script != "":
                run_commands.append(self.get_script_run_string(command_script) + " --log_file " + str(jid) + ".log")
        if not run_commands:
            results = {"ok": False, "message": "could not create a run command did you register your script with "
                                               "slycat?"}
            sys.stdout.write("%s\n" % json.dumps(results))
            sys.stdout.flush()
            return
        command["run_command"] = run_commands
        # if "background_task" in command and command["background_task"]:
        output = ["running task in background", "running task in background"]

        if command["hpc"]["is_hpc_job"]:
            self.check_hpc_params(command["hpc"]["parameters"])
            module_name = command["hpc"]["parameters"]["module_name"]
            wckey = command["hpc"]["parameters"]["wckey"]
            nnodes = command["hpc"]["parameters"]["nnodes"]
            partition = command["hpc"]["parameters"]["partition"]
            ntasks_per_node = command["hpc"]["parameters"]["ntasks_per_node"]
            time_hours = command["hpc"]["parameters"]["time_hours"]
            time_minutes = command["hpc"]["parameters"]["time_minutes"]
            time_seconds = command["hpc"]["parameters"]["time_seconds"]
            working_dir = command["hpc"]["parameters"]["working_dir"]
            output = ["running batch job", "running batch job"]
            try:
                self.run_shell_command("mkdir -p %s" % working_dir)
            except Exception as e:
                output[0] = e.message
            tmp_file = tempfile.NamedTemporaryFile(delete=False, dir=working_dir)
            self.generate_batch(module_name, wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes,
                                time_seconds, run_commands,
                                tmp_file)
            # with open(tmp_file.name, 'r') as myfile:
            #     data = myfile.read().replace('\n', '')
            output[0], output[1] = self.run_shell_command("sbatch %s" % tmp_file.name, jid, log_to_file=True)
        else:
            try:
                self.get_job_logger(jid)("[COMMAND length] %s" % len(run_commands))
                for command in run_commands:
                    self.get_job_logger(jid)("[COMMAND] %s" % command)
                    background_thread = threading.Thread(target=self.run_shell_command, args=(command, jid, True,))
                    background_thread.start()
            except Exception as e:
                output[0] = traceback.format_exc()
        results = {
            "message": "ran the remote command",
            "ok": True,
            "jid": jid,
            "command": command,
            "output": output[0],
            "errors": output[1],
            "log_file_path": os.path.abspath(str(jid) + ".log"),
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
            log = self.get_job_logger(jid)
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
            value1, value2 = p.communicate()
            if log_to_file:
                log(str(value1))
                log("[RAN SCRIPT]")
                return value1, value2
            else:
                return value1, value2
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
            with open(str(command["command"]["jid"]) + '.log') as log_file:
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

        results["output"], results["errors"] = self.run_shell_command("sbatch %s" % results["filename"])

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def checkjob(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }
        try:
            results["output"], results["errors"] = self.run_shell_command("sacct -j %s --format=jobname,state" % results["jid"])
            myset = results["output"].split('\n')
            results["output"]="COMPLETED"
            for _ in myset:
                if "slycat-tmp" in _:
                    results["output"] = _.split()[1]
                    break
        except OSError as e:
            sys.stdout.write("%s\n" % json.dumps({"ok": False, "message": e}))
            sys.stdout.flush()

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

        f.write("#!/bin/bash\n\n")
        f.write("#SBATCH --account=%s\n" % wckey)
        f.write("#SBATCH --job-name=slycat-tmp\n")
        f.write("#SBATCH --partition=%s\n\n" % partition)
        f.write("#SBATCH --nodes=%s\n" % nnodes)
        f.write("#SBATCH --ntasks-per-node=%s\n" % ntasks_per_node)
        f.write("#SBATCH --time=%s:%s:%s\n" % (time_hours, time_minutes, time_seconds))
        f.write("module load %s\n" % module_name)
        f.write("profile=slurm_${SLURM_JOB_ID}_$(hostname)\n")
        f.write("echo \"Creating profile ${profile}\"\n")
        f.write("ipython profile create --parallel \n")
        f.write("echo \"Launching controller\"\n")
        f.write("ipcontroller --ip='*' &\n")
        f.write("sleep 1m\n")
        f.write("echo \"Launching engines\"\n")
        f.write("srun ipengine &\n")
        f.write("sleep 1m\n")
        f.write("echo \"Launching job\"\n")

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
        working_dir = command["command"]["working_dir"]
        # uid = command["command"]["uid"]
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
        results["output"], results["errors"] = self.run_shell_command("sbatch %s" % tmp_file.name)

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()


if __name__ == "__main__":
    slurm_cluster_agent = Agent()
    slurm_cluster_agent.run()

