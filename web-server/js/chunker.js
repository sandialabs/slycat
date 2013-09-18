/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

function is_little_endian()
{
  if(this.result === undefined)
    this.result = ((new Uint32Array((new Uint8Array([1,2,3,4])).buffer))[0] === 0x04030201);
  return this.result;
}

// Create a table chunker asynchronously, calling a callback when it's ready ...
function create_table_chunker(server_root, model, artifact, callback, error_callback)
{
  // Creating a table chunker worker
  $.ajax(
  {
    contentType : "application/json",
    data : $.toJSON({ type : "table-chunker", "mid" : model, "artifact" : artifact, "generate-index" : "Index" }),
    processData : false,
    type : "POST",
    cache: false,
    url : server_root + "workers",
    success : function(worker)
    {
      // Setup unload handler to stop and delete worker when user leaves page
      $(window).unload({"worker":worker}, function(e)
      {
        $.ajax(
        {
          type : "DELETE",
          url : server_root + "workers/" + e.data.worker.id,
          async: false,
          error : function(request, status, reason_phrase)
          {
            //window.alert("Error deleting remote worker: " + reason_phrase);
          }
        });
      });

      callback(worker.id);
    },
    error : function(request, status, reason_phrase)
    {
      if(error_callback)
        error_callback(request, status, reason_phrase);
    },
  });
}

// Create an array chunker asynchronously, calling a callback when it's ready ...
function create_array_chunker(server_root, model, artifact, callback, error_callback)
{
  $.ajax({
    contentType : "application/json",
    data : $.toJSON({ type : "array-chunker", "mid" : model, "artifact" : artifact, }),
    processData : false,
    type : "POST",
    cache: false,
    url : server_root + "workers",
    async: true,
    success : function(worker)
    {
      // Setup unload handler to stop and delete worker when user leaves page
      $(window).unload({"worker":worker}, function(e)
      {
        $.ajax(
        {
          type : "DELETE",
          url : server_root + "workers/" + e.data.worker.id,
          async: false,
          error : function(request, status, reason_phrase)
          {
            //window.alert("Error deleting remote worker: " + reason_phrase);
          }
        });
      });

      callback(worker.id);
    },
    error : function(request, status, reason_phrase)
    {
      if(error_callback)
        error_callback(request, status, reason_phrase);
    },
  });
}

// Retrieve an array chunker attribute asynchronously, calling a callback when it's ready ...
function get_array_attribute(server_root, chunker, attribute, callback)
{
  $.ajax({
    url : server_root + "workers/" + chunker + "/array-chunker/metadata",
    contentType : "application/json",
    success: function(metadata)
    {
      var ranges = [];
      for(var dimension in metadata.dimensions)
      {
        ranges.push(metadata.dimensions[dimension].begin);
        ranges.push(metadata.dimensions[dimension].end);
      }
      ranges = ranges.join(",");

      var request = new XMLHttpRequest();
      request.open("GET", server_root + "workers/" + chunker + "/array-chunker/chunk?attribute=" + attribute + "&ranges=" + ranges + "&byteorder=" + (is_little_endian() ? "little" : "big"));
      request.responseType = "arraybuffer"; // This is a hack: we're assuming an array of doubles here
      request.metadata = metadata;
      request.onload = function(e)
      {
        var buffer = this.response;
        var metadata = this.metadata;

        if(metadata.dimensions.length == 1)
        {
          // This is a hack: we're assuming an array of doubles here
          var result = new Float64Array(buffer);
        }
        else if(metadata.dimensions.length == 2)
        {
          var row_count = metadata.dimensions[0].end - metadata.dimensions[0].begin;
          var column_count = metadata.dimensions[1].end - metadata.dimensions[1].begin;
          var result = [];
          for(var i = 0; i != row_count; ++i)
            result.push(new Float64Array(buffer, i * column_count * 8, column_count))
        }
        else
        {
          window.alert("Can't handle array with " + metadata.dimensions.length + " dimensions.");
        }
        callback(result);
      }
      request.send();
    },
    error: function(request, status, reason_phrase)
    {
      window.alert("Error getting metadata from array-chunker worker: " + reason_phrase);
    }
  });
}
