# Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
# Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
# retains certain rights in this software.

# This is a Python command line script which decomposes a set
# of movies into pairwise distance matrices and trajectories
# for the VideoSwarm application.  The inputs to this script are
# a .csv file containing meta data, a column number in the .csv file
# (indexed from 1) indicating the movie file names to use for the
# distance matrix calculations, and a directory name (must exist)
# to write out the necessary VideoSwarm files.

# S. Martin
# 9/15/2017

# Options have been added to create movies and run in parallel.
# J. Gittinger, M. Letter 
# 11/2020


# standard library
##################

# command line 
import argparse

# reading files, parsing file names
import os
from os import listdir
import csv
import urllib.parse

# error handling
import sys
import traceback

# estimating time to complete
import time
import logging
import itertools

# 3rd party libraries
#####################

# video processing
import imageio

# parallel computations
import ipyparallel

# computing distance matrices and coordinates
import numpy
from sklearn.metrics.pairwise import euclidean_distances

# create movies
import ffmpy


# subroutines to set up environment
###################################

# parse command line arguments
def parse_command_line ():

    # provide description
    parser = argparse.ArgumentParser(
        description="Computes MDS coordinates for video frames "
                    "and trajectories for use by the VideoSwarm  "
                    "Slycat plugin.  "
                    "The output files are in the VideoSwarm format "
                    "with the names movies.trajectories, movies.xcoords "
                    "movies.ycoords, and movies.csv.")

    # mandatory arguments
    #####################

    # csv file
    parser.add_argument("--csv_file",
                        help="the .csv file containing the meta data for the videos "
                            "to be processed.")

    # column of frames
    parser.add_argument("--frame_col", type=int,
                        help="column number (indexed by 1) with the frame files "
                            "to be processed, first frame only.  Note that frame "
                            "files are expected to be of the format *.#.*, "
                            "where * is the video name (and does not vary by frame), "
                            "# is the frame number in the video, "
                            "and the last * is the file type extension.")

    # output directory for VS files
    parser.add_argument("--output_dir",
                        help="output directory for the VideoSwarm files")

    # conditional mandatory arguments
    #################################

    # decision to generate movies
    parser.add_argument("--generate_movies",
                        help="generate movies")

    # if generate_movies is true, must also provide
    # output directory containing movies
    parser.add_argument("--movie_dir",
                        help="write movies to this directory")

    # if generate_movies is false, must provide instead

    # column of movies
    parser.add_argument("--movie_col", default=None,
                        help="column number (indexed by 1) with the movie files "
                            "(can't use with --generate_movies).")

    # optional arguments
    ####################

    # log file
    parser.add_argument("--log_file", default=None,
                        help="log file for job status (optional)")

    # decision to replace existing movies
    parser.add_argument("--replace_movies", default=None,
                        help="replace existing movies.")

    # naming template for the simulation
    parser.add_argument("--sim_id_template", default=None,
                        help="naming template for the simulation id, consists of the "
                            "first part of the frame file path, up to the simulation identifier.")

    # number of dimensions to use for alignment
    parser.add_argument("--num_dim", default=10, type=int,
                        help="number of dimensions to use for alignment between frames, "
                            "defaults to 10.")

    # percent energy to use for alignment
    parser.add_argument("--energy", default=None, type=float,
                        help="percent of energy to use for alignment (overrides num_dim).")

    # known duration of video
    parser.add_argument("--fps", default=25, type=float,
                        help="frame per second, if known.  If unknown the script will "
                            "default to 25 fps.")

    # size of parallel partition
    parser.add_argument('--group_size', default=50, type=int,
                        help="number of frames per processor for parallel computation, "
                            "defaults to 50.")

    # parse arguments and distribute to variables
    return parser.parse_args()

# log file handler
def create_job_logger(file_name):
    """
    returns a logging function with the jid.log as the file name
    changed to print for compatibility for hpc
    :param jid: job id
    :return:
    """
    return lambda msg: print(msg, flush = True)

