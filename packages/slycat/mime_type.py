# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import mimetypes

mimetypes.add_type("text/csv", ".csv", strict=False)
mimetypes.add_type("video/webm", ".webm", strict=False)

def guess_extension(content_type, strict):
  return mimetypes.guess_extension(content_type, strict)

def guess_type(filename, strict=False, default="application/octet-stream"):
  """ Wrap std mimetypes.guess_type to assign a default type """
  content_type, encoding = mimetypes.guess_type(filename, strict=strict)
  if content_type is None:
    content_type = default
  return content_type, encoding
