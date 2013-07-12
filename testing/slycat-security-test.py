# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import cStringIO
import getpass
import json
import optparse
import slycat.client
import slycat.client.testing
import StringIO
import struct
import sys
import time

parser = optparse.OptionParser()
parser.add_option("--host", default="https://localhost:8092", help="Root URL of the Slycat server.  Default: %default")
parser.add_option("--http-proxy", default="", help="HTTP proxy URL.  Default: %default")
parser.add_option("--https-proxy", default="", help="HTTPS proxy URL.  Default: %default")
parser.add_option("--marking", default="", help="Marking type.  Default: %default")
parser.add_option("--non-project-member", default=None, help="Non Project Member")
parser.add_option("--non-server-member", default=None, help="Non Server Member")
parser.add_option("--no-verify", default=False, action="store_true", help="Disable HTTPS host certificate verification.")
parser.add_option("--project-administrator", default=None, help="Project Administrator")
parser.add_option("--project-reader", default=None, help="Project Reader")
parser.add_option("--project-writer", default=None, help="Project Writer")
parser.add_option("--server-administrator", default=None, help="Server Administrator")
options, arguments = parser.parse_args()

if options.server_administrator is None:
  raise Exception("Must specify a server administrator with --server-administrator.")
if options.project_administrator is None:
  raise Exception("Must specify a project administrator with --project-administrator.")
if options.project_writer is None:
  raise Exception("Must specify a project writer with --project-writer.")
if options.project_reader is None:
  raise Exception("Must specify a project reader with --project-reader.")
if options.non_project_member is None:
  raise Exception("Must specify a non project member with --non-project-member.")
if options.non_server_member is None:
  raise Exception("Must specify a non server member with --non-server-member.")
if len(set([options.server_administrator, options.project_administrator, options.project_writer, options.project_reader, options.non_project_member, options.non_server_member])) != 6:
  raise Exception("--server-administrator, --project-administrator, --project-writer, --project-reader, --non-project-member, and --non-server-member  must each have a unique user id.")

# Setup a connection for each class of user ...
server_administrator = slycat.client.connection(auth=(options.server_administrator, getpass.getpass("%s password: " % options.server_administrator)), host=options.host, proxies={"http":options.http_proxy,"https":options.https_proxy}, verify=not options.no_verify)
project_administrator = slycat.client.connection(auth=(options.project_administrator, getpass.getpass("%s password: " % options.project_administrator)), host=options.host, proxies={"http":options.http_proxy,"https":options.https_proxy}, verify=not options.no_verify)
project_writer = slycat.client.connection(auth=(options.project_writer, getpass.getpass("%s password: " % options.project_writer)), host=options.host, proxies={"http":options.http_proxy,"https":options.https_proxy}, verify=not options.no_verify)
project_reader = slycat.client.connection(auth=(options.project_reader, getpass.getpass("%s password: " % options.project_reader)), host=options.host, proxies={"http":options.http_proxy,"https":options.https_proxy}, verify=not options.no_verify)
non_project_member = slycat.client.connection(auth=(options.non_project_member, getpass.getpass("%s password: " % options.non_project_member)), host=options.host, proxies={"http":options.http_proxy,"https":options.https_proxy}, verify=not options.no_verify)
non_server_member = slycat.client.connection(auth=(options.non_server_member, getpass.getpass("%s password: " % options.non_server_member)), host=options.host, proxies={"http":options.http_proxy,"https":options.https_proxy}, verify=not options.no_verify)

