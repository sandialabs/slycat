/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-markings", "knockout", "knockout-mapping", "slycat_file_uploader_factory"], function(server_root, client, dialog, markings, ko, mapping, fileUploader)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New Tracer Image Model", description: "", marking: markings.preselected()});
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null});
    component.remote.focus.extend({notify: "always"});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.parser = ko.observable(null);
    component.attributes = mapping.fromJS([]);

    component.cancel = function()
    {
      if(component.remote.sid())
        client.delete_remote({ sid: component.remote.sid() });

      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    };
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
          component.remote.focus(true);
        },
        error: dialog.ajax_error("Error creating model.")
      });
    };
    component.connect = function()
    {
      component.remote.enable(false);
      component.remote.status_type("info");
      component.remote.status("Connecting ...");
      client.post_remotes(
      {
        hostname: component.remote.hostname(),
        username: component.remote.username(),
        password: component.remote.password(),
        success: function(sid)
        {
          component.remote.sid(sid);
          component.tab(2);
        },
        error: function(request, status, reason_phrase)
        {
          component.remote.enable(true);
          component.remote.status_type("danger");
          component.remote.status(reason_phrase);
          component.remote.focus("password");
        }
      });
    };
    component.load_table = function()
    {
      $('.remote-browser-continue').toggleClass("disabled", true);
      var fileObject ={
        pid: component.project._id(),
        sids: [component.remote.sid()],
        mid: component.model._id(),
        paths: [component.browser.selection()],
        aids: ["data-table"],
        parser: component.parser(),
        success: function(){
          client.get_model_command(
          {
            mid: component.model._id(),
            type: "tracer-image",
            command: "media-columns",
            success: function(media_columns)
            {
              client.get_model_table_metadata(
              {
                mid: component.model._id(),
                aid: "data-table",
                success: function(metadata)
                {
                  var attributes = [];
                  for(var i = 0; i != metadata["column-names"].length; ++i)
                    attributes.push({name:metadata["column-names"][i], type:metadata["column-types"][i], input:false,output:false,category:false,rating:false,image:media_columns.indexOf(i) !== -1})
                  mapping.fromJS(attributes, component.attributes);
                  component.tab(3);
                  $('.remote-browser-continue').toggleClass("disabled", false);
                }
              });
            }
          });
        },
        error: function(){
          dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
          $('.remote-browser-continue').toggleClass("disabled", false);
        }
      };
      fileUploader.uploadFile(fileObject);
    };

    component.set_input = function(attribute)
    {
      attribute.output(false);
      attribute.category(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    };

    component.set_output = function(attribute)
    {
      attribute.input(false);
      attribute.category(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    };

    component.set_category = function(attribute)
    {
      attribute.input(false);
      attribute.output(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    };

    component.set_rating = function(attribute)
    {
      attribute.input(false);
      attribute.output(false);
      attribute.category(false);
      attribute.image(false);
      return true;
    };

    component.set_image = function(attribute)
    {
      attribute.input(false);
      attribute.output(false);
      attribute.category(false);
      attribute.rating(false);
      return true;
    };

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
    };

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
                aid: "rating-columns",
                value: rating_columns,
                input: true,
                success: function()
                {
                  client.put_model_parameter(
                  {
                    mid: component.model._id(),
                    aid: "category-columns",
                    value: category_columns,
                    input: true,
                    success: function()
                    {
                      client.put_model_parameter(
                      {
                        mid: component.model._id(),
                        aid: "image-columns",
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
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/tracer-image/ui.html" }
    };
});