# set up logging
def init_logging (args):

    # set up log file, or print to screen (default)
    if args.log_file:
        log = create_job_logger(args.log_file)
    else:
        def log(msg):
            print(msg, flush = True)
    
    return log

# check command line arguments
def check_command_line_args(args, log):

    # check to see if mandatory arguments are present
    if args.csv_file == None:
        log("[VS_LOG] Error: .csv file not specified.")
        sys.exit()

    if args.frame_col == None:
        log("[VS-LOG] Error: frame column must be specified.")
        sys.exit()

    if args.output_dir == None:
        log("[VS-LOG] Error: output directory not specified.")
        sys.exit()

    # check that frame col is >= 1
    if args.frame_col <= 0:
        log('[VS-LOG] Error: frame column must be >= 1.')
        sys.exit()

    # check presence of both conditional arguments
    if args.movie_col != 'None' and args.generate_movies == 'true':
        log("[VS-LOG] Error: can't use both --generate_movies and --movie_col.")
        sys.exit()

    # check conditional mandatory arguments
    if args.generate_movies == 'true':

        # check that movie directory was specified
        if args.movie_dir == None:
            log("[VS-LOG] Error: movie directory not specified.")
            sys.exit()

        # check if the movie directory exists
        if os.path.exists(args.movie_dir):

            # check if overwrite has been selected
            if not args.replace_movies:

                log("[VS-LOG] Movie directory already exists, you must use "
                    "--replace_movies to proceed.")
                sys.exit()

    # otherwise check to see if movie column was provided and >= 1
    # else:
        
        # movie column provided
        # if args.movie_col == 'None':
        #     log('[VS-LOG] Error: must either generate movies or specify movie column.')
        #     sys.exit()
        
        # movie col is >= 1
        # if args.movie_col <= 0:
        #     log('[VS-LOG] Error: movie column must be >= 1.')
        #     sys.exit()

    # check optional arguments
    if args.group_size <= 0:
        log('[VS-LOG] Error: group size must be >= 1.')
        sys.exit()

    if args.fps <= 0:
        log('[VS-LOG] Error: fps must be > 0.')
        sys.exit()

# set up parallel python
def init_parallel(log):

    # set up ipython processor pool
    try:
        pool = ipyparallel.Client(profile=None)
        pool = pool.direct_view()
    except Exception as e:
        log(str(e))
        raise Exception("A running IPython parallel cluster is required to run this script.")

    return pool

# create output directories if they don't already exist
def init_working_dirs (args, log):

    # check to see if output directory exists
    if not os.path.exists(args.output_dir):

        # make diretory if it does not exist
        log("[VS-LOG] Creating working directory: " + args.output_dir)
        os.makedirs(args.output_dir)

    # check to see if movies directory exists
    if args.generate_movies == 'true':
        if not os.path.exists(args.movie_dir):

            # make directory if it does not exist
            log("[VS-LOG] Creating movies directory: " + args.movie_dir)
            os.makedirs(args.movie_dir)

# set up MDS alignment parameters
def init_parameters (args, log):

    # check limits on number dimensions
    num_dim = args.num_dim
    if num_dim < 2:
        log("[VS-LOG] Error: number dimensions must be >= 2.")
        sys.exit()

    # check limits on percent energy
    use_energy = False
    energy = 0
    if args.energy != None:
        energy = args.energy
        if energy <= 0 or energy > 100:
            log("[VS-LOG] Error: percent energy must be > 0 and <= 100.")
            sys.exit()
        else:
            use_energy = True
            energy = float(args.energy)

    return num_dim, use_energy, energy

# subroutines for reading and finding files
###########################################