# Ensure all of the supplied users have the correct attributes ...
slycat.client.testing.assert_dict(server_administrator.request("GET", "/users/%s" % (options.server_administrator)), contains=["name", "email"], matches={"server-administrator":True})
slycat.client.testing.assert_dict(server_administrator.request("GET", "/users/%s" % (options.project_administrator)), contains=["name", "email"], matches={"server-administrator":False})
slycat.client.testing.assert_dict(server_administrator.request("GET", "/users/%s" % (options.project_writer)), contains=["name", "email"], matches={"server-administrator":False})
slycat.client.testing.assert_dict(server_administrator.request("GET", "/users/%s" % (options.project_reader)), contains=["name", "email"], matches={"server-administrator":False})
slycat.client.testing.assert_dict(server_administrator.request("GET", "/users/%s" % (options.non_project_member)), contains=["name", "email"], matches={"server-administrator":False})
with slycat.client.testing.assert_http_status(404):
  server_administrator.request("GET", "/users/%s" % (options.non_server_member))

# Setup resources required for the test ...
project_data = {"name":"SecurityTest","description":"SecurityTest"}
project_acl = {"acl":{"administrators":[{"user":options.project_administrator}], "writers":[{"user":options.project_writer}], "readers":[{"user":options.project_reader}]}}
project_model = {"model-type":"generic","name":"TestModel","marking":options.marking,"description":"TestModel"}
bookmark = {"selected-column":16, "selected-row":34, "color-scheme":"lighthearted"}
test_worker = {"type":"table-chunker","row-count":10,"column-count":10}
test_worker_state = {"pi":3.1415}
sort_order = {"order":[[1,"ascending"]]}
start_table = {"column-names":["c0", "c1"],"column-types":["double", "double"],"name":"a"}

projects = []
projects.append(project_administrator.request("POST", "/projects", headers={"content-type":"application/json"}, data=json.dumps(project_data))["id"])
projects.append(project_administrator.request("POST", "/projects", headers={"content-type":"application/json"}, data=json.dumps(project_data))["id"])
for pid in projects:
  project_administrator.request("PUT", "/projects/%s" % (pid), headers={"content-type":"application/json"}, data=json.dumps(project_acl))
project = projects[0]

# Run the test ...

# Anyone can request the home page ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/")
non_project_member.request("GET", "/")
project_reader.request("GET", "/")
project_writer.request("GET", "/")
project_administrator.request("GET", "/")
server_administrator.request("GET", "/")

# Anyone can request the list of projects ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/projects")
non_project_member.request("GET", "/projects")
project_reader.request("GET", "/projects")
project_writer.request("GET", "/projects")
project_administrator.request("GET", "/projects")
server_administrator.request("GET", "/projects")

# Any project member can request the project page ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/projects/%s" % (project))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/projects/%s" % (project))
project_reader.request("GET", "/projects/%s" % (project))
project_writer.request("GET", "/projects/%s" % (project))
project_administrator.request("GET", "/projects/%s" % (project))
server_administrator.request("GET", "/projects/%s" % (project))

# Any project writer can modify name and description ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_data))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_data))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_data))
project_writer.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_data))
project_administrator.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_data))
server_administrator.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_data))

# Only project admins can modify the ACL ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_acl))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_acl))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_acl))
with slycat.client.testing.assert_http_status(403):
  project_writer.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_acl))
project_administrator.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_acl))
server_administrator.request("PUT", "/projects/%s" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_acl))

# Any project member can request the project design page ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/projects/%s/design" % (project))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/projects/%s/design" % (project))
project_reader.request("GET", "/projects/%s/design" % (project))
project_writer.request("GET", "/projects/%s/design" % (project))
project_administrator.request("GET", "/projects/%s/design" % (project))
server_administrator.request("GET", "/projects/%s/design" % (project))

# Only project writers can create models ...
model_workers = []

with slycat.client.testing.assert_http_status(401):
  model_workers.append(non_server_member.request("POST", "/projects/%s/models" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_model))["wid"])
with slycat.client.testing.assert_http_status(403):
  model_workers.append(non_project_member.request("POST", "/projects/%s/models" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_model))["wid"])
with slycat.client.testing.assert_http_status(403):
  model_workers.append(project_reader.request("POST", "/projects/%s/models" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_model))["wid"])
