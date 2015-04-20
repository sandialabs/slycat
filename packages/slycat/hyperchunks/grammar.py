from pyparsing import *

class CallFunction(object):
  def __init__(self, *tokens):
    self._name = tokens[0]
    self._args = tokens[1:]
  def __eq__(self, other):
    return self._name == other._name and self._args == other._args
  def __repr__(self):
    return "%s(%s)" % (self._name, ",".join([repr(arg) for arg in self._args]))
  @property
  def name(self):
    return self._name
  @property
  def args(self):
    return self._args

class LoadAttribute(object):
  def __init__(self, index):
    self._index = index
  def __eq__(self, other):
    return self._index == other._index
  def __repr__(self):
    return "a%s" % self._index
  @property
  def index(self):
    return self._index

class BinaryOperator(object):
  def __init__(self, *tokens):
    self._left = tokens[0]
    self._operator = tokens[1]
    self._right = tokens[2]
  def __eq__(self, other):
    return self._left == other._left and self._operator == other._operator and self._right == other._right
  def __repr__(self):
    return "%s %s %s" % (self._left, self._operator, self._right)

integer_p = Optional("-") + Word(nums)
integer_p.setParseAction(lambda tokens: int("".join(tokens)))

float_p = Optional("-") + Word(nums) + Optional("." + Word(nums))
float_p.setParseAction(lambda tokens: float("".join(tokens)))

attribute_id_p = Word("a", nums, min=2)
attribute_id_p.setParseAction(lambda tokens: LoadAttribute(int(tokens[0][1:])))

range_index_p = integer_p.copy().setParseAction(lambda tokens: [int("".join(tokens))]) | Empty().setParseAction(lambda tokens: [None])

range_p = range_index_p + Suppress(":") + range_index_p + Optional(Suppress(":") + range_index_p)
range_p.setParseAction(lambda tokens: tokens[0] if len(tokens) == 1 else slice(*tokens))

ellipsis_p = Literal("...")
ellipsis_p.setParseAction(lambda tokens: Ellipsis)

slice_p = range_p | ellipsis_p | integer_p

comparison_operator_p = oneOf("== >= <= != < >")

comparison_p = attribute_id_p + comparison_operator_p + float_p
comparison_p.setParseAction(lambda tokens: BinaryOperator(*tokens))

logical_expression_p = infixNotation(comparison_p,
[
  (Literal("and"), 2, opAssoc.LEFT, lambda tokens: BinaryOperator(*tokens[0])),
  (Literal("or"), 2, opAssoc.LEFT, lambda tokens: BinaryOperator(*tokens[0])),
])

function_call_p = Word(alphas, alphanums) + Suppress("(") + Optional(delimitedList(integer_p, delim=",")) + Suppress(")")
function_call_p.setParseAction(lambda tokens: [CallFunction(*tokens)])

expression_p = logical_expression_p | function_call_p | attribute_id_p | slice_p

hyperslice_p = Group(delimitedList(slice_p, delim=","))

hyperslices_p = Group(delimitedList(hyperslice_p, delim="|"))

attributes_p = Group(delimitedList(expression_p, delim="|"))

arrays_p = Group(delimitedList(slice_p, delim="|"))

hyperchunk_p = Group(arrays_p + Optional(Suppress("/") + attributes_p + Optional(Suppress("/") + hyperslices_p)))

hyperchunks_p = delimitedList(hyperchunk_p, delim=";")