# read csv file and get movie/frame file names
def read_csv(args, log):

    # read csv file
    log("[VS-LOG] Reading " + str(args.csv_file) + " ...")
    csv_file = open(args.csv_file)
    meta_data = list(csv.reader(csv_file))
    csv_file.close()

    num_movies = len(meta_data) - 1

    # get file names of movies
    movie_files = []
    if args.movie_col != 'None':
        movie_files = [movie_file[int(args.movie_col) - 1] for movie_file in meta_data]
        movie_files = movie_files[1:]

    # get file names of frames
    frame_files = [frame_file[int(args.frame_col) - 1] for frame_file in meta_data]
    frame_files = frame_files[1:]

    return num_movies, movie_files, frame_files, meta_data

# read and order frame files, generate movies if requested
def order_frame_files(args, log, num_movies, movie_files, frame_files):

    # identify all frame files and order them by frame number
    log("[VS-LOG] Locating and ordering frame files ...")

    num_frames = 0
    all_frame_files = []
    for i in range(0, num_movies):

        # create movie, if requested
        if (args.generate_movies == 'true' and args.replace_movies == 'None') or (args.generate_movies == 'true' and args.replace_movies == 'true'):
            movie_name = create_movie(args, log, frame_files, i)

            # keep track of movie files created
            movie_files.append(movie_name)
        elif (args.generate_movies == 'false' and args.movie_dir != 'None') or (args.generate_movies == 'true' and args.replace_movies == 'false'):
            movie_input, movie_output, file_location, frame_file_path = create_movie_name(args, log, frame_files, i)
            movie_name = file_location + movie_output
            movie_files.append(movie_name)

        # isolate first frame file
        frame_file_path, frame_file_name = \
            os.path.split(urllib.parse.urlparse(frame_files[i]).path)

        if args.generate_movies == 'false' and args.movie_dir != 'None':
            if args.sim_id_template != None:
                frame_file_path_split = frame_file_path.split(args.sim_id_template)
                frame_file_path_split = frame_file_path_split[1].split('/')
                simulation_id = '.simulation.' + frame_file_path_split[0]             

        # check for at least two dots in frame file name
        frame_split = frame_file_name.split('.')
        if len(frame_split) < 3:
            log("[VS-LOG] Error: incorrect frame file name format.")
            sys.exit()

        # get root file name, frame #, and extension
        frame_ext = frame_split[-1]
        frame_num = frame_split[-2]
        frame_root = ".".join(frame_split[0:-2])

        # get all files in frame path
        files_in_path = os.listdir(frame_file_path)

        # restrict to files with same root name
        frames_in_path = []
        frame_nums_in_path = []
        for j in range(0, len(files_in_path)):

            # get root file name
            file_split = files_in_path[j].split(".")

            # only consider files with at least two dots
            if len(file_split) < 3:
                continue

            # only consider files with same extension
            file_ext = file_split[-1]
            if file_ext != frame_ext:
                continue

            # get file root & frame num
            file_root = ".".join(file_split[0:-2])
            file_num = file_split[-2]

            # compare to file root of frames of interest
            if frame_root == file_root:
                frames_in_path.append(files_in_path[j])
                frame_nums_in_path.append(int(file_num))

        # order frames in path by frame number
        all_frame_files.append([os.path.join(frame_file_path, frames_in_path[j])
                                for j in numpy.argsort(frame_nums_in_path)])

        # check that all movies have same number of frames
        if i == 0:
            num_frames = len(all_frame_files[i])
        elif num_frames != len(all_frame_files[i]):
            # log("[VS-LOG] Error: inconsistent number of frames for video " + str(movie_files[i]))
            log("[VS-LOG] Error: inconsistent number of frames for video")
            sys.exit()

    # try to read image
    try:
        frame = imageio.imread(all_frame_files[0][0])
    except:
        log("[VS-LOG] Error: could not read frame " + str(all_frame_files[0][0]))
        sys.exit()

    # may succeed and be empty
    if frame is None:
        log("[VS-LOG] Error: could not read frame " + str(all_frame_files[0][0]))
        sys.exit()

    num_pixels = numpy.size(frame)

    # get duration of video based on number of frames and fps
    vid_duration = num_frames / float(args.fps)
    log("[VS-LOG] Estimated video duration is: " + str(vid_duration) + " seconds.")

    return num_frames, num_pixels, all_frame_files, movie_files, vid_duration