model_workers.append(project_writer.request("POST", "/projects/%s/models" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_model))["wid"])
model_workers.append(project_administrator.request("POST", "/projects/%s/models" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_model))["wid"])
model_workers.append(server_administrator.request("POST", "/projects/%s/models" % (project), headers={"content-type":"application/json"}, data=json.dumps(project_model))["wid"])

# Any project member (not just writers) can save a bookmark ...
with slycat.client.testing.assert_http_status(401):
  bookmark = non_server_member.request("POST", "/projects/%s/bookmarks" % (project), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]
with slycat.client.testing.assert_http_status(403):
  bookmark = non_project_member.request("POST", "/projects/%s/bookmarks" % (project), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]
bookmark = project_reader.request("POST", "/projects/%s/bookmarks" % (project), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]
project_writer.request("POST", "/projects/%s/bookmarks" % (project), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]
project_administrator.request("POST", "/projects/%s/bookmarks" % (project), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]
server_administrator.request("POST", "/projects/%s/bookmarks" % (project), headers={"content-type":"application/json"}, data=json.dumps(bookmark))["id"]

# Any project member can load a bookmark ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/bookmarks/%s" % (bookmark))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/bookmarks/%s" % (bookmark))
project_reader.request("GET", "/bookmarks/%s" % (bookmark))
project_writer.request("GET", "/bookmarks/%s" % (bookmark))
project_administrator.request("GET", "/bookmarks/%s" % (bookmark))
server_administrator.request("GET", "/bookmarks/%s" % (bookmark))

# Anyone can lookup a user, but only server administrators get all details ...
with slycat.client.testing.assert_http_status(401):
  slycat.client.testing.assert_dict(non_server_member.request("GET", "/users/%s" % (options.server_administrator)), contains=["name", "email"], excludes=["server-administrator"])
slycat.client.testing.assert_dict(non_project_member.request("GET", "/users/%s" % (options.server_administrator)), contains=["name", "email"], excludes=["server-administrator"])
slycat.client.testing.assert_dict(project_reader.request("GET", "/users/%s" % (options.server_administrator)), contains=["name", "email"], excludes=["server-administrator"])
slycat.client.testing.assert_dict(project_writer.request("GET", "/users/%s" % (options.server_administrator)), contains=["name", "email"], excludes=["server-administrator"])
slycat.client.testing.assert_dict(project_administrator.request("GET", "/users/%s" % (options.server_administrator)), contains=["name", "email"], excludes=["server-administrator"])
slycat.client.testing.assert_dict(server_administrator.request("GET", "/users/%s" % (options.server_administrator)), contains=["name", "email", "server-administrator"])

# Anyone can create a worker ...
table_chunkers = []

with slycat.client.testing.assert_http_status(401):
  table_chunkers.append(non_server_member.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps(test_worker))["id"])
table_chunkers.append(non_project_member.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps(test_worker))["id"]) # Create an extra for later ...
table_chunkers.append(non_project_member.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps(test_worker))["id"])
table_chunkers.append(project_reader.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps(test_worker))["id"])
table_chunkers.append(project_writer.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps(test_worker))["id"])
table_chunkers.append(project_administrator.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps(test_worker))["id"])
table_chunkers.append(server_administrator.request("POST", "/workers", headers={"content-type":"application/json"}, data=json.dumps(test_worker))["id"])

# Anyone can request the list of workers ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers")
non_project_member.request("GET", "/workers")
project_reader.request("GET", "/workers")
project_writer.request("GET", "/workers")
project_administrator.request("GET", "/workers")
server_administrator.request("GET", "/workers")

# Anyone can lookup their own worker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers/%s" % (table_chunkers[-6]))
non_project_member.request("GET", "/workers/%s" % (table_chunkers[-5]))
project_reader.request("GET", "/workers/%s" % (table_chunkers[-4]))
project_writer.request("GET", "/workers/%s" % (table_chunkers[-3]))
project_administrator.request("GET", "/workers/%s" % (table_chunkers[-2]))
server_administrator.request("GET", "/workers/%s" % (table_chunkers[-1]))

