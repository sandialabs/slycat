Data Table Creation
===================

CSV File Format
Most Slycat models can be created by supplying a CSV file.  The file is expected to follow the standard CSV format where each row is one set of samples.  The header row should name the values contained in the columns, and the delimiters should be commas. Columns may contain integers, real numbers, or strings.  Columns should be type consistent and missing data should be represented with an appropriate entry, such as “” for empty string or NAN for missing number.
 
 
Here is a simple CSV file example:

Index, variable1, variable2, result1, result2

1, 47, 2.3, 100.3, 0.019
2, 47, 2.5, 101.2, 0.022
3, 49, 2.3, 100.8, 0.029
4, 49, 2.5, 103.5, 0.026
 
To include a reference to a media file on a Linux file system, use this format:

file://hostname/path/to/images/image.jpg
 
To include a reference to a media file on a Windows file system, use this format:

smb://somehost.example.com/drive/path/to/images/image.jpg
 
Here is a CSV example for a Linux remote system that includes one media column:

index, value1, value2, image

1, 47, 2.5, file://hostname/scratch/bob/simulation_1/stress1.jpg

2, 48, 2.4, file://hostname/scratch/bob/simulation_2/stress1.jpg

3, 49, 2.3, file://hostname/scratch/bob/simulation_3/stress1.jpg
 
 
Here is a CSV example for a remote Windows file system, that includes one media column:

index, value1, value2, image

1, 47, 2.5, smb://somehost.example.com/collab/myProject/exper_1/topView.jpg

2, 48, 2.4, smb://somehost.example.com/collab/myProject/exper_2/topView.jpg

3, 49, 2.3, smb://somehost.example.com/collab/myProject/exper_3/topView.jpg
 

.. toctree::
  :maxdepth: 1
  
