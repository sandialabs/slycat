import IPython.parallel
import IPython.parallel.apps.launcher
import IPython.utils.path
import logging
import os
import sys
import tempfile
import time

logger = logging.Logger('ipcluster')
logger.setLevel(logging.DEBUG)
logger.addHandler(logging.StreamHandler(sys.stdout))

profile_dir=tempfile.mkdtemp()

print "Starting controller."
controller = IPython.parallel.apps.launcher.LocalControllerLauncher(config=None, log=logger, profile_dir=profile_dir)
controller.start()

print "Starting engines."
engines = [IPython.parallel.apps.launcher.LocalEngineLauncher(config=None, log=logger, profile_dir=profile_dir) for i in range(4)]
for engine in engines:
  engine.start()

print "Connecting client."
while True:
  try:
    client = IPython.parallel.Client(profile_dir=profile_dir)
    break
  except:
    pass

print "Waiting for engines to finish starting."
while len(client.ids) != 4:
  time.sleep(0.1)
print client.ids

print "Starting additional engines."
new_engines = [IPython.parallel.apps.launcher.LocalEngineLauncher(config=None, log=logger, profile_dir=profile_dir) for i in range(4)]
for engine in new_engines:
  engine.start()
engines = engines + new_engines

print "Waiting for new engines to finish starting."
while len(client.ids) != 8:
  time.sleep(0.1)
print client.ids

print "Stopping some engines."
engines[4].stop()
del engines[4]

print "Waiting for engines to finish stopping."
while len(client.ids) != 7:
  time.sleep(0.1)
print client.ids

for engine in engines:
  engine.stop()

controller.stop()