# Only a server administrator can lookup someone else's worker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers/%s" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/workers/%s" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("GET", "/workers/%s" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_writer.request("GET", "/workers/%s" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("GET", "/workers/%s" % (table_chunkers[-1]))
server_administrator.request("GET", "/workers/%s" % (table_chunkers[-2]))

# Anyone can modify their own worker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("PUT", "/workers/%s" % (table_chunkers[-6]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
non_project_member.request("PUT", "/workers/%s" % (table_chunkers[-5]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
project_reader.request("PUT", "/workers/%s" % (table_chunkers[-4]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
project_writer.request("PUT", "/workers/%s" % (table_chunkers[-3]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
project_administrator.request("PUT", "/workers/%s" % (table_chunkers[-2]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
server_administrator.request("PUT", "/workers/%s" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))

# Only a server administrator can modify someone else's worker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("PUT", "/workers/%s" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("PUT", "/workers/%s" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("PUT", "/workers/%s" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
with slycat.client.testing.assert_http_status(403):
  project_writer.request("PUT", "/workers/%s" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("PUT", "/workers/%s" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))
server_administrator.request("PUT", "/workers/%s" % (table_chunkers[-2]), headers={"content-type":"application/json"}, data=json.dumps(test_worker_state))

# Anyone can retrieve metadata from their own chunker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-6]))
non_project_member.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-5]))
project_reader.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-4]))
project_writer.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-3]))
project_administrator.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-2]))
server_administrator.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-1]))

# Only a server administrator can retrieve metadata from someone else's chunker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_writer.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-1]))
server_administrator.request("GET", "/workers/%s/table-chunker/metadata" % (table_chunkers[-2]))

# Anyone can search their own chunker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-6]))
non_project_member.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-5]))
project_reader.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-4]))
project_writer.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-3]))
project_administrator.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-2]))
server_administrator.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-1]))

# Only a server administrator can search someone else's chunker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_writer.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-1]))
server_administrator.request("GET", "/workers/%s/table-chunker/search?query=1:5&2:6" % (table_chunkers[-2]))

# Anyone can retrieve data from their own chunker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-6]))
non_project_member.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-5]))
project_reader.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-4]))
project_writer.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-3]))
project_administrator.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-2]))
server_administrator.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-1]))

# Only a server administrator can retrieve data from someone else's chunker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_writer.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-1]))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-1]))
server_administrator.request("GET", "/workers/%s/table-chunker/chunk?rows=0-3&columns=0-3" % (table_chunkers[-2]))

# Anyone can modify their own chunker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-6]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
non_project_member.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-5]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
project_reader.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-4]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
project_writer.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-3]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
project_administrator.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-2]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
server_administrator.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))

# Only a server administrator can modify someone else's chunker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
with slycat.client.testing.assert_http_status(403):
  project_writer.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-1]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))
server_administrator.request("PUT", "/workers/%s/table-chunker/sort" % (table_chunkers[-2]), headers={"content-type":"application/json"}, data=json.dumps(sort_order))

