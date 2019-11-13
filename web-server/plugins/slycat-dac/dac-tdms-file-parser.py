# This script imports PTS zip files for DAC.  It is modified from
# the slycat-csv-parser.  This parser uploads a PTS CSV/META zip
# file then pushes the stored files to the previous CSV/META parsers.
#
# S. Martin
# 7/14/2017

# computation and array manipulation
import numpy
from scipy import spatial

# web server interaction
import slycat.web.server
import cherrypy

# file manipulation
import io
import os

# reading tdms files
import nptdms
import pandas as pd

# background thread does all the work on the server
import threading
import sys
import traceback

# for dac_compute_coords.py and dac_upload_model.py
import imp


# go through all tdms files and make of record of each shot
# filter out channels that have < MIN_TIME_STEPS
# filter out shots that have < MIN_CHANNELS
def filter_shots (database, model, parse_error_log, tdms_ref, MIN_TIME_STEPS, MIN_CHANNELS):

    shot_meta = []          # meta data for shot
    shot_data = []          # channel data for shot

    for tdms_file in tdms_ref:

        # get root meta data properties, same for every row of table
        root_properties = pd.DataFrame(tdms_file.object().properties, index=[0]).add_suffix(' [Root]')

        for group in tdms_file.groups():

            # name shot/channel for potential errors
            shot_name = tdms_file.object().properties['name'] + '_' + group

            # get channels for group
            group_channels = tdms_file.group_channels(group)

            # compile channel data in a list
            channel_data = []

            for channel_object in group_channels:

                # each channel is a dictionary containing name, unit, and time data
                channel = {}

                # get time information for channel
                channel['wf_samples'] = channel_object.properties.get('wf_samples', None)
                channel['wf_start_offset'] = channel_object.properties.get('wf_start_offset', None)
                channel['wf_increment'] = channel_object.properties.get('wf_increment', None)
                channel['wf_unit'] = channel_object.properties.get('wf_unit', None)

                # get channel name
                channel['name'] = channel_object.channel

                # get channel unit
                channel['unit'] = channel_object.properties.get('Unit', None)

                # get actual time series
                channel['data'] = channel_object.data

                # check that channel is not empty
                if channel['wf_samples'] is None:

                    parse_error_log.append('Discarding channel "' + channel['name'] + '" in shot "' +
                          shot_name + '" -- empty time series.')
                    slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                          ["Progress", "\n".join(parse_error_log)])

                    continue

                # check that channel has enough time steps
                if channel['wf_samples'] < MIN_TIME_STEPS:

                    parse_error_log.append('Discarding channel "' + channel['name'] + '" in shot "' +
                          shot_name + '" -- less than ' + str(MIN_TIME_STEPS) + ' time steps.')
                    slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                          ["Progress", "\n".join(parse_error_log)])

                    continue

                # a shot contains a list of channel data
                channel_data.append(channel)

            # check that shot has enough channels
            if len(channel_data) < MIN_CHANNELS:

                parse_error_log.append('Discarding shot "' + shot_name + '" -- less than ' +
                                       str(MIN_CHANNELS) + ' channels.')
                slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                      ["Progress", "\n".join(parse_error_log)])

                continue

            # keep track of channel names and time data
            shot_data.append(channel_data)

            # gather meta data:

            # get group meta data properties, different for each row of table
            group_properties = pd.DataFrame(tdms_file.object(group).properties, index=[0]).add_suffix(' [Group]')

            # combine root and group properties
            group_root_properties = group_properties.join(root_properties, sort=False)

            # add shot index
            shot = pd.DataFrame([group], index=[0], columns=['Group'])
            group_root_shot_properties = group_root_properties.join(shot, sort=False)

            # make unique index to row from name and group number (shot)
            group_root_shot_properties['Index (Name_Group)'] = group_root_shot_properties['name [Root]'].astype(str) + \
                                                               '_' + group_root_shot_properties['Group']
            group_df = group_root_shot_properties.set_index('Index (Name_Group)')

            shot_meta.append(group_df)

    return parse_error_log, shot_meta, shot_data


