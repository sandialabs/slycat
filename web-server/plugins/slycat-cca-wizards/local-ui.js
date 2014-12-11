define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/local-cca/ui.html"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = ko.mapping.fromJS({_id: params.project_id});
    component.model = ko.mapping.fromJS({_id: null, name: "New CCA Model", description: "", marking: null});
    component.browser = ko.mapping.fromJS({selection: []});
    component.attributes = ko.mapping.fromJS([]);
    component.scale_inputs = ko.observable(true);

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
          component.tab(1);
        }
      });
    }
    component.upload_table = function()
    {
      console.log("upload_table", component.browser.selection());

      client.put_model_table(
      {
        mid: component.model._id(),
        file: component.browser.selection()[0],
        input: true,
        name: "data-table",
        success: function()
        {
          client.get_model_table_metadata(
          {
            mid: component.model._id(),
            name: "data-table",
            success: function(metadata)
            {
              var attributes = [];
              for(var i = 0; i != metadata["column-names"].length; ++i)
                attributes.push({name:metadata["column-names"][i], type:metadata["column-types"][i], input:metadata["column-types"][i] != "string", output:false})
              ko.mapping.fromJS(attributes, component.attributes);
              component.tab(2);
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
                      component.tab(3);
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
