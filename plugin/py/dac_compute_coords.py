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
from scipy import optimize

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
    H = np.eye(n) - np.ones((n, n))/n
 
    # YY^T                                                                                   
    B = -H.dot(D**2).dot(H)/2
 
    # Diagonalize                                                                            
    evals, evecs = np.linalg.eigh(B)
 
    # Sort by eigenvalue in descending order                                                 
    idx   = np.argsort(evals)[::-1]
    evals = evals[idx]
    evecs = evecs[:,idx]
 
    # Compute the coordinates using positive-eigenvalued components only                     
    w, = np.where(evals >= 0)
    L  = np.diag(np.sqrt(evals[w]))
    V  = evecs[:,w]
    Y  = V.dot(L)

    # if only one coordinate then add two columns of zeros
    if len(w) == 1:
        Y = np.append(np.reshape(Y, (Y.shape[0],1)),
                      np.zeros((Y.shape[0],2)), axis=1)

    # if only two coordinates then add one column of zeros
    if len(w) == 2:
        Y = np.append(Y, np.zeros((Y.shape[0],1)), axis=1)

    return Y, evals
    
def compute_coords (dist_mats, alpha_values):
    """
    Computes sum alpha_i^2 dist_mat_i.^2 then calls cmdscale to compute
    classical multidimensional scaling.
    
    INPUTS: dist_mats is a list of numpy arrays containing square
            matrices (n,n) representing distances, and alpha_values is
            a numpy array containing a vector of alpha values between
            0 and 1.
    
    OUTPUTS: Y is a numpy array of coordinates (n,c) and
             e is a numpy array of eigenvalues (n)
    """
        
    # first compute alpha-sum of distance matrices
    full_dist_mat = np.zeros(dist_mats[0].shape[0])
    for i in range(len(dist_mats)):
        full_dist_mat = full_dist_mat + alpha_values[i]**2 * dist_mats[i]**2

    # now do MDS on full distance matrix
    return cmdscale(np.sqrt(full_dist_mat))

def scale_coords (coords, full_coords):
    """
    Adjusts coords (with 3 columns) so that the orientation is
    correlated with the full_coords and scaled by the scalar
    scale to fit in a box [0,1]^3.
    
    INPUTS: coords is numpy matrix (n,3) of coords to scale, 
            full_coords is numpy matrix (n,3) to align
            as a reference for the coords vector.
            
    OUTPUTS: a numpy matrix (n,3) of adjusted coordinates.
    """
    
    # use Kabsch algorithm to rotate coords in line with full_coords
    corr_mat = np.dot(coords.transpose(),full_coords)
    u,s,v = np.linalg.svd(corr_mat)
    rot_mat = np.dot(v, u.transpose())

    # rotate to get new coords
    rot_coords = np.dot(coords, rot_mat.transpose())
    
    # get maximum absolute value in full coordinate system
    coords_scale = np.amax(np.absolute(rot_coords))
    if coords_scale < np.finfo(float).eps:
        coords_scale = 1.0

    # adjust so we have the least amount of sign changes
    # and all values lie within box [0,1]^3
    scaled_coords = rot_coords/(2.0*coords_scale) + 0.5
    
    return scaled_coords

def init_coords (var_dist):
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

    # compute MDS coordinates assuming alpha = 1 for scaling
    full_mds_coords = compute_coords(var_dist, alpha_values)
    full_mds_coords = full_mds_coords[0][:, 0:3]

    # scale using full coordinates
    mds_coords = scale_coords(full_mds_coords, full_mds_coords)

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

            # compute pairwise distance matrix for property i
            prop_dist_mat_i = np.absolute(
                np.transpose(np.tile(meta_columns[i],
                                    (num_time_series, 1))) - np.tile(meta_columns[i],
                                    (num_time_series, 1)))
            prop_dist_vec_i = np.squeeze(np.reshape(prop_dist_mat_i,
                                    (num_time_series * num_time_series, 1)))

            # make sure we don't divide by 0
            prop_dist_vec_max_i = np.amax(prop_dist_vec_i)
            if prop_dist_vec_max_i <= np.finfo(float).eps:
                prop_dist_vec_max_i = 1.0
            prop_dist_mats.append(prop_dist_vec_i / prop_dist_vec_max_i)

        else:
            prop_dist_mats.append(0)

    # compute NNLS cluster button alpha values, if more than one data point
    alpha_cluster_mat = np.zeros((num_meta_cols, num_vars))
    if num_time_series > 1:
        for i in range(num_meta_cols):
            if meta_column_types[i] == "float64":

                beta_i = optimize.nnls(all_dist_mat, prop_dist_mats[i])
                alpha_i = np.sqrt(beta_i[0])

                # again don't divide by zero
                alpha_max_i = np.amax(alpha_i)
                if alpha_max_i <= np.finfo(float).eps:
                    alpha_max_i = 1
                alpha_cluster_mat[i, :] = alpha_i / alpha_max_i

    return alpha_cluster_mat