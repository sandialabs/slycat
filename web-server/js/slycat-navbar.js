/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-navbar", ["slycat-server-root", "slycat-web-client", "slycat-changes-feed", "knockout", "knockout-mapping"], function(server_root, client, changes_feed, ko, mapping)
{
  ko.components.register("slycat-navbar",
  {
    viewModel: function(params)
    {
      var component = this;
      component.server_root = server_root;

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
          acl: project.acl,
          popover: ko.pureComputed(function()
          {
            var members = [];
            for(var i = 0; i != project.acl.administrators().length; ++i)
              members.push(project.acl.administrators()[i].user());
            for(var i = 0; i != project.acl.writers().length; ++i)
              members.push(project.acl.writers()[i].user());
            for(var i = 0; i != project.acl.readers().length; ++i)
              members.push(project.acl.readers()[i].user());
            var result = "<p>" + project.description() + "</p>";
            result += "<p><small>Members: " + members.join(",") + "</small></p>";
            result += "<p><small><em>Created " + project.created() + " by " + project.creator() + "</em></small></p>";
            return result;
          }),
        };
      });

      // Keep track of the current model, if any.
      component.models = changes_feed.models();

      component.model_id = ko.observable(params.model_id);

      component.model = component.models.filter(function(model)
      {
        return model._id() == component.model_id();
      });

      component.model_popover = ko.pureComputed(function()
      {
        var model = component.model();
        if(!model.length)
          return "";
        model = model[0];
        return "<p>" + model.description() + "</p><p><small><em>Created " + model.created() + " by " + model.creator() + "</em></small></p>";
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

      var create_wizards = component.wizards.filter(function(wizard)
      {
        return wizard.require.action() === "create";
      });
      var edit_wizards = component.wizards.filter(function(wizard)
      {
        return wizard.require.action() === "edit";
      });
      var delete_wizards = component.wizards.filter(function(wizard)
      {
        return wizard.require.action() === "delete";
      });
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
        return wizard.require.context() === "model" && component.model_id();
      }
      component.global_create_wizards = create_wizards.filter(global_wizard_filter);
      component.project_create_wizards = create_wizards.filter(project_wizard_filter);
      component.model_create_wizards = create_wizards.filter(model_wizard_filter);
      component.global_edit_wizards = edit_wizards.filter(global_wizard_filter);
      component.project_edit_wizards = edit_wizards.filter(project_wizard_filter);
      component.model_edit_wizards = edit_wizards.filter(model_wizard_filter);
      component.global_delete_wizards = delete_wizards.filter(global_wizard_filter);
      component.project_delete_wizards = delete_wizards.filter(project_wizard_filter);
      component.model_delete_wizards = delete_wizards.filter(model_wizard_filter);
      component.wizard = ko.observable(false);
      component.show_wizard = ko.observable(false).extend({notify: "always"});
      component.show_wizard.subscribe(function(value)
      {
        $("#slycat-wizard").modal(value ? "show" : "hide");
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


    },
    template: ' \
<div class="bootstrap-styles zooming-modals"> \
  <nav class="navbar navbar-default"> \
    <div class="container"> \
      <div class="navbar-header"> \
        <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#slycat-navbar-content"> \
          <span class="sr-only">Toggle navigation</span> \
          <span class="icon-bar"></span> \
          <span class="icon-bar"></span> \
          <span class="icon-bar"></span> \
        </button> \
        <a class="navbar-brand" data-bind="attr:{href:server_root + \'projects\'}">Slycat</a> \
      </div> \
      <div class="collapse navbar-collapse" id="slycat-navbar-content"> \
        <ol class="breadcrumb navbar-left"> \
          <li data-bind="visible: true"><a data-bind="attr:{href:server_root + \'projects\'}">Projects</a></li> \
          <!-- ko foreach: project --> \
            <li><a data-bind="text:name,popover:{trigger:\'hover\',html:true,content:popover()},attr:{href:$parent.server_root + \'projects/\' + _id()}"></a></li> \
          <!-- /ko --> \
          <!-- ko foreach: model --> \
            <li class="slycat-unclickable"><a data-bind="text:name,popover:{trigger:\'hover\',html:true,content:$parent.model_popover()}"></a></li> \
          <!-- /ko --> \
        </ol> \
        <ul class="nav navbar-nav navbar-left"> \
          <li class="dropdown" data-bind="visible: global_create_wizards().length || project_create_wizards().length || model_create_wizards().length"> \
            <button type="button" class="btn btn-xs btn-success navbar-btn dropdown-toggle" data-toggle="dropdown">Create <span class="caret"></span></button> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: model_create_wizards --> \
                <li class="slycat-clickable"><a class="" data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: model_create_wizards().length && project_create_wizards().length"></li> \
              <!-- ko foreach: project_create_wizards --> \
                <li class="slycat-clickable"><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: project_create_wizards().length && global_create_wizards().length"></li> \
              <!-- ko foreach: global_create_wizards --> \
                <li class="slycat-clickable"><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
            </ul> \
          </li> \
          <li class="dropdown" data-bind="visible: global_edit_wizards().length || project_edit_wizards().length || model_edit_wizards().length"> \
            <button type="button" class="btn btn-xs btn-warning navbar-btn dropdown-toggle" data-toggle="dropdown">Edit <span class="caret"></span></button> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: model_edit_wizards --> \
                <li class="slycat-clickable"><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: model_edit_wizards().length && project_edit_wizards().length"></li> \
              <!-- ko foreach: project_edit_wizards --> \
                <li class="slycat-clickable"><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: project_edit_wizards().length && global_edit_wizards().length"></li> \
              <!-- ko foreach: global_edit_wizards --> \
                <li class="slycat-clickable"><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
            </ul> \
          </li> \
          <li class="dropdown" data-bind="visible: global_delete_wizards().length || project_delete_wizards().length || model_delete_wizards().length"> \
            <button type="button" class="btn btn-xs btn-danger navbar-btn dropdown-toggle" data-toggle="dropdown">Delete <span class="caret"></span></button> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: model_delete_wizards --> \
                <li class="slycat-clickable"><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: model_delete_wizards().length && project_delete_wizards().length"></li> \
              <!-- ko foreach: project_delete_wizards --> \
                <li class="slycat-clickable"><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible: project_delete_wizards().length && global_delete_wizards().length"></li> \
              <!-- ko foreach: global_delete_wizards --> \
                <li><a data-bind="text: label, click:$parent.run_wizard"></a></li> \
              <!-- /ko --> \
            </ul> \
          </li> \
          <li class="dropdown" data-bind="visible:open_models().length"> \
            <a class="dropdown-toggle" data-toggle="dropdown"><span class="badge"><span data-bind="text:running_models().length"></span> / <span data-bind="text:finished_models().length"></span></span><span class="caret"></span></a> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: finished_models --> \
                <li> \
                  <a data-bind="attr:{href:$parent.server_root + \'models/\' + $data._id()},popover:{trigger:\'hover\',content:$data.message()}"> \
                    <button type="button" class="btn btn-default btn-xs" data-bind="click:$parent.close_model,clickBubble:false,css:{\'btn-success\':$data.result && $data.result()===\'succeeded\',\'btn-danger\':$data.result && $data.result()!==\'succeeded\'}"><span class="fa fa-check"></span></button> \
                    <span data-bind="text:name"></span> \
                  </a> \
                </li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible:finished_models().length && running_models().length"></li> \
              <!-- ko foreach: running_models --> \
                <li> \
                  <a data-bind="attr:{href:$parent.server_root + \'models/\' + $data._id()}"> \
                    <span data-bind="text:name"></span> \
                  </a> \
                  <div style="height:10px; margin: 0 10px" data-bind="progress:{value:progress_percent,type:progress_type}"> \
                </li> \
              <!-- /ko --> \
            </ul> \
          </li> \
        </ul> \
        <ul class="nav navbar-nav navbar-right"> \
          <li class="navbar-text slycat-clickable"><span class="fa fa-user"></span> <span data-bind="text:user.name,popover:{trigger:\'hover\',content:\'Username: \' + user.uid()}"></span></li> \
          <li class="dropdown"> \
            <a class="dropdown-toggle slycat-clickable" data-toggle="dropdown">Help <span class="caret"></span></a> \
            <ul class="dropdown-menu"> \
              <li class="slycat-clickable"><a data-bind="click:about"><span class="fa fa-fw"></span> About Slycat</a></li> \
              <li class="slycat-clickable"><a data-bind="click:support_request"><span class="fa fa-fw fa-envelope-o"></span> Support Request</a></li> \
              <li class="slycat-clickable"><a data-bind="click:open_documentation"><span class="fa fa-fw fa-book"></span> Documentation</a></li> \
            </ul> \
          </li> \
        </ul> \
      </div> \
    </div> \
  </nav> \
  <!-- ko foreach: model_alerts --> \
    <div class="alert slycat-navbar-alert" data-bind="css:{\'alert-danger\':$data.type === \'danger\',\'alert-info\':$data.type === \'info\',\'alert-success\':$data.type === \'success\'}"> \
      <p data-bind="text:message"></p> \
      <pre data-bind="visible:detail,text:detail,css:{\'bg-danger\':$data.type === \'danger\',\'bg-info\':$data.type === \'info\',\'bg-success\':$data.type === \'success\'}"></pre> \
    </div> \
  <!-- /ko --> \
  <div class="modal fade" id="slycat-wizard" data-backdrop="static"> \
    <div class="modal-dialog"> \
      <div class="modal-content zoom-sensitive"> \
        <div data-bind="if: wizard" style="height: 100%"> \
          <div data-bind="component:{name:wizard,params:{projects:project,models:model,show_wizard:show_wizard}}" class="zoom-sensitive" style="height: 100%"> \
          </div> \
        </div> \
      </div> \
    </div> \
  </div> \
  <div class="modal fade" id="slycat-about"> \
    <div class="modal-dialog"> \
      <div class="modal-content"> \
        <div class="modal-body"> \
          <div class="jumbotron"> \
            <img data-bind="attr:{src:server_root + \'css/slycat-brand.png\'}"/> \
            <p>&hellip; is the web-based analysis and visualization platform created at Sandia National Laboratories.</p> \
          </div> \
          <p>Version <span data-bind="text:version.version"></span>, commit <span data-bind="text:version.commit"></span></p> \
          <p><small>Copyright 2013, Sandia Corporation. Under the terms of Contract DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain rights in this software.</small></p> \
        </div> \
        <div class="modal-footer"> \
          <button type="button" class="btn btn-default" data-dismiss="modal">Close</button> \
        </div> \
      </div> \
    </div> \
  </div> \
</div> \
'

  });
});