def create_movie_name(args, log, frame_files, i):
    # isolate first frame file
    frame_file_path, frame_file_name = \
        os.path.split(urllib.parse.urlparse(frame_files[i]).path)

    # get simulation identifier for movie generation
    if args.sim_id_template != 'None':
        frame_file_path_split = frame_file_path.split(args.sim_id_template)
        frame_file_path_split = frame_file_path_split[1].split('/')
        simulation_id = '.simulation.' + frame_file_path_split[0]
    else:
        simulation_id = '.simulation'

    split_path = frame_files[i].split(frame_file_path)

    # get the frame name, including number and file extension
    frame_name = split_path[1].split('/')[1]

    # get the identifier name only
    identifier = frame_name.split('.')[0]

    file_location = split_path[0]

    # generate movie name
    if args.movie_dir[-1] == '/':
        movie_output = args.movie_dir + identifier + simulation_id + '.%d.mp4' % (i+1)
    else:
        movie_output = args.movie_dir + '/' + identifier + simulation_id + '.%d.mp4' % (i+1)

    log("[VS-LOG] Creating movie " + movie_output)

    # frames to make into movie
    movie_input = frame_file_path + '/' +  identifier + '*.jpg'

    return movie_input, movie_output, file_location, frame_file_path
    
# create movie i
def create_movie(args, log, frame_files, i):

    movie_input, movie_output, file_location, frame_file_path = create_movie_name(args, log, frame_files, i)

    #create the movie
    ff = ffmpy.FFmpeg(
        inputs={None: ['-y', '-pattern_type', 'glob'], movie_input: None},
        outputs={None: ['-force_key_frames', '0.0,0.04,0.08', '-vcodec', 
                        'libx264', '-acodec', 'aac'],
        movie_output: None}
    )
    ff.run()

    return file_location + movie_output

# subroutines for MDS computations
##################################

