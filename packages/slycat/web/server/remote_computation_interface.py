from abc import ABCMeta, abstractmethod

class RemoteComputationInterface(metaclass=ABCMeta):
  """
  The Remote Interface aims at setting a standard between Slycat and any remote
  systems, supporting remote job launching and monitoring.
  """

  @abstractmethod
  def connect(host, username=None, password=None, token=None):
    """
    Establish a connection to the remote system using either a username/password
    combination or an authenticating token. The function returns a session ID that
    Slycat can use to interact with the remote system.

    :param host: host, i.e. hostname or IP address
    :param username:
    :param password:
    :param token:
    :return: session ID
    """
    pass

  @abstractmethod
  def disconnect(sid):
    """
    Disconnect and destroy the connection between Slycat and the remote system
    for the input session ID. The function return True if the disconnect was
    successful, False otherwise.

    :param sid: session ID
    :return: boolean
    """
    pass

  @abstractmethod
  def run_command(sid, command):
    """
    Run a command to the remote system for the input session ID. The function
    returns the output, i.e. stdout, of the command if it was succesafull, the
    error ouput otherwize, i.e. stderr.

    :param sid: session ID
    :param command: command (in array or string format)
    :return: string
    """
    pass

  @abstractmethod
  def generate_job_file(sid, params):
    """
    Generate a job fie, i.e. a batch file for a SLURM system. The function expects
    the input parameters to have the following format:

        params = {
            job_file_path:            file path for the job file
            account_id:               an account ID to identify the user/entity
                                      submitting the job,
            job_name:                 a job name
            partition:                partition name
            number_of_nodes:          number of nodes necessary for the job
            number_of_tasks_per_node: number of tasks (CPUs) needed per core for
                                      the job
            time_hours:               time (in hours) needed for the job
            time_minutes:             time (in minutes) needed for the job
            time_seconds:             time (in seconds) needed for the job
            commands:                 an array of commands to run during the job.
                                      each item in the array correspond to a new
                                      line in the file.
        }

    :param sid: session ID
    :param params: parameters for the file generation
    """
    pass

  @abstractmethod
  def submit_job(sid, job_file_path):
    """
    Submit a job to the remote system and return the job unique identifier. The
    function uses the path of the job file, i.e. batch file for SLURM, and
    executes it.

    :param sid: session ID
    :param job_file_path: path to the job file
    :return: job ID
    """
    pass

  @abstractmethod
  def check_job(sid, jid):
    """
    Check on the status of the job with the input job ID.

    :param sid: session ID
    :param jid: job ID
    :return: job status
    """
    pass

  @abstractmethod
  def cancel_job(sid, jid):
    """
    Cancel a running job with the input job ID. The function returns True if the
    job was cancelled successfully, False otherwise.

    :param sid: session ID
    :param jid: job ID
    :return: boolean
    """
    pass

  @abstractmethod
  def pause_job(sid, jid):
    """
    Pause a running job with the input job ID. The function returns True if the
    job was paused successfully, False otherwise.

    :param sid: session ID
    :param jid: job ID
    :return: boolean
    """
    pass

  @abstractmethod
  def resume_job(sid, jid):
    """
    Resume a paused job with the input job ID. The function returns True if the
    job was resumed succesfully, False otherwise.

    :param sid: session ID
    :param jid: job ID
    :return: boolean
    """
    pass

  @abstractmethod
  def get_job_output(sid, jid):
    """
    Fetch and return the content of the job output file for the input session ID
    and job ID.

    :param sid: session ID
    :param jid: job ID
    :return: string
    """
    pass
