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

// Retrieve an array attribute asynchronously, calling a callback when it's ready ...
function get_model_array_attribute(parameters)
{
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

  $.ajax({
    url : parameters.server_root + "models/" + parameters.mid + "/array-sets/" + parameters.aid + "/arrays/" + parameters.array + "/metadata",
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
      request.open("GET", parameters.server_root + "models/" + parameters.mid + "/array-sets/" + parameters.aid + "/arrays/" + parameters.array + "/attributes/" + parameters.attribute + "/chunk?ranges=" + ranges + "&byteorder=" + (is_little_endian() ? "little" : "big"));
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
      }
      request.send();
    },
    error: function(request, status, reason_phrase)
    {
      if(parameters.error)
        parameters.error(request, status, reason_phrase);
    }
  });
}