# compute coordinates for a particular frame across all movies
# this routine is run in parallel using ipyparallel so it 
# must be self contained in terms of imports and subroutines
# returns coords as a numpy array if everything works,
# otherwise returns a string with an error message
def compute_coords(frame_number, input_num_movies, input_frame_files, 
            input_energy, input_use_energy, input_num_dim, input_num_pixels):

    # error handling (standard library)
    import sys
    import traceback

    # reading frames (3rd party library)
    import imageio

    # computations (3rd party libraries)
    import numpy
    from sklearn.metrics.pairwise import euclidean_distances

    # classical multidimensional scaling subroutine
    def cmdscale(D):
        """                                                                                      
        Classical multidimensional scaling (MDS)                                                 

        Parameters                                                                               
        ----------                                                                               
        D : (n, n) array                                                                         
            Symmetric distance matrix.                                                           

        Returns                                                                                  
        -------                                                                                  
        Y : (n, p) array                                                                         
            Configuration matrix. Each column represents a dimension. Only the                   
            p dimensions corresponding to positive eigenvalues of B are returned.                
            Note that each dimension is only determined up to an overall sign,                   
            corresponding to a reflection.                                                       

        e : (n,) array                                                                           
            Eigenvalues of B.                                                                                                                                                       
        """

        # Number of points
        n = len(D)

        # Centering matrix
        H = numpy.eye(n) - numpy.ones((n, n)) / n

        # YY^T
        B = -H.dot(D ** 2).dot(H) / 2

        # Diagonalize
        evals, evecs = numpy.linalg.eigh(B)

        # Sort by eigenvalue in descending order
        idx = numpy.argsort(evals)[::-1]
        evals = evals[idx]
        evecs = evecs[:, idx]

        # Compute the coordinates using positive-eigenvalued components only
        w, = numpy.where(evals >= 0)
        L = numpy.diag(numpy.sqrt(evals[w]))
        V = evecs[:, w]
        Y = V.dot(L)

        # if only one coordinate then add two columns of zeros
        if len(w) == 1:
            Y = numpy.append(numpy.reshape(Y, (Y.shape[0], 1)),
                            numpy.zeros((Y.shape[0], 2)), axis=1)

        # if only two coordinates then add one column of zeros
        if len(w) == 2:
            Y = numpy.append(Y, numpy.zeros((Y.shape[0], 1)), axis=1)

        return Y, evals

    # start of compute_coords main code
    input_frames = numpy.ones((input_num_movies, input_num_pixels))
    
    # using a try/catch to show errors on remote nodes/cores
    try:

        # read in one frame for all movies
        for j in range(0, input_num_movies):

            # get frame i
            try:
                frame_i = imageio.imread(input_frame_files[j])
            except Exception as e:
                return str(e), input_num_dim

            # check for empty image file
            if frame_i is None:
                return input_frame_files[j] + ' is empty.', input_num_dim

            # save frame pixels
            input_frames[j, :] = frame_i.astype(float).reshape(input_num_pixels)

        # now compute distance for frame i
        dist_mat = euclidean_distances(input_frames) / 255.0

        # now compute MDS for frame i
        mds_coords, evals = cmdscale(dist_mat)

        # re-compute num_dim if energy is being used
        # this should only be done on the first call
        if input_use_energy:

            # set num_dims according to percent
            energy_evals = numpy.cumsum(evals) / numpy.sum(evals)
            energy_dim = numpy.where(energy_evals >= input_energy/100)
            if len(energy_dim[0]) == 0:
                input_num_dim = len(energy_evals)

            else:
                input_num_dim = max(1,numpy.amin(energy_dim)) + 1

        # truncate mds coords
        if mds_coords.shape[1] >= input_num_dim:
            curr_coords = mds_coords[:,0:input_num_dim]

        else:
            curr_coords = numpy.concatenate((mds_coords, \
                          numpy.zeros((input_num_movies, 
                            input_num_dim - mds_coords.shape[1]))), axis=1)

        return curr_coords, input_num_dim

    except Exception as e:
        return traceback.format_exc(), input_num_dim

