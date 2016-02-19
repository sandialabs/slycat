define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout", "knockout-mapping", "slycat_file_uploader_factory"], function(server_root, client, dialog, ko, mapping, fileUploader)
{
  function constructor(params)
  {
    var component = {};
    component.attributes = mapping.fromJS([]);
    component.server_root = server_root;

    component._id = params.models()[0]._id();
    component.input_columns = params.models()[0]["artifact:input-columns"] != undefined ? params.models()[0]["artifact:input-columns"]() : [];
    component.output_columns = params.models()[0]["artifact:output-columns"] != undefined ? params.models()[0]["artifact:output-columns"]() : [];
    component.category_columns = params.models()[0]["artifact:category-columns"] != undefined ? params.models()[0]["artifact:category-columns"]() : [];
    component.rating_columns = params.models()[0]["artifact:rating-columns"] != undefined ? params.models()[0]["artifact:rating-columns"]() : [];
    component.media_columns = params.models()[0]["artifact:image-columns"] != undefined ? params.models()[0]["artifact:image-columns"]() : [];

    client.get_model_table_metadata({
      mid: component._id,
      aid: "data-table",
      success: function(metadata) {
        var attributes = [];
        for(var i = 0; i != metadata["column-names"].length; ++i)
        {
          var classification = 'Neither';
          if(component.input_columns.indexOf(i) !== -1)
          {
            classification = 'Input';
          }
          else if(component.output_columns.indexOf(i) !== -1)
          {
            classification = 'Output';
          }
          attributes.push({
            name:metadata["column-names"][i], 
            type:metadata["column-types"][i], 
            input:false,
            output:false,
            category:false,
            rating:false,
            image: component.media_columns.indexOf(i) !== -1,
            Classification: classification,
            Categorical: component.category_columns.indexOf(i) !== -1,
            Editable: component.rating_columns.indexOf(i) !== -1,
            hidden: component.media_columns.indexOf(i) !== -1,
            selected: false,
            lastSelected: false,
            disabled: false,
            tooltip: ""
          });
        }
        mapping.fromJS(attributes, component.attributes);
      }
    });

    component.cancel = function() {
    };

    component.finish = function() {
      var input_columns = [];
      var output_columns = [];
      var rating_columns = [];
      var category_columns = [];
      var image_columns = [];
      for(var i = 0; i != component.attributes().length; ++i) {
        if(component.attributes()[i].Classification() == 'Input')
          input_columns.push(i);
        if(component.attributes()[i].Classification() == 'Output')
          output_columns.push(i);
        if(component.attributes()[i].Categorical())
          category_columns.push(i);
        if(component.attributes()[i].Editable())
          rating_columns.push(i);
        if(component.attributes()[i].image())
          image_columns.push(i);
      }

      //dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();

      client.put_model_parameter({
        mid: component._id,
        aid: "input-columns",
        value: input_columns,
        input: true,
        success: function() {
          client.put_model_parameter({
            mid: component._id,
            aid: "output-columns",
            value: output_columns,
            input: true,
            success: function() {
              client.put_model_parameter({
                mid: component._id,
                aid: "rating-columns",
                value: rating_columns,
                input: true,
                success: function() {
                  client.put_model_parameter({
                    mid: component._id,
                    aid: "category-columns",
                    value: category_columns,
                    input: true,
                    success: function() {
                      client.put_model_parameter({
                        mid: component._id,
                        aid: "image-columns",
                        value: image_columns,
                        input: true,
                        success: function() {
                          document.location.reload(true);
                        }
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/column-wizard/ui.html" },
  };
});
