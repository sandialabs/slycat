# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

class prototype:
  """Prototype for a marking object that defines the rules for marking artifacts."""
  def types(self):
    """Returns a sequence of allowed markings.  Use an empty string to represent "no marking"."""
    raise NotImplementedError()

  def label(self, type):
    """Returns a human-readable label for the given marking type."""
    raise NotImplementedError()

  def html(self, type):
    """Returns the HTML markup that should be used to insert the given marking type into a document."""
    raise NotImplementedError()

class basic(prototype):
  """Marking object that is explicitly instantiated with a sequence of (type,
  label, html) tuples.  Note that the logic to combine markings requires that
  the types are specified from least-to-most restrictive."""
  def __init__(self, types):
    self.allowed = { type : { "label" : label, "html" : html } for type, label, html in types }
    self.order = [type for type, label, html in types]

  def types(self):
    return self.order

  def label(self, type):
    return self.allowed[type]["label"]

  def html(self, type):
    return self.allowed[type]["html"]

  def __repr__(self):
    return "<slycat.web.server.marking.basic, allowed types: %s>" % (self.allowed.keys())
