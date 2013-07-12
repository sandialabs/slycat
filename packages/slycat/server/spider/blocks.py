# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

def read(stream, size=2**16):
  """Reads the contents of a file one-block-at-a-time without loading the
  entire file into memory."""
  while True:
    block = stream.read(size)
    if len(block) == 0:
      break
    yield block

