/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-navbar", ["slycat-server-root", "slycat-web-client", "slycat-changes-feed", "slycat-dialog", "slycat-model-names", "knockout", "knockout-mapping"], function(server_root, client, changes_feed, dialog, model_names, ko, mapping)
{
  ko.components.register("slycat-navbar",
  {
    viewModel: function(params)
    {
      var refreshTimer = setInterval(checkCookie,60000)

      function checkCookie(){
        var myCookie = getCookie("slycattimeout");
        if(myCookie == null){
            //window.location.href = "/login/slycat-login.html?from=" + window.location.href;
            window.location.href = "/projects";
        }
      }

      function getCookie(name) {
        var dc = document.cookie;
        var prefix = name + "=";
        var begin = dc.indexOf("; " + prefix);
        if (begin == -1) {
            begin = dc.indexOf(prefix);
            if (begin != 0) return null;
        }
        else
        {
            begin += 2;
            var end = document.cookie.indexOf(";", begin);
            if (end == -1) {
            end = dc.length;
            }
        }
        return unescape(dc.substring(begin + prefix.length, end));
      }

      var component = this;
      component.server_root = server_root;
      component.model_names = model_names;

      // Keep track of the current project, if any.
      component.project_id = ko.observable(params.project_id);

      component.project = changes_feed.projects().filter(function(project)
      {
        return project._id() == component.project_id();
      }).map(function(project)
      {
        return {
          _id: project._id,
          name: project.name,
          description: project.description,
          creator: project.creator,
          created: project.created,
          acl: project.acl
        };
      });

      component.relation = ko.pureComputed(function(){
        if(component.project()[0])
        {
          var users = component.project()[0].acl;
          var get_name = function(x){ return x.user() };
          var roles = {
            administrator: users.administrators().map(get_name),
            writer: users.writers().map(get_name),
            reader: users.readers().map(get_name)
          };
          for(var k in roles)
            if(roles[k].indexOf(component.user.uid()) != -1)
              return k;
        }
        return "none";
      });

      // Keep track of the current model, if any.
      component.models = changes_feed.models();

      component.model_id = ko.observable(params.model_id);

      component.model = component.models.filter(function(model)
      {
        return model._id() == component.model_id();
      });

      component.navbar_popover = ko.pureComputed(function(){
        var projectInfo = "";
        if(component.project().length)
        {
          var project = component.project()[0];
          projectInfo += "<b>Project: </b> ";
          projectInfo += "<span>" + project.name() + "</span>";
          var members = [];
          for(var i = 0; i != project.acl.administrators().length; ++i)
            members.push(project.acl.administrators()[i].user());
          for(var i = 0; i != project.acl.writers().length; ++i)
            members.push(project.acl.writers()[i].user());
          for(var i = 0; i != project.acl.readers().length; ++i)
            members.push(project.acl.readers()[i].user());
          if(project.description())
            projectInfo += "<div><small><b>Description:</b> " + project.description() + "</small></div>";
          projectInfo += "<div><small><b>Members:</b> " + members.join(",") + "</small>";
          projectInfo += "<br /><small><b>Created:</b> " + project.created() + " by " + project.creator() + "</small></div>";
        }
        if(component.model().length)
        {
          var model = component.model()[0];
          projectInfo += "<br /><b>Model: </b> ";
          projectInfo += "<span>" + model.name() + "<span>";
          if(model.description())
            projectInfo += "<div><small><b>Description:</b> " + model.description() + "</small></div>";
          projectInfo += "<p><small><b>Created:</b> " + model.created() + " by " + model.creator() + "</small></p>";
        }

        return projectInfo;
      });

      component.model_alerts = ko.pureComputed(function()
      {
        var alerts = [];

        var models = component.model();
        for(var i = 0; i != models.length; ++i)
        {
          var model = models[i];

          if(model.state() == "waiting")
            alerts.push({"type":"info", "message":"The model is waiting for data to be uploaded.", "detail":null})

          if(model.state() == "running")
            alerts.push({"type":"success", "message":"The model is being computed.  Patience!", "detail":null})

          if(model.result && model.result() == "failed")
            alerts.push({"type":"danger", "message":"Model failed to build.  Here's what was happening when things went wrong:", "detail": model.message()})
        }

        return alerts;
      });

      // Reload model when it closes
      var modelSubscription = component.model.subscribe(function(newValue) {
        if(component.model().length == 1)
        {
          // Terminating subscription
          modelSubscription.dispose();
          var stateSubscription = component.model()[0].state.subscribe(function(newValue) {
            if(newValue == 'closed')
            {
              document.location.reload();
            }
          });
        }
      });

      // If the current model is finished, close it.
      component.close_model = function(model)
      {
        client.put_model(
        {
          mid: model._id(),
          state: "closed",
        });
      }

      component.model.filter(function(model)
      {
        return model.state() == "finished";
      }).map(function(model)
      {
        component.close_model(model);
      });

      // Keep track of running models
      component.open_models = component.models.filter(function(model)
      {
        return model.state() && model.state() != "closed";
      });
      component.finished_models = component.open_models.filter(function(model)
      {
        return model.state() == "finished";
      });
      component.running_models = component.open_models.filter(function(model)
      {
        return model.state() != "finished";
      }).map(function(model)
      {
        return  {
          _id: model._id,
          name: model.name,
          progress_percent: ko.pureComputed(function()
          {
            return model.progress() * 100;
          }),
          progress_type: ko.pureComputed(function()
          {
            return model.state() === "running" ? "success" : null;
          }),
        }
      });

      // Get the set of available wizards.
      component.wizards = mapping.fromJS([]);

      client.get_configuration_wizards(
      {
        success : function(wizards)
        {
          wizards.sort(function(left, right)
          {
            return left.label < right.label ? -1 : left.label > right.label ? 1 : 0;
          });

          mapping.fromJS(wizards, component.wizards);
          for(var i = 0; i != wizards.length; ++i)
          {
            ko.components.register(wizards[i].type,
            {
              require: component.server_root + "resources/wizards/" + wizards[i].type + "/ui.js"
            });
          }
        }
      });

      var filter_by_action = function(action, callback)
      {
        var extra_filters = callback || function(){ return true; };
        return function(wizard)
        {
          return wizard.require.action() === action && extra_filters(wizard);
        };
      };

      var create_wizards = component.wizards.filter(filter_by_action("create"));
      var edit_wizards = component.wizards.filter(filter_by_action("edit", function(wizard)
      {
        return component.relation() === "administrator" ||
          (component.relation() === "writer" && wizard.require.context() === "model");
      }));
      var info_wizards = component.wizards.filter(filter_by_action("info"));
      var delete_wizards = component.wizards.filter(filter_by_action("delete"));

      var global_wizard_filter = function(wizard)
      {
        return wizard.require.context() === "global";
      }
      var project_wizard_filter = function(wizard)
      {
        return wizard.require.context() === "project" && component.project_id() && !component.model_id();
      }
      var model_wizard_filter = function(wizard)
      {
        if("model-type" in wizard.require && component.model().length && wizard.require["model-type"].indexOf(component.model()[0]["model-type"]()) == -1)
          return false;
        return wizard.require.context() === "model" && component.model_id() && wizard.type() !== "slycat-create-saved-bookmark";
      }
      var bookmark_wizard_filter = function(wizard)
      {
        if("model-type" in wizard.require && component.model().length && wizard.require["model-type"].indexOf(component.model()[0]["model-type"]()) == -1)
          return false;
        return wizard.require.context() === "model" && component.model_id() && wizard.type() === "slycat-create-saved-bookmark";
      }
      component.global_create_wizards = create_wizards.filter(global_wizard_filter);
      component.project_create_wizards = create_wizards.filter(project_wizard_filter);
      component.model_create_wizards = create_wizards.filter(model_wizard_filter);
      component.global_edit_wizards = edit_wizards.filter(global_wizard_filter);
      component.project_edit_wizards = edit_wizards.filter(project_wizard_filter);
      component.model_edit_wizards = edit_wizards.filter(model_wizard_filter);
      component.project_info_wizards = info_wizards.filter(project_wizard_filter);
      component.model_info_wizards = info_wizards.filter(model_wizard_filter);
      component.model_bookmark_wizards = create_wizards.filter(bookmark_wizard_filter);
      component.global_delete_wizards = delete_wizards.filter(global_wizard_filter);
      component.project_delete_wizards = delete_wizards.filter(project_wizard_filter);
      component.model_delete_wizards = delete_wizards.filter(model_wizard_filter);
      component.wizard = ko.observable(false);
      component.show_wizard = ko.observable(false).extend({notify: "always"});
      component.show_wizard.subscribe(function(value)
      {
        $("#slycat-wizard").modal(value ? "show" : "hide");
        // Updating references when wizard is hidden because a new bookmark may have been created.
        if( value == false )
        {
          component.update_references();
        }
      });

      // Get information about the current user.
      component.user = mapping.fromJS({uid:"", name:""});
      client.get_user(
      {
        success: function(user)
        {
          mapping.fromJS(user, component.user);
        }
      });

      // Keep track of information about the current server version.
      component.version = mapping.fromJS({version:"unknown", commit:"unknown"});

      component.run_wizard = function(item)
      {
        component.wizard(false);
        component.wizard(item.type());
        component.show_wizard(true);
      }

      component.about = function()
      {
        client.get_configuration_version(
        {
          success : function(version)
          {
            mapping.fromJS(version, component.version);
          }
        });

        $("#slycat-about").modal("show");
      }

      component.support_request = function()
      {
        client.get_configuration_support_email(
        {
          success: function(email)
          {
            window.location.href = "mailto:" + email.address + "?subject=" + email.subject;
          }
        });
      }

      component.open_documentation = function()
      {
        window.open("http://slycat.readthedocs.org");
      }

      var references = mapping.fromJS([]);

      component.saved_project_bookmarks = references.filter(function(reference)
      {
        if(component.model_id() === undefined)
          return reference.bid() && reference.mid();
        else
          return reference.bid() && reference.mid() && reference.mid() != component.model_id();
      }).map(function(reference)
      {
        var model = ko.utils.arrayFirst(component.models(), function(model)
        {
          return model._id() == reference.mid();
        });

        return {
          _id: reference._id,
          name: reference.name,
          model_name: model ? model.name() : "",
          model_type: reference["model-type"] ? reference["model-type"]() : "",
          created: reference.created,
          creator: reference.creator,
          uri: server_root + "models/" + reference.mid() + "?bid=" + reference.bid(),
        };
      });

      component.saved_model_bookmarks = references.filter(function(reference)
      {
        if(component.model_id() === undefined)
          return false;
        else
          return reference.bid() && reference.mid() && reference.mid() == component.model_id();
      }).map(function(reference)
      {
        var model = ko.utils.arrayFirst(component.models(), function(model)
        {
          return model._id() == reference.mid();
        });

        return {
          _id: reference._id,
          name: reference.name,
          model_name: model ? model.name() : "",
          model_type: reference["model-type"] ? reference["model-type"]() : "",
          created: reference.created,
          creator: reference.creator,
          uri: server_root + "models/" + reference.mid() + "?bid=" + reference.bid(),
        };
      });

      component.edit_saved_bookmark = function(reference)
      {
        var name = ko.observable(reference.name())
        dialog.prompt(
        {
          title: "Edit Bookmark",
          value: name,
          buttons: [{className: "btn-default", label:"Cancel"}, {className: "btn-danger",label:"OK"}],
          callback: function(button)
          {
            if(button.label != "OK")
              return;
            client.put_reference(
            {
              rid: reference._id(),
              name: name(),
              success: function()
              {
                component.update_references();
              },
              error: dialog.ajax_error("Couldn't edit bookmark."),
            });
          },
        });
      }

      component.delete_saved_bookmark = function(reference)
      {
        dialog.dialog(
        {
          title: "Delete Saved Bookmark?",
          message: "The saved bookmark will be deleted immediately and there is no undo.  This will not affect any existing models or bookmarks.",
          buttons: [{className: "btn-default", label:"Cancel"}, {className: "btn-danger",label:"OK"}],
          callback: function(button)
          {
            if(button.label != "OK")
              return;
            client.delete_reference(
            {
              rid: reference._id(),
              success: function()
              {
                component.update_references();
              },
              error: dialog.ajax_error("Couldn't delete bookmark."),
            });
          },
        });
      }

      component.update_references = function()
      {
        if(component.project_id())
        {
          client.get_project_references(
          {
            pid: component.project_id(),
            success: function(result)
            {
              mapping.fromJS(result, references);
            }
          });
        }
      }

      component.update_references();
      component.sign_out = function()
      {
        client.sign_out({ 
          success: function(){
            //window.location.href = "/login/slycat-login.html?from=" + window.location.href;
            window.location.href = "/projects";
          }, 
          error: function(){
            window.alert("Sorry, something went wrong and you are not signed out."); 
          } 
        })
      }

    },
    template: { require: "text!" + server_root + "templates/slycat-navbar.html" }

  });
});