# routine to find minimal channel list for list of shots, order preserving
# also returns maximum (union) of channels, for error messages, not order preserving
def intersect_channels (shot_channels):

    # assume empty intersection
    min_chan = []
    max_chan = []
    channel_counts = []

    # check for non-empty list of shots
    if len(shot_channels) > 0:

        # go through each shot and look at the channels available
        min_chan = shot_channels[0]
        max_chan = shot_channels[0]
        for i in range(0, len(shot_channels)):

            # get intersection and union of channels
            min_chan = [channel for channel in min_chan if channel in shot_channels[i]]
            max_chan = list(set(max_chan) | set(shot_channels[i]))

            # count number of channels for each shot
            channel_counts.append(len(shot_channels[i]))

    # only care about minimum unique values for channel counts
    min_channel_counts = min(numpy.unique(channel_counts))

    return min_chan, max_chan, min_channel_counts


# routine to reduce shot data to smallest channel minimum by order
# if can't reduce, changes SHOT_TYPE to 'General'
def reduce_shot_channels (database, model, parse_error_log, first_shot_name, shot_channels, shot_data, \
                          min_channels, min_channel_count, SHOT_TYPE, shot_type_min):

    num_shots = len(shot_channels)

    if min_channel_count >= shot_type_min:

        parse_error_log.append('Found ' + str(min_channel_count) +
               ' channels for ' + SHOT_TYPE + ' testing -- using "' +
               first_shot_name + '" for channel names.')
        slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                              ["Progress", "\n".join(parse_error_log)])

        # reduce channels to consistent number
        for i in range(0, num_shots):
            shot_data[i] = shot_data[i][0:min_channel_count]

        min_channels = shot_channels[0]

    else:

        parse_error_log.append('Found less than ' + str(shot_type_min) + ' channels per shot for ' +
               SHOT_TYPE + ' testing, reverting to General case.')
        slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                              ["Progress", "\n".join(parse_error_log)])

        SHOT_TYPE = 'General'

    return parse_error_log, shot_data, min_channels, SHOT_TYPE


# filter out channels to obtain a consistent number
# of channels per shot and get channel names
def filter_channels (database, model, parse_error_log, first_shot_name, shot_data, SHOT_TYPE):

    # get channel names
    shot_channels = [[channel['name'] for channel in shot] for shot in shot_data]

    # get list of channels that occur in every shot
    min_channels, all_channels, min_channel_count = intersect_channels(shot_channels)

    # in the overvoltage case, we use channel order and assume at least two channels
    if SHOT_TYPE == 'Overvoltage':
        parse_error_log, shot_data, min_channels, SHOT_TYPE = \
            reduce_shot_channels(database, model, parse_error_log, first_shot_name, shot_channels, shot_data, \
                                 min_channels, min_channel_count, SHOT_TYPE, 2)

    # in the sprytron case, we use channel order and assume at least six channels
    if SHOT_TYPE == 'Sprytron':
        parse_error_log, shot_data, min_channels, SHOT_TYPE = \
            reduce_shot_channels(database, model, parse_error_log, first_shot_name, shot_channels, shot_data, \
                                 min_channels, min_channel_count, SHOT_TYPE, 6)

    # in the general case, we discard channels not present in all shots
    num_shots = len(shot_channels)
    if SHOT_TYPE == 'General':
        for channel in all_channels:
            if channel not in min_channels:

                parse_error_log.append('Discarding channel "' + channel + '" -- not present in all shots.')
                slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                      ["Progress", "\n".join(parse_error_log)])

                # discard channel from all shots
                for i in range(0, num_shots):

                    # replace old channel data
                    new_channel = []
                    new_data = []

                    for j in range(0, len(shot_channels[i])):
                        if shot_channels[i][j] != channel:
                            new_channel.append(shot_channels[i][j])
                            new_data.append(shot_data[i][j])

                    # update all channel information
                    shot_channels[i] = new_channel
                    shot_data[i] = new_data

    return parse_error_log, min_channels, shot_data


