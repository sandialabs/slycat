import subprocess

for image in ["supervisord", "sshd", "slycat", "slycat-dev"]:
  subprocess.check_call(["docker", "build", "-t", "sandialabs/%s" % image, image])
