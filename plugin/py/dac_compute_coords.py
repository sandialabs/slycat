# Copyright 2013, Sandia Corporation. Under the terms of Contract
# DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
# rights in this software.

# Computes a coordinate representation using Multidimensional Scaling
# on an alpha-sum of distance matrices.
#
# S. Martin
# 1/6/2015

"""Computes a coordinate representation using Multidimensional Scaling
on an alpha-sum of distance matrices.  The distance matrices are stored
in a list of 2d numpy arrays and the alpha values are stored in a 1d numpy
array."""

import numpy as np
import scipy

import cherrypy

# cmdscale translation from Matlab by Francis Song 
def cmdscale(D):
    """                                                                                      
    Classical multidimensional scaling (MDS)                                                 
                                                                                               
    Parameters                                                                               
    ----------                                                                               
    D : (n, n) array                                                                         
        Symmetric distance matrix.                                                           
                                                                                               
    Returns                                                                                  
    -------                                                                                  
    Y : (n, 2) array
        Configuration matrix. Each column represents a dimension. Only the                   
        p dimensions corresponding to positive eigenvalues of B are returned.                
        Note that each dimension is only determined up to an overall sign,                   
        corresponding to a reflection.  Only returns 2d coordinates.
    Yinv : multiply (dx - d_mean) times Yinv to get 2d projected coordinates,
           where dx is a row vector of distances to points in Y and d_mean
           is the average of the distance in Y.
    """
    
    # number of points
    n = len(D)

    # for multiple points, solve eigenvalue problem
    if n > 1:

        # Centering matrix
        H = np.eye(n) - np.ones((n, n)) / n

        # YY^T
        B = -H.dot(D ** 2).dot(H) / 2

        # Diagonalize (keep only two largest eigenvals)
        evals, evecs = scipy.linalg.eigh(B, eigvals=(n-2,n-1))

        # Sort by eigenvalue in descending order
        idx   = np.argsort(evals)[::-1]
        evals = evals[idx]
        evecs = evecs[:,idx]

        # Compute the coordinates using positive-eigenvalued components only
        w, = np.where(evals > 0)
        L  = np.diag(np.sqrt(evals[w]))
        V  = evecs[:,w]
        Y  = V.dot(L)

        # compute inverse for projection
        Linv = np.diag(np.reciprocal(np.sqrt(evals[w])))
        Yinv = - V.dot(Linv) / 2.0

        # if no coordinates then use two columns of zeros for Y and Yinv
        if len(w) == 0:
            Y = np.zeros((n,2))
            Yinv = np.zeros((n,2))

        # if only one coordinate then add one column of zeros to Y and Yinv
        if len(w) == 1:
            Y = np.append(np.reshape(Y, (Y.shape[0],1)),
                          np.zeros((Y.shape[0],1)), axis=1)
            Yinv = np.append(np.reshape(Yinv, (Yinv.shape[0], 1)),
                          np.zeros((Yinv.shape[0], 1)), axis=1)

    # for one point set coordinates to center of screen
    else:
        Y = np.array([0, 0])
        Yinv = np.array([0, 0])

    return Y, Yinv