# get channel units from consensus or inference via channel names
def infer_channel_units (database, model, parse_error_log, first_shot_name, channel_names,
                         shot_units, INFER_CHANNEL_UNITS, SHOT_TYPE):

    num_channels = len(channel_names)
    num_shots = len(shot_units)
    channel_units = []

    # check for consistent channel units
    for i in range(0, num_channels):

        # flag for inconsistent units
        inconsistent_units = False

        # get units of first shot in this channel
        unit_0 = shot_units[0][i]

        # compare units of each shot in list
        for j in range(0, num_shots):
            unit_j = shot_units[j][i]
            if unit_j != unit_0:
                inconsistent_units = True

        # go with first unit assignment if inconsistent units found
        if inconsistent_units:

            parse_error_log.append('Inconsistent units found for channel "' + channel_names[i] + '", using "' +
                  str('Not Given' if unit_0 is None else unit_0) + '" from shot "' +
                  first_shot_name + '".')
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["Progress", "\n".join(parse_error_log)])

        # if missing unit, infer from name using Jeremy's method
        if unit_0 is None and INFER_CHANNEL_UNITS:

            if channel_names[i].find('I') >= 0:
                unit_0 = 'Amps'
            elif channel_names[i].find('Current') >= 0:
                unit_0 = 'Amps'
            else:
                unit_0 = 'Volts'

        channel_units.append(unit_0)

    # double check units using number of channels for Overvoltage type
    if SHOT_TYPE == 'Overvoltage':

        # if units don't agree with expected units issue warning
        if not channel_units[0:2] == ['Amps', 'Volts']:

            parse_error_log.append('Warning -- units different from expected units for Overvoltage testing.')
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["Progress", "\n".join(parse_error_log)])

    # double check units for Sprytron type
    if SHOT_TYPE == 'Sprytron':

        # if units don't agree with expected units issue warning
        if not channel_units[0:6] == ['Amps', 'Volts', 'Volts', 'Volts', 'Amps', 'Volts']:

            parse_error_log.append('Warning -- units different from expected units for Sprytron testing.')
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["Progress", "\n".join(parse_error_log)])

    # change None type to 'Not Given' for final output
    channel_units = ['Not Given' if unit is None else unit for unit in channel_units]

    return parse_error_log, channel_units


# makes a time vector from start, increment, and samples
def make_time_vector (shot_time):

    # shot_time is [start, increment, samples]
    start = shot_time[0]
    increment = shot_time[1]
    samples = int(shot_time[2])

    # construct time vector
    time_vector = []
    for i in range(0, samples):
        time_vector.append(start + increment*i)

    return time_vector


# construct and intersect/union all time vectors using a vector of shot times
def combine_time_vectors (shot_times, TIME_STEP_TYPE):

    num_shots = len(shot_times)

    # go through each shot and intersect or union time vectors
    time_vector = make_time_vector(shot_times[0])
    for i in range(0, num_shots):

        time_i = make_time_vector(shot_times[i])

        if TIME_STEP_TYPE == 'Intersection':
            time_vector = numpy.intersect1d(time_vector, time_i)
        else:
            time_vector = numpy.union1d(time_vector, time_i)

    return time_vector


# normalize time steps using either intersection or union
# note shot_data, channel_names, and channel_units might be changed if
# a channel is removed because it doesn't have enough time steps
def normalize_time_steps (database, model, parse_error_log, shot_data, channel_names,
                          channel_units, MIN_TIME_STEPS, TIME_STEP_TYPE):

    # get shot time interval data
    shot_times = [[[channel['wf_start_offset'], channel['wf_increment'], channel['wf_samples']]
                   for channel in shot] for shot in shot_data]

    # check that time steps are the same for every included channel
    num_shots = len(shot_times)
    num_channels = len(channel_names)

    # form time steps (list of time vectors) for DAC
    time_steps = []

    for i in range(0, num_channels):

        time_0 = shot_times[0][i]
        inconsistent_time_steps = False

        # compare time for first shot with time for remaining shots
        for j in range(0, num_shots):
            time_j = shot_times[j][i]
            if time_j != time_0:
                inconsistent_time_steps = True

        # if inconsistent time steps warn user then use intersection or union
        if inconsistent_time_steps:

            parse_error_log.append('Found inconsistent time steps for channel "' + channel_names[i] +
                  '" -- normalizing time steps using ' + TIME_STEP_TYPE + '.')
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["Progress", "\n".join(parse_error_log)])

            if TIME_STEP_TYPE == 'Union':

                parse_error_log.append('Warning -- Union introduces artificial data from interpolation and extrapolation.')
                slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                      ["Progress", "\n".join(parse_error_log)])

            # form union or intersection time vector
            time_steps.append(combine_time_vectors(numpy.array(shot_times)[:, i], TIME_STEP_TYPE))

        else:

            # add time vector to time steps list
            time_steps.append(make_time_vector(shot_times[0][i]))

    # check if any time_steps have been reduced below MIN_TIME_STEPS threshold
    # use reverse order because we may be removing items from the data lists
    for i in range(num_channels - 1, -1, -1):

        if len(time_steps[i]) < MIN_TIME_STEPS:

            parse_error_log.append('Discarding channel "' + channel_names[i] + '" -- less than ' +
                   str(MIN_TIME_STEPS) + ' time steps.')
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["Progress", "\n".join(parse_error_log)])

            # discard channel from all shots
            for j in range(0, num_shots):
                # remove channel i from data, time steps, names, and units
                shot_data[j].pop(i)
                time_steps.pop(i)
                channel_names.pop(i)
                channel_units.pop(i)

    return parse_error_log, time_steps, shot_data, channel_names, channel_units


