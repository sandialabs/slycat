from pyparsing import *

class Arrays(list):
  pass

class Attributes(list):
  pass

class Hyperslice(tuple):
  pass

class Hyperslices(list):
  pass

class Hyperchunk(object):
  def __init__(self, tokens):
    self.arrays = Arrays(tokens["arrays"].asList())
    self.attributes = Attributes(tokens["attributes"].asList()) if "attributes" in tokens else None
    self.sort = tokens.get("sort", None)
    self.hyperslices = Hyperslices(tokens["hyperslices"].asList()) if "hyperslices" in tokens else None

class Hyperchunks(list):
  pass

class FunctionCall(object):
  def __init__(self, tokens):
    self.name = tokens[0]
    self.args = tokens[1:]

class AttributeIndex(object):
  def __init__(self, index):
    self.index = index

class BinaryOperator(object):
  def __init__(self, tokens):
    self.left = tokens[0]
    self.operator = tokens[1]
    self.right = tokens[2]

integer_p = Optional("-") + Word(nums)
integer_p.setParseAction(lambda tokens: int("".join(tokens)))

float_p = Optional("-") + Word(nums) + Optional("." + Word(nums))
float_p.setParseAction(lambda tokens: float("".join(tokens)))

string_p = QuotedString(quoteChar='"', escChar="\\")

attribute_id_p = Word("a", nums, min=2)
attribute_id_p.setParseAction(lambda tokens: AttributeIndex(int(tokens[0][1:])))

range_index_p = integer_p.copy().setParseAction(lambda tokens: [int("".join(tokens))]) | Empty().setParseAction(lambda tokens: [None])

range_p = range_index_p + Suppress(":") + range_index_p + Optional(Suppress(":") + range_index_p)
range_p.setParseAction(lambda tokens: slice(*tokens))

ellipsis_p = Literal("...")
ellipsis_p.setParseAction(lambda tokens: Ellipsis)

slice_p = range_p | ellipsis_p | integer_p

comparison_operator_p = oneOf("== >= <= != < >")

comparison_p = attribute_id_p + comparison_operator_p + float_p
comparison_p.setParseAction(lambda tokens: BinaryOperator(tokens))

logical_expression_p = infixNotation(comparison_p,
[
  (Literal("and"), 2, opAssoc.LEFT, lambda tokens: BinaryOperator(tokens[0])),
  (Literal("or"), 2, opAssoc.LEFT, lambda tokens: BinaryOperator(tokens[0])),
])

function_argument_p = attribute_id_p | string_p | float_p | integer_p

function_call_p = Word(alphas, alphanums) + Suppress("(") + Optional(delimitedList(function_argument_p, delim=",")) + Suppress(")")
function_call_p.setParseAction(FunctionCall)

sort_expression_p = function_call_p

sort_section_p = Suppress(Literal("sort:")) + sort_expression_p
sort_section_p.setParseAction(lambda tokens: tokens[0])

attribute_expression_p = logical_expression_p | function_call_p | attribute_id_p | slice_p

hyperslice_p = delimitedList(slice_p, delim=",")
hyperslice_p.setParseAction(lambda tokens: Hyperslice(tokens))

hyperslices_p = delimitedList(hyperslice_p, delim="|")

attributes_p = delimitedList(attribute_expression_p, delim="|")

arrays_p = delimitedList(slice_p, delim="|")

hyperchunk_p = arrays_p("arrays") + Optional(Suppress("/") + attributes_p("attributes") + Optional(Suppress("/") + sort_section_p("sort")) +  Optional(Suppress("/") + hyperslices_p("hyperslices")))
hyperchunk_p.setParseAction(Hyperchunk)

hyperchunks_p = delimitedList(hyperchunk_p, delim=";")
