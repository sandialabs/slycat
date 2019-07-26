/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

// this is the code for showing the parse log, if it exists
// originally copied from the model details code (plugins/slycat-model-wizards/info-ui.js)

import api_root from "js/slycat-api-root";
import URI from "urijs";
import mapping from "knockout-mapping";
import DACParseLogUI from "../html/dac-parse-log.html";

var constructor = function(params) {
  var component = {};
  component.project = params.projects()[0];
  component.model = params.models()[0];
  component.details = mapping.fromJS({
    total_server_data_size: 0,
    mid: "",
    hdf5_file_size: 0,
    hdf5_store_size: 0,
    couchdb_doc_size: 0,
    delta_creation_time: 0,
    job_pending_time: 0,
    job_running_time: 0,
    model_compute_time: 0,
    hdf5_footprint: 0,
    server_cache_size: 0,
    analysis_computation_time:0,
    db_creation_time: 0,
    model: null,
    parse_log: null,
  });

  $.ajax({
    dataType: "json",
    type: "GET",
    url: URI(api_root + "get-model-statistics/" + component.model._id()),
    success: function(result)
    {
      mapping.fromJS(result, component.details);

      // if parse log is found, write text to model details (for display in html)
      if ("artifact:dac-parse-log" in result.model) {
          component.details.parse_log(result.model["artifact:dac-parse-log"][1]);
      }
    },
    error: function(request, status, reason_phrase)
    {
      window.alert("error request:" + request.responseJSON +" status: "+ status + " reason: " + reason_phrase);
      console.log("error request:" + request.responseJSON +" status: "+ status + " reason: " + reason_phrase);
    }
  });

  // we want a large dialog box
  $(".modal-dialog").addClass("modal-lg");

  return component;
};

export default {
  viewModel: constructor,
  template: DACParseLogUI
};