def compute_coords (dist_mats, alpha_values, old_coords, subset, proj=None):
    """
    Computes sum alpha_i^2 dist_mat_i.^2 then calls cmdscale to compute
    classical multidimensional scaling.
    
    INPUTS: dist_mats is a list of numpy arrays containing square
            matrices (n,n) representing distances, and alpha_values is
            a numpy array containing a vector of alpha values between
            0 and 1.
            subset is a vector of length n with 1 = in subset, 0 = not in subset.
            proj is an optional vector similar to subset, defaults to vector
            of all 1.
    
    OUTPUTS: Y is a numpy array of coordinates (n,2) and
    """

    # set projection default (vector of all ones -- everything in projection)
    num_tests = dist_mats[0].shape[0]
    if proj is None:
        proj = np.ones(num_tests)

    # make sure projection is an array
    else:
        proj = np.asarray(proj)

    # get sizes of projection, subset
    num_proj = int(np.sum(proj))
    num_subset = int(np.sum(subset))

    # use subset if not full dataset, otherwise get projection
    cmd_subset = subset
    compute_proj = False
    if num_subset == num_tests:
        cmd_subset = proj
        compute_proj = True

    # init distance matrix to size of working subset
    num_cmd_subset = int(np.sum(cmd_subset))
    full_dist_mat = np.zeros((num_cmd_subset,num_cmd_subset))

    # compute alpha-sum of distance matrices on subset
    subset_inds = np.where(cmd_subset)[0]
    for i in range(len(dist_mats)):
        full_dist_mat = full_dist_mat + alpha_values[i]**2 * \
                        dist_mats[i][subset_inds[:,None], subset_inds]**2

    # compute mds coordinates on subset
    mds_subset_coords, proj_inv = cmdscale(np.sqrt(full_dist_mat))

    # if not in subset, assign coordinates of [0,0]
    mds_coords = old_coords
    mds_coords[subset_inds,:] = mds_subset_coords

    # compute projection, if no subset and projection not full dataset
    if compute_proj and (num_proj < num_tests):

        # get points to project
        proj_inds = np.where(cmd_subset==0)[0]

        # compute mean distance squared for points in projection
        mean_dist = np.mean(full_dist_mat, axis=1)

        # compute distance squared for each point to be projected
        proj_dist_mat = np.zeros((num_proj, num_proj))
        for i in range(len(dist_mats)):
            proj_dist_mat = proj_dist_mat + alpha_values[i] ** 2 * \
                                            dist_mats[i][proj_inds[:, None], subset_inds] ** 2

        # compute projected coords
        proj_coords = (proj_dist_mat - mean_dist).dot(proj_inv)

        # put projected coords into mds coords
        mds_coords[proj_inds,:] = proj_coords

    return mds_coords


def scale_coords (coords, full_coords, subset, center):
    """
    Adjusts coords (with 2 columns) so that the orientation is
    correlated with the full_coords and scaled by the scalar
    scale to fit in a box [0,1]^2.
    
    INPUTS: coords is numpy matrix (n,2) of coords to scale,
            full_coords is numpy matrix (n,2) to align
            as a reference for the coords vector.
            subset is a vector of length n with 1 = in subset, 0 = not in subset.
            
    OUTPUTS: a numpy matrix (n,2) of adjusted coordinates.
    """

    # get subset for scaling
    subset_inds = np.where(subset)[0]
    subset_coords = coords[subset_inds,:]
    full_subset_coords = full_coords[subset_inds,:]

    # mean subtract full subset
    full_subset_mean = np.mean(full_subset_coords, axis=0)
    full_subset_coords_ms = full_subset_coords - full_subset_mean

    # use Kabsch algorithm to rotate coords in line with full_coords
    corr_mat = np.dot(subset_coords.transpose(),full_subset_coords_ms)
    u,s,v = np.linalg.svd(corr_mat)
    rot_mat = np.dot(v, u.transpose())

    # rotate to get new coords
    rot_coords = np.dot(subset_coords, rot_mat.transpose())
    
    # get maximum absolute value in full coordinate system
    coords_scale = np.amax(np.absolute(rot_coords))
    if coords_scale < np.finfo(float).eps:
        coords_scale = 1.0

    # scale to [0,1]^2
    scaled_coords = rot_coords / (2.0 * coords_scale) + 0.5

    # set coords of anything not in subset
    num_coords = coords.shape[0]
    new_coords = np.zeros((num_coords,2))
    for i in range(num_coords):
        if subset[i] == 0:

            # compute direction to move non-subset coord
            move_dir = coords[i,:] - center
            norm_move_dir = np.linalg.norm(move_dir)
            if norm_move_dir == 0:
                move_dir = np.array([-1,-1])
            else:
                move_dir = center + 2.0 * move_dir/norm_move_dir

            # put somewhere beyond [0,1], but in the same direction from center
            new_coords[i,:] = move_dir

    # set newly computed subset coordinates
    new_coords[subset_inds,:] = scaled_coords

    return new_coords


