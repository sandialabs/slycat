define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout", "knockout-mapping"], function(server_root, client, dialog, ko, mapping) {
  function constructor(params) {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.model = mapping.fromJS({_id: null, name: "New CCA Model", description: "", marking: null});
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: true, focus: false, sid: null});
    component.remote.focus.extend({notify: "always"});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.parser = ko.observable(null);
    component.attributes = mapping.fromJS([]);
    component.scale_inputs = ko.observable(true);
    component.cca_type = ko.observable("local"); // local is selected by default...

    component.set_input = function(attribute) {
      attribute.output(false);
      return true;
    };

    component.set_output = function(attribute) {
      attribute.input(false);
      return true;
    };

    component.cancel = function() {
      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: "cca",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
          component.model._id(mid);
          component.tab(1);
        },
        error: dialog.ajax_error("Error creating model.")
      });
    };

    component.select_type = function() {
      var type = component.cca_type();

      if (type === "local") {
        $(".cca-tab-local").css("display", "block");
        component.tab(2);
      } else if (type === "remote") {
        $(".modal-dialog").addClass("modal-lg");
        $(".cca-tab-remote").css("display", "block");
        component.tab(3);
      }
    };

    component.upload_table = function() {
      client.post_model_files({
        mid: component.model._id(),
        files: component.browser.selection(),
        input: true,
        names: ["data-table"],
        parser: component.parser(),
        success: function() {
          client.get_model_table_metadata({
            mid: component.model._id(),
            name: "data-table",
            success: function(metadata) {
              var attributes = [];
              for(var i = 0; i != metadata["column-names"].length; ++i)
                attributes.push({name:metadata["column-names"][i], type:metadata["column-types"][i], input:metadata["column-types"][i] != "string", output:false});
              mapping.fromJS(attributes, component.attributes);
              component.tab(5);
            }
          });
        },
        error: dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: "),
      });
    };

    component.connect = function() {
      component.remote.enable(false);
      component.remote.status_type("info");
      component.remote.status("Connecting ...");
      client.post_remotes({
        hostname: component.remote.hostname(),
        username: component.remote.username(),
        password: component.remote.password(),
        success: function(sid) {
          component.remote.sid(sid);
          component.tab(4);
        },
        error: function(request, status, reason_phrase) {
          component.remote.enable(true);
          component.remote.status_type("danger");
          component.remote.status(reason_phrase);
          component.remote.focus("password");
        }
      });
    };

    component.load_table = function() {
      client.post_model_files({
        mid: component.model._id(),
        sids: [component.remote.sid()],
        paths: [component.browser.selection()],
        input: true,
        names: ["data-table"],
        parser: component.parser(),
        success: function() {
          client.get_model_table_metadata({
            mid: component.model._id(),
            name: "data-table",
            success: function(metadata) {
              var attributes = [];
              for(var i = 0; i != metadata["column-names"].length; ++i)
                attributes.push({name:metadata["column-names"][i], type:metadata["column-types"][i], input:metadata["column-types"][i] != "string", output:false});
              mapping.fromJS(attributes, component.attributes);
              component.tab(5);
            }
          });
        },
        error: dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: "),
      });
    };

    component.finish = function() {
      var input_columns = [];
      var output_columns = [];
      for(var i = 0; i != component.attributes().length; ++i) {
        if(component.attributes()[i].input())
          input_columns.push(i);
        if(component.attributes()[i].output())
          output_columns.push(i);
      }

      client.put_model_parameter({
        mid: component.model._id(),
        name: "input-columns",
        value: input_columns,
        input: true,
        success: function() {
          client.put_model_parameter({
            mid: component.model._id(),
            name: "output-columns",
            value: output_columns,
            input: true,
            success: function() {
              client.put_model_parameter({
                mid: component.model._id(),
                name: "scale-inputs",
                value: component.scale_inputs(),
                input: true,
                success: function() {
                  client.post_model_finish({
                    mid: component.model._id(),
                    success: function() {
                      component.tab(6);
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
    template: { require: "text!" + server_root + "resources/wizards/new-cca/ui.html"},
    };
});
