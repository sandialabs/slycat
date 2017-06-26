This directory contains example data for use with the dial-a-cluster
application.  There is only one sample dataset, as follows:

weather-csv -- a multivariate time series dataset containing weather statistics
over the year 2014 for the top 100 most populated cities in the US, taken
from the weather underground web site.  This folder contains the generic
dial-a-cluster format described below.

weather-pts -- the same data set in the "pts" format.  The "pts" format is an
inferior internal format which only a lunatic would use.  It therefore remains
undocumented.

The files in the weather-csv directory conform to the generic dial-a-cluster format.
All the files are comma separated.

The central index file (selected using the wizard) is:

datapoints.dac -- information on the data points, must include a header
that describes each column.  Following the header are rows 
for each datapoint (so there should be same number of rows as the number 
of rows in each of the .var files).  For the push script (dac-create-model.py)
the name has to be "datapoints.dac".  For the wizard it only has to have the
".dac" extension.

In the "time" directory:

variable_1.time -- containing the values of the time steps for the first
variable.  Note that this don’t actually have to be time steps, but are
the x-axis values.

...

variable_n.time -- there are n variables.

In the "var" directory:

variable_1.var -- actual time series, assumed rectified, one time series 
per row, must have equal lengths, but different variables can have different lengths.

...

variable_n.var -- there are n time series variables.

variables.meta -- information on the time series for plotting, has three 
tab delimited columns with header: Name, Time Units, Units, Plot Type.  Following 
the header are rows for each time series (so there should be n rows + 
the header).  For Plot Type there are three choices: Curve, Bar, and Scatter.
These options refer to plot type, where curve is a traditional time series type
representation, bar is a histogram type plot, and scatter is a point plot.

In the "dist" directory is derived data:

variable_1.dist -- pairwise distance matrix between each 
time series in variable_1.var

...

variable_n.dist -- n time series

Finally, you can specify dial-a-cluster preferences in three files (in
the "pref" directory):

alpha_parms.pref --  alpha parameters and order to present sliders to user, has
a header with the columns (comma delimited): Alpha, Order.  Each row specifies
the time series variable alpha default (starting with first time series), and
the order to present to the user (starting with 1).

variable_defaults.pref -- the three preferred time series (variables) to show
on the right hand side of the dial-a-cluster app, comma delimited on one line.
This file just has three numbers which give the defaults variables to display (starting with 1).

dac_ui.pref -- dial-a-cluster user interface parameters in a comma separated
table, one per line in the format NAME,value.  The file must contain the header
Preference,Value.  The parameters specify colors, pixel sizes, etc. for the
web page.  Any values not specified have defaults. 
