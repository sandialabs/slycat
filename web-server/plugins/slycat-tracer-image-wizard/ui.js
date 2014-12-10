define(["slycat-web-client", "text!" + $("#slycat-server-root").attr("href") + "resources/wizards/tracer-image/ui.html", "slycat-remote-browser"], function(client, html)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = ko.mapping.fromJS({_id: params.project_id});
    component.model = ko.mapping.fromJS({_id: null, name: "New Tracer Image Model", description: "", marking: null});
    component.remote = ko.mapping.fromJS({hostname: null, username: null, password: null, sid: null});
    component.browser = ko.mapping.fromJS({path:"/", selection: []});
    component.attributes = ko.mapping.fromJS([]);

    console.log(component);

    component.cancel = function()
    {
      if(component.remote.sid())
        client.delete_remote({ sid: component.remote.sid() });

      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    }
    component.create_model = function()
    {
      client.post_project_models(
      {
        pid: component.project._id(),
        type: "tracer-image",
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
    component.connect = function()
    {
      client.post_remotes(
      {
        hostname: component.remote.hostname(),
        username: component.remote.username(),
        password: component.remote.password(),
        success: function(sid)
        {
          component.remote.sid(sid);
          component.tab(2);
        }
      });
    }
    component.load_table = function()
    {
      client.put_model_table(
      {
        mid: component.model._id(),
        sid: component.remote.sid(),
        path: component.browser.selection()[0],
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
              console.log("metadata", metadata);
              var attributes = [];
              for(var i = 0; i != metadata["column-names"].length; ++i)
                attributes.push({name:metadata["column-names"][i], type:metadata["column-types"][i], categories:[]})
              ko.mapping.fromJS(attributes, component.attributes);
              component.tab(3);
            }
          });
        }
      });
    }
    component.finish = function()
    {
      var input_columns = [];
      var output_columns = [];
      var rating_columns = [];
      var category_columns = [];
      var image_columns = [];
      for(var i = 0; i != component.attributes().length; ++i)
      {
        var categories = component.attributes()[i].categories();
        for(var j = 0; j != categories.length; ++j)
        {
          if(categories[j] == "input")
            input_columns.push(i);
          else if(categories[j] == "output")
            output_columns.push(i);
          else if(categories[j] == "rating")
            rating_columns.push(i);
          else if(categories[j] == "category")
            category_columns.push(i);
          else if(categories[j] == "image")
            image_columns.push(i);
        }
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
                name: "rating-columns",
                value: rating_columns,
                input: true,
                success: function()
                {
                  client.put_model_parameter(
                  {
                    mid: component.model._id(),
                    name: "category-columns",
                    value: category_columns,
                    input: true,
                    success: function()
                    {
                      client.put_model_parameter(
                      {
                        mid: component.model._id(),
                        name: "image-columns",
                        value: image_columns,
                        input: true,
                        success: function()
                        {
                          client.post_model_finish(
                          {
                            mid: component.model._id(),
                            success: function()
                            {
                              component.tab(4);
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
        }
      });
    }

    window.component = component;
    return component;
  }

  return { viewModel: constructor, template: html };
});
