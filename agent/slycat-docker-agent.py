#!/bin/env python

# Copyright 2013, National Technology & Engineering Solutions of Sandia, LLC (NTESS).
# Under the terms of Contract DE-NA0003525 with NTESS,
# the U.S. Government retains certain rights in this software.
# Export of this program may require a
# license from the United States Government.

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
import threading


class Agent(agent.Agent):
    """

    """

    def __init__(self):
        """
        add the list of scripts we want to be able to call
        """
        agent.Agent.__init__(self)
        self.scripts.append({
            "name": "test",
            "exec_path": "/home/slycat/install/conda/bin/python",
            "path": "/home/slycat/src/slycat/agent/test_run_remote_command.py",
            "description": "this is a test script for building testing and launching scripts",
            "parameters": [
                {
                    "name": "--number",
                    "description": "the number you want printed by the test script",
                    "example": "python test_run_remote_command.py --number 2",
                    "type": "integer",
                    "required": False,
                    "default": 1
                }
            ]
        })
        self.scripts.append({
            "name": "compute_timeseries",
            "exec_path": "/home/slycat/install/conda/bin/python",
            "path": "/home/slycat/src/slycat/agent/slycat-agent-compute-timeseries.py",
            "description": "Compute a timeseries model data from hdf5 data, saving to files for the Slycat Web Server to ingest. "
                           "This script loads data from a directory containing: One inputs.hdf5 file containing a single table. "
                           "One timeseries-N.hdf5 file for each row in the input table.",
            "parameters": [
                {
                    "name": "--directory",
                    "description": "Directory containing hdf5 timeseries data (one inputs.hdf5 and multiple sub-directories with multiple timeseries-N.hdf5 files).",
                    "example": "python slycat-agent-compute-timeseries.py --directory /path/to/hdf5_dir",
                    "type": "string",
                    "required": True,
                    "default": None
                },
                {
                    "name": "--timeseries-name",
                    "description": "Name of the timeseries, i.e. sub-directory name in the input directory."
                                   " If blank uses directory",
                    "example": "python slycat-agent-compute-timeseries.py --timeseries-name example",
                    "type": "string",
                    "required": False,
                    "default": None
                },
                {
                    "name": "--cluster-sample-count",
                    "description": "Sample count used for the uniform-pla and uniform-paa re-sampling algorithms.",
                    "example": "python slycat-agent-compute-timeseries.py --cluster-sample-count 500",
                    "type": "int",
                    "required": False,
                    "default": 1000
                },
                {
                    "name": "--cluster-sample-type",
                    "description": "the number you want printed by the test script",
                    "example": "python slycat-agent-compute-timeseries.py --cluster-sample-type uniform-paa",
                    "type": "string",
                    "required": False,
                    "default": "uniform-paa"
                },
                {
                    "name": "--cluster-type",
                    "description": "Hierarchical clustering method. choices = single, complete, average, weighted",
                    "example": "python slycat-agent-compute-timeseries.py --cluster-type average",
                    "type": "string",
                    "required": False,
                    "default": "average"
                },
                {
                    "name": "--cluster-metric",
                    "description": "Hierarchical clustering distance metric.",
                    "example": "python slycat-agent-compute-timeseries.py --cluster-metric euclidean",
                    "type": "string",
                    "required": False,
                    "default": "euclidean"
                },
                {
                    "name": "--workdir",
                    "description": "Working directory to store data to be processed during model creation",
                    "example": "python slycat-agent-compute-timeseries.py --workdir /path/to/workdir",
                    "type": "string",
                    "required": True,
                    "default": None
                },
                {
                    "name": "--hash",
                    "description": "Unique identifier for the output folder.",
                    "example": "python slycat-agent-compute-timeseries.py --hash 123kndn23n23",
                    "type": "string",
                    "required": True,
                    "default": None
                },
                {
                    "name": "--profile",
                    "description": "the number you want printed by the test script",
                    "example": "python slycat-agent-compute-timeseries.py --profile ${profile}",
                    "type": "string",
                    "required": False,
                    "default": None
                }
            ]
        })
        self.scripts.append({
            "name": "timeseries_to_hdf5",
            "exec_path": "/home/slycat/install/conda/bin/python",
            "path": "/home/slycat/src/slycat/agent/slycat-timeseries-to-hdf5.py",
            "description": "Stage data to hdf5 format for Slycat computation.",
            "parameters": [
                {
                    "name": "--output-directory",
                    "description": "Output directory containing hdf5 files.",
                    "example": "python slycat-timeseries-to-hdf5.py --output-directory /path/to/out_data-dir",
                    "type": "string",
                    "required": True,
                    "default": None
                },
                {
                    "name": "--id-column",
                    "description": "Inputs file id column name. needs to be the first column in the csv",
                    "example": "python slycat-timeseries-to-hdf5.py --id-column name",
                    "type": "string",
                    "required": False,
                    "default": None
                },
                {
                    "name": "--inputs-file",
                    "description": "The name of the delimited text file containing input data.",
                    "example": "python slycat-timeseries-to-hdf5.py --inputs-file /path/to/input/file",
                    "type": "string",
                    "required": True,
                    "default": None
                },
                {
                    "name": "--inputs-file-delimiter",
                    "description": "Field delimiter.  By default, fields will be delimited with any whitespace except a newline.",
                    "example": "python slycat-timeseries-to-hdf5.py --inputs-file-delimiter ,",
                    "type": "string",
                    "required": True,
                    "default": None
                },
                {
                    "name": "--parallel-jobs",
                    "description": "Number of parallel jobs to run.",
                    "example": "python slycat-timeseries-to-hdf5.py --parallel-jobs 4",
                    "type": "int",
                    "required": False,
                    "default": "number of cores on the machine"
                },
                {
                    "name": "--force",
                    "description": "Overwrite existing data.",
                    "example": "python slycat-timeseries-to-hdf5.py --force",
                    "type": "bool",
                    "required": False,
                    "default": None
                }
            ]
        })

    def get_script_run_string(self, command_script):
        run_command = ''
        for agent_script in self.scripts:
            # we just found a match lets add it to the command that we are going to run
            if command_script["name"] == agent_script["name"]:
                run_command += str(agent_script["exec_path"])
                run_command += " "
                run_command += str(agent_script["path"])
                for parameter in command_script["parameters"]:
                    run_command += " "
                    run_command += str(parameter["name"])
                    run_command += " "
                    run_command += str(parameter["value"])
                return run_command

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
        output = self.run_shell_command(run_command)
        results = {
            "message": "ran the remote command",
            "ok": True,
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

    def run_shell_command(self, command):
        command = command.split(' ')
        for _ in command:
            if _ == "":
                command.remove("")
        print command
        p = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        return p.communicate()

    def launch(self, command):
        output = self.run_shell_command(command["command"])
        results = {
            "ok": True,
            "command": command["command"],
            "output": output[0],
            "errors": output[1]
        }
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def submit_batch(self, command):
        output = self.run_shell_command(command["command"])
        results = {
            "ok": True,
            "filename": command["command"],
            "output": output[0],
            "errors": output[1]
        }
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def checkjob(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }
        try:
            # /job_log.txt
            results["output"], results["errors"] = ("COMPLETED", "COMPLETED")
        except OSError as e:
            sys.stdout.write("%s\n" % json.dumps({"ok": False, "message": e}))
            sys.stdout.flush()
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def cancel_job(self, command):
        output = self.run_shell_command("scancel %s" % command["command"])  # command is jid here
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
        f.write("export SLYCAT_HOME=\/home\/slycat\/src\/slycat\n")
        f.write("#SBATCH --account=%s\n" % wckey)
        f.write("#SBATCH --job-name=slycat-tmp\n")
        f.write("#SBATCH --partition=%s\n\n" % partition)
        f.write("#SBATCH --nodes=%s\n" % nnodes)
        f.write("#SBATCH --ntasks-per-node=%s\n" % ntasks_per_node)
        f.write("#SBATCH --time=%s:%s:%s\n" % (time_hours, time_minutes, time_seconds))
        f.write("echo \"RUNNING\" > job_log.txt\n")
        # f.write("ipython profile create\n")
        # f.write("echo \"Creating profile ${profile}\"\n")
        # f.write("ipcontroller --ip='*' &\n")
        # f.write("ipcluster start -n 4&\n")
        f.write("echo \"Launching controller\"\n")
        f.write("echo \"RUNNING\" > job_log.txt\n")
        f.write("sleep 1m\n")
        f.write("echo \"Launching job\"\n")
        for c in fn:
            f.write("%s >> outfile.txt\n" % c)
        f.write("echo \"COMPLETE\" > job_log.txt\n")
        # f.write("pkill -f ipcontroller \n")
        # f.write("pkill -f ipcluster \n")
        # f.write("pkill -f python \n")
        f.close()

    def remote_command(self, command):
        """
        command to be run on the remote machine
        :param command: json command
        :return: 
        """
        pass

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
        results["temp_file"] = data
        self.run_shell_command("chmod 755 %s" % tmp_file.name)
        # print "starting"
        # print tmp_file.name
        try:
            # print (".%s &> /dev/null" % tmp_file.name)
            # p = Process(target=self.run_shell_command, args=(("sh %s >> outfile.txt" % tmp_file.name),))
            # p.start()
            t = threading.Thread(target=self.run_shell_command, args=("sh %s &>/dev/null &; disown" % tmp_file.name,))
            t.start()
            results["working_dir"] = working_dir
            results["errors"] = None
            results["output"] = "1234567 aids"
        except Exception:
            raise
        # print "running"

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()


if __name__ == "__main__":
    slurm_cluster_agent = Agent()
    slurm_cluster_agent.run()
