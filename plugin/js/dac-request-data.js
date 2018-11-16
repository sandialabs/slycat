// This script contains code to load data from the Slycat database using
// http requests via jQuery.  The data returned as a jQuery "promises" so
// that multiple datasets can be requested before something is done.

// S. Martin
// 1/15/2015

import api_root from "js/slycat-api-root";

export default {

    // *******************************************************
    // GENERIC FUNCTIONS: for reading tables, parameters, etc.
    // *******************************************************

    // load meta data from a table artifact stored in the model
    get_table_metadata: function (tableid, mid) {
        return $.ajax(api_root + "models/" + mid + "/tables/" + tableid + "/arrays/0/metadata");
    },

    // get table data artifact stored in the model
    get_table: function (tableid, mid) {
        return $.when($.ajax(api_root + "models/" + mid + "/tables/" +
            tableid + "/arrays/0/metadata")).then(
            function (metadata) {
                return $.ajax(api_root + "models/" + mid + "/tables/" + tableid +
                    "/arrays/0/chunk?rows=0-" + metadata["row-count"] +
                    "&columns=0-" + metadata["column-count"]);
            }
        );
    },

    // get parameter data stored in model
    get_parameters: function (parmid, mid) {

        return $.ajax(api_root + "models/" + mid + "/parameters/" + parmid);
    },

    // get array metadata (e.g. number of rows and columns)
    // arrayid is the name and arraynum is index in the case of multiple arrays
    get_array_metadata: function (arrayid, arraynum) {
        return $.ajax(location.href + "/arraysets/" + arrayid + "/metadata?arrays=" +
            arraynum);
    },

    // get actual array data (rowids is an array of rows to fetch)
    get_array: function (arrayid, arraynum, mid) {
        return $.when($.ajax(api_root + "models/" + mid + "/arraysets/" + arrayid +
            "/metadata?arrays=" + arraynum)).then(
            function (metadata) {
                if (metadata.arrays[0].dimensions.length == 1) {
                    // only one row is available (1d array)
                    return $.ajax(api_root + "models/" + mid + "/arraysets/" + arrayid + "/arrays/" +
                        arraynum + "/attributes/0/chunk?ranges=0," +
                        metadata.arrays[0].dimensions[0].end);
                } else {
                    // pick all rows (2d array)
                    return $.ajax(api_root + "models/" + mid + "/arraysets/" + arrayid + "/arrays/" +
                        arraynum + "/attributes/0/chunk?ranges=0," +
                        metadata.arrays[0].dimensions[0].end + ",0," +
                        metadata.arrays[0].dimensions[1].end);
                }
            }
        );
    }
};