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
import stat
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
            output[0], output[1] = self.run_shell_command("qsub %s" % tmp_file.name, jid, log_to_file=True)
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
                log("[FINISHED]")
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
        queryStdout = ""
        queryStderr = ""
        
        queryStdout, queryStderr = self.run_shell_command("qstat -x %s" % results["jid"] ) 
    
        # parse the returned stdout & stderr
        results["output"] = self.parseQuery(queryStdout, queryStderr)
        results["errors"] = queryStderr
        
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def parseQuery(self, sOut, sErr):
        # from slycat-timeseries-model.py, here are the recognized job state categories:
        # ["RUNNING", "PENDING"]
        # ["CANCELLED", "REMOVED", "VACATED", "REMOVED"]
        # COMPLETED
        # ["FAILED", "UNKNOWN", "NOTQUEUED"]
        #
        # this fn will return:
        # running    if pbs returns:  E, H, Q, R, B, X, S, W
        # completed  if pbs returns:  F
        # cancelled  if pbs returns:  M, T, U, 
        # unknown    if pbs returns:  a stderr msg
        #
        # example query output
        #61 excal06> qstat -x 153256
        #Job id            Name             User              Time Use S Queue
        #----------------  ---------------- ----------------  -------- - -----
        #153256.excal      slycat           aSlyUser          00:00:07 F debug
        
        if sErr != "":
            return "UNKNOWN"
        if sOut == "":
            return "UNKNOWN"
        
        # pull out the state code from the stdout string
        try:
            stLine = sOut.split('\n')[2]  # get the 3rd line
            stCode = stLine.split()[4]    # get the 5th field
        except Exception as e:
            # TODO, need logging here
            #print "++ PBS agent parseQuery exception: %s" % e
            return "UNKNOWN"
        
        if stCode in ["R", "Q", "E", "H", "B", "X", "S", "W"]:
            return "RUNNING"
        if stCode in ["F"]:
            return "COMPLETED"
        if stCode in ["M", "T", "U"]:
            return "CANCELLED"
        
        return "UNKNOWN"

    def cancel_job(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }
        results["output"], results["errors"] = self.run_shell_command("qdel %s" % results["jid"])
        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def get_job_output(self, command):
        results = {
            "ok": True,
            "jid": command["command"]["jid"]
        }
        # caution, jid has the form       :  123456.excal-wlm1 
        # the job output file has the form:  slycat.o123456
        # must rmv the trailing text from the jid to find the file 
        path = command["command"]["path"]
        numericJID = results["jid"].split('.')[0]
        f = path + "slycat.o%s" % numericJID
        #f = path + "slycat.o%s" % results["jid"]
        if os.path.isfile(f):
            results["output"], results["errors"] = self.run_shell_command("cat %s" % f)
        else:
            results["output"] = "see errors"
            results["errors"] = "the file %s does not exist." % f

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

    def generateRootScript(self, tmp_file, scriptName, eScript, fn):
        f = open(os.path.dirname(tmp_file.name) + os.sep + scriptName, mode='w')
        f.write("#!/bin/bash -l \n")
        f.write("# This script requires that the slycat working dir be passed in as only arg \n")
        f.write("# modules not avail on compute nodes, load Slycat env \n")
        f.write(". /p/app/unsupported/slycat/modules/slycatEnv \n")
        f.write("slyDir=$1 \n")
        f.write("slyNodeFile=\"slycatNodes.txt\" \n")
        f.write("profile=\"default\" \n")
        f.write("cd $slyDir \n")
        f.write("hn=`hostname` \n")
        f.write("# create list of nodes in this job, this script executes on \n")
        f.write("# the root node - the first node in the list \n")
        f.write("nodeList=`cat $slyNodeFile | uniq ` \n")
        f.write("# create an ipython dir for the user, it's a noop if it already exists \n")
        f.write("echo \"++ root node (which is: $hn) calling create ipython profile\" \n")
        f.write("ipython profile create --parallel \n")
        f.write("sleep 1 \n")
        f.write("# start the controller on this node \n")
        f.write("echo \"++ root node starting the controller at `date`\" \n")
        f.write("ipcontroller --ip='*' & \n")
        f.write("sleep 70 \n")
        f.write("# ssh to other nodes in job to start the engines \n")
        f.write("for n in $nodeList \n")
        f.write("do \n")
        f.write("  if [ $n != $hn ] \n")
        f.write("  then \n")
        f.write("    echo \"++ on $hn, ssh'ing to $n to start engines\" \n")
        f.write("    ssh $n \"$slyDir/%s $slyDir \" & \n" % eScript)
        f.write("  fi \n")
        f.write("done \n")
        f.write("sleep 90 \n")
        f.write("echo \"++ root node calling hdf5 conversion and compute timeseries at `date`\" \n")
        for c in fn:
            f.write("%s \n" % c)
        f.close()
        os.chmod(os.path.dirname(tmp_file.name) + os.sep + scriptName, stat.S_IRUSR|stat.S_IWUSR|stat.S_IXUSR|stat.S_IRGRP|stat.S_IWGRP)
        
    def generateEnginesScript(self, tmp_file, scriptName):
        f = open(os.path.dirname(tmp_file.name) + os.sep + scriptName, mode='w')
        f.write("#!/bin/bash -l \n")
        f.write("# This script requires that the slycat working dir be passed in as only arg \n")
        f.write("hn=`hostname` \n")
        f.write("# modules not avail on compute nodes, load Slycat env \n")
        f.write(". /p/app/unsupported/slycat/modules/slycatEnv \n")
        f.write("sleep 1 \n")
        f.write("slyDir=$1 \n")
        f.write("slyNodeFile=\"slycatNodes.txt\" \n")
        f.write("cd $slyDir \n")
        f.write("echo \"++ engines running on $hn in `pwd` at `date`\" \n")
        f.write("nodeList=`cat $slyNodeFile ` \n")
        f.write("for n in $nodeList \n")
        f.write("do \n")
        f.write("  if [ $n == $hn ] \n")
        f.write("  then \n")
        f.write("    echo \"++ launching engine on $hn at `date`\" \n")
        f.write("    ipengine & \n")
        f.write("    sleep 1 \n")
        f.write("  fi \n")
        f.write("done \n")
        f.write("echo \"++ done launching engines at `date`\" \n")
        f.close()
        os.chmod(os.path.dirname(tmp_file.name) + os.sep + scriptName, stat.S_IRUSR|stat.S_IWUSR|stat.S_IXUSR|stat.S_IRGRP|stat.S_IWGRP)

    def generate_batch(self, module_name, wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes,
                       time_seconds, fn, tmp_file):
        
        rootScriptName = "rootCommands.bash"
        engineScriptName = "engineCommands.bash"
        
        self.generateRootScript(tmp_file, rootScriptName, engineScriptName, fn)
        self.generateEnginesScript(tmp_file, engineScriptName)
        
        workDir = os.path.dirname(tmp_file.name)
        f = tmp_file
        
        f.write("#!/bin/bash -l \n")
        f.write("#PBS -A %s \n" % wckey)
        f.write("#PBS -q %s \n" % partition)
        f.write("#PBS -l select=%s:ncpus=32:mpiprocs=%s \n" % (nnodes, ntasks_per_node))
        f.write("#PBS -l walltime=%s:%s:%s \n" % (time_hours, time_minutes, time_seconds))
        f.write("#PBS -N slycat \n")
        f.write("#PBS -j oe \n")
        f.write("#PBS -V \n")
        f.write("#PBS -l ccm=1 \n")
        f.write("echo \"++ submit, starting at `date` on `hostname`\" \n")
        f.write("module load ccm \n")
        f.write("module load slycat \n")
        f.write("slyNodeFile=\"slycatNodes.txt\" \n")
        f.write("slyDir=%s \n" % workDir)
        f.write("cd $slyDir \n")
        f.write("# put node names in file cuz compute node doesn't have this env var \n")
        f.write("cat $PBS_NODEFILE > $slyNodeFile \n")
        f.write("echo \"++ submit calling ccmrun at `date` \" \n")
        f.write("ccmrun ./%s $slyDir \n" % rootScriptName)
        f.write("wait \n")
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
        # temporary: verify nnodes >= 2, move this check to wizard
        if nnodes == 1:
            nnodes = 2
        
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
