define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout", "knockout-mapping"], function(server_root, client, dialog, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.original = params.models()[0];
    component.model = mapping.fromJS(
    {
      _id: null,
      name: "Rerun " + component.original.name(),
      description: "Rerunning " + component.original.name() + ". Original description: " + component.original.description(),
      marking: component.original.marking(),
    });
    component.attributes = mapping.fromJS([]);
    component.scale_inputs = ko.observable(false);

    client.get_model_arrayset_metadata({
      mid: component.original._id(),
      aid: "data-table",
      arrays: "0",
      statistics: "0/...",
      success: function(metadata) {
        console.log(metadata);
        var attributes = [];
        for(var i = 0; i != metadata.arrays[0].attributes.length; ++i)
        {
          var name = metadata.arrays[0].attributes[i].name;
          var type = metadata.arrays[0].attributes[i].type;
          var constant = metadata.statistics[i].unique == 1;
          attributes.push({
            name: name, 
            type: type, 
            constant: constant, 
            //input: type != "string" && !constant, 
            input: false, 
            output: false,
            Classification: type != "string" && !constant ? 'Input' : 'Neither',
            hidden: type == "string",
            selected: false,
            lastSelected: false
          });
        }
        mapping.fromJS(attributes, component.attributes);
        
        client.get_model_parameter(
        {
          mid: component.original._id(),
          aid: "input-columns",
          success: function(value)
          {
            for(var i = 0; i != value.length; ++i)
              component.attributes()[value[i]].input(true);
          }
        });

        client.get_model_parameter(
        {
          mid: component.original._id(),
          aid: "output-columns",
          success: function(value)
          {
            for(var i = 0; i != value.length; ++i)
              component.attributes()[value[i]].output(true);
          }
        });
      }
    });

    // client.get_model_table_metadata(
    // {
    //   mid: component.original._id(),
    //   aid: "data-table",
    //   success: function(metadata)
    //   {
    //     var attributes = [];
    //     for(var i = 0; i != metadata["column-names"].length; ++i)
    //     {
    //       attributes.push({
    //         name: metadata["column-names"][i], 
    //         type: metadata["column-types"][i], 
    //         input: false, 
    //         output: false
    //       });
    //     }
    //     mapping.fromJS(attributes, component.attributes);

    //     client.get_model_parameter(
    //     {
    //       mid: component.original._id(),
    //       aid: "input-columns",
    //       success: function(value)
    //       {
    //         for(var i = 0; i != value.length; ++i)
    //           component.attributes()[value[i]].input(true);
    //       }
    //     });

    //     client.get_model_parameter(
    //     {
    //       mid: component.original._id(),
    //       aid: "output-columns",
    //       success: function(value)
    //       {
    //         for(var i = 0; i != value.length; ++i)
    //           component.attributes()[value[i]].output(true);
    //       }
    //     });
    //   }
    // });

    client.get_model_parameter(
    {
      mid: component.original._id(),
      aid: "scale-inputs",
      success: function(value)
      {
        component.scale_inputs(value);
      }
    });

    component.set_input = function(attribute)
    {
      attribute.output(false);
      return true;
    }

    component.set_output = function(attribute)
    {
      attribute.input(false);
      return true;
    }

    component.cancel = function()
    {
      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    }
    component.create_model = function()
    {
      client.post_project_models(
      {
        pid: component.project._id(),
        type: "cca",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid)
        {
          component.model._id(mid);
          client.put_model_inputs(
          {
            mid: component.model._id(),
            sid: component.original._id(),
            success: function()
            {
              component.tab(1);
            }
          });
        },
        error: dialog.ajax_error("Error creating model."),
      });
    }


    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    }

    component.finish = function()
    {
      var input_columns = [];
      var output_columns = [];
      for(var i = 0; i != component.attributes().length; ++i)
      {
        if(component.attributes()[i].input())
          input_columns.push(i);
        if(component.attributes()[i].output())
          output_columns.push(i);
      }

      client.put_model_parameter(
      {
        mid: component.model._id(),
        aid: "input-columns",
        value: input_columns,
        input: true,
        success: function()
        {
          client.put_model_parameter(
          {
            mid: component.model._id(),
            aid: "output-columns",
            value: output_columns,
            input: true,
            success: function()
            {
              client.put_model_parameter(
              {
                mid: component.model._id(),
                aid: "scale-inputs",
                value: component.scale_inputs(),
                input: true,
                success: function()
                {
                  client.post_model_finish(
                  {
                    mid: component.model._id(),
                    success: function()
                    {
                      component.tab(2);
                    }
                  });
                }
              });
            }
          });
        }
      });
    }

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/rerun-cca/ui.html" },
    };
});
