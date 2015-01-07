define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/linear-regression-demo/ui.html"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.project;
    component.model = ko.mapping.fromJS({_id: null, name: "New Linear Regression Demo Model", description: "This model demonstrates plotting with d3.js", marking: null});
    component.browser = ko.mapping.fromJS({selection: []});
    component.attributes = ko.mapping.fromJS([]);
    component.input_column = ko.observable(null);
    component.output_column = ko.observable(null);

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
        type: "linear-regression-demo",
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
              {
                var name = metadata["column-names"][i];
                var type = metadata["column-types"][i];

                attributes.push({name: name, type: type})

                if(type != "string" && component.input_column() === null)
                  component.input_column(i);
                else if(type != "string" && component.output_column() === null)
                  component.output_column(i);
              }
              ko.mapping.fromJS(attributes, component.attributes);
              component.tab(2);
            }
          });
        }
      });
    }
    component.finish = function()
    {
      client.put_model_parameter(
      {
        mid: component.model._id(),
        name: "input-column",
        value: component.input_column(),
        input: true,
        success: function()
        {
          client.put_model_parameter(
          {
            mid: component.model._id(),
            name: "output-column",
            value: component.output_column(),
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

    return component;
  }

  return { viewModel: constructor, template: html };
});
