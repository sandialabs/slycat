.. _hyperchunks:

Hyperchunks
===========

To meet a wide variety of needs for incremental and interactive data ingestion
and retrieval, Slycat has evolved a complex data storage hierarchy.  At the top
of the hierarchy are *projects*, which provide administrative and access
controls, grouping together related analytical results.  *Models* are owned by
projects, and represent instances of specific analysis types.  Models contain
data *artifacts*, whose layout and structure are dictated by the model type.
Each artifact in a model is identified by name, which can be an arbitrary
string.  There are three types of artifacts: *parameters* are JSON objects of
arbitrary complexity, intended for storage of small quantities of metadata.
*Files* are opaque binary objects that can store large quantities of data,
along with an explicitly stored MIME type.  The final and most widely used type
of artifact is an *arrayset*, which is a one-dimensional array of *darrays*.  A
darray is a dense, multi-dimensional multi-attribute array, and an arrayset
stores :math:`n` darrays that can be accessed by integer indices in the range
:math:`[0, n)`.  In-turn, each *attribute* in a darray can be accessed by its
integer index, and the elements in each attribute can be identified using a
*hyperslice*, which includes a *slice* of element indices for each dimension of
the darray.

The bulk of the data in a Slycat model is stored in arraysets, and each time a
client reads or writes data to an arrayset, it must specify all of the
parameters mentioned above.  To make this process simpler, while allowing for a
wide variety of data access patterns, we group this information into
*hyperchunks*, and have developed the `Hyperchunk Query Language` or `HQL` to
serve as a compact specification for a set of hyperchunks.  Using HQL, a client
can read and write data that spans the arrays and attributes in an arrayset,
including computed attributes and arbitrary expressions.

Basic HQL
---------

To begin, the most basic building-block in HQL is a *slice* expression, which
follows the same syntactic rules as slicing in the Python language:  At its
most general a slice takes the form "start:stop:skip", which specifies every
:math:`skip`-th element in the half-open range :math:`[start, stop)`.  If start
is omitted, it defaults to zero.  If stop is omitted, it defaults to the length
of the available range.  If skip is omitted it defaults to one.  If start or
stop are negative, they represent indices counted backwards from the end of the
available range.  Start, stop, and skip may be omitted or used in any
combination desired:

* "10:20:2" - every other index in the range :math:`[10, 20)`.
* "10:20" - every index in the range :math:`[10, 20)`.
* "10:" - every index from 10 through the end of the available range.
* ":20" - every index in the range :math:`[0, 20)`.
* "..." - every index in the available range.
* ":" - every index in the available range.
* "::" - every index in the available range.
* "::2" - every other index in the available range, starting with zero: :math:`0, 2, 4, ...`.
* "1::2" - every other index in the available range, starting with one: :math:`1, 3, 5, ...`.
* "10" - index 10.
* "-1" - last index in the available range.
* "-10:" - last ten indices in the available range.

Recall that a slice is a range of indices along a single dimension, while
darrays are multi-dimensional.  Thus, to retrieve data from a darray with more
than one dimension, we need to specify *hyperslice* expressions.  To do this,
HQL uses slice expressions separated by commas.  For example:

* "1" - index 1 of a vector.
* "1,2" - row 1, column 2 of a matrix.
* "3,..." - row 3 of a matrix.
* "...,4" - column 4 of a matrix.
* "50:60,7" - rows :math:`[50, 60)` from column 7 in a matrix.
* "50:60,7:10" - rows :math:`[50, 60)` from columns :math:`[7, 10)` in a matrix.

Additionally, HQL allows us to combine multiple hyperslice expressions,
separated by vertical bars.  This means we can specify irregular sets of data
that can't be specified with the normal slice syntax alone:

* "1|3|4" - indices 1, 3, and 4 of a vector.
* "10:20|77" - indices :math:`[10, 20)` and 77 from a vector.
* "1,2|33,4" - cells 1,2 and 33,4 from a matrix.


With all this in mind, we can begin putting the pieces together into
hyperchunks.  A typical HQL expression includes three pieces of
information, separated with forward slashes::

    array expression / attribute expression / hyperslice expression

Since an arrayset is a one-dimensional set of darrays, an HQL array expression
is a set of one-or-more one-dimensional hyperslice expressions.  Similarly,
array attributes are accessed by their one-dimensional attribute indices, so
basic HQL attribute attribute expressions are also one-dimensional hyperslices.
Finally, the subset of each attribute to retrieve is specified using
one-or-more multi-dimensional hyperslices, which must match the dimensionality
of the underlying array.  Here are some simple examples:

* "1/2/10" - array 1, attribute 2, element 10
* "1/2/10:20" - array 1, attribute 2, elements :math:`[10, 20)`.
* "1/2/..." - the entire contents of array 1, attribute 2
* "1/2:4/..." - the entire contents of array 1, attributes 2 and 3
* ".../2/..." - the entire contents of attribute 2 for every array in the arrayset.
* ".../.../..." - everything in the entire arrayset.

The preceding examples assume one-dimensional darrays.  Here are some examples
of working with matrices:

* "1/2/10:20,30:40" - a ten-by-ten subset of the matrix stored in array 1, attribute 2.
* "1/2/:,3" - column 3 of the matrix stored in array 1, attribute 2.
* "1/2/3,..." - row 3 of the matrix stored in array 1, attribute 2.

And here are examples using multiple hyperslices:

* "1|3|4/.../..." - the entire contents of arrays 1, 3, and 4.
* "1/3|7|8/..." - the entire contents of array 1, attributes 3, 7, and 8.
* "1/2/:,0|:,3|:10" - columns 0, 3, and 10 from the matrix stored in array 1, attribute 2.

Note that when you use HQL to specify the locations for reading and writing
data, the data will contain the cartesian product of the specified arrays,
attributes, and hyperslices, in array-attribute-hyperslice order.  For example,
retrieving the hyperchunk "0:2/4:6/10:20|30:40" will return, in-order:

* Array 0, attribute 4, elements 10:20
* Array 0, attribute 4, elements 30:40
* Array 0, attribute 5, elements 10:20
* Array 0, attribute 5, elements 30:40
* Array 1, attribute 4, elements 10:20
* Array 1, attribute 4, elements 30:40
* Array 1, attribute 5, elements 10:20
* Array 1, attribute 5, elements 30:40

All of the APIs that work with hyperchunks take a set of hyperchunks,
rather than a single hyperchunk, as their parameter.  You can combine multiple
hyperchunks by separating them with semicolons:

* "1/2/...;3/4/..." - the entire contents of array 1 attribute 2 and array 3 attribute 4.

Advanced HQL
------------

In addition to slices specifying attribute indices, HQL attribute expressions can include
computed expressions that generate attribute data "on the fly".  Attribute expressions
currently include function execution and a full set of boolean expressions, including set
operations:

* "0/1|index(0)/..." - The entire contents of array 0, attribute 1, plus coordinate indices along dimension 0.
* "0/1|rank(a1,"asc")/..." - The entire contents of array 0, attribute 1, plus the rank of each attribute 1 element in ascending order.
* "0/1|a1 > 5/..." - Return the entire contents of array 0, attribute 1, and whether each attribute 1 element is greater than five.
* "0/1|a1 > 5 and a1 < 13/..." - Return the entire contents of array 0, attribute 1, and whether each attribute 1 element is between five and thirteen.
* "0/1|a1 in ["red", "cinnamon"]/..." - Return the entire contents of array 0, attribute 1, and whether each attribute 1 element matches "red" or "cinnamon".

HQL provides a full set of boolean operators: `<`, `>`, `<=`, `>=`, `==`, and
`!=`, along with `in` and `not in` for testing set membership, plus `and` and
`or` for logical comparisons.  You may use parentheses to control the
precedence of complex expressions.  Of course, you can specify as many computed
attribute expressions as you like, using vertical pipes as a separator.

HQL also allows an optional fourth type of expression, an "order" expression,
used to sort the data to be returned.  The order expression should return an
integer rank for each element in the data to be returned and appears between
the attribute expression and the hyperslices expression:

* 0/1/order:rank(a1,"asc")/... - The entire contents of array 0, attribute 1, sorted in ascending order.
* 0/1/order:rank(a2, "desc")/... - The entire contents of array 0, attribute 1, sorted in descending order of attribute 2
* 0/1/order:rank(a1,"asc")/0:10 - Array 0, attribute 1, first ten elements in ascending order.

Note that the hyperslice in the final example retrieves the first ten elements
of the sorted data, rather than the first ten elements of the attribute.

HQL Context
-----------

Depending on the context, not all APIs allow every HQL feature.  For example,
APIs that write data don't allow computed attribute expressions; some APIs only
allow array expressions; others allow only array and attribute expressions.
For those situations, you may omit the other parts of the HQL.  For example:

* "10:20;35" - arrays :math:`[10, 20)` plus array 35.
* "3/4;5/7" - array 3 attribute 4, plus array 5 attribute 7.