# parallel coordinate calculation
def parallel_coords(log, pool, GROUP_SIZE, num_movies, num_frames, num_pixels, 
                    all_frame_files, num_dim, use_energy, energy):

    # accumulate frame coords for each frame
    all_curr_coords = []

    # estimate time for entire run
    start_time = time.time()

    # organize the frame files for ipyparallel 
    # (should be visited in reverse order)
    list_frame_files = []
    for frame_number in reversed(range(num_frames)):
        accumulator = []
        for j in range(0, num_movies):
            accumulator.append(all_frame_files[j][frame_number])
        list_frame_files.append(accumulator)

    # compute last frame to adjust num_dim if necessary
    curr_coords, num_dim = compute_coords(0, num_movies, 
        list_frame_files[0], energy, use_energy, num_dim, num_pixels)

    # save last frame, or quit on error
    if type(curr_coords) == numpy.ndarray:
        all_curr_coords.append(curr_coords)
    else:
        log(curr_coords)
        sys.exit()
        
    # num_dim is now correct, so don't need to re-compute
    use_energy = False

    # organize parameters for ipyparallel (these are all constants)
    list_num_movies = list(itertools.repeat(num_movies, GROUP_SIZE))
    list_energy = list(itertools.repeat(energy, GROUP_SIZE))
    list_use_energy = list(itertools.repeat(use_energy, GROUP_SIZE))
    list_num_dim = list(itertools.repeat(num_dim, GROUP_SIZE))
    list_num_pixels = list(itertools.repeat(num_pixels, GROUP_SIZE))

    log("[VS-LOG] Sending compute jobs to nodes, "
        "this may take a while depending on job size ...")
 
    # call ipyparallel in batches
    steps = list(range(1, num_frames, GROUP_SIZE)) + [num_frames]
    for i in range(len(steps)-1):

        # get start and stop
        start = steps[i]
        stop = steps[i+1]
        
        # use remainder in case we are at the end
        remainder = stop - start

        # frame numbers for this batch
        frame_numbers = list(range(start,stop))

        # call ipyparallel
        pool_results = pool.map_sync(compute_coords,
                                     frame_numbers,
                                     list_num_movies[0:remainder],
                                     list_frame_files[start:stop],
                                     list_energy[0:remainder],
                                     list_use_energy[0:remainder],
                                     list_num_dim[0:remainder],
                                     list_num_pixels[0:remainder])

        # if no errors accumulate results
        for result in pool_results:
            if type(result[0]) == numpy.ndarray:
                all_curr_coords.append(result[0])
        
            # otherwise log error message and quit
            else:
                log(result[0])
                sys.exit()

        # print progress
        log("[VS-LOG] %s/%s frames computed." % (stop, num_frames))
        
        # estimated percentage complete
        progress = round(stop / num_frames * 100.0)

        # make sure it's a number between 0 and 100
        progress = numpy.clip(progress, 0, 100)

        # record into log for polling code
        log("[VS-PROGRESS] " + str(progress))

    log("[VS-PROGRESS] " + str(100))

    # keeping a linear calculation example here for debugging
    # alt_curr_coords = [compute_coords(frame_number, num_movies, list_frame_files[frame_number], 
    #     energy, use_energy, num_dim, num_pixels)[0] for frame_number in range(num_frames)]

    # check that parallel and serial computation agree
    # check_parallel = True
    # for frame_number in range(num_frames):
    #     if not numpy.array_equal(all_curr_coords[frame_number], 
    #                              alt_curr_coords[frame_number]):
    #         check_parallel = False
    # print(check_parallel)

    time_elapsed = time.time() - start_time
    log("[VS-LOG] total compute time (s): %s" % time_elapsed)

    return all_curr_coords

# perform frame alignment (assume that all_curr_coords is in reverse order)
def align_coords(all_curr_coords, num_frames, num_movies):

    # storage for x and y coords
    xcoords = numpy.ones((num_frames, num_movies))
    ycoords = numpy.ones((num_frames, num_movies))

    for i in range(num_frames):

        # rotate to previous coordinates
        if i == 0:
            old_coords = all_curr_coords[i]

        else:
            # do Kabsch algorithm
            A = all_curr_coords[i].transpose().dot(old_coords)
            U, S, V = numpy.linalg.svd(A)
            rot_mat = (V.transpose()).dot(U.transpose())

            # rotate to get new coordinates
            all_curr_coords[i] = all_curr_coords[i].dot(rot_mat.transpose())

            # update old coords
            old_coords = all_curr_coords[i]

        # update x,y coords
        xcoords[num_frames-1-i, :] = all_curr_coords[i][:, 0]
        ycoords[num_frames-1-i, :] = all_curr_coords[i][:, 1]

    return xcoords, ycoords

# scale coordinates for VideoSwarm interface
def scale_coords (xcoords, ycoords):

    # get range for x
    min_x = numpy.amin(xcoords)
    max_x = numpy.amax(xcoords)

    # get range for y
    min_y = numpy.amin(ycoords)
    max_y = numpy.amax(ycoords)

    # scale coordinates to be in [0,1]^2
    # if constant assign value of 1/2
    xcoords = (xcoords - min_x)
    if max_x > min_x:
        xcoords = xcoords / (max_x - min_x)
    else:
        xcoords = xcoords + 0.5

    ycoords = (ycoords - min_y)
    if max_y > min_y:
        ycoords = ycoords / (max_y - min_y)
    else:
        ycoords = ycoords + 0.5

    return xcoords, ycoords


