# Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
# DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
# retains certain rights in this software.

import pyparsing as pp

class Arrays(list):
  pass

class Attributes(list):
  pass

class AttributeIndex(object):
  def __init__(self, index):
    self.index = index

class BinaryOperator(object):
  def __init__(self, operator, operands):
    self.operator = operator
    self.operands = operands

class FunctionCall(object):
  def __init__(self, tokens):
    self.name = tokens[0]
    self.args = tokens[1:]

class Hyperslice(tuple):
  pass

class Hyperslices(list):
  pass

class Hyperchunk(object):
  def __init__(self, tokens):
    self.arrays = Arrays(tokens["arrays"].asList())
    self.attributes = Attributes(tokens["attributes"].asList()) if "attributes" in tokens else None
    self.order = tokens.get("order", None)
    self.hyperslices = Hyperslices(tokens["hyperslices"].asList()) if "hyperslices" in tokens else None
  def __repr__(self):
    import slycat.hyperchunks
    ret_string = slycat.hyperchunks.tostring(self)
    return ret_string

class Hyperchunks(list):
  pass

class List(object):
  def __init__(self, tokens):
    self.values = tokens.asList()

# Define literals.
nonzero_nums = "123456789"

#interger
decimal_integer_literal_p = pp.Optional("-") + pp.Word(nonzero_nums, pp.nums) | "0"
decimal_integer_literal_p.setParseAction(lambda tokens: int("".join(tokens)))

integer_literal_p = decimal_integer_literal_p

#floating point number  -1.2 or 1. includes scientific notation
point_float_p = (pp.Optional("-") + pp.Word(pp.nums) + "." + pp.Optional(pp.Word(pp.nums)) + pp.Optional("e") + pp.Optional("-") + pp.Optional(pp.Word(pp.nums))) \
                | (pp.Optional("-") + pp.Word(pp.nums) + "e" + pp.Optional("-") + pp.Word(pp.nums))

float_literal_p = point_float_p
float_literal_p.setParseAction(lambda tokens: float("".join(tokens)))

#add none real numbers
nan_p = pp.Word("nan")
nan_p.setParseAction(lambda tokens: float("".join(tokens)))

number_literal_p = float_literal_p | integer_literal_p | nan_p

string_literal_p = pp.QuotedString(quoteChar='"', escChar="\\")

number_list_literal_p = pp.Suppress("[") + pp.delimitedList(number_literal_p, delim=",") + pp.Suppress("]")
number_list_literal_p.setParseAction(lambda tokens: List(tokens))

string_list_literal_p = pp.Suppress("[") + pp.delimitedList(string_literal_p, delim=",") + pp.Suppress("]")
string_list_literal_p.setParseAction(lambda tokens: List(tokens))

range_index_p = decimal_integer_literal_p.copy().setParseAction(lambda tokens: [int("".join(tokens))]) | pp.Empty().setParseAction(lambda tokens: [None])

range_literal_p = range_index_p + pp.Suppress(":") + range_index_p + pp.Optional(pp.Suppress(":") + range_index_p)
range_literal_p.setParseAction(lambda tokens: slice(*tokens))

ellipsis_literal_p = pp.Literal("...")
ellipsis_literal_p.setParseAction(lambda tokens: Ellipsis)

slice_literal_p = range_literal_p | ellipsis_literal_p | decimal_integer_literal_p

slices_literal_p = pp.delimitedList(slice_literal_p, delim="|")

hyperslice_literal_p = pp.delimitedList(slice_literal_p, delim=",")
hyperslice_literal_p.setParseAction(lambda tokens: Hyperslice(tokens))

hyperslices_literal_p = pp.delimitedList(hyperslice_literal_p, delim="|")

# Define indentifiers (variables).
attribute_identifier_p = pp.Word("a", pp.nums, min=2)
attribute_identifier_p.setParseAction(lambda tokens: AttributeIndex(int(tokens[0][1:])))

identifier_p = attribute_identifier_p

# Define attribute expressions (expressions that return attributes).
value_comparison_operator_p = pp.oneOf("== >= <= != < >")

value_comparison_p = attribute_identifier_p + value_comparison_operator_p + number_literal_p
value_comparison_p.setParseAction(lambda tokens: BinaryOperator(tokens[1], tokens[0::2]))

membership_comparison_operator_p = pp.Optional("not") + pp.Literal("in")
membership_comparison_operator_p.setParseAction(lambda tokens: " ".join(tokens))

membership_comparison_p = attribute_identifier_p + membership_comparison_operator_p + (number_list_literal_p | string_list_literal_p)
membership_comparison_p.setParseAction(lambda tokens: BinaryOperator(tokens[1], tokens[0::2]))

comparison_p = value_comparison_p | membership_comparison_p

logical_expression_p = pp.infixNotation(comparison_p,
[
  (pp.Literal("and"), 2, pp.opAssoc.LEFT, lambda tokens: BinaryOperator(tokens[0][1], tokens[0][0::2])),
  (pp.Literal("or"), 2, pp.opAssoc.LEFT, lambda tokens: BinaryOperator(tokens[0][1], tokens[0][0::2])),
])

function_call_p = pp.Forward()

function_argument_p = function_call_p | attribute_identifier_p | string_literal_p | float_literal_p | integer_literal_p

function_call_p << pp.Word(pp.alphas, pp.alphanums) + pp.Suppress("(") + pp.Optional(pp.delimitedList(function_argument_p, delim=",")) + pp.Suppress(")")
function_call_p.setParseAction(FunctionCall)

attribute_expression_p = logical_expression_p | function_call_p | attribute_identifier_p | slice_literal_p

# Define the arrays section of a hyperchunk.
arrays_expression_p = slices_literal_p

# Define the attributes section of a hyperchunk.
attributes_expression_p = pp.delimitedList(attribute_expression_p, delim="|")

# Define the order section of a hyperchunk.
order_expression_p = pp.Suppress(pp.Literal("order:")) + function_call_p
order_expression_p.setParseAction(lambda tokens: tokens[0])

# Define the hyperslices section of a hyperchunk.
hyperslices_expression_p = hyperslices_literal_p

# Define a hyperchunk.
hyperchunk_p = arrays_expression_p("arrays") + pp.Optional(pp.Suppress("/") + attributes_expression_p("attributes") + pp.Optional(pp.Suppress("/") + order_expression_p("order")) +  pp.Optional(pp.Suppress("/") + hyperslices_expression_p("hyperslices")))
hyperchunk_p.setParseAction(Hyperchunk)

# Define a collection of hyperchunks.
hyperchunks_p = pp.delimitedList(hyperchunk_p, delim=";")