# get channel time units from data or time steps and seconds inference
def infer_channel_time_units (database, model, parse_error_log, first_shot_name,
                              shot_time_units, time_steps, INFER_SECONDS, channel_names):

    num_channels = len(channel_names)
    num_shots = len(shot_time_units)
    channel_time_units = []

    # check for consistent channel units
    for i in range(0, num_channels):

        # flag for inconsistent units
        inconsistent_units = False

        # get units of first shot in this channel
        unit_0 = shot_time_units[0][i]

        # compare units of each shot in list
        for j in range(0, num_shots):
            unit_j = shot_time_units[j][i]
            if unit_j != unit_0:
                inconsistent_units = True

        # go with first unit assignment if inconsistent units found
        if inconsistent_units:

            parse_error_log.append('Inconsistent time units found for channel "' + channel_names[i] + '", using "' +
                  str('Not Given' if unit_0 is None else unit_0) + '" from shot "' +
                  first_shot_name + '".')
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["Progress", "\n".join(parse_error_log)])

        # if missing unit, infer secons and time steps magnitude
        if unit_0 is None and INFER_SECONDS:

            # change unit_0 to seconds
            unit_0 = 'Seconds'

            # check if magnitude of time steps is in micro-seconds
            time_magnitude = (time_steps[i][-1] - time_steps[i][0]) * 10**6
            if time_magnitude > 0 and time_magnitude < 1000:

                # change units to microseconds
                unit_0 = 'Microseconds'

                # change actual time values to microseconds
                time_steps[i] = numpy.multiply(time_steps[i], 10**6)

        channel_time_units.append(unit_0)

    # change None type to 'Not Given' for final output
    channel_time_units = ['Not Given' if unit is None else unit for unit in channel_time_units]

    return parse_error_log, channel_time_units, time_steps


# construct DAC variables to match time steps
def construct_variables (shot_data, time_steps):

    # get shot time interval data
    shot_times = [[[channel['wf_start_offset'], channel['wf_increment'], channel['wf_samples']]
                   for channel in shot] for shot in shot_data]

    # check that time steps are the same for every included channel
    num_shots = len(shot_times)
    num_channels = len(shot_times[0])

    # variables contains a list of matrices for DAC
    variables = []
    var_dist = []

    # get variables for each channel
    for i in range(0, num_channels):

        # each channel has one array of variables
        channel_vars = []

        for j in range(0, num_shots):

            # start with NaNs for entire variable
            var_j = numpy.array([float('NaN')] * len(time_steps[i]))

            # get time steps and variable for this channel and shot
            time_j = make_time_vector(shot_times[j][i])
            data_j = numpy.array(shot_data[j][i]['data'])

            # get indices of time_j in time_steps
            inds_in_time_steps = numpy.where(numpy.isin(time_steps[i], time_j) == True)[0]
            inds_in_time_j = numpy.where(numpy.isin(time_j, time_steps[i]) == True)[0]

            # fill in variable with available data
            var_j[inds_in_time_steps] = data_j[inds_in_time_j]

            # interpolate or extrapolate for any NaNs
            nan_inds = numpy.isnan(var_j)
            if numpy.any(nan_inds):

                # returns time indices of logical array
                time = lambda z: z.nonzero()[0]

                # interpolates between values, extrapolates past ends
                var_j[nan_inds] = numpy.interp(time(nan_inds), time(~nan_inds), var_j[~nan_inds])

            # add this variable to our channel list
            channel_vars.append(list(var_j))

        # add the channel variable matrix to variable list
        variables.append(numpy.array(channel_vars))

        # create pairwise distance matrix
        dist_i = spatial.distance.pdist(variables[-1])
        var_dist.append(spatial.distance.squareform(dist_i))

    return variables, var_dist


