# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import io
import sys

from . import blocks

def convert_text(path, content, encoding):
  if path is not None:
    stream = io.open(path, "rt", encoding=encoding, errors="strict", newline="")

  if content is not None:
    stream = io.TextIOWrapper(io.BytesIO(content), encoding=encoding, errors="strict", newline="")

  preview = u""
  preview_limit = 2**12
  character_length = 0
  for block in blocks.read(stream):
    character_length += len(block)
    if len(preview) < preview_limit:
      preview += block

  preview = preview[:preview_limit]
  if len(preview) < character_length:
    preview += u"\u2026"

  perspective = {}
  perspective["type"] = "text"
  perspective["encoding"] = encoding
  perspective["confidence"] = 1
  perspective["character-length"] = character_length
  perspective["preview:text"] = preview

  return perspective

def index(**keywords):
  path = keywords["path"]
  content = keywords["content"]
  progress = keywords["progress"]

  progress.write("Indexing unstructured text data.")

  for encoding in ["utf_8", "ascii", "utf_16"]:
    try:
      yield convert_text(path, content, encoding)
      break # Limit ourselves to the first encoding that works.  In the long-term, we might want to allow for more than one.
    except:
      import traceback
      progress.write(traceback.format_exc(), 1)
