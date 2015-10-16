import subprocess
import slycat.web.server


def send_error(subject, body):
  echo = subprocess.Popen(["echo", "\"%s\"" % body], stdout=subprocess.PIPE)
  mail = subprocess.Popen(["mail", "-s", "\"%s %s\"" % (slycat.web.server.config["slycat-web-server"]["error-email"]["subject"], subject), slycat.web.server.config["slycat-web-server"]["error-email"]["address"]], stdin=echo.stdout, stdout=subprocess.PIPE)

  echo.stdout.close()
  mail.communicate()