# Only owners and server administrators can start a table ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/workers/%s/model/start-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"table-0"}))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("POST", "/workers/%s/model/start-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"table-1"}))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("POST", "/workers/%s/model/start-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"table-2"}))
project_writer.request("POST", "/workers/%s/model/start-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"table-3"}))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("POST", "/workers/%s/model/start-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"table-4"}))
server_administrator.request("POST", "/workers/%s/model/start-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"table-5"}))

# Only owners and server administrators can start a timeseries ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/workers/%s/model/start-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"timeseries-0"}))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("POST", "/workers/%s/model/start-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"timeseries-1"}))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("POST", "/workers/%s/model/start-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"timeseries-2"}))
project_writer.request("POST", "/workers/%s/model/start-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"timeseries-3"}))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("POST", "/workers/%s/model/start-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"timeseries-4"}))
server_administrator.request("POST", "/workers/%s/model/start-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"column-names":["c0","c1"],"column-types":["double","double"],"name":"timeseries-5"}))

# Only owners and server administrators can send table rows ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/workers/%s/model/send-table-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-0", "rows":[[3.14,42.0]]}))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("POST", "/workers/%s/model/send-table-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-1", "rows":[[3.14,42.0]]}))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("POST", "/workers/%s/model/send-table-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-2", "rows":[[3.14,42.0]]}))
project_writer.request("POST", "/workers/%s/model/send-table-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-3", "rows":[[3.14,42.0]]}))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("POST", "/workers/%s/model/send-table-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-4", "rows":[[3.14,42.0]]}))
server_administrator.request("POST", "/workers/%s/model/send-table-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-5", "rows":[[3.14,42.0]]}))

# Only owners and server administrators can send timeseries rows ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/workers/%s/model/send-timeseries-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-0", "rows":[[3.14,42.0]]}))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("POST", "/workers/%s/model/send-timeseries-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-1", "rows":[[3.14,42.0]]}))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("POST", "/workers/%s/model/send-timeseries-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-2", "rows":[[3.14,42.0]]}))
project_writer.request("POST", "/workers/%s/model/send-timeseries-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-3", "rows":[[3.14,42.0]]}))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("POST", "/workers/%s/model/send-timeseries-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-4", "rows":[[3.14,42.0]]}))
server_administrator.request("POST", "/workers/%s/model/send-timeseries-rows" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-5", "rows":[[3.14,42.0]]}))

# Only owners and server administrators can finish a table ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/workers/%s/model/finish-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-0"}))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("POST", "/workers/%s/model/finish-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-1"}))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("POST", "/workers/%s/model/finish-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-2"}))
project_writer.request("POST", "/workers/%s/model/finish-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-3"}))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("POST", "/workers/%s/model/finish-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-4"}))
server_administrator.request("POST", "/workers/%s/model/finish-table" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"table-5"}))

# Only owners and server administrators can finish a timeseries ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/workers/%s/model/finish-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-0"}))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("POST", "/workers/%s/model/finish-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-1"}))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("POST", "/workers/%s/model/finish-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-2"}))
project_writer.request("POST", "/workers/%s/model/finish-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-3"}))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("POST", "/workers/%s/model/finish-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-4"}))
server_administrator.request("POST", "/workers/%s/model/finish-timeseries" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"timeseries-5"}))

# Only owners and server administrators can set a parameter ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/workers/%s/model/set-parameter" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"parameter-0","value":42}))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("POST", "/workers/%s/model/set-parameter" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"parameter-1","value":42}))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("POST", "/workers/%s/model/set-parameter" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"parameter-2","value":42}))
project_writer.request("POST", "/workers/%s/model/set-parameter" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"parameter-3","value":42}))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("POST", "/workers/%s/model/set-parameter" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"parameter-4","value":42}))
server_administrator.request("POST", "/workers/%s/model/set-parameter" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({"name":"parameter-5","value":42}))

# Only owners and server administrators can get table columns ...
#with slycat.client.testing.assert_http_status(401):
#  non_server_member.request("GET", "/workers/%s/model/table-columns?name=table-0" % (model_workers[0]))
#with slycat.client.testing.assert_http_status(403):
#  non_project_member.request("GET", "/workers/%s/model/table-columns?name=table-1" % (model_workers[0]))
#with slycat.client.testing.assert_http_status(403):
#  project_reader.request("GET", "/workers/%s/model/table-columns?name=table-2" % (model_workers[0]))
#project_writer.request("GET", "/workers/%s/model/table-columns?name=table-3" % (model_workers[0]))
#with slycat.client.testing.assert_http_status(403):
#  project_administrator.request("GET", "/workers/%s/model/table-columns?name=table-4" % (model_workers[0]))
#server_administrator.request("GET", "/workers/%s/model/table-columns?name=table-5" % (model_workers[0]))

