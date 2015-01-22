define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout", "knockout-mapping"], function(server_root, client, dialog, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New Tracer Image Model", description: "", marking: null});
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, sid: null});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.attributes = mapping.fromJS([]);

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
        },
        error: dialog.ajax_error("Error creating model."),
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
              var attributes = [];
              for(var i = 0; i != metadata["column-names"].length; ++i)
                attributes.push({name:metadata["column-names"][i], type:metadata["column-types"][i], input:false,output:false,category:false,rating:false,image:false})
              mapping.fromJS(attributes, component.attributes);
              component.tab(3);
            }
          });
        }
      });
    }

    component.set_input = function(attribute)
    {
      attribute.output(false);
      attribute.category(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    }

    component.set_output = function(attribute)
    {
      attribute.input(false);
      attribute.category(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    }

    component.set_category = function(attribute)
    {
      attribute.input(false);
      attribute.output(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    }

    component.set_rating = function(attribute)
    {
      attribute.input(false);
      attribute.output(false);
      attribute.category(false);
      attribute.image(false);
      return true;
    }

    component.set_image = function(attribute)
    {
      attribute.input(false);
      attribute.output(false);
      attribute.category(false);
      attribute.rating(false);
      return true;
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
        if(component.attributes()[i].input())
          input_columns.push(i);
        if(component.attributes()[i].output())
          output_columns.push(i);
        if(component.attributes()[i].category())
          category_columns.push(i);
        if(component.attributes()[i].rating())
          rating_columns.push(i);
        if(component.attributes()[i].image())
          image_columns.push(i);
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

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/tracer-image/ui.html" },
    };
});
