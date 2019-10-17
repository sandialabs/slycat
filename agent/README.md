# Slycat Agent
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
