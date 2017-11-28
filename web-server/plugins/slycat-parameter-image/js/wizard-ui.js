define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "slycat-markings", "knockout", "knockout-mapping", "slycat_file_uploader_factory"], function(server_root, client, dialog, markings, ko, mapping, fileUploader)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New Parameter Space Model", description: "", marking: markings.preselected()});
    component.remote = mapping.fromJS({
      hostname: null, 
      username: null, 
      password: null, 
      status: null, 
      status_type: null, 
      enable: true, 
      focus: false, 
      sid: null, 
      session_exists: false,
      progress: ko.observable(null), 
      progress_status: ko.observable(''),
    });
    component.remote.focus.extend({notify: "always"});
    component.browser = mapping.fromJS({
      path:null, 
      selection: [], 
      progress: ko.observable(null), 
      progress_status: ko.observable(''),
    });
    component.parser = ko.observable(null);
    component.attributes = mapping.fromJS([]);
    component.server_root = server_root;
    component.ps_type = ko.observable(null);
    component.single_star_warning = ko.observable(false);
    component.plus_warning = ko.observable(false);
    component.ps_type.subscribe(function(newValue) {
      if(newValue == 'local')
      {
        $(".modal-dialog").removeClass("modal-lg");
      }
      else
      {
        $(".modal-dialog").addClass("modal-lg");
      }
    });
    component.ps_type("remote"); // remote is selected by default...

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: "parameter-image",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
          component.model._id(mid);
          component.remote.focus(true);
        },
        error: dialog.ajax_error("Error creating model."),
      });
    };

    // Create a model as soon as the dialog loads. We rename, change description and marking later.
    component.create_model();

    component.cancel = function() {
      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.select_type = function() {
      var type = component.ps_type();

      if (type === "local") {
        component.tab(1);
      } else if (type === "remote") {
        component.tab(2);
      }
    };

    var upload_success = function(uploader) {
      uploader.progress(95);
      uploader.progress_status('Finishing...');
      client.get_model_command({
        mid: component.model._id(),
        type: "parameter-image",
        command: "media-columns",
        success: function(media_columns) {
          client.get_model_table_metadata({
            mid: component.model._id(),
            aid: "data-table",
            success: function(metadata) {
              uploader.progress(100);
              uploader.progress_status('Finished');
              var attributes = [];
              for(var i = 0; i != metadata["column-names"].length; ++i)
                attributes.push({
                  name:metadata["column-names"][i], 
                  type:metadata["column-types"][i], 
                  input:false,
                  output:false,
                  category:false,
                  rating:false,
                  image:media_columns.indexOf(i) !== -1,
                  Classification: 'Neither',
                  Categorical: false,
                  Editable: false,
                  hidden: media_columns.indexOf(i) !== -1,
                  selected: false,
                  lastSelected: false,
                  disabled: false,
                  tooltip: ""
                });
              mapping.fromJS(attributes, component.attributes);

              console.log(component.attributes()[0].name());
              for(var i = 0; i < component.attributes().length; i++){
                if(component.attributes()[i].name().includes("*")) {
                  component.single_star_warning(true);
                }
                if(component.attributes()[i].name().includes("+")) {
                  component.plus_warning(true);
                }
              }

              component.tab(4);
              $('.browser-continue').toggleClass("disabled", false);
            }
          });
        }
      });
    };

    component.upload_table = function() {
      $('.local-browser-continue').toggleClass("disabled", true);
      //TODO: add logic to the file uploader to look for multiple files list to add
      var file = component.browser.selection()[0];
      var fileObject ={
       pid: component.project._id(),
       mid: component.model._id(),
       file: file,
       aids: ["data-table"],
       parser: component.parser(),
       progress: component.browser.progress,
       progress_status: component.browser.progress_status,
       progress_final: 90,
       success: function(){
         upload_success(component.browser);
       },
       error: function(){
          dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
          $('.local-browser-continue').toggleClass("disabled", false);
          component.browser.progress(null);
          component.browser.progress_status('');
        }
      };
      fileUploader.uploadFile(fileObject);
    };

    component.connect = function() {
      component.remote.enable(false);
      component.remote.status_type("info");
      component.remote.status("Connecting ...");

      if(component.remote.session_exists())
      {
        component.tab(3);
        component.remote.enable(true);
        component.remote.status_type(null);
        component.remote.status(null);
      }
      else
      {
        client.post_remotes({
          hostname: component.remote.hostname(),
          username: component.remote.username(),
          password: component.remote.password(),
          success: function(sid) {
            component.remote.session_exists(true);
            component.remote.sid(sid);
            component.tab(3);
            component.remote.enable(true);
            component.remote.status_type(null);
            component.remote.status(null);
          },
          error: function(request, status, reason_phrase) {
            component.remote.enable(true);
            component.remote.status_type("danger");
            component.remote.status(reason_phrase);
            component.remote.focus("password");
          }
        });
      }
    };

    component.load_table = function() {
      $('.remote-browser-continue').toggleClass("disabled", true);
      var fileObject ={
       pid: component.project._id(),
       hostname: [component.remote.hostname()],
       mid: component.model._id(),
       paths: [component.browser.selection()],
       aids: ["data-table"],
       parser: component.parser(),
       progress: component.remote.progress,
       progress_status: component.remote.progress_status,
       progress_final: 90,
       success: function(){
         upload_success(component.remote);
       },
       error: function(){
          dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
          $('.remote-browser-continue').toggleClass("disabled", false);
          component.remote.progress(null);
          component.remote.progress_status('');
        }
      };
      fileUploader.uploadFile(fileObject);
    };

    component.set_input = function(attribute) {
      attribute.output(false);
      attribute.category(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    };

    component.set_output = function(attribute) {
      attribute.input(false);
      attribute.category(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    };

    component.set_category = function(attribute) {
      attribute.input(false);
      attribute.output(false);
      attribute.rating(false);
      attribute.image(false);
      return true;
    };

    component.set_rating = function(attribute) {
      attribute.input(false);
      attribute.output(false);
      attribute.category(false);
      attribute.image(false);
      return true;
    };

    component.set_image = function(attribute) {
      attribute.input(false);
      attribute.output(false);
      attribute.category(false);
      attribute.rating(false);
      return true;
    };

    component.go_to_model = function() {
      location = server_root + 'models/' + component.model._id();
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

      client.put_model_parameter({
        mid: component.model._id(),
        aid: "input-columns",
        value: input_columns,
        input: true,
        success: function() {
          client.put_model_parameter({
            mid: component.model._id(),
            aid: "output-columns",
            value: output_columns,
            input: true,
            success: function() {
              client.put_model_parameter({
                mid: component.model._id(),
                aid: "rating-columns",
                value: rating_columns,
                input: true,
                success: function() {
                  client.put_model_parameter({
                    mid: component.model._id(),
                    aid: "category-columns",
                    value: category_columns,
                    input: true,
                    success: function() {
                      client.put_model_parameter({
                        mid: component.model._id(),
                        aid: "image-columns",
                        value: image_columns,
                        input: true,
                        success: function() {
                          component.tab(5);
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

    component.name_model = function() {
      client.put_model(
      {
        mid: component.model._id(),
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function()
        {
          client.post_model_finish({
            mid: component.model._id(),
            success: function() {
              component.go_to_model();
            }
          });
        },
        error: dialog.ajax_error("Error updating model."),
      });
    };

    component.back = function() {
      var target = component.tab();
      // Skip Upload Table tab if we're on the Choose Host tab.
      if(component.tab() == 2)
      {
        target--;
      }
      // Skip remote ui tabs if we are local
      if(component.ps_type() == 'local' && component.tab() == 4)
      {
        target--;
        target--;
      }
      target--;
      component.tab(target);
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/parameter-image/ui.html" },
  };
});
