/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/
var arrayset_metadata_cache = {};

function is_little_endian()
{
  if(this.result === undefined)
    this.result = ((new Uint32Array((new Uint8Array([1,2,3,4])).buffer))[0] === 0x04030201);
  return this.result;
}

// Retrieve an array attribute's metadata asynchronously, calling a callback when it's ready ...
function get_model_array_attribute_metadata(parameters, dfd)
{
  $.ajax({
    url : parameters.server_root + "models/" + parameters.mid + "/arraysets/" + parameters.aid + "/arrays/" + parameters.array + "/metadata",
    contentType : "application/json",
    success: function(metadata)
    {
      parameters.metadata = metadata;
      if(parameters.metadataSuccess !== undefined) {
        parameters.metadataSuccess(parameters);
      } else {
        parameters.success(parameters);
      }
    },
    error: function(request, status, reason_phrase)
    {
      if(parameters.error)
        parameters.error(request, status, reason_phrase);
    },
    always: function() {
      dfd.resolve();
    }
  });
}

// Retrieve an arrayset's metadata asynchronously, calling a callback when it's ready ...
function get_model_arrayset_metadata(parameters)
{
  if(arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid] !== undefined) {
    parameters.metadata = arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid];
    if(parameters.metadataSuccess !== undefined) {
      parameters.metadataSuccess(parameters);
    } else {
      parameters.success(parameters);
    }
  } else {
    $.ajax({
      url : parameters.server_root + "models/" + parameters.mid + "/arraysets/" + parameters.aid + "/metadata",
      contentType : "application/json",
      success: function(metadata)
      {
        arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid] = metadata;
        parameters.metadata = metadata;
        if(parameters.metadataSuccess !== undefined) {
          parameters.metadataSuccess(parameters);
        } else {
          parameters.success(parameters);
        }
      },
      error: function(request, status, reason_phrase)
      {
        if(parameters.error)
          parameters.error(request, status, reason_phrase);
      }
    });
  }
}

// Cast a generic arraybuffer to a typed array, with an optional offset and
// count.  Note that offset and count are measured in elements, not bytes.
function cast_array_buffer(buffer, type, offset, count)
{
  if(type == "int32")
  {
    if(offset !== undefined)
      return new Int32Array(buffer, offset*4, count);
    else
      return new Int32Array(buffer);
  }
  else if(type == "int16")
  {
    if(offset !== undefined)
      return new Int16Array(buffer, offset*2, count);
    else
      return new Int16Array(buffer);
  }
  else if(type == "int8")
  {
    if(offset !== undefined)
      return new Int8Array(buffer, offset, count);
    else
      return new Int8Array(buffer);
  }
  else if(type == "uint32")
  {
    if(offset !== undefined)
      return new Uint32Array(buffer, offset*4, count);
    else
      return new Uint32Array(buffer);
  }
  else if(type == "uint16")
  {
    if(offset !== undefined)
      return new Uint16Array(buffer, offset*2, count);
    else
      return new Uint16Array(buffer);
  }
  else if(type == "uint8")
  {
    if(offset !== undefined)
      return new Uint8Array(buffer, offset, count);
    else
      return new Uint8Array(buffer);
  }
  else if(type == "float64")
  {
    if(offset !== undefined)
      return new Float64Array(buffer, offset*8, count);
    else
      return new Float64Array(buffer);
  }
  else if(type == "float32")
  {
    if(offset !== undefined)
      return new Float32Array(buffer, offset*4, count);
    else
      return new Float32Array(buffer);
  }
  else
    console.error("Unknown array buffer type: " + type);
}

// Retrieve an array attribute asynchronously, calling a callback when it's ready ...
function get_model_array_attribute(parameters) {
  var dfd = $.Deferred();
  if(parameters.metadata === undefined) {
    parameters.metadataSuccess = retrieve_model_array_attribute;
    get_model_array_attribute_metadata(parameters, dfd);
  }
  else {
    retrieve_model_array_attribute(parameters);
  }
  return dfd;

  function retrieve_model_array_attribute(parameters) {
    var ranges = [];
    var metadata = parameters.metadata;
    for(var dimension in metadata.dimensions)
    {
      ranges.push(metadata.dimensions[dimension].begin);
      ranges.push(metadata.dimensions[dimension].end);
    }
    ranges = ranges.join(",");

    var request = new XMLHttpRequest();
    request.open("GET", parameters.server_root + "models/" + parameters.mid + "/arraysets/" + parameters.aid + "/arrays/" + parameters.array + "/attributes/" + parameters.attribute + "/chunk?ranges=" + ranges + "&byteorder=" + (is_little_endian() ? "little" : "big"));
    request.responseType = "arraybuffer";
    request.success = parameters.success;
    request.attribute = parameters.attribute;
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
      this.success(result);
      dfd.resolve();
    }
    request.send();
  }
}

// Retrieve an arrayset asynchronously, calling a callback when it's ready ...
function get_model_arrayset(parameters)
{
  if(parameters.metadata !== undefined) {
    retrieve_model_arrayset(parameters);
  } else if (arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid] !== undefined) {
    parameters.metadata = arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid];
    retrieve_model_arrayset(parameters);
  } else {
    parameters.metadataSuccess = retrieve_model_arrayset;
    get_model_arrayset_metadata(parameters);
  }

  function retrieve_model_arrayset(parameters)
  {
    var metadata = parameters.metadata;

    var request = new XMLHttpRequest();
    request.open("GET", parameters.server_root + "models/" + parameters.mid + "/arraysets/" + parameters.aid + "?byteorder=" + (is_little_endian() ? "little" : "big") + "&arrays=" + (parameters.arrays !== undefined ? parameters.arrays : ""));
    request.responseType = "arraybuffer";
    request.success = parameters.success;
    request.metadata = metadata;
    request.onload = function(e)
    {
      var buffer = this.response;
      var metadata = this.metadata;
      var results = [];
      var result, item, index, count, attributes, attribute = null;
      var start = 0;
      var length = metadata.length;
      if(parameters.arrays !== undefined) {
        var arrays = parameters.arrays.split(":");
        start = parseInt(arrays[0]);
        length = parseInt(arrays[1]);
      }
      var offset = 0;
      for(var i=start; i < length; i++)
      {
        item = metadata[i];
        index = item.index;
        count = item.dimensions[0].end - item.dimensions[0].begin;
        attributes = item.attributes;
        result = {};
        result["input-index"] = index;
        for(var j=0; j < attributes.length; j++)
        {
          attribute = attributes[j];
          result[attribute.name] = cast_array_buffer(buffer, attribute.type, offset, count);
          offset = offset + count;
        }
        results.push(result);
      }
      this.success(results, metadata, parameters);
    }
    request.send();
  }
}
