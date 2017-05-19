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

    # if only one coordinate then add column of zeros
    if len(evals) == 1:
        Y2D = np.zeros((Y.shape[0],Y.shape[1]+1))
        Y2D[:,0] = Y
        Y = Y2D

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
    