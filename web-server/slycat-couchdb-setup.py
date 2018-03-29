# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import argparse
import couchdb
import logging
import sys
import time

parser = argparse.ArgumentParser()
parser.add_argument("--database", default="slycat", help="Specify the database name.  Default: %(default)s")
parser.add_argument("--error-log", default="-", help="Error log filename, or '-' for stderr.  Default: %(default)s")
parser.add_argument("--error-log-count", type=int, default=100, help="Maximum number of error log files.  Default: %(default)s")
parser.add_argument("--error-log-size", type=int, default=10000000, help="Maximum size of error log files.  Default: %(default)s")
parser.add_argument("--host", default="localhost", help="CouchDB server.  Default: %(default)s")
parser.add_argument("--port", default="5984", help="CouchDB port.  Default: %(default)s")
parser.add_argument("--admin", default="", help="CouchDB admin user.  Default: %(default)s")
parser.add_argument("--password", default="", help="CouchDB admin password.  Default: %(default)s")
arguments = parser.parse_args()

error_log = logging.getLogger("error")
error_log.propagate = False
error_log.setLevel(logging.INFO)
if arguments.error_log == "-":
  error_log.addHandler(logging.StreamHandler(sys.stderr))
else:
  error_log.addHandler(logging.handlers.RotatingFileHandler(arguments.error_log, maxBytes=arguments.error_log_size, backupCount=arguments.error_log_count))
error_log.handlers[-1].setFormatter(logging.Formatter(fmt="%(asctime)s  %(message)s", datefmt="[%d/%b/%Y:%H:%M:%S]"))

class log(object):
  error = logging.getLogger("error").info

# assuming CouchDB initialization from local process to local server
creds = ""
if arguments.admin != "":
  creds = arguments.admin + ":" + arguments.password + "@"

serverURL = "http://" + creds + arguments.host + ":" + arguments.port + "/"

while True:
  try:
    server = couchdb.Server(serverURL)
    version = server.version()
    break
  except:
    log.error("Waiting for couchdb.")
    time.sleep(2)

if arguments.database not in server:
  server.create(arguments.database)
database = server[arguments.database]

