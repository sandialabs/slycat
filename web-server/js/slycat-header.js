(function()
{
  ko.components.register("slycat-header",
  {
    viewModel: function(params)
    {
      var server_root = document.querySelector("#slycat-server-root").getAttribute("href");
      var component = this;

      component.server_root = server_root;
      component.model_root = server_root + "models/";
      component.projects_url = server_root + "projects";
      component.project_name = params.project_name;
      component.project_url = server_root + "projects/" + params.project_id;
      component.model_name = ko.observable(params.model_name);
      component.model_description = ko.observable(params.model_description);
      component.model_marking = ko.observable(params.model_marking);
      component.new_model_name = ko.observable(params.model_name);
      component.new_model_description = ko.observable(params.model_description);
      component.new_model_marking = ko.observable(params.model_marking);
      component.logo_url = server_root + "css/slycat-small.png";
      component.user = {uid : ko.observable(""), name : ko.observable("")};
      component.version = ko.observable("");
      component.brand_image = server_root + "css/slycat-brand.png";
      var open_models_mapping =
      {
        key: function(model)
        {
          return ko.utils.unwrapObservable(model._id);
        },
        create: function(options)
        {
          var result = ko.mapping.fromJS(options.data);
          result.progress_percent = ko.pureComputed(function()
          {
            return result.progress() * 100;
          });
          result.progress_type = ko.pureComputed(function()
          {
            return result.state() === "running" ? "success" : null;
          });
          return result;
        },
      }
      component.open_models = ko.mapping.fromJS([], open_models_mapping);
      component.finished_models = component.open_models.filter(function(model)
      {
        return model.state() == "finished";
      });
      component.running_models = component.open_models.filter(function(model)
      {
        return model.state() != "finished";
      });
      component.markings = ko.mapping.fromJS([]);

      component.close_model = function(model)
      {
        $.ajax(
        {
          contentType : "application/json",
          data : $.toJSON({ "state" : "closed" }),
          processData : false,
          type : "PUT",
          url : server_root + "models/" + model._id(),
        });
      }

      component.save_model_changes = function()
      {
        var model =
        {
          "name" : component.new_model_name(),
          "description" : component.new_model_description(),
          "marking" : component.new_model_marking(),
        };

        $.ajax(
        {
          type : "PUT",
          url : server_root + "models/" + params.model_id,
          contentType : "application/json",
          data : $.toJSON(model),
          processData : false,
          success : function()
          {
            if(component.new_model_marking() !== component.model_marking())
            {
              // Since marking changes have the potential to alter the page
              // structure in arbitrary ways, just reload.
              document.location.reload(true);
            }
            else
            {
              component.model_name(component.new_model_name());
              component.model_description(component.new_model_description());
              component.model_marking(component.new_model_marking());
            }
          },
          error : function(request, status, reason_phrase)
          {
            window.alert("Error updating model: " + reason_phrase);
          }
        });
      }

      component.delete_model = function()
      {
        if(window.confirm("Delete " + component.model_name() + "? All data will be deleted immediately, and this cannot be undone."))
        {
          $.ajax(
          {
            type : "DELETE",
            url : server_root + "models/" + params.model_id,
            success : function()
            {
              window.location.href = server_root + "projects/" + params.project_id;
            }
          });
        }
      }

      component.open_documentation = function()
      {
        window.open("http://slycat.readthedocs.org");
      }

      component.support_request = function()
      {
        $.ajax(
        {
          type : "GET",
          url : server_root + "configuration/support-email",
          success : function(email)
          {
            window.location.href = "mailto:" + email.address + "?subject=" + email.subject;
          }
        });
      }

      // Get information about the currently-logged-in user.
      $.ajax(
      {
        type : "GET",
        url : server_root + "users/-",
        success : function(user)
        {
          component.user.uid(user.uid);
          component.user.name(user.name);
        }
      });

      // Get information about the current server version.
      $.ajax(
      {
        type : "GET",
        url : server_root + "configuration/version",
        success : function(version)
        {
          component.version("Version " + version.version + ", commit " + version.commit);
        }
      });

      // Get the set of allowed server markings.
      $.ajax(
      {
        type : "GET",
        url : server_root + "configuration/markings",
        success : function(markings)
        {
          ko.mapping.fromJS(markings, component.markings);
        }
      });

      // Get information about open models.
      var current_revision = null;
      function get_models()
      {
        $.ajax(
        {
          dataType : "text",
          type : "GET",
          cache : false, // Don't cache this request; otherwise, the browser will display the JSON if the user leaves this page then returns.
          url : server_root + "models" + (current_revision != null ? "?revision=" + current_revision : ""),
          success : function(text)
          {
            // https://github.com/jquery/jquery-migrate/blob/master/warnings.md#jqmigrate-jqueryparsejson-requires-a-valid-json-string
            var results = text ? $.parseJSON(text) : null;
            if(results)
            {
              current_revision = results.revision;
              results.models.sort(function(left, right)
              {
                return left.created == right.created ? 0 : (left.created < right.created ? -1 : 1);
              });
              ko.mapping.fromJS(results.models, component.open_models);
            }

            // Restart the request immediately.
            window.setTimeout(get_models, 10);
          },
          error : function(request, status, reason_phrase)
          {
            // Rate-limit requests when there's an error.
            window.setTimeout(get_models, 5000);
          }
        });
      }

      get_models();
    },
    template: ' \
<div class="bootstrap-styles"> \
  <nav class="navbar navbar-default"> \
    <div class="container"> \
      <div class="navbar-header"> \
        <button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#slycat-header-content"> \
          <span class="sr-only">Toggle navigation</span> \
          <span class="icon-bar"></span> \
          <span class="icon-bar"></span> \
          <span class="icon-bar"></span> \
        </button> \
        <a class="navbar-brand" data-bind="attr:{href:projects_url}">Slycat</a> \
      </div> \
      <div class="collapse navbar-collapse" id="slycat-header-content"> \
        <ol class="breadcrumb navbar-left"> \
          <li><a data-bind="attr:{href:projects_url}">Projects</a></li> \
          <li><a data-bind="text:project_name, attr:{href:project_url}"></a></li> \
          <li class="active"><a id="slycat-model-description" data-bind="text:model_name,popover:{options:{content:model_description}}"></a></li> \
        </ol> \
        <ul class="nav navbar-nav navbar-left" data-bind="visible: open_models().length"> \
          <li class="dropdown"> \
            <a class="dropdown-toggle" data-toggle="dropdown"><span class="badge"><span data-bind="text:running_models().length"></span> / <span data-bind="text:finished_models().length"></span></span><span class="caret"></span></a> \
            <ul class="dropdown-menu"> \
              <!-- ko foreach: finished_models --> \
                <li> \
                  <a data-bind="attr:{href:$parent.model_root + $data._id()}"> \
                    <button type="button" class="btn btn-default btn-xs" data-bind="click:$parent.close_model,clickBubble:false,css:{\'btn-success\':$data.result()===\'succeeded\',\'btn-danger\':$data.result()!==\'succeeded\'}"><span class="glyphicon glyphicon-ok"></span></button> \
                    <span data-bind="text:name"></span> \
                  </a> \
                </li> \
              <!-- /ko --> \
              <li class="divider" data-bind="visible:finished_models().length && running_models().length"></li> \
              <!-- ko foreach: running_models --> \
                <li> \
                  <a data-bind="attr:{href:$parent.model_root + $data._id()}"> \
                    <span data-bind="text:name"></span> \
                  </a> \
                  <div style="height:10px; margin: 0 10px" data-bind="progress:{value:progress_percent,type:progress_type}"> \
                </li> \
              <!-- /ko --> \
            </ul> \
          </li> \
        </ul> \
        <ul class="nav navbar-nav navbar-right"> \
          <li><button type="button" class="btn btn-xs btn-warning navbar-btn" data-toggle="modal" data-target="#slycat-edit-model">Edit Model</button></li> \
          <li class="navbar-text"><span data-bind="text:user.name"></span> (<span data-bind="text:user.uid"></span>)</li> \
          <li class="dropdown"> \
            <a class="dropdown-toggle" data-toggle="dropdown">Help <span class="caret"></span></a> \
            <ul class="dropdown-menu"> \
              <li><a data-toggle="modal" data-target="#slycat-about">About Slycat</a></li> \
              <li><a data-bind="click:support_request">Support Request</a></li> \
              <li><a data-bind="click:open_documentation">Documentation</a></li> \
            </ul> \
          </li> \
        </ul> \
      </div> \
    </div> \
  </nav> \
  <div class="modal fade" id="slycat-about"> \
    <div class="modal-dialog"> \
      <div class="modal-content"> \
        <div class="modal-body"> \
          <div class="jumbotron"> \
            <img data-bind="attr:{src:brand_image}"/> \
            <p>&hellip; is the web-based analysis and visualization platform created at Sandia National Laboratories.</p> \
          </div> \
          <p data-bind="text:version"></p> \
          <p><small>Copyright 2013, Sandia Corporation. Under the terms of Contract DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain rights in this software.</small></p> \
        </div> \
        <div class="modal-footer"> \
          <button type="button" class="btn btn-default" data-dismiss="modal">Close</button> \
        </div> \
      </div> \
    </div> \
  </div> \
  <div class="modal fade" id="slycat-edit-model"> \
    <div class="modal-dialog"> \
      <div class="modal-content"> \
        <div class="modal-header"> \
          <h3 class="modal-title">Edit Model</h3> \
        </div> \
        <div class="modal-body"> \
          <form class="form-horizontal"> \
            <div class="form-group"> \
              <label for="slycat-model-name" class="col-sm-2 control-label">Name</label> \
              <div class="col-sm-10"> \
                <input id="slycat-model-name" class="form-control" type="text" placeholder="Name" data-bind="value:new_model_name"></input> \
              </div> \
            </div> \
            <div class="form-group"> \
              <label for="slycat-model-description" class="col-sm-2 control-label">Description</label> \
              <div class="col-sm-10"> \
                <textarea id="slycat-model-description" class="form-control" placeholder="Description" rows="5" data-bind="value:new_model_description"></textarea> \
              </div> \
            </div> \
            <div class="form-group"> \
              <label for="slycat-model-marking" class="col-sm-2 control-label">Marking</label> \
              <div class="col-sm-10"> \
                <select id="slycat-model-marking" class="form-control" data-bind="options:markings,optionsValue:\'type\',optionsText:\'label\',value:new_model_marking,valueAllowUnset:true"></select> \
              </div> \
            </div> \
          </form> \
        </div> \
        <div class="modal-footer"> \
          <button class="btn btn-danger pull-left" data-bind="click:delete_model">Delete Model</button> \
          <button class="btn btn-primary" data-bind="click:save_model_changes" data-dismiss="modal">Save Changes</button> \
          <button class="btn btn-warning" data-dismiss="modal">Cancel</button> \
        </div> \
      </div> \
    </div> \
  </div> \
</div> \
'

  });

}());