def parse_tdms(database, model, input, files, aids, **kwargs):

    """
    uploads a set of .tdms files and parses them for the database
    :param database: slycat.web.server.database.couchdb.connect()
    :param model: database.get("model", self._mid)
    :param input: boolean
    :param files: files to be parsed
    :param aids: normally artifact ID, but we are using it as [csv parms, dig parms],
                 where csv parms is number of csv files to require, and digitizer parms
                 is number of digitizers to require (see wizard)
    :param kwargs:
    """

    cherrypy.log.error("DAC TDMS parser started.")

    # get user parameters
    MIN_TIME_STEPS = int(aids[0])
    MIN_CHANNELS = int(aids[1])
    SHOT_TYPE = aids[2]
    TIME_STEP_TYPE = aids[3]
    INFER_CHANNEL_UNITS = aids[4]
    INFER_SECONDS = aids[4]

    # keep a parsing error log to help user correct input data
    # (each array entry is a string)
    parse_error_log = []
    parse_error_log.append("Notes:")

    # count number of tdms files
    num_files = len(files)
    parse_error_log.append("Uploaded " + str(num_files) + " file(s).")

    # start parse log
    slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                          ["Progress", "\n".join(parse_error_log)])

    # push progress for wizard polling to database
    slycat.web.server.put_model_parameter(database, model, "dac-polling-progress", ["Extracting ...", 10.0])

    # treat each uploaded file as bitstream
    file_object = []
    tdms_ref = []

    for i in range(0,num_files):

        try:

            file_object.append(io.BytesIO(files[i]))
            tdms_ref.append(nptdms.TdmsFile(file_object[i]))

        except Exception as e:

            # couldn't open tdms file, report to user
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                  ["Error", "couldn't read .tdms file."])

            # record no data message in front of parser log
            parse_error_log.append("Error -- couldn't read .tmds file.")
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["No Data", "\n".join(parse_error_log)])

            # print error to cherrypy.log.error
            cherrypy.log.error(traceback.format_exc())

    stop_event = threading.Event()
    thread = threading.Thread(target=parse_tdms_thread, args=(database, model, tdms_ref,
                              MIN_TIME_STEPS, MIN_CHANNELS, SHOT_TYPE, TIME_STEP_TYPE,
                              INFER_CHANNEL_UNITS, INFER_SECONDS, parse_error_log, stop_event))
    thread.start()