design = {
  "_id": "_design/slycat",
  "filters": {
    "projects-models": """function(doc, req) { return doc._deleted || doc.type == "project" || doc.type == "model"; }""",
    },

  "views": {
    "cache-objects": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "cache-object")
            return;

          emit(doc._id, null);
        }
        """,
      },
    "hdf5-file-counts": {
      "map": """
        function(doc)
        {
          if(doc["type"] == "hdf5")
          {
            emit(doc["_id"], 0);
          }
          else if(doc["type"] == "model")
          {
            artifact_types = doc["artifact-types"];
            if(artifact_types)
            {
              for(var artifact in artifact_types)
              {
                if(artifact_types[artifact] == "hdf5")
                {
                  emit(doc["artifact:" + artifact], 1);
                }
              }
            }
          }
        }
        """,
      "reduce": """
        function(keys, values)
        {
            return sum(values);
        }
        """,
      },
    "hdf5-files": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "hdf5")
            return;

          emit(doc._id, null);
        }
        """,
      },
    "models": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "model")
            return;

          emit(doc._id, null);
        }
        """,
      },
    "open-models": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "model")
            return;
          if(doc["state"] == null)
            return;
          if(doc["state"] == "closed")
            return;
          emit(doc._id, null);
        }
        """,
      },
    "project-bookmarks": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "bookmark")
            return;

          emit(doc["project"], null);
        }
        """,
      },
    "project-cache-objects": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "cache-object")
            return;

          emit(doc["project"], null);
        }
        """,
      },
    "project-key-cache-objects": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "cache-object")
            return;

          emit(doc["project"] + "-" + doc["key"], null);
        }
        """,
      },
    "project-models": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "model")
            return;

          emit(doc["project"], null);
        }
        """,
      },
    "project-references": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "reference")
            return;

          emit(doc["project"], null);
        }
        """,
      },
    "projects": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "project")
            return;

          emit(doc._id, null);
        }
        """,
      },
    "references": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "reference")
            return;

          emit(doc._id, null);
        }
        """,
      },
    "sessions": {
      "map": """
        function(doc)
        {
          if(doc["type"] != "session")
            return;

          emit(doc._id, null);
        }
        """,
      },
    },

  "validate_doc_update": """
    function(new_document, old_document, user_context)
    {
      function require(expression, message)
      {
        if(!expression)
        {
          throw(
          {
            forbidden: message
          });
        }
      }

      if(new_document._deleted)
        return;

      if(old_document)
      {
        require(new_document["type"] == old_document["type"], "Document type cannot be modified." + new_document["type"] + " " + old_document["type"]);
      }
      else
      {
        require(new_document["type"] != null, "Document type is required.");
      }

      if(new_document["type"] == "project")
      {
        require(new_document["acl"] != null, "Project must contain security object.");
        require(new_document["acl"].administrators != null, "Project security object must contain adminstrators.");
        require(new_document["acl"].readers != null, "Project security object must contain readers.");
        require(new_document["acl"].writers != null, "Project security object must contain writers.");

        require(new_document["acl"].administrators.length > 0, "Project security object must contain at least one administrator.");

        require(new_document["created"] != null, "Project must contain creation time.");
        require(new_document["creator"] != null, "Project must contain creator.");
        require(new_document["name"] != null, "Project must contain name.");

        if(old_document)
        {
          require(new_document["created"] == old_document["created"], "Project creation time cannot be modified.");
          require(new_document["creator"] == old_document["creator"], "Project creator cannot be modified.");
        }
      }
      else if(new_document["type"] == "model")
      {
        require(new_document["project"] != null, "Model must contain project id.");
        require(new_document["created"] != null, "Model must contain creation time.");
        require(new_document["creator"] != null, "Model must contain creator.");
        require(new_document["marking"] != null, "Model must contain marking information.");
        require(new_document["name"] != null, "Model must have a name.");
        require(new_document["model-type"] != null, "Model must have a model-type.");
        require(new_document["state"] == null || new_document["state"] == "waiting" || new_document["state"] == "running" || new_document["state"] == "finished" || new_document["state"] == "closed", "Invalid model state.");
        require(new_document["result"] == null || new_document["result"] == "succeeded" || new_document["result"] == "failed", "Invalid model result.");

        if(old_document)
        {
          require(new_document["state"] == null || new_document["state"] == "waiting" || new_document["state"] == "running" || new_document["state"] == "finished" || new_document["state"] == "closed", "Invalid model state.");
          require(new_document["project"] == old_document["project"], "Model project id cannot be modified.");
          require(new_document["created"] == old_document["created"], "Model creation time cannot be modified.");
          require(new_document["creator"] == old_document["creator"], "Model creator creator cannot be modified.");
        }
      }
      else if(new_document["type"] == "hdf5")
      {
      }
      else if(new_document["type"] == "bookmark")
      {
        require(new_document["project"] != null, "Bookmark must contain project id.");

        if(old_document)
        {
          require(new_document["project"] == old_document["project"], "Bookmark project id cannot be modified.");
        }
      }
      else if(new_document["type"] == "reference")
      {
        require(new_document["project"] != null, "Reference must contain project id.");

        if(old_document)
        {
          require(new_document["project"] == old_document["project"], "Reference project id cannot be modified.");
        }
      }
      else if(new_document["type"] == "cache-object")
      {
        require(new_document["project"] != null, "Cache object must contain project id.");
        require(new_document["key"] != null, "Cache object must contain key.");

        if(old_document)
        {
          require(new_document["project"] == old_document["project"], "Cache object project id cannot be modified.");
          require(new_document["key"] == old_document["key"], "Cache object key cannot be modified.");
        }
      }
      else if(new_document["type"] == "session")
      {
        require(new_document["created"] != null, "Session must contain creation time.");
        require(new_document["creator"] != null, "Session must contain creator.");
        if(old_document)
        {
          require(new_document["created"] == old_document["created"], "Session creation time cannot be modified.");
          require(new_document["creator"] == old_document["creator"], "Session creator cannot be modified.");
        }
      }
      else
      {
        throw(
        {
          forbidden: "Unknown document type: " + new_document["type"],
        });
      }
    }
    """,
}

if design["_id"] in database:
  log.error("Deleting %s from %s" % (design["_id"], arguments.database))
  database.delete(database[design["_id"]])

log.error("Saving %s to %s" % (design["_id"], arguments.database))
database.save(design)

