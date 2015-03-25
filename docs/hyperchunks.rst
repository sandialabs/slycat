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
wide variety of data access patterns, we have developed the concept of a
*hyperchunk* - a compact representation of a set of data coordinates that can
span arrays and attributes in an arrayset.  In particular, a hyperchunk
specifies three pieces of information, separated with forward slashes::

    array slice / attribute slice / hyperslices

Before moving-on to some examples, we need to demonstrate all of the
ways to specify a *slice* (note that the following is consistent with the rules
for slicing in the Python language).  At its most general a slice takes the
form "start:stop:skip", which specifies every :math:`skip`-th element in the
half-open range :math:`[start, stop)`.  If start is omitted, it defaults to
zero.  If stop is omitted, it defaults to the length of the available range.
If skip is omitted it defaults to one.  If start or stop are negative, they
represent values before the end of the available range.  Start, stop, and
skip may be omitted or used in any combination desired:

* "10:20:2" - every other index in the range :math:`[10, 20)`.
* "10:20" - every index in the range :math:`[10, 20)`.
* "10:" - every index from 10 through the end of the available range.
* ":20" - every index in the range :math:`[0, 20)`.
* ":" - every index in the available range.
* "..." - every index in the available range.
* "::2" - every other index in the available range, :math:`0, 2, 4, ...`.
* "1::2" - every other index in the available range, :math:`1, 3, 5, ...`.
* "10" - index 10.
* "-1" - last index in the available range.
* "-10:" - last ten indices in the available range.

Remember that a slice is a range of indices along a single dimension.  A
*hyperslice* is a set of slices along multiple dimensions, separated by commas.
Putting it all together, here are some sample hyperchunks:

* "1/2/10" - array 1, attribute 2, element 10
* "1/2/10:20" - array 1, attribute 2, elements :math:`[10, 20)`.
* "1/2/..." - the entire contents of array 1, attribute 2
* "1/2:4/..." - the entire contents of array 1, attributes 2 and 3
* ".../2/..." - the entire contents of attribute 2 for every array in the arrayset.
* ".../.../..." - everything in the entire arrayset.

In all of the preceding examples, we've assumed one-dimensional darrays.  For
higher dimensions, our hyperslices become more complex:

* "1/2/10:20,30:40" - a ten-by-ten subset of the matrix stored in array 1, attribute 2.
* "1/2/:,3" - column 3 of the matrix stored in array 1, attribute 2.
* "1/2/3,..." - row 3 of the matrix stored in array 1, attribute 2.

Also, note from the above hyperchunk specification that the third part of a hyperchunk
is a set of *hyperslices*, not just a single hyperslice.  We can specify multiple hyperslices
in a hyperchunk, separating them with a vertical pipe:

* "1/2/:,0|:,3|:10" - columns 0, 3, and 10 from the matrix stored in array 1, attribute 2.

When you use a hyperchunk to specify the locations for reading and writing
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

Finally, some APIs only use the array portion, or the array and attribute
portions, of a hyperchunk.  For those situations, you may omit the hyperslices,
or the hyperslices and the attributes.  For example:

* "10:20;35" - arrays :math:`[10, 20)` plus array 35.
* "3/4;5/7" - array 3 attribute 4, plus array 5 attribute 7.