def init_coords (var_dist, proj=None):
    """
    Computes initial MDS coordinates assuming alpha values are all 1.0

    INPUTS: var_dist is a list of distance matrices

    OUTPUTS: mds_coords are the initial scaled MDS coordinates
             full_mds_coords are the unscaled version of the same coordinates
    """

    num_vars = len(var_dist)

    # assume initial alpha values are all one
    alpha_values = np.ones(num_vars)

    # scale distance matrices by maximum, unless maximum is zero
    for i in range(0, num_vars):

        coords_scale = np.amax(var_dist[i])
        if coords_scale < np.finfo(float).eps:
            coords_scale = 1.0

        var_dist[i] = var_dist[i] / coords_scale

    # compute MDS coordinates assuming alpha = 1 for scaling, full subset, full view
    subset_mask = np.ones(var_dist[0].shape[0])
    old_coords = np.zeros((var_dist[0].shape[0], 2))
    full_mds_coords = compute_coords(var_dist, alpha_values, old_coords, subset_mask, proj)

    # scale using full coordinates
    subset_center = np.array([.5,.5])
    mds_coords = scale_coords(full_mds_coords, full_mds_coords, subset_mask, subset_center)

    return mds_coords, full_mds_coords


def compute_alpha_clusters (var_dist, meta_columns, meta_column_types):
    """
    Computes the alpha cluster values.

    INPUTS: var_dist is a list of distance matrices
            meta_columns is a list of meta data arrays
            meta_column_types is a list of the meta data array types

    OUTPUTS: alpha_cluster_mat is a matrix containing all the alpha
             values for clustering each meta data array
    """

    num_vars = len(var_dist)
    num_time_series = var_dist[0].shape[0]

    # form a matrix with each distance matrix as a column (this is U matrix)
    all_dist_mat = np.zeros((num_time_series * num_time_series, num_vars))
    for i in range(num_vars):
        all_dist_mat[:, i] = np.squeeze(np.reshape(var_dist[i],
                                    (num_time_series * num_time_series, 1)))

    # for each quantitative meta variable, compute distances as columns (V matrices)
    prop_dist_mats = []  # store as a list of numpy columns
    num_meta_cols = len(meta_column_types)
    for i in range(num_meta_cols):
        if meta_column_types[i] == "float64":

            # compute pairwise distance matrix vector for property i
            prop_dist_mats.append(compute_prop_dist_vec(meta_columns[i], num_time_series))

        elif meta_column_types[i] == "string":

            # compute pairwise distance matrix for property i
            # using strings (sorted alphabetically and assigned
            # values starting at 0)

            # sort potential values in string metadata
            uniq_sorted_columns = sorted(set(meta_columns[i]))

            # use alphabetical order to make a vector of numbers
            meta_column_num = [uniq_sorted_columns.index(str_meta) for str_meta in meta_columns[i]]

            prop_dist_mats.append(compute_prop_dist_vec(meta_column_num, num_time_series))

        else:

            # do nothing
            prop_dist_mats.append(0)

    # compute NNLS cluster button alpha values, if more than one data point
    alpha_cluster_mat = np.zeros((num_meta_cols, num_vars))
    if num_time_series > 1:
        for i in range(num_meta_cols):
            if (meta_column_types[i] == "float64") or \
               (meta_column_types[i] == "string"):

                beta_i = scipy.optimize.nnls(all_dist_mat, prop_dist_mats[i])
                alpha_i = np.sqrt(beta_i[0])

                # again don't divide by zero
                alpha_max_i = np.amax(alpha_i)
                if alpha_max_i <= np.finfo(float).eps:
                    alpha_max_i = 1
                alpha_cluster_mat[i, :] = alpha_i / alpha_max_i

    return alpha_cluster_mat


# subroutine for compute_alpha_clusters which computes the pairwise
# distance matrix for the alpha slider optimization
def compute_prop_dist_vec(prop_vec, vec_length):

    # compute pairwise distance matrix for property
    prop_dist_mat = np.absolute(
        np.transpose(np.tile(prop_vec, (vec_length, 1))) - np.tile(prop_vec, (vec_length, 1)))
    prop_dist_vec = np.squeeze(np.reshape(prop_dist_mat, (vec_length * vec_length, 1)))

    # make sure we don't divide by 0
    prop_dist_vec_max = np.amax(prop_dist_vec)
    if prop_dist_vec_max <= np.finfo(float).eps:
        prop_dist_vec_max = 1.0

    return prop_dist_vec / prop_dist_vec_max