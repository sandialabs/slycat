from pyparsing import *

class Arrays(list):
  pass

class Attributes(list):
  pass

class AttributeIndex(object):
  def __init__(self, index):
    self.index = index

class BinaryOperator(object):
  def __init__(self, left, operator, right):
    self.left = left
    self.operator = operator
    self.right = right

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

class Hyperchunks(list):
  pass

class List(object):
  def __init__(self, tokens):
    self.values = tokens.asList()

nonzero_nums = "123456789"

decimal_integer_literal_p = Optional("-") + Word(nonzero_nums, nums) | "0"
decimal_integer_literal_p.setParseAction(lambda tokens: int("".join(tokens)))

integer_literal_p = decimal_integer_literal_p

point_float_p = Optional("-") + Optional(Word(nums)) + "." + Word(nums) | Word(nums) + "."

float_literal_p = point_float_p
float_literal_p.setParseAction(lambda tokens: float("".join(tokens)))

number_literal_p = float_literal_p | integer_literal_p

string_literal_p = QuotedString(quoteChar='"', escChar="\\")

number_list_literal_p = Suppress("[") + delimitedList(number_literal_p, delim=",") + Suppress("]")
number_list_literal_p.setParseAction(lambda tokens: List(tokens))

string_list_literal_p = Suppress("[") + delimitedList(string_literal_p, delim=",") + Suppress("]")
string_list_literal_p.setParseAction(lambda tokens: List(tokens))

range_index_p = decimal_integer_literal_p.copy().setParseAction(lambda tokens: [int("".join(tokens))]) | Empty().setParseAction(lambda tokens: [None])

range_literal_p = range_index_p + Suppress(":") + range_index_p + Optional(Suppress(":") + range_index_p)
range_literal_p.setParseAction(lambda tokens: slice(*tokens))

ellipsis_literal_p = Literal("...")
ellipsis_literal_p.setParseAction(lambda tokens: Ellipsis)

slice_literal_p = range_literal_p | ellipsis_literal_p | decimal_integer_literal_p

attribute_identifier_p = Word("a", nums, min=2)
attribute_identifier_p.setParseAction(lambda tokens: AttributeIndex(int(tokens[0][1:])))

identifier_p = attribute_identifier_p

value_comparison_operator_p = oneOf("== >= <= != < >")

value_comparison_p = attribute_identifier_p + value_comparison_operator_p + number_literal_p
value_comparison_p.setParseAction(lambda tokens: BinaryOperator(*tokens))

membership_comparison_operator_p = Optional("not") + Literal("in")
membership_comparison_operator_p.setParseAction(lambda tokens: " ".join(tokens))

membership_comparison_p = attribute_identifier_p + membership_comparison_operator_p + (number_list_literal_p | string_list_literal_p)
membership_comparison_p.setParseAction(lambda tokens: BinaryOperator(*tokens))

comparison_p = value_comparison_p | membership_comparison_p

logical_expression_p = infixNotation(comparison_p,
[
  (Literal("and"), 2, opAssoc.LEFT, lambda tokens: BinaryOperator(*tokens[0])),
  (Literal("or"), 2, opAssoc.LEFT, lambda tokens: BinaryOperator(*tokens[0])),
])

function_call_p = Forward()

function_argument_p = function_call_p | attribute_identifier_p | string_literal_p | float_literal_p | integer_literal_p

function_call_p << Word(alphas, alphanums) + Suppress("(") + Optional(delimitedList(function_argument_p, delim=",")) + Suppress(")")
function_call_p.setParseAction(FunctionCall)

order_expression_p = function_call_p

order_section_p = Suppress(Literal("order:")) + order_expression_p
order_section_p.setParseAction(lambda tokens: tokens[0])

attribute_expression_p = logical_expression_p | function_call_p | attribute_identifier_p | slice_literal_p

hyperslice_p = delimitedList(slice_literal_p, delim=",")
hyperslice_p.setParseAction(lambda tokens: Hyperslice(tokens))

hyperslices_p = delimitedList(hyperslice_p, delim="|")

attributes_p = delimitedList(attribute_expression_p, delim="|")

arrays_p = delimitedList(slice_literal_p, delim="|")

hyperchunk_p = arrays_p("arrays") + Optional(Suppress("/") + attributes_p("attributes") + Optional(Suppress("/") + order_section_p("order")) +  Optional(Suppress("/") + hyperslices_p("hyperslices")))
hyperchunk_p.setParseAction(Hyperchunk)

hyperchunks_p = delimitedList(hyperchunk_p, delim=";")
