# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import base64
import couchdb
import getpass
import json
import mimetypes
import optparse
import os

def add_attachments(full_path, relative_path, database, document):
  for child in os.listdir(full_path):
    if child in [".gitattributes", ".svn"]:
      continue
    child_path = os.path.join(full_path, child)
    if os.path.isdir(child_path):
      add_attachments(child_path, os.path.join(relative_path, child), database, document)
    else:
      content = open(child_path, "r")
      mime_type = mimetypes.guess_type(child_path)
      database.put_attachment(document, content.read(), filename = os.path.join(relative_path, child).replace("\\", "/"), content_type = mime_type[0])

def add_directory(path, object):
  for child in os.listdir(path):
    if child in ["_attachments",".couchapprc","couchapp.json","language",".svn"]:
      continue
    child_path = os.path.join(path, child)
    if os.path.isdir(child_path):
      object[child] = {}
      add_directory(child_path, object[child])
    else:
      try:
        if child in ["rewrites.json"]:
          object[os.path.splitext(child)[0]] = json.loads(open(child_path, "r").read())
        else:
          object[os.path.splitext(child)[0]] = unicode(open(child_path, "r").read().strip())
      except Exception as e:
        print child_path, e

def main():
  parser = optparse.OptionParser()
  parser.add_option("--askpass", default=False, action="store_true", help="Prompt for a password.")
  parser.add_option("--database", default="slycat", help="Specify the database name.  Default: %default")
  parser.add_option("--delete", default=False, action="store_true", help="Delete existing database.")
  parser.add_option("--host", default="http://localhost:5984", help="CouchDB server.  Default: %default")
  parser.add_option("--password", default=None, help="CouchDB password.  Default: %default.  Use --askpass to be prompted for your password instead.")
  parser.add_option("--username", default=None, help="CouchDB username.  Default: %default")
  (options, arguments) = parser.parse_args()

  if options.askpass:
    options.password = getpass.getpass()

  server = couchdb.Server(options.host)
  if options.username is not None and options.password is not None:
    server.resource.credentials = (options.username, options.password)

  databases = [options.database]
  directories = ["couchdb-design"]

  if options.delete and options.database in server:
    server.delete(options.database)

  for database_name in databases:
    if database_name not in server:
      print "Creating database %s" % database_name
      server.create(database_name)
    database = server[database_name]

    for directory in directories:
      design = {}
      add_directory(directory, design)

      if not design.has_key("_id"):
        raise Exception("Missing %s/_id" % directory)

      if design["_id"] in database:
        print "Deleting %s from %s" % (design["_id"], database_name)
        database.delete(database[design["_id"]])

      # This is a workaround for a bizarro problem in py-couchdb ...
      server = couchdb.Server(options.host)
      if options.username is not None and options.password is not None:
        server.resource.credentials = (options.username, options.password)
      database = server[database_name]

      print "Saving %s to %s" % (design["_id"], database_name)
      database.save(design)
      #add_attachments(os.path.join(directory, "_attachments"), "", database, design)

if __name__ == "__main__":
  main()
