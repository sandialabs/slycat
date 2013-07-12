# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

import time

class timer:
  def __init__(self, clock):
    self.clock = clock
    self.start = clock()

  def elapsed(self):
    return self.clock() - self.start

  def reset(self):
    self.start = self.clock()

def cpu():
  return timer(time.clock)

def wallclock():
  return timer(time.time)

