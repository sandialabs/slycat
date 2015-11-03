import subprocess

def send_error(subject, body):
  import slycat.web.server

  if "slycat-web-server" in slycat.web.server.config and "error-email" in slycat.web.server.config["slycat-web-server"]:
    echo = subprocess.Popen(["echo", "\"%s\"" % body], stdout=subprocess.PIPE)
    mail = subprocess.Popen(["mail", "-s", "\"%s %s\"" % (slycat.web.server.config["slycat-web-server"]["error-email"]["subject"], subject), slycat.web.server.config["slycat-web-server"]["error-email"]["address"]], stdin=echo.stdout, stdout=subprocess.PIPE)

    echo.stdout.close()
    mail.communicate()