from pyparsing import *

class FunctionCall(object):
  def __init__(self, *tokens):
    self._name = tokens[0]
    self._args = tokens[1:]
  def __eq__(self, other):
    return self._name == other._name and self._args == other._args

integer_p = Optional("-") + Word(nums)
integer_p.setParseAction(lambda tokens: [int("".join(tokens))])

float_p = Optional("-") + Word(nums) + Optional("." + Word(nums))
float_p.setParseAction(lambda tokens: [float("".join(tokens))])

attribute_id_p = Word("a", nums, min=2)

empty_p = Empty()
empty_p.setParseAction(lambda tokens: [None])

optional_integer_p = integer_p | empty_p

range_p = optional_integer_p + Suppress(":") + optional_integer_p + Optional(Suppress(":") + optional_integer_p)
range_p.setParseAction(lambda tokens: tokens[0] if len(tokens) == 1 else slice(*tokens))

ellipsis_p = Literal("...")
ellipsis_p.setParseAction(lambda tokens: [Ellipsis])

slice_p = range_p | ellipsis_p | integer_p

comparison_operator_p = oneOf("== >= <= != < >")

comparison_p = attribute_id_p + comparison_operator_p + float_p

logical_expression_p = infixNotation(comparison_p,
[
  (Literal("and"), 2, opAssoc.LEFT),
  (Literal("or"), 2, opAssoc.LEFT),
])

function_call_p = Word(alphas, alphanums) + Suppress("(") + Optional(delimitedList(integer_p, delim=",")) + Suppress(")")
function_call_p.setParseAction(lambda tokens: [FunctionCall(*tokens)])

expression_p = logical_expression_p | function_call_p

slice_or_expression_p = slice_p | expression_p

hyperslice_p = Group(delimitedList(slice_p, delim=","))

hyperslices_p = Group(delimitedList(hyperslice_p, delim="|"))

attributes_p = Group(delimitedList(slice_or_expression_p, delim="|"))

arrays_p = Group(delimitedList(slice_p, delim="|"))

hyperchunk_p = Group(arrays_p + Optional(Suppress("/") + attributes_p + Optional(Suppress("/") + hyperslices_p)))

hyperchunks_p = delimitedList(hyperchunk_p, delim=";")