# Only owners and server administrators can finish a model ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/workers/%s/model/finish-model" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({}))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("POST", "/workers/%s/model/finish-model" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({}))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("POST", "/workers/%s/model/finish-model" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({}))
project_writer.request("POST", "/workers/%s/model/finish-model" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({}))
with slycat.client.testing.assert_http_status(403):
  project_administrator.request("POST", "/workers/%s/model/finish-model" % (model_workers[0]), headers={"content-type":"application/json"}, data=json.dumps({}))
server_administrator.request("POST", "/workers/%s/model/finish-model" % (model_workers[1]), headers={"content-type":"application/json"}, data=json.dumps({}))

# Only a server administrator can delete someone else's worker
with slycat.client.testing.assert_http_status(401):
  non_server_member.delete_worker(table_chunkers[-6], stop=True)
with slycat.client.testing.assert_http_status(403):
  non_project_member.delete_worker(table_chunkers[-1], stop=True)
with slycat.client.testing.assert_http_status(403):
  project_reader.delete_worker(table_chunkers[-6], stop=True)
with slycat.client.testing.assert_http_status(403):
  project_writer.delete_worker(table_chunkers[-6], stop=True)
with slycat.client.testing.assert_http_status(403):
  project_administrator.delete_worker(table_chunkers[-6], stop=True)
server_administrator.delete_worker(table_chunkers[-6], stop=True)

# Anyone can delete their own worker ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.delete_worker(table_chunkers[-5], stop=True)
non_project_member.delete_worker(table_chunkers[-5], stop=True)
project_reader.delete_worker(table_chunkers[-4], stop=True)
project_writer.delete_worker(table_chunkers[-3], stop=True)
project_administrator.delete_worker(table_chunkers[-2], stop=True)
server_administrator.delete_worker(table_chunkers[-1], stop=True)

# Any project member can request models ...
with slycat.client.testing.assert_http_status(401):
  models = non_server_member.request("GET", "/projects/%s/models" % (project))
with slycat.client.testing.assert_http_status(403):
  models = non_project_member.request("GET", "/projects/%s/models" % (project))
models = project_reader.request("GET", "/projects/%s/models" % (project))
models = project_writer.request("GET", "/projects/%s/models" % (project))
models = project_administrator.request("GET", "/projects/%s/models" % (project))
models = server_administrator.request("GET", "/projects/%s/models" % (project))

# Pick a specific model for subsequent tests ...
model = models[0]["_id"]

# Any project member can retrieve a model ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/models/%s" % (model))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/models/%s" % (model))
project_reader.request("GET", "/models/%s" % (model))
project_writer.request("GET", "/models/%s" % (model))
project_administrator.request("GET", "/models/%s" % (model))
server_administrator.request("GET", "/models/%s" % (model))

# Only project writers can modify a model ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("PUT", "/models/%s" % (model), headers={"content-type":"application/json"}, data=json.dumps(project_model))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("PUT", "/models/%s" % (model), headers={"content-type":"application/json"}, data=json.dumps(project_model))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("PUT", "/models/%s" % (model), headers={"content-type":"application/json"}, data=json.dumps(project_model))
project_writer.request("PUT", "/models/%s" % (model), headers={"content-type":"application/json"}, data=json.dumps(project_model))
time.sleep(1.0) # Ensure we don't get a conflict with everyone trying to write to the same model
project_administrator.request("PUT", "/models/%s" % (model), headers={"content-type":"application/json"}, data=json.dumps(project_model))
time.sleep(1.0) # Ensure we don't get a conflict with everyone trying to write to the same model
server_administrator.request("PUT", "/models/%s" % (model), headers={"content-type":"application/json"}, data=json.dumps(project_model))

