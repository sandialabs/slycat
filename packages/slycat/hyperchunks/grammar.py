from pyparsing import *

integer_p = (Optional("-") + Word(nums))
integer_p.setParseAction(lambda tokens: [int("".join(tokens))])
empty_p = Empty()
empty_p.setParseAction(lambda tokens: [None])
optional_integer_p = integer_p | empty_p
range_p = optional_integer_p + Suppress(":") + optional_integer_p + Optional(Suppress(":") + optional_integer_p)
range_p.setParseAction(lambda tokens: tokens[0] if len(tokens) == 1 else slice(*tokens))
ellipsis_p = Literal("...").setParseAction(lambda tokens: [Ellipsis])
slice_p = range_p | ellipsis_p | integer_p
hyperslice_p = Group(delimitedList(slice_p, delim=","))
hyperslices_p = Group(delimitedList(hyperslice_p, delim="|"))
attributes_p = Group(delimitedList(slice_p, delim="|"))
arrays_p = Group(delimitedList(slice_p, delim="|"))
hyperchunk_p = Group(arrays_p + Optional(Suppress("/") + attributes_p + Optional(Suppress("/") + hyperslices_p)))
hyperchunks_p = delimitedList(hyperchunk_p, delim=";")

