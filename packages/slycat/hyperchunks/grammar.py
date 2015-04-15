from pyparsing import *

integer = (Optional("-") + Word(nums))
integer.setParseAction(lambda tokens: [int("".join(tokens))])
empty = Empty()
empty.setParseAction(lambda tokens: [None])
optinteger = integer | empty
range_expr = optinteger + Suppress(":") + optinteger + Optional(Suppress(":") + optinteger)
range_expr.setParseAction(lambda tokens: tokens[0] if len(tokens) == 1 else slice(*tokens))
ellipsis = Literal("...").setParseAction(lambda tokens: [Ellipsis])
slice_expr = range_expr | ellipsis | integer
hyperslice = Group(delimitedList(slice_expr, delim=","))
hyperslices = Group(delimitedList(hyperslice, delim="|"))
attributes = slice_expr
arrays = slice_expr
hyperchunk = Group(arrays + Optional(Suppress("/") + attributes + Optional(Suppress("/") + hyperslices)))
hyperchunks = delimitedList(hyperchunk, delim=";")