# Any project member can retrieve a model design page ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/models/%s/design" % (model))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("GET", "/models/%s/design" % (model))
project_reader.request("GET", "/models/%s/design" % (model))
project_writer.request("GET", "/models/%s/design" % (model))
project_administrator.request("GET", "/models/%s/design" % (model))
server_administrator.request("GET", "/models/%s/design" % (model))

# Any project member can retrieve a model file ...
#with slycat.client.testing.assert_http_status(401):
#  non_server_member.request("GET", "/models/%s/file/table-5" % (model))
#with slycat.client.testing.assert_http_status(403):
#  non_project_member.request("GET", "/models/%s/file/table-5" % (model))
#project_reader.request("GET", "/models/%s/file/table-5" % (model))
#project_writer.request("GET", "/models/%s/file/table-5" % (model))
#project_administrator.request("GET", "/models/%s/file/table-5" % (model))
#server_administrator.request("GET", "/models/%s/file/table-5" % (model))

# Only project writers can delete a model ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("DELETE", "/models/%s" % (models[0]["_id"]))
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("DELETE", "/models/%s" % (models[0]["_id"]))
with slycat.client.testing.assert_http_status(403):
  project_reader.request("DELETE", "/models/%s" % (models[0]["_id"]))
project_writer.request("DELETE", "/models/%s" % (models[0]["_id"]))
project_administrator.request("DELETE", "/models/%s" % (models[1]["_id"]))
server_administrator.request("DELETE", "/models/%s" % (models[2]["_id"]))

# Anyone can post an event for logging ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("POST", "/events/test")
non_project_member.request("POST", "/events/test")
project_reader.request("POST", "/events/test")
project_writer.request("POST", "/events/test")
project_administrator.request("POST", "/events/test")
server_administrator.request("POST", "/events/test")

# Anyone can request the test page ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/test")
non_project_member.request("GET", "/test")
project_reader.request("GET", "/test")
project_writer.request("GET", "/test")
project_administrator.request("GET", "/test")
server_administrator.request("GET", "/test")

# Anyone can trigger a 404 exception for testing ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/test/exception/404")
with slycat.client.testing.assert_http_status(404):
  non_project_member.request("GET", "/test/exception/404")
with slycat.client.testing.assert_http_status(404):
  project_reader.request("GET", "/test/exception/404")
with slycat.client.testing.assert_http_status(404):
  project_writer.request("GET", "/test/exception/404")
with slycat.client.testing.assert_http_status(404):
  project_administrator.request("GET", "/test/exception/404")
with slycat.client.testing.assert_http_status(404):
  server_administrator.request("GET", "/test/exception/404")

# Anyone can trigger a 500 exception for testing ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("GET", "/test/exception/500")
with slycat.client.testing.assert_http_status(500):
  non_project_member.request("GET", "/test/exception/500")
with slycat.client.testing.assert_http_status(500):
  project_reader.request("GET", "/test/exception/500")
with slycat.client.testing.assert_http_status(500):
  project_writer.request("GET", "/test/exception/500")
with slycat.client.testing.assert_http_status(500):
  project_administrator.request("GET", "/test/exception/500")
with slycat.client.testing.assert_http_status(500):
  server_administrator.request("GET", "/test/exception/500")

# Only administrators can delete a project ...
with slycat.client.testing.assert_http_status(401):
  non_server_member.request("DELETE", "/projects/%s" % projects[0])
with slycat.client.testing.assert_http_status(403):
  non_project_member.request("DELETE", "/projects/%s" % projects[0])
with slycat.client.testing.assert_http_status(403):
  project_reader.request("DELETE", "/projects/%s" % projects[0])
with slycat.client.testing.assert_http_status(403):
  project_writer.request("DELETE", "/projects/%s" % projects[0])
project_administrator.request("DELETE", "/projects/%s" % projects[0])
server_administrator.request("DELETE", "/projects/%s" % projects[1])

# Cleanup leftover resources ...
for wid in model_workers:
  server_administrator.delete_worker(wid)

print "Test succeeded!"
