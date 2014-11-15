(function()
{
  ko.components.register("slycat-header",
  {
    viewModel: function(params)
    {
      $(function () { $('[data-toggle="popover"]').popover() })

      var server_root = document.querySelector("#slycat-server-root").getAttribute("href");
      var current_revision = null;
      var component = this;

      component.projects_url = server_root + "projects";
      component.project_name = params.project_name;
      component.project_url = server_root + "projects/" + params.project_id;
      component.model_name = ko.observable(params.model_name);
      component.model_description = ko.observable(params.model_description);
      component.new_model_name = ko.observable(params.model_name);
      component.new_model_description = ko.observable(params.model_description);
      component.new_name = ko.observable("");
      component.new_description = ko.observable("");
      component.logo_url = server_root + "css/slycat-small.png";
      component.user = {uid : ko.observable(""), name : ko.observable("")};
      component.version = ko.observable("");
      component.brand_image = server_root + "css/slycat-brand.png";

      component.delete_model = function()
      {
        if(window.confirm("Delete " + component.model_name() + "? All data will be deleted immediately, and this cannot be undone."))
        {
          $.ajax(
          {
            type : "DELETE",
            url : location.href,
            success : function()
            {
              window.location.href = component.project_url;
            }
          });
        }
      }

      component.save_model_changes = function()
      {
        component.model_name(component.new_model_name());
        component.model_description(component.new_model_description());

        var model =
        {
          "name" : component.new_model_name(),
          "description" : component.new_model_description(),
        };

        $.ajax(
        {
          type : "PUT",
          url : location.href,
          contentType : "application/json",
          data : $.toJSON(model),
          processData : false,
          error : function(request, status, reason_phrase)
          {
            window.alert("Error updating model: " + reason_phrase);
          }
        });
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

/*
      // Mark this model as closed, so it doesn't show-up in the header anymore.
      $.ajax(
      {
        contentType : "application/json",
        data : $.toJSON({ "state" : "closed" }),
        processData : false,
        type : "PUT",
        url : location.href,
      });
*/

/*
      $('#workers-close').click(function()
      {
        $('#workers-close').slideUp();
        $('#workers-container').switchClass("workersDetail","workersCompact");
        window.setTimeout( "$('#workers-container .worker').each(function() { $(this).qtip('enable'); })", 250 ); // Enable tooltips when collapsing status bar. Added dealy otherwise tooltips appear before slideUp is finished
      });

      // Expand status bar when any part of it is clicked
      $('#workers-container.workersCompact').click(function()
      {
        if($(this).hasClass('workersCompact'))
        {
          document.getSelection().removeAllRanges(); // Need to clear selection after click since for some reason clicking an icon selects the status text to the right of it
          // Hide and disable all tooltips when expanding status bar
          disable_tooltips($("#workers-container .worker"));
          $('#workers-close').slideDown();
          $('#workers-container').switchClass("workersCompact","workersDetail");
        }
      });

      function close_model(mid)
      {
        $.ajax(
        {
          type : "PUT",
          url : server_root + "models/" + mid,
          contentType : "application/json",
          data : $.toJSON({
            "state" : "closed"
          }),
          processData : false
        });
      }

      function disable_tooltips(selector)
      {
        selector.each(function() { $(this).qtip('hide').qtip('api').disable(true); });
      }

      function update()
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
            var results = text? $.parseJSON(text) : null;
            if(results != null)
            {
              current_revision = results.revision;
              models = results.models;
              models.sort(function(a, b)
              {
                if(!a["finished"] && !b["finished"])
                {
                  if(a["started"] > b["started"])
                    return -1;
                  if(a["started"] == b["started"])
                    return 0;
                  return 1;
                };
                if(a["finished"] && b["finished"])
                {
                  if(a["finished"] > b["finished"])
                    return -1;
                  if(a["finished"] == b["finished"])
                    return 0;
                  return 1;
                }
                return a["finished"] ? 1 : -1;
              });

              function create_model_scaffolding(model)
              {
                return $("<div class='worker'>")
                  .attr('id', model["_id"])
                  .append($("<div>").addClass("message").click(function(e){window.location=server_root + "models/" + model["_id"];}))
                  .append($("<div>").addClass("name").click(function(e){window.location=server_root = "models/" + model["_id"];}))
                  .append($("<div>").addClass("close").append($("<button>").html("&times;").attr("title", "Close model.").click(
                    function(e){
                      close_model(model["_id"]);
                      e.stopPropagation();
                    }
                  )))
                  .qtip({
                    position: {
                      adjust: {
                        x: -14
                      }
                    },
                    content: {
                      text: ' ' // Need to initiate with some text otherwise tooltip is never created
                    },
                    hide: {
                      delay: 500,
                      fixed: true,
                    },
                    show: {
                      solo: true
                    },
                  });
              }

              $.each(models, function(index, model)
              {
                var model_id = model["_id"];
                var line = $("#" + model_id ,"#workers #workers-container");
                if(line.length == 0)
                  line = create_model_scaffolding(model).appendTo($("#workers #workers-container #workersWrapper"));

                line.toggleClass("finished", model["finished"] ? true : false)
                  .addClass(model["result"])
                  .addClass("updated") // Mark each model so we can remove the ones that no loner exist
                  .qtip(
                    'option',
                    'content.title.text',
                    (model["name"] || "")
                  );

                if(model["finished"]) {
                  line.click(function(e){
                    window.location=server_root + "models/" + model["_id"];
                    e.stopPropagation();
                  });
                }

                if( $('#workers-container').hasClass('workersDetail') ) {
                  disable_tooltips(line);
                }
                line.find(".message").text(model["message"] || "");
                line.find(".name").text(model["name"] || "");
                line.find(".close button").unbind('click').click(
                  function(e){
                    close_model(model_id);
                    e.stopPropagation();
                  }
                );

                // Set up progress indicator for workers with progress
                if(model.hasOwnProperty("progress")) {
                  // If the line doesn't have a progress class, add the class and add a progress indicator if it's not finished yet
                  if(!line.hasClass("progressDeterminate")) {
                    line.addClass("progressDeterminate");
                    if(!model["finished"]){
                      line.append($("<input>").addClass("pie").attr("value", model["progress"]).knob({
                        'min':0,
                        'max':1,
                        'readOnly':true,
                        'displayInput':false,
                        'fgColor':'#4D720C',
                        'bgColor':'#D7D7D6',
                        'width':15,
                        'height':15,
                        'thickness':0.4,
                        'step':0.01,
                      }));
                    }
                  }
                  // Otherwise check if it's not finished and update the progress indicator with current value
                  else if(!model["finished"]){
                    line.find(".pie").val(model["progress"]).trigger('change');
                  }
                  else {
                    line.find("input.pie").parent().remove();
                  }
                }

                if(true)
                {
                  line.qtip('option','content.text',
                    $('<div>').append($('<div>').text((model["message"] || ""))).append($('<a>').attr('href', server_root + "models/" + model['_id']).text('View'))
                  );

                }
                else
                {
                  line.qtip('option','content.text',
                    $('<div>').append($('<div>').text((model["message"] || ""))).append($('<a href="#">').text('Delete').click(close_model.bind(this, model_id)))
                  );
                }

              });

              $("#workers-container .worker").not(".updated").remove(); // Remove any non-existing workers
              $("#workers-container .worker").removeClass("updated"); // Clear the updated flag
            }

            // Restart the request immediately.
            window.setTimeout(update, 10);
          },
          error : function(request, status, reason_phrase)
          {
            // Rate-limit requests when there's an error.
            window.setTimeout(update, 5000);
          }
        });
      }

      update();
*/
    },
    template: ' \
<div class="bootstrap-styles"> \
  <nav class="navbar navbar-default" role="navigation"> \
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
          <li class="active"><a data-toggle="popover" data-placement="bottom" data-content="Description." data-bind="text:model_name"></a></li> \
        </ol> \
        <ul class="nav navbar-nav navbar-right"> \
          <li><button type="button" class="btn btn-xs btn-warning navbar-btn" data-toggle="modal" data-target="#slycat-edit-model">Edit Model</button></li> \
          <li class="navbar-text"><span data-bind="text:user.name"></span> (<span data-bind="text:user.uid"></span>)</li> \
          <li class="dropdown"> \
            <a class="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Help <span class="caret"></span></a> \
            <ul class="dropdown-menu" role="menu"> \
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
          <form role="form"> \
            <div class="form-group"> \
              <label for="slycat-model-name">Name</label> \
              <input id="slycat-model-name" class="form-control" type="text" data-bind="value:new_model_name"></input> \
            </div> \
            <div class="form-group"> \
              <label for="slycat-model-description">Description</label> \
              <textarea id="slycat-model-description" class="form-control" rows="3" data-bind="value:new_model_description"></textarea> \
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