def parse_tdms_thread (database, model, tdms_ref, MIN_TIME_STEPS, MIN_CHANNELS, SHOT_TYPE, TIME_STEP_TYPE,
                              INFER_CHANNEL_UNITS, INFER_SECONDS, parse_error_log, stop_event):
    """
    Extracts CSV/META data from the zipfile uploaded to the server
    and processes it/combines it into data in the DAC generic format,
    finally pushing that data to the server.  Problems are described
    and returned to the calling function.
    """

    # put entire thread into a try-except block in order to print
    # errors to cherrypy.log.error
    try:

        # import dac_upload_model from source
        push = imp.load_source('dac_upload_model',
                               os.path.join(os.path.dirname(__file__), 'py/dac_upload_model.py'))

        cherrypy.log.error("DAC TDMS thread started.")

        # filter shots according to user preferences MIN_TIME_STEPS and MIN_CHANNELS
        parse_error_log, shot_meta, shot_data = filter_shots(database, model, parse_error_log, tdms_ref,
                                            MIN_TIME_STEPS, MIN_CHANNELS)

        # was any data imported?
        if len(shot_meta) == 0:

            # record no data message in front of parser log
            parse_error_log.append("Error: no data imported -- check minimum channel (" + str(MIN_CHANNELS) +
                  ") and minimum time step (" + str(MIN_TIME_STEPS) + ") filters.")
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["No Data", "\n".join(parse_error_log)])

            # done polling
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                  ["Error", "no data could be imported (see Info > Parse Log for details)"])

            # quit early
            stop_event.set()


        # push progress for wizard polling to database
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Extracting ...", 20.0])

        # finalize list of usable channels
        parse_error_log, channel_names, shot_data = filter_channels(database, model, parse_error_log, shot_meta[0].index[0],
                                                   shot_data, SHOT_TYPE)

        # check that enough channels are still present
        if len(channel_names) < MIN_CHANNELS:

            # record no data message in front of parser log
            parse_error_log.append("Error: no data imported -- available numbers of channels is less than "
                                   + str(MIN_CHANNELS) + ".")
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["No Data", "\n".join(parse_error_log)])

            # done polling
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                  ["Error", "no data could be imported (see Info > Parse Log for details)"])

            # quit early
            stop_event.set()

        # push progress for wizard polling to database
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Extracting ...", 30.0])

        # get shot units
        shot_units = [[channel['unit'] for channel in shot] for shot in shot_data]

        # finalize channel units
        parse_error_log, channel_units = infer_channel_units(database, model, parse_error_log, shot_meta[0].index[0],
                                            channel_names, shot_units, INFER_CHANNEL_UNITS, SHOT_TYPE)

        # push progress for wizard polling to database
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Extracting ...", 40.0])

        # normalize time step data
        parse_error_log, time_steps, shot_data, channel_names, channel_units = \
            normalize_time_steps(database, model, parse_error_log,
                shot_data, channel_names, channel_units, MIN_TIME_STEPS, TIME_STEP_TYPE)

        # check that enough channels are still present
        if len(channel_names) < MIN_CHANNELS:

            # record no data message in front of parser log
            parse_error_log.append("Error: no data imported -- available numbers of channels is less than " +
                                   str(MIN_CHANNELS) + ".")
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["No Data", "\n".join(parse_error_log)])

            # done polling
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                  ["Error", "no data could be imported (see Info > Parse Log for details)"])

            # quit early
            stop_event.set()

        # push progress for wizard polling to database
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Computing ...", 50.0])

        # construct DAC variables and distance matrices to match time steps
        variables, var_dist = construct_variables(shot_data, time_steps)

        # get shot time units
        shot_time_units = [[channel['wf_unit'] for channel in shot] for shot in shot_data]

        # finalize time units
        parse_error_log, channel_time_units, time_steps = \
            infer_channel_time_units(database, model, parse_error_log,
                                     shot_meta[0].index[0], shot_time_units,
                                     time_steps, INFER_SECONDS, channel_names)

        # push progress for wizard polling to database
        slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                              ["Computing ...", 60.0])

        # construct remaining DAC variables

        # construct meta data table (modified from Jeremy Little's code to
        # append [root] to root columns and [group] to group columns)
        meta_df = pd.DataFrame()
        for i in range(0, len(shot_meta)):
            # add rows and repeat
            meta_df = meta_df.append(shot_meta[i], sort=False)

        # convert pandas dataframe to header and rows
        meta_column_names = meta_df.reset_index().columns.values.tolist()
        meta_rows = meta_df.reset_index().values.tolist()

        # construct variables.meta table
        meta_var_col_names = ['Name', 'Time Units', 'Units', 'Plot Type']

        # construct meta variable rows
        meta_vars = []
        num_vars = len(channel_names)
        for i in range(0, num_vars):
            meta_vars.append([channel_names[i], channel_time_units[i], channel_units[i], 'Curve'])

        # show which digitizers were parsed
        for i in range(num_vars):
            parse_error_log.append("Channel " + str(meta_vars[i][0]) + " parsed successfully.")

        # check that we still have enough digitizers
        if num_vars < MIN_CHANNELS:
            parse_error_log.append("Total number of channels parsed less than " + str(MIN_CHANNELS) +
                                   " -- no data remaining.")
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["Progress", "\n".join(parse_error_log)])
            meta_rows = []

        # if no parse errors then inform user
        if len(parse_error_log) == 1:
            parse_error_log.append("None.")
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                    ["Progress", "\n".join(parse_error_log)])

        # summarize results for user
        parse_error_log.insert(0, "Summary:")
        parse_error_log.insert(1, "Total number of tests parsed: " + str(len(meta_rows)) + ".")
        parse_error_log.insert(2, "Each test has " + str(num_vars) + " digitizer time series.\n")

        # if no data then return failed result
        if len(meta_rows) == 0:

            # record no data message in front of parser log
            slycat.web.server.put_model_parameter(database, model, "dac-parse-log",
                                                  ["No Data", "\n".join(parse_error_log)])

            # done polling
            slycat.web.server.put_model_parameter(database, model, "dac-polling-progress",
                                                  ["Error", "no data could be imported (see Info > Parse Log for details)"])

            # quit early
            stop_event.set()

        else:

            # upload model to slycat database
            push.init_upload_model (database, model, parse_error_log,
                                    meta_column_names, meta_rows,
                                    meta_var_col_names, meta_vars,
                                    variables, time_steps, var_dist)

            # done -- destroy the thread
            stop_event.set()

    except Exception as e:

        # print error to cherrypy.log.error
        cherrypy.log.error(traceback.format_exc())


def register_slycat_plugin(context):
    context.register_parser("dac-tdms-file-parser", ".tdms file", ["dac-tdms-files"], parse_tdms)

