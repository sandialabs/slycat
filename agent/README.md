# Slycat Agent
- The slycat server runs the agent by opening up an ssh session to where the agent code is going to run. 
- It will then execute and agent command to start the remote agent and wait for the appropiate response from the agent before it start sending commands for the agent to execute.

# Creating a custom Agent
- When creating an agent for your specific evironment the first place to start should be looking at how the agent was implemented for other systems. 
- When creating you own agent you will need to implement https://github.com/sandialabs/slycat/blob/master/agent/agent.py
- Review https://github.com/sandialabs/slycat/blob/master/agent/slycat-slurm-agent.py or https://github.com/sandialabs/slycat/blob/master/agent/slycat-pbs-agent.py to get a good idea of how the agent interface needs to implemented.

- The following functions will need to be implemented
```python
    @abc.abstractmethod
    def run_remote_command(self, command):
        """
        run a predefine script on hpc. could potentially be
        an hpc batch job such as slurm or pbs.
        :param command: json command
        :return:
        """
        pass

    @abc.abstractmethod
    def run_shell_command(self, command, jid=0, log_to_file=False):
        """
        command to be run on the remote machine
        :param log_to_file: bool for logging
        :param jid: job id
        :param command: json command
        :return: 
        """
        pass

    @abc.abstractmethod
    def launch(self, command):
        """
        launch a job on the remote machine
        :param command: json command
        :return: 
        """
        pass

    @abc.abstractmethod
    def submit_batch(self, command):
        """
        submit a batch job on the remote machine
        :param command: json command
        :return: 
        """
        pass

    @abc.abstractmethod
    def checkjob(self, command):
        """
        check a job's status on a remote machine
        :param command: json command
        :return: 
        """
        pass

    @abc.abstractmethod
    def check_agent_job(self, command):
        """
        check an agents job status on a remote machine
        :param command: json command
        :return: 
        """
        pass

    @abc.abstractmethod
    def cancel_job(self, command):
        """
        cancels a remote job
        :param command: json command
        :return: 
        """
        pass

    @abc.abstractmethod
    def get_job_output(self, command):
        """
        get a detailed version of the jobs output
        :param command: json command
        :return: 
        """
        pass

    @abc.abstractmethod
    def generate_batch(self, module_name, wckey, nnodes, partition, ntasks_per_node, time_hours, time_minutes,
                       time_seconds,
                       fn,
                       tmp_file):
        """
        generate a remote batch file that can be used
        by the remote system's mpi queue
        :param module_name: 
        :param wckey: 
        :param nnodes: 
        :param partition: 
        :param ntasks_per_node: 
        :param time_hours: 
        :param time_minutes: 
        :param time_seconds: 
        :param fn: 
        :param tmp_file: 
        :return: 
        """
        pass

    @abc.abstractmethod
    def run_function(self, command):
        """
        function used to run a job
        :param command: json command
        :return: 
        """
        pass

    @abc.abstractmethod
    def check_hpc_params(self, command):
        """
        takes a command json and creates a string that can be
        run hpc jobs
        :param command: json command
        :return: 
        """
        pass
```

- Here is an example of each function implemented for a slurm based hoc system.

### run_remote_command
- the point of this function is to generate a string to be sent to the shell to start a python script.
    - `commmand` is the command recieved from the server
    - `jid` is the job uuid for any command run
    - `command script` is the list of registered commands that can be run on the remote system
    - `result` is the json payload shipped back to the slycat server
    - `output` goes to the log
    - both hpc and non hpc jobs can be started so you don't always have to start say a slurm job you can always run a script locally
    - if the job is an hpc job it will try to lauch the script into the (in this case)`slurm` running environment.
    
```python
        command = command["command"]
        run_commands = []
        # get the command scripts that were sent to the agent
        jid = random.randint(10000000, 99999999)
        for command_script in command["scripts"]:
            # compare the payload commands to the registered commands on the agent
            if command_script != "":
                run_commands.append(self.get_script_run_string(command_script))
                # run_commands.append(self.get_script_run_string(command_script) + " --log_file " + str(jid) + ".log")
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
```

### run_shell_command
- this method is used to actually run the shell command on the remote system.
- command is the is and array of string that when concatonated and space seperated comprise the shell command to run
  - for example it could be as simple as ['echo', 'hello'] which when sent to the shell will be concatinate and ran as `echo hello`

```python
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

```

### launch
- `command` is the command that is to be run with shell command

```python
    def launch(self, command):
        results = {
            "ok": True,
            "command": command["command"]
        }

        results["output"], results["errors"] = self.run_shell_command(command["command"])

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()

```

### submit_batch
- the `command` in this case is actually a file that is to be submitted to sbatch for the slurm environment

```python
    def submit_batch(self, command):
        results = {
            "ok": True,
            "filename": command["command"],
            "output": -1
        }

        results["output"], results["errors"] = self.run_shell_command("sbatch %s" % results["filename"])

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()
```

### checkjob
- this function is used to check on the jobs status
- the `command` in this case is the jid used to check the job status
- in the example below the `sacct` is the command to check the job status for a slurm environment

```python
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

```

### cancel_job
- This is the function used to cancel jobs on the hpc
- Generally it would be a shell command that is run with the given job id that would kill the job

```python
    def cancel_job(self, command):
        results = {
            "ok": True,
            "jid": command["command"]
        }

        results["output"], results["errors"] = self.run_shell_command(
            "scancel %s" % results["jid"])

        sys.stdout.write("%s\n" % json.dumps(results))
        sys.stdout.flush()
```
### get_job_output
- This function is used to get job output and send it back to the web client
- The output should be put in `results["output"]`
```python 
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
```

### generate_batch
- Used to create the hpc scripts sent to the hpc engine eg. slurm
- In the below example for slurm we are generating a slurm script that will launch our job
```python
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
```

### run_function
- calls the generate batch functino and then sends the launch script to the hpc runner

```python
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
```
