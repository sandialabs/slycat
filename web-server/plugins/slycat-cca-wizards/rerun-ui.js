define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/rerun-cca/ui.html"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.project;
    component.original = params.model;
    component.model = ko.mapping.fromJS(
    {
      _id: null,
      name: params.model.name() + " Rerun",
      description: "Reran " + (params.model.description() ? params.model.description() : params.model.name()),
      marking: params.model.marking()
    });
    component.attributes = ko.mapping.fromJS([]);
    component.scale_inputs = ko.observable(false);

    client.get_model_table_metadata(
    {
      mid: component.original._id(),
      name: "data-table",
      success: function(metadata)
      {
        var attributes = [];
        for(var i = 0; i != metadata["column-names"].length; ++i)
          attributes.push({name:metadata["column-names"][i], type:metadata["column-types"][i], input:false, output:false})
        ko.mapping.fromJS(attributes, component.attributes);

        client.get_model_parameter(
        {
          mid: component.original._id(),
          name: "input-columns",
          success: function(value)
          {
            for(var i = 0; i != value.length; ++i)
              component.attributes()[value[i]].input(true);
          }
        });

        client.get_model_parameter(
        {
          mid: component.original._id(),
          name: "output-columns",
          success: function(value)
          {
            for(var i = 0; i != value.length; ++i)
              component.attributes()[value[i]].output(true);
          }
        });
      }
    });

    client.get_model_parameter(
    {
      mid: component.original._id(),
      name: "scale-inputs",
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
        }
      });
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
        name: "input-columns",
        value: input_columns,
        input: true,
        success: function()
        {
          client.put_model_parameter(
          {
            mid: component.model._id(),
            name: "output-columns",
            value: output_columns,
            input: true,
            success: function()
            {
              client.put_model_parameter(
              {
                mid: component.model._id(),
                name: "scale-inputs",
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

  return { viewModel: constructor, template: html };
});
