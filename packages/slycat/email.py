# Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import subprocess

def send_error(subject, body):
  import slycat.web.server

  if "slycat-web-server" in slycat.web.server.config and "error-email" in slycat.web.server.config["slycat-web-server"]:
    echo = subprocess.Popen(["echo", "\"%s\"" % body], stdout=subprocess.PIPE)
    mail = subprocess.Popen(["mail", "-s", "\"%s %s\"" % (slycat.web.server.config["slycat-web-server"]["error-email"]["subject"], subject), slycat.web.server.config["slycat-web-server"]["error-email"]["address"]], stdin=echo.stdout, stdout=subprocess.PIPE)

    echo.stdout.close()
    mail.communicate()