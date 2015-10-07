define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout", "knockout-mapping", "slycat-remote-browser"], function(server_root, client, dialog, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.cluster_linkage = ko.observable("average"); // average is selected by default...
    component.cluster_column = ko.observable(false);
    component.ps_type = ko.observable("remote"); // local is selected by default...
    component.is_compute = ko.observable("no_compute");
    component.matrix_type = ko.observable("remote"); // local is selected by default...
    component.model = mapping.fromJS({_id: null, name: "New Parameter Image Plus Model", description: "", marking: null});
    component.remote = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: ko.computed(function(){return component.ps_type() == 'remote' ? true : false;}), focus: false, sid: null});
    component.remote.focus.extend({notify: "always"});
    component.remote_matrix = mapping.fromJS({hostname: null, username: null, password: null, status: null, status_type: null, enable: ko.computed(function(){return component.matrix_type() == 'remote' ? true : false;}), focus: false, sid: null});
    component.remote_matrix.focus.extend({notify: "always"});
    component.browser = mapping.fromJS({path:null, selection: []});
    component.parser = ko.observable(null);
    component.attributes = mapping.fromJS([]);
    component.image_attributes = ko.computed(function(){
      return ko.utils.arrayFilter(component.attributes(), function(attribute) {
        return attribute.image();
      });
    });
    component.image_attributes.subscribe(function(newValue){
      if(this.target().length > 0)
      {
        component.cluster_column( this.target()[0].name() );
      }
    });
    component.server_root = server_root;

    component.cancel = function() {
      if(component.remote.sid())
        client.delete_remote({ sid: component.remote.sid() });

      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    };

    component.create_model = function() {
      client.post_project_models({
        pid: component.project._id(),
        type: "parameter-image-plus",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid) {
          component.model._id(mid);
          client.put_model_parameter({
            mid: component.model._id(),
            aid: "cluster-linkage",
            value: component.cluster_linkage(),
            input: true,
            success: function() {
              component.tab(1);
              component.remote.focus(true);
            }
          });
        },
        error: dialog.ajax_error("Error creating model."),
      });
    };

    component.select_type = function() {
      $('.local-browser-continue-data').toggleClass("disabled", true);
      var type = component.ps_type();

      if (type === "local") {
        component.upload_table();
      } else if (type === "remote") {
        $(".modal-dialog").addClass("modal-lg");
        $(".ps-tab-remote-data").css("display", "block");
        component.connect();
      }
    };

    component.select_matrix_type = function() {
      $('.local-browser-continue-matrix').toggleClass("disabled", true);
      var type = component.matrix_type();

      if (type === "local") {
        component.upload_distance_matrix();
      } else if (type === "remote") {
        $(".modal-dialog").addClass("modal-lg");
        $(".ps-tab-remote-matrix").css("display", "block");
        component.connect_matrix();
      }
    };

    var upload_success = function() {
      client.get_model_command({
        mid: component.model._id(),
        type: "parameter-image-plus",
        command: "media-columns",
        success: function(media_columns) {
          client.get_model_table_metadata({
            mid: component.model._id(),
            aid: "data-table",
            success: function(metadata) {
              var attributes = [];
              for(var i = 0; i != metadata["column-names"].length; ++i)
              {
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
                  lastSelected: false
                });
              }
              // find the first image column and set its name to component.cluster_column
              component.cluster_column

              mapping.fromJS(attributes, component.attributes);
              component.tab(3);
              $('.browser-continue').toggleClass("disabled", false);
            }
          });
        }
      });
    };

    component.upload_table = function() {
      //$('.local-browser-continue').toggleClass("disabled", true);
      client.post_model_files({
        mid: component.model._id(),
        files: component.browser.selection(),
        input: true,
        aids: ["data-table"],
        parser: component.parser(),
        success: upload_success,
        error: function(){
          dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
          $('.local-browser-continue').toggleClass("disabled", false);
        },
      });
    };

    component.select_columns = function() {
      if (component.ps_type() === "remote") {
        $('.ps-tab-compute-matrix').css('display', 'block');
        $('.ps-tab-locate-matrix').css('display', 'none');
        component.tab(4);
      } else
        component.tab(5);
    };

    component.select_compute = function() {
      if (component.is_compute() === 'yes_compute') {
        component.finish(true);
      } else if (component.is_compute() === 'no_compute') {
        $('.ps-tab-locate-matrix').css('display', 'block');
        $('.ps-tab-remote-matrix').css('display', 'block');
        component.tab(5);
      }
    };

    var upload_matrix_success = function() {
      client.get_model_command({
        mid: component.model._id(),
        type: "parameter-image",
        command: "media-columns",
        success: function(media_columns) {
          client.get_model_table_metadata({
            mid: component.model._id(),
            aid: "data-table",
            success: function(metadata) {
              // var attributes = [];
              // for(var i = 0; i != metadata["column-names"].length; ++i)
              //   attributes.push({
              //     name:metadata["column-names"][i],
              //     type:metadata["column-types"][i],
              //     input:false,
              //     output:false,
              //     category:false,
              //     rating:false,
              //     image:media_columns.indexOf(i) !== -1,
              //     Classification: 'Neither',
              //     Categorical: false,
              //     Editable: false,
              //     hidden: media_columns.indexOf(i) !== -1,
              //     selected: false,
              //     lastSelected: false
              //   });
              // mapping.fromJS(attributes, component.attributes);
              component.finish();
              $('.browser-continue').toggleClass("disabled", false);
            }
          });
        }
      });
    };

    component.upload_distance_matrix = function() {
      //$('.local-browser-continue').toggleClass("disabled", true);
      client.post_model_files({
        mid: component.model._id(),
        files: component.browser.selection(),
        input: true,
        aids: ["distance-matrix"],
        parser: "slycat-csv-parser",
        success: upload_matrix_success,
        error: function(){
          dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
          $('.local-browser-continue').toggleClass("disabled", false);
        },
      });
    };

    component.connect = function() {
      component.remote.status_type("info");
      component.remote.status("Connecting ...");
      client.post_remotes({
        hostname: component.remote.hostname(),
        username: component.remote.username(),
        password: component.remote.password(),
        success: function(sid) {
          component.remote.sid(sid);
          component.tab(2);
        },
        error: function(request, status, reason_phrase) {
          component.remote.status_type("danger");
          component.remote.status(reason_phrase);
          component.remote.focus("password");
        }
      });
    };

    component.connect_matrix = function() {
      component.remote_matrix.status_type("info");
      component.remote_matrix.status("Connecting ...");
      client.post_remotes({
        hostname: component.remote_matrix.hostname(),
        username: component.remote_matrix.username(),
        password: component.remote_matrix.password(),
        success: function(sid) {
          component.remote_matrix.sid(sid);
          component.tab(6);
        },
        error: function(request, status, reason_phrase) {
          component.remote_matrix.status_type("danger");
          component.remote_matrix.status(reason_phrase);
          component.remote_matrix.focus("password");
        }
      });
    };

    component.load_table = function() {
      $('.remote-browser-continue-data').toggleClass("disabled", true);
      client.post_model_files({
        mid: component.model._id(),
        sids: [component.remote.sid()],
        paths: component.browser.selection(),
        input: true,
        aids: ["data-table"],
        parser: component.parser(),
        success: function(){
          upload_success();
        },
        error: function(){
          dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
          $('.remote-browser-continue').toggleClass("disabled", false);
        },
      });
    };

    component.load_distance_matrix = function() {
      $('.remote-browser-continue-matrix').toggleClass("disabled", true);
      client.post_model_files({
        mid: component.model._id(),
        sids: [component.remote_matrix.sid()],
        paths: component.browser.selection(),
        input: true,
        aids: ["distance-matrix"],
        parser: "slycat-csv-parser",
        success: function(){
          upload_matrix_success();
        },
        error: function(){
          dialog.ajax_error("Did you choose the correct file and filetype?  There was a problem parsing the file: ")();
          $('.remote-browser-continue').toggleClass("disabled", false);
        },
      });
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

    component.finish = function(not_finished) {
      component.tab(7);
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
        // if(component.attributes()[i].input())
        //   input_columns.push(i);
        // if(component.attributes()[i].output())
        //   output_columns.push(i);
        // if(component.attributes()[i].category())
        //   category_columns.push(i);
        // if(component.attributes()[i].rating())
        //   rating_columns.push(i);
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
                          client.put_model_parameter({
                            mid: component.model._id(),
                            aid: "cluster-columns",
                            value: component.cluster_column(),
                            input: true,
                            success: function() {
                              client.put_model_parameter({
                                mid: component.model._id(),
                                aid: "cluster-measure",
                                value: 'csv',
                                input: true,
                                success: function() {
                                  if (!not_finished) {
                                    client.post_model_finish({
                                      mid: component.model._id(),
                                      success: function() {
                                        component.tab(7);
                                      }
                                    });
                                  }
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
      });
    };

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/parameter-image-plus/ui.html" },
  };
});
