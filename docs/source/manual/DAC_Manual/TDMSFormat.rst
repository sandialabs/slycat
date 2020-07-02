TDMS Format
===========

The TDMS format uses files created with National Instruments (http://www.ni.com) LabView software.  The TDMS 
format is quite complicated and can contain a variety of information 
(see https://www.ni.com/en-us/support/documentation/supplemental/06/the-ni-tdms-file-format.html) .  The 
TDMS files that can be imported into DAC are specific to a particular Sandia project.  These files can be 
imported as individual files or as archived .zip file containing directories with TDMS files.  In the case of 
the TDMS .zip format, DAC will identify any TDMS files (by the .tdms extension) and attempt to combine the data 
in those files.


