/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */
var arrayset_metadata_cache = {};
var arrayset_metadata_retrieval_inprogress = {};
var arrayset_metadata_callbacks = {};

function is_little_endian()
{
  if(this.result === undefined)
    this.result = ((new Uint32Array((new Uint8Array([1,2,3,4])).buffer))[0] === 0x04030201);
  return this.result;
}

// Retrieve an array attribute's metadata asynchronously, calling a callback when it's ready ...
function get_model_array_attribute_metadata(parameters, dfd)
{
  return $.ajax({
    url : parameters.server_root + "models/" + parameters.mid + "/arraysets/" + parameters.aid + "/metadata?arrays=" + parameters.array,
    contentType : "application/json",
    success: function(result)
    {
      parameters.metadata = result.arrays[0];
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
  // It's cached, so just execute callback with cached metadata
  if(arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid] !== undefined) {
    parameters.metadata = arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid];
    if(parameters.metadataSuccess !== undefined) {
      parameters.metadataSuccess(parameters);
    } else {
      parameters.success(parameters);
    }
  }
  // It's being cached now, so add callback to queue
  else if(arrayset_metadata_retrieval_inprogress[parameters.server_root + parameters.mid + parameters.aid]) {
    var callback = parameters.metadataSuccess !== undefined ? parameters.metadataSuccess : parameters.success;
    arrayset_metadata_callbacks[parameters.server_root + parameters.mid + parameters.aid].push({callback:callback, parameters: parameters});
  } 
  // It's not in the cache and it's not being cached, so retrieve it and execute callback queue
  else {
    arrayset_metadata_retrieval_inprogress[parameters.server_root + parameters.mid + parameters.aid] = true;
    var callback = parameters.metadataSuccess !== undefined ? parameters.metadataSuccess : parameters.success;
    if(arrayset_metadata_callbacks[parameters.server_root + parameters.mid + parameters.aid] === undefined)
    {
      arrayset_metadata_callbacks[parameters.server_root + parameters.mid + parameters.aid] = [];
    }
    arrayset_metadata_callbacks[parameters.server_root + parameters.mid + parameters.aid].push({callback:callback, parameters: parameters});

    $.ajax({
      url : parameters.server_root + "models/" + parameters.mid + "/arraysets/" + parameters.aid + "/metadata",
      contentType : "application/json",
      success: function(metadata)
      {
        arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid] = metadata;
        arrayset_metadata_retrieval_inprogress[parameters.server_root + parameters.mid + parameters.aid] = false;
        // Execute callback queue
        for(var i=0; i < arrayset_metadata_callbacks[parameters.server_root + parameters.mid + parameters.aid].length; i++)
        {
          var callback_parameters = arrayset_metadata_callbacks[parameters.server_root + parameters.mid + parameters.aid][i].parameters;
          callback_parameters.metadata = metadata;
          arrayset_metadata_callbacks[parameters.server_root + parameters.mid + parameters.aid][i].callback(callback_parameters);
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
    var range = '';
    var metadata = parameters.metadata;
    var attribute = parameters.attribute;
    var isStringAttribute = metadata.attributes[attribute].type == "string";
    var byteorder = "&byteorder=" + (is_little_endian() ? "little" : "big");
    if(isStringAttribute)
    {
      byteorder = "";
    }

    for(var dimension in metadata.dimensions)
    {
      range = '';
      range += metadata.dimensions[dimension].begin;
      range += ':';
      range += metadata.dimensions[dimension].end;
      ranges.push(range);
    }
    ranges = ranges.join("|");

    var request = new XMLHttpRequest();
    request.open("GET", parameters.server_root + "models/" + parameters.mid + "/arraysets/" + parameters.aid + "/data?hyperchunks=" + parameters.array + "/" + parameters.attribute + "/" + ranges + byteorder);
    if(!isStringAttribute)
    {
      request.responseType = "arraybuffer";
    }
    request.success = parameters.success;
    request.attribute = parameters.attribute;
    request.metadata = metadata;
    request.isStringAttribute = isStringAttribute;
    request.onload = function(e)
    {
      var buffer = this.response;
      var metadata = this.metadata;
      var attribute = this.metadata.attributes[this.attribute];
      var result;

      if(metadata.dimensions.length == 1)
      {
        if(!this.isStringAttribute)
        {
          result = cast_array_buffer(buffer, attribute.type);
        }
        else
        {
          result = JSON.parse(this.responseText);
        }
      }
      else if(metadata.dimensions.length == 2)
      {
        var row_count = metadata.dimensions[0].end - metadata.dimensions[0].begin;
        var column_count = metadata.dimensions[1].end - metadata.dimensions[1].begin;
        var result = [];
        for(var i = 0; i != row_count; ++i)
        {
          result.push(cast_array_buffer(buffer, attribute.type, i * column_count, column_count));
        }
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
  if(parameters.metadata !== undefined) 
  {
    retrieve_model_arrayset(parameters);
  } 
  else if (arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid] !== undefined) 
  {
    parameters.metadata = arrayset_metadata_cache[parameters.server_root + parameters.mid + parameters.aid];
    retrieve_model_arrayset(parameters);
  } 
  else 
  {
    parameters.metadataSuccess = retrieve_model_arrayset;
    get_model_arrayset_metadata(parameters);
  }

  function retrieve_model_arrayset(parameters)
  {
    var metadata = parameters.metadata;

    var arrays = [];
    var hyperchunks = [];

    if("arrays" in parameters)
    {
      for(var i = parseInt(parameters.arrays.split(":")[0]); i != parseInt(parameters.arrays.split(":")[1]); ++i)
      {
        arrays.push(i);
      }
      for(var i = 0; i != arrays.length; ++i)
      {
        var array = arrays[i];
        for(var attribute = 0; attribute != metadata[array].attributes.length; ++attribute)
        {
          hyperchunks.push(array + "/" + attribute + "/...");
        }
      }
    }
    else
    {
      hyperchunks.push(".../.../...");
    }

    var uri = parameters.server_root + "models/" + parameters.mid + "/arraysets/" + parameters.aid + "/data?byteorder=" + (is_little_endian() ? "little" : "big") + "&hyperchunks=" + encodeURIComponent(hyperchunks.join(";"));
    var request = new XMLHttpRequest();
    request.open("GET", uri);
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
