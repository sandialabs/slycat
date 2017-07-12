# This script imports PTS log files for DAC.  It is modified from
# the slycat-csv-parser.  This parser parses the .csv files from
# the CSV directory
#
# S. Martin
# 4/4/2017

import csv
import numpy
import slycat.web.server
import slycat.email
import time
import cherrypy
import uuid
import tarfile

def parse(database, model, input, files, aids, **kwargs):

    """
    parses a file as a csv and then uploads the parsed data to associated storage for a
    model
    :param database: slycat.web.server.database.couchdb.connect()
    :param model: database.get("model", self._mid)
    :param input: boolean
    :param files: files to be parsed
    :param aids: artifact ID
    :param kwargs:
    """
    import tempfile
    # dac-csv-files-parser.parse(database, model, input, files, aids, kwargs)
    # if len(files) >1 or len(files) <= 0:
    #     return
    cherrypy.log.error(str(len(files)))
    # cherrypy.log.error(files[0])
    temp = tempfile.NamedTemporaryFile(suffix="")
    temp.write(files[0])
    # cherrypy.log.error(files[0])
    # zip_file = files[0]
    # cherrypy.log.error(type(zip_file))
    # unzipped_files = gzip.GzipFile(temp.name)
    # files = unzipped_files.decompress()
    # unzipped_files = zipfile.ZipFile(temp.name, 'r')
    # cherrypy.log.error(unzipped_files.name)
    # tar = tarfile.open(temp.name)
    import subprocess
    folder_name = str(uuid.uuid4())
    proc = subprocess.Popen(['cp', temp.name, '/extracted'],
                            stdout=subprocess.PIPE)
    # proc = subprocess.Popen(['mkdir', '%s/%s'%(cherrypy.request.app.config["slycat-web-server"]["upload-store"], folder_name)],
    #                         stdout=subprocess.PIPE)
    output = 'out:: %s'%proc.stdout.read()
    cherrypy.log.error(output)
    # # this is where you would change it to be unzipped
    # proc = subprocess.Popen(['tar', '--verbose', '-xzf', temp.name, '--directory=%s/%s'%(cherrypy.request.app.config["slycat-web-server"]["upload-store"], folder_name)], stdout=subprocess.PIPE)
    # output = proc.stdout.read()
    # cherrypy.log.error("out :" + output)
    # proc = subprocess.Popen(['ls', '%s/%s'%(cherrypy.request.app.config["slycat-web-server"]["upload-store"], folder_name)], stdout=subprocess.PIPE)
    # output = proc.stdout.read()
    # cherrypy.log.error(output)
    # proc = subprocess.Popen(['ls', '%s/%s'%(cherrypy.request.app.config["slycat-web-server"]["upload-store"],folder_name+output)], stdout=subprocess.PIPE)
    # output = proc.stdout.read()
    # cherrypy.log.error("out::"+output)
    #
    # # uncomment below to stop folder from getting removed from the file system
    # # location /var/lib/slycat/upload-store
    # proc = subprocess.Popen(['rm', '-rf', '%s/%s'%(cherrypy.request.app.config["slycat-web-server"]["upload-store"], folder_name)], stdout=subprocess.PIPE)
    # output = proc.stdout.read()
    # cherrypy.log.error("out::"+output)


def register_slycat_plugin(context):
    context.register_parser("dac-zip-files-parser", "PTS zip files", ["dac-zip-files"], parse)

