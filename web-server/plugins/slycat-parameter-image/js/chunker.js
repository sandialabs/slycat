/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */
var arrayset_metadata_cache = {};

function is_little_endian()
{
  if(this.result === undefined)
    this.result = ((new Uint32Array((new Uint8Array([1,2,3,4])).buffer))[0] === 0x04030201);
  return this.result;
}

// Retrieve an array attribute's metadata asynchronously, calling a callback when it's ready ...
export function get_model_array_attribute_metadata(parameters, dfd)
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

// Cast a generic arraybuffer to a typed array, with an optional offset and
// count.  Note that offset and count are measured in elements, not bytes.
export function cast_array_buffer(buffer, type, offset, count)
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
export function get_model_array_attribute(parameters) {
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
    // Assigning current scope's "this" to is_little_endian function, otherwise "this" is undefined in is_little_endian
    var byteorder = "&byteorder=" + (is_little_endian.call(this) ? "little" : "big");
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

