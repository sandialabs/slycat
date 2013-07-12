# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import os
import sys

class dev_null(object):
  """Do-nothing progress callback."""
  def write(self, message, indent=0):
    pass

def index(path=None, content=None, filename=None, progress=None, host=None):
  """Generator expression that will emit zero-to-many perspectives for the
  given artifact."""
  from . import byte_indexer
  from . import file_indexer
  from . import name_indexer
  from . import text_indexer
  from . import image_indexer
  from . import delimited_file_indexer
  from . import exodus_indexer
  from . import xyce_indexer

  if path is not None:
    if not os.path.isabs(path):
      raise Exception("Path must be absolute.")
    if content is not None:
      raise Exception("Specify path or content, not both.  path is for local files, content is for uploaded data.""")
    if filename is not None:
      raise Exception("Specify path or filename, not both.  path is for local files, filename is for uploaded data.""")

  if progress is None:
    progress = dev_null()

  keywords = {
    "content" : content,
    "filename" : filename,
    "host" : host,
    "path" : path,
    "progress" : progress
    }

  for perspective in byte_indexer.index(**keywords):
    yield perspective

  for perspective in file_indexer.index(**keywords):
    yield perspective

  for perspective in name_indexer.index(**keywords):
    yield perspective

  for perspective in text_indexer.index(**keywords):
    yield perspective

  for perspective in delimited_file_indexer.index(**keywords):
    yield perspective

  for perspective in image_indexer.index(**keywords):
    yield perspective

  for perspective in exodus_indexer.index(**keywords):
    yield perspective

  for perspective in xyce_indexer.index(**keywords):
    yield perspective

def extract(type, path=None, content=None, filename=None, progress=None, nan_row_filtering=False):
  """Generator expression that will emit zero-to-many data structures of the
  given type extracted from the given artifact."""

  if path is not None:
    if not os.path.isabs(path):
      raise Exception("Path must be absolute.")
    if content is not None:
      raise Exception("Specify path or content, not both.  path is for local files, content is for uploaded data.""")
    if filename is not None:
      raise Exception("Specify path or filename, not both.  path is for local files, filename is for uploaded data.""")

  if progress is None:
    progress = dev_null()

  keywords = {
    "path" : path,
    "content" : content,
    "filename" : filename,
    "progress" : progress,
    "nan_row_filtering" : nan_row_filtering,
    }

  if type == "table":
    from . import delimited_file_extractor
    for data in delimited_file_extractor.extract(**keywords):
      yield data
    return

  raise Exception("Unknown extraction type: %s" % type)
