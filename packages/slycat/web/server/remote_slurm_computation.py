# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import RemoteComputationInterface
import subprocess
import os
import ConfigParser
import threading
import time

class RemoteSlurmComputation(RemoteComputationInterface):

  def connect(host, username=None, password=None, token=None):
    pass

  def get_session(sid):
    pass

  def disconnect(sid):
    pass

  def run_command(command):
    results = {}
    command = command.split(' ')
    p = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    results["output"], results["errors"] = p.communicate
    return results

  def generate_job_file(params):
    with open(params["job_file_path"]) as job_file:
      job_file.write("#!/bin/bash\n\n")
      job_file.write("#SBATCH --account=%s\n" % params["account_id"])
      job_file.write("#SBATCH --job-name=%s\n" % params["job_name"])
      job_file.write("#SBATCH --partition=%s\n\n" % params["partition"])
      job_file.write("#SBATCH --nodes=%s\n" % params["number_of_nodes"])
      job_file.write("#SBATCH --ntasks-per-node=%s\n" % params["number_of_tasks_per_node"])
      job_file.write("#SBATCH --time=%s:%s:%s\n" % (params["time_hours"], params["time_minutes"], params["time_seconds"]))

      for c in params["commands"]:
        job_file.write("%s\n" % c)

  def submit_job(job_file_path):
    results = run_command("sbatch %s" % job_file_path)
    jid = [int(s) for s in results["output"].split() if s.isdigit()][0]
    return jid

  def check_job(jid):
    results = run_command("checkjob %s" % jid)
    status = "UNKNOWN"

    for line in results["output"]:
      if "State" in line:
        try:
          status = line.split(':')[1].strip().upper()
        except Exception as e:
          status = "UNKNOWN"
        break

    return status

  def check_job_thread(interval, jid, success, fail, logger, stop_event):
    retry_count = 5

    while True:
      try:
        status = check_job(jid)
      except Exception as e:
        logger("Something went wrong while checking on job %s status, trying again..." % jid)
        retry_counter = retry_counter - 1

        if retry_counter == 0:
          fail("Something went wrong while checking on job %s status: check for the generated files when the job completes" % jid)
          stop_event.set()
          break

        status = "ERROR"
        time.sleep(60)
        pass

      logger("Job %s returned with status %s" % (jid, status))

      if status == "RUNNING":
        retry_counter = 5

      if status == "CANCELLED" or status == "REMOVED":
        fail("Job %s was cancelled" % jid)
        stop_event.set()
        break

      if status == "VACATED":
        fail("Job %s was vacated due to system failure" % jid)
        stop_event.set()
        break

      if status == "REMOVED":
        fail("Job %s was removed by the scheduler due to exceeding walltime or violating another policy" % jid)
        stop_event.set()
        break

      if status == "COMPLETED":
        success()
        stop_event.set()
        break

      if status == "FAILED" or status == "UNKNOWN" or status == "NOTQUEUED":
        retry_counter = retry_counter - 1
        if retry_counter == 0:
          fail("Job %s has failed" % jid)
          stop_event.set()
          break

        # in case something went wrong and still willing to try, wait for 30
        # seconds and try another check
        time.sleep(30)

      # interval between each of the checks
      time.sleep(interval)

  def check_job_loop(interval, jid, success, fail, logger):
    stop_event = threading.Event()
    t = threading.Thread(target=check_job_thread, args=(interval, jid, success, fail, logger, stop_event))
    t.start()

  def cancel_job(jid):
    results = run_command("scancel %s" % jid)
    # TODO check results["errors"] for actual errors, if any return False
    # instead
    return True

  def pause_job(jid):
    results = run_command("scontrol suspend %s" % jid)
    # TODO check results["errors"] for actual errors, if any return False
    # instead
    return True

  def resume_job(jid):
    results = run_command("scontrol resume %s" % jid)
    # TODO check results["errors"] for actual errors, if any return False
    # instead
    return True

  def get_job_output(path, jid):
    f = path + "slurm-%s.out" % jid
    if os.path.isFile(f):
      results = run_command("cat %s" % f)
    else:
      return "The file %s does not exist." % f

    return results["output"]

  def set_slycatrc(config):
    rc = os.path.expanduser('~') + ("/.slycatrc")
    rc_file = open(rc, "w+")
    parser = ConfigParser.RawConfigParser()

    for section_key in config:
      if not parser.has_section(section_key):
        parser.add_section(section_key)
      section = config[section_key]
      for option_key in section:
        if not str(section[option_key]) == "":
          parser.set(section_key, option_key, "\"%s\"" % section[option_key])

    parser.write(rc_file)
    rc_file.close()
    # TODO if anything goes wrong return false instead
    return True

  def get_slycatrc():
    results = {}

    rc = os.path.expanduser('~') + ("/.slycatrc")
    if os.path.isfile(rc):
      try:
        parser = ConfigParser.RawConfigParser()
        parser.read(rc)
        config = { section: { key: eval(value) for key, value in parser.items(section) } for section in parser.sections() }
        results["ok"] = True
        results["config"] = config
      except Exception as e:
        results["ok"] = False
        results["errors"] = "%s" % e
    else:
      results["ok"] = False
      results["errors"] = "The user does not have a .slycatrc file under their home directory"

    return results