# output results to VideoSwarm files
####################################

# write out VideoSwarm files
def output_VS_files(args, log, meta_data, movie_files, vid_duration, 
                    num_frames, xcoords, ycoords):

    log("[VS-LOG] Writing movies.csv file ...")
    # add a column to the end of the csv with created movie files
    if args.movie_col == 'None':
        log("[VS-LOG] Creating movie column.")
        for i in range(0, (len(meta_data))):
            if i == 0:
                meta_data[i].append("Movie Files")
            else:
                meta_data[i].append(movie_files[i-1])

    # write out movies.meta (the .csv file)
    meta_file = open(os.path.join(args.output_dir, 'movies.csv'), 'w')
    csv_meta_file = csv.writer(meta_file)
    csv_meta_file.writerows(meta_data)
    meta_file.close()

    # write out movies.xcoords file (use only float precision)
    log("[VS-LOG] Writing movies.xcoords ...")
    xcoords_file = open(os.path.join(args.output_dir, 'movies.xcoords'), 'w')
    csv_xcoords_file = csv.writer(xcoords_file)
    for i in xcoords.tolist():
        csv_xcoords_file.writerow(['{:f}'.format(x) for x in i])
    xcoords_file.close()

    # write out movies.ycoords file
    log("[VS-LOG] Writing movies.ycoords ...")
    ycoords_file = open(os.path.join(args.output_dir, 'movies.ycoords'), 'w')
    csv_ycoords_file = csv.writer(ycoords_file)
    for i in ycoords.tolist():
        csv_ycoords_file.writerow(['{:f}'.format(y) for y in i])
    ycoords_file.close()

    # add time to first row of xcoords to make trajectories
    num_movies = len(meta_data) - 1
    time_row = numpy.linspace(0, vid_duration, num=num_frames)
    traj = numpy.ones((num_movies + 1, num_frames))
    traj[0, :] = time_row
    traj[1:, :] = xcoords.transpose()

    # write out movies.trajectories
    log("[VS-LOG] Writing movies.trajectories ...")
    traj_file = open(os.path.join(args.output_dir, 'movies.trajectories'), 'w')
    csv_traj_file = csv.writer(traj_file)
    for i in traj.tolist():
        csv_traj_file.writerow(['{:f}'.format(t) for t in i])
    traj_file.close()

    log("[VS-LOG] All files written successfully to: " + str(args.output_dir))
    log("[VS-FINISHED] parse_frames.py complete.")


# organize all the steps for computing coordinates
def main():

    # set up environment
    ####################

    # parse command line
    args = parse_command_line()

    # start loggging
    log = init_logging(args)

    # check command line arguments
    check_command_line_args(args, log)

    # start parallel pool
    pool = init_parallel(log)

    # create output directories
    init_working_dirs(args, log)

    # initialize alignment parameters
    num_dim, use_energy, energy = init_parameters(args, log)

    # read and parse files
    ######################

    # read csv file
    num_movies, movie_files, frame_files, meta_data = read_csv(args, log)

    # order frame files and make movies, if requested
    num_frames, num_pixels, all_frame_files, movie_files, vid_duration = \
        order_frame_files(args, log, num_movies, movie_files, frame_files)

    # MDS calculations
    ##################

    # perform parallel coordinate calculation
    all_curr_coords = parallel_coords(log, pool, args.group_size, num_movies, 
                                      num_frames, num_pixels, all_frame_files, 
                                      num_dim, use_energy, energy)

    # algin coordinates
    xcoords, ycoords = align_coords(all_curr_coords, num_frames, num_movies)

    # scale coordinates
    xcoords, ycoords = scale_coords(xcoords, ycoords)

    # write out VS files
    ####################

    output_VS_files(args, log, meta_data, movie_files, 
                    vid_duration, num_frames, xcoords, ycoords)


# command line entry point
if __name__ == "__main__":
    main()