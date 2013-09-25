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
function create_table_chunker(parameters)
{
  // Creating a table chunker worker
  $.ajax(
  {
    contentType : "application/json",
    data : $.toJSON({ type : "table-chunker", "mid" : parameters.model, "artifact" : parameters.artifact, "generate-index" : "Index" }),
    processData : false,
    type : "POST",
    cache: false,
    url : parameters.server_root + "workers",
    success : function(worker)
    {
      // Setup unload handler to stop and delete worker when user leaves page
      $(window).unload({"worker":worker}, function(e)
      {
        $.ajax(
        {
          type : "DELETE",
          url : parameters.server_root + "workers/" + e.data.worker.id,
          async: false,
          error : function(request, status, reason_phrase)
          {
            //window.alert("Error deleting remote worker: " + reason_phrase);
          }
        });
      });

      parameters.success(worker.id);
    },
    error : function(request, status, reason_phrase)
    {
      if(parameters.error)
        parameters.error(request, status, reason_phrase);
    },
  });
}

// Create an array chunker asynchronously, calling a callback when it's ready ...
function create_array_chunker(parameters)
{
  $.ajax({
    contentType : "application/json",
    data : $.toJSON({ type : "array-chunker", "mid" : parameters.model, "artifact" : parameters.artifact, }),
    processData : false,
    type : "POST",
    cache: false,
    url : parameters.server_root + "workers",
    async: true,
    success : function(worker)
    {
      // Setup unload handler to stop and delete worker when user leaves page
      $(window).unload({"worker":worker}, function(e)
      {
        $.ajax(
        {
          type : "DELETE",
          url : parameters.server_root + "workers/" + e.data.worker.id,
          async: false,
          error : function(request, status, reason_phrase)
          {
            //window.alert("Error deleting remote worker: " + reason_phrase);
          }
        });
      });

      parameters.success(worker.id);
    },
    error : function(request, status, reason_phrase)
    {
      if(parameters.error)
        parameters.error(request, status, reason_phrase);
    },
  });
}

// Retrieve an array chunker attribute asynchronously, calling a callback when it's ready ...
function get_array_attribute(server_root, chunker, attribute, callback)
{
  // Cast a generic arraybuffer to a typed array, with an optional offset and
  // count.  Note that offset and count are measured in elements, not bytes.
  function cast_array_buffer(buffer, type, offset, count)
  {
    if(type == "int32")
    {
      if(offset !== undefined)
        offset *= 4;
      return new Int32Array(buffer, offset, count);
    }
    else if(type == "int16")
    {
      if(offset !== undefined)
        offset *= 2;
      return new Int16Array(buffer, offset, count);
    }
    else if(type == "int8")
    {
      return new Int8Array(buffer, offset, count);
    }
    else if(type == "uint32")
    {
      if(offset !== undefined)
        offset *= 4;
      return new Uint32Array(buffer, offset, count);
    }
    else if(type == "uint16")
    {
      if(offset !== undefined)
        offset *= 2;
      return new Uint16Array(buffer, offset, count);
    }
    else if(type == "uint8")
    {
      return new Uint8Array(buffer, offset, count);
    }
    else if(type == "float64")
    {
      if(offset !== undefined)
        offset *= 8;
      return new Float64Array(buffer, offset, count);
    }
    else if(type == "float32")
    {
      if(offset !== undefined)
        offset *= 4;
      return new Float32Array(buffer, offset, count);
    }
    else
      console.error("Unknown array buffer type: " + type);
  }

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
      request.responseType = "arraybuffer";
      request.attribute = attribute;
      request.metadata = metadata;
      request.onload = function(e)
      {
        var buffer = this.response;
        var metadata = this.metadata;
        var attribute = this.metadata.attributes[this.attribute];

        if(metadata.dimensions.length == 1)
        {
          var result = cast_array_buffer(buffer, attribute.type);
        }
        else if(metadata.dimensions.length == 2)
        {
          var row_count = metadata.dimensions[0].end - metadata.dimensions[0].begin;
          var column_count = metadata.dimensions[1].end - metadata.dimensions[1].begin;
          var result = [];
          for(var i = 0; i != row_count; ++i)
            result.push(cast_array_buffer(buffer, attribute.type, i * column_count, column_count))
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
