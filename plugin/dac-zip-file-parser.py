# This script imports PTS zip files for DAC.  It is modified from
# the slycat-csv-parser.  This parser uploads a PTS CSV/META zip
# file then pushes the stored files to the previous CSV/META parsers.
#
# S. Martin
# 7/14/2017

import csv
import numpy
import slycat.web.server
import slycat.email
import time
import cherrypy

# zip file manipulation
import io
import zipfile
import os

def parse(database, model, input, files, aids, **kwargs):

    """
    uploads a PTS CSV/META zip file and passes the CSV/META files
    to the previous CSV/META parsers to be uploaded to the database
    :param database: slycat.web.server.database.couchdb.connect()
    :param model: database.get("model", self._mid)
    :param input: boolean
    :param files: files to be parsed
    :param aids: artifact ID
    :param kwargs:
    """

    # treat uploaded file as bitstream
    file_like_object = io.BytesIO(files[0])
    zip_ref = zipfile.ZipFile(file_like_object)
    zip_files = zip_ref.namelist()

    # loop through zip files and make a list of CSV/META files
    csv_files = []
    meta_files = []
    csv_meta_no_ext = []
    for zip_file in zip_files:

        # parse files in list
        head, tail = os.path.split(zip_file)

        # check for CSV or META file
        if head == "CSV":

            # check for .csv extension
            if tail != "":

                ext = tail.split(".")[-1]
                if ext == "csv":
                    csv_files.append(zip_file)
                    csv_meta_no_ext.append(tail.split(".")[0])
                else:
                    raise Exception("CSV files must have .csv extension.")

        elif head == "META":

            # check for .ini extension
            if tail != "":

                ext = tail.split(".")[-1]
                if ext == "ini":
                    meta_files.append(zip_file)
                else:
                    raise Exception("META files must have .ini extension.")

        else:

            # not CSV or META file
            raise Exception("Unexpected file (not CSV/META) found in .zip file.")

    # check that CSV and META files have a one-to-one correspondence
    cherrypy.log.error(str(csv_files))
    cherrypy.log.error(str(meta_files))
    cherrypy.log.error(str(csv_meta_no_ext))



    #cherrypy.log.error(str(csv_meta))

    #zip_ref.extractall("/var/lib/slycat/upload-store/")

    # close archive
    zip_ref.close()

    # write zip file to temporary storage
    #temp = tempfile.NamedTemporaryFile(suffix=".zip")
    #cherrypy.log.error(str(temp.name))
    #temp.write(files[0])
    #cherrypy.log.error("Hello")
    #cherrypy.log.error(str(len(files)))
#    cherrypy.log.error(str(files[0]))
    # unzip to /var/lib/slycat/upload-store
    #zip_ref = zipfile.ZipFile(temp.name, 'r')


    # cherrypy.log.error(files[0])
    # zip_file = files[0]
    # cherrypy.log.error(type(zip_file))
    # unzipped_files = gzip.GzipFile(temp.name)
    # files = unzipped_files.decompress()
    # unzipped_files = zipfile.ZipFile(temp.name, 'r')
    # cherrypy.log.error(unzipped_files.name)
    # tar = tarfile.open(temp.name)
    #import subprocess
    #folder_name = str(uuid.uuid4())
    #proc = subprocess.Popen(['cp', temp.name, '/var/lib/slycat/upload-store/'],
    #                        stdout=subprocess.PIPE)
    # proc = subprocess.Popen(['mkdir', '%s/%s'%(cherrypy.request.app.config["slycat-web-server"]["upload-store"], folder_name)],
    #                         stdout=subprocess.PIPE)
    #output = 'out:: %s'%proc.stdout.read()
    #cherrypy.log.error(output)
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
    context.register_parser("dac-zip-file-parser", "PTS CSV/META .zip file", ["dac-zip-file"], parse)

