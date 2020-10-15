/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/
// This script contains code to load data from the Slycat database using
// http requests via jQuery.  The data returned as a jQuery "promises" so
// that multiple datasets can be requested before something is done.

// S. Martin
// 1/15/2015

import api_root from "js/slycat-api-root";
import URI from "urijs";

 export default {

	// *******************************************************
	// GENERIC FUNCTIONS: for reading tables, parameters, etc.
	// *******************************************************
    model : { _id: URI(window.location).segment(-1) },

	// load meta data from a table artifact stored in the model
    get_table_metadata: function (tableid)
    {
        var self = this;
    	return $.ajax(api_root + "models/" + self.model._id + "/tables/" + tableid + "/arrays/0/metadata");
    },

    // get table data artifact stored in the model
    get_table: function (tableid, modelid=self.model._id)
    {
        var self = this;
    	return $.when ($.ajax(api_root + "models/" + modelid + "/tables/" +
    					 tableid + "/arrays/0/metadata")).then(
    		function (metadata)
    		{
          		return $.ajax(api_root + "models/" + modelid + "/tables/" + tableid +
          			"/arrays/0/chunk?rows=0-" + metadata["row-count"] +
          			"&columns=0-" + metadata["column-count"]);
          	}
    	);
	 },

	// get parameter data stored in model
    get_parameters: function (parmid)
    {
        var self = this;
    	return $.ajax(api_root + "models/" + self.model._id + "/parameters/" + parmid);
    },

    // get array metadata (e.g. number of rows and columns)
    // arrayid is the name and arraynum is index in the case of multiple arrays
    get_array_metadata: function (arrayid, arraynum)
    {
        var self = this;
    	return $.ajax(api_root + "models/" + self.model._id + "/arraysets/" + arrayid + "/metadata?arrays=" +
    		arraynum);
    },

    // get actual array data (rowids is an array of rows to fetch)
    get_array: function (arrayid, arraynum)
    {
        var self = this;
    	return $.when ($.ajax(api_root + "models/" + self.model._id + "/arraysets/" + arrayid +
    				"/metadata?arrays=" + arraynum)).then(
    		function (metadata)
    		{
    			if (metadata.arrays[0].dimensions.length == 1) {
    				// only one row is available (1d array)
    				return $.ajax(api_root + "models/" + self.model._id + "/arraysets/" + arrayid + "/arrays/" +
    					arraynum + "/attributes/0/chunk?ranges=0," +
    					metadata.arrays[0].dimensions[0].end);
    			} else {
    				// pick all rows (2d array)
    				return $.ajax(api_root + "models/" + self.model._id + "/arraysets/" + arrayid + "/arrays/" +
    					arraynum + "/attributes/0/chunk?ranges=0," +
    					metadata.arrays[0].dimensions[0].end + ",0," +
    					metadata.arrays[0].dimensions[1].end);
    			}
    		}
    	);
    }
};