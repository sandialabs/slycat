.. _PTS-CSV-MetaFormat:

PTS CSV/META Zip Format
=======================

This data format is designed to facilitate ingestion from a Sandia-specific project.  Constructing this format is complex 
and contains redundant copies of the same information.  Consequently, it is not recommended for general use.  However, we 
document it here for completeness.  The format consists of a zip file containing two subdirectories named CSV and META. 

Within the CSV subdirectory are a set of .csv files, where each .csv contains a single time series.  Within the META 
subdirectory are corresponding sets of .ini files, where each .ini file contains the metadata for a single temporal 
variable for a single ensemble member (one of the .csv files in the other directory).  Given that there are *n* temporal 
variables and *k* ensemble members, both directories will contain *n × k* files.  There is no naming convention for these 
files, beyond the fact that each .csv file must have a corresponding .ini file.  However, it is convenient to use a 
naming convention such as <member descriptor> <member index> <underscore> <variable descriptor> <variable index>.  The 
index for the ensemble member should vary between 1 and *n*.  The index for the temporal variable should vary between 1 
and *k*.

So, for example, if we had data sampled at 10 cities (our ensemble members) and 20 temporal variables per city, we could 
name the timeseries for the 10th temporal variable for the second city as city2_temp10.csv.  We would then need to name 
the corresponding meta variable file as city2_temp10.ini.  Or instead, we could have named them more abstractly, t2_d10.csv 
and t2_d10.ini, respectively.

.csv
----

Each time series file has four columns, named “SampleNum”, “Raw”, “X”, and “Y”, respectively.  *SampleNum* is a one-based 
index of the time samples in the file.  *Raw* contains the raw data values for the quantity being sampled.  *X* is the temporal 
value for the sample that will be used as the *x*-coordinate in the *Time Series Plot*.  *Y* is the sampled value that will be 
plotted (either the original raw value or a scaled/modified value).

.ini
----
These files contain the metadata for each temporal variable for each sample.  They also contain the scalar metadata for 
each sample, which is repeated for each temporal variable (since there is a file per temporal variable per sample).  The 
metadata is described using key-value pairs in an ASCII text file.  An example from our weather data set for the city of 
*New York* for the first temporal variable, *Max Temperature*, would look like::

   ; Fake PTS Weather data
   ; S. Martin 6/23/2017
   
   [test]
   City="New York"
   State="New York"
   Time Zone="Eastern"
   Population="8213839"
   Latitude="40.7833"
   Longitude="72.0333"
   Average Temperature (F)="52.3166"
   Average Humidity (%)=”62.4648”
   Annual Precipitation (In)="57.02"
   Average Windspeed (MPH)="11.5126"
   Average Visibility (Miles)="9.1206"
   Average Cloud Cover (Okta)="5.27889"
   
   [operation]
   test_op_inst_id=1
   
   [waveform]
   WF_DIG_ID="1"
   WF_DIG_LABEL="Max Temperature"
   WF_X_UNITS="Day"
   WF_Y_UNITS="F"

Comments are lines beginning with a ‘;’.  The bracketed text, *[test]*, *[operation]*, and *[waveform]* are required.  The 
key-value pairs in the *[test]* section are used in the *Metadata Table*.  They can be any set of variables and values, so long 
as they are consistent across the samples (inconsistent values will generate warnings and/or errors during model creation – 
see :ref:`ModelParseLog`).  The table values are in quotes.  Under *[operation]*, the *test_op_inst_id* variable provides the ensemble 
member number.  The *test_op_inst_id* is also typically encoded in the file name, but this is optional.  Under *[waveform]*, the 
*WF_DIG_ID* variable provides the temporal variable index.  Unlike the variable names in the *[test]* section, the variable names 
in the *[waveform]* section cannot be changed.  Only the values for those waveform variables can be modified to describe the time 
series quantities.

The two most important fields in the .ini file are *test_op_inst_id*, which identifies the member of the ensemble, and *WF_DIG_ID*, 
which identifies the variable for that member.  These two fields uniquely identify the time series, regardless of the file name 
provided.

These CSV and META directories must then be archived using the .zip format as described in :ref:`archiving-Windows` and 
:ref:`archiving-Mac`. 
