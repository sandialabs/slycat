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
```

### run_shell_command
