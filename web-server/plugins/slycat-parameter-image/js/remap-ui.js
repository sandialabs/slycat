define(["slycat-server-root", "slycat-web-client", "slycat-dialog", "knockout", "knockout-mapping"], function(server_root, client, dialog, ko, mapping)
{
  function constructor(params)
  {
    var component = {};
    component.tab = ko.observable(0);
    component.project = params.projects()[0];
    component.original = params.models()[0];
    component.model = mapping.fromJS(
    {
      _id: null,
      name: "Remapped " + component.original.name(),
      description: component.original.description(),
      marking: component.original.marking(),
    });
    component.media_columns = mapping.fromJS([]);
    component.search = ko.observable("");
    component.replace = ko.observable("");

    /** contains all the seach and replace pairs to be fed to the backend for update... */
    var searchAndReplaceArr = [];


    client.get_model_parameter(
    {
      mid: component.original._id(),
      name: "image-columns",
      success: function(value)
      {
        mapping.fromJS(value, component.media_columns);
      },
    });

    component.cancel = function()
    {
      if(component.model._id())
        client.delete_model({ mid: component.model._id() });
    }


    var build_li = function(label, name) {
      var $li = $("<li />");
      var $div = $("<div />");

      var $label = $("<span />").text(label + ": " + name);
      var $replaceLabel = $("<span />").text(" - replace with: ");
      var $replace = $("<input />")
        .attr("type", "text")
        .val(name);

      $div
        .append($label)
        .append($replaceLabel)
        .append($replace);

      $li.append($div);

      searchAndReplaceArr.push({
        search: name,
        replace: $replace
      });

      return $li;
    };

    var build_column_ul = function(name, uris) {
      var $li = $("<li />").text(name);
      var $subUl = $("<ul />");

      uris.forEach(function(uri) {
        $subUl.append(build_li("Uri", uri));
      });

      $li.append($subUl);

      return $li;
    };

    var display_uris = function(result) {
      var uris = result.uris;
      var $container = $("#path-structure-container");
      var $hostUl = $("<ul />");

      for (var h in uris) {
        if (uris.hasOwnProperty(h)) {
          var host = uris[h];
          var $li = build_li("Host", h);
          var $ul = $("<ul />");

          for (var c in host) {
            if (host.hasOwnProperty(c)) {
              $ul.append(build_column_ul(c, host[c]));
            }
          }

          $li.append($ul);
          $hostUl.append($li);
        }
      }

      $container.append($hostUl);
    };

    var list_uris = function() {
      client.get_model_command(
      {
        mid: component.model._id(),
        command: "list-uris",
        parameters:
        {
          columns: component.media_columns()
        },
        success: function(result)
        {
          display_uris(result);
        },
        error: dialog.ajax_error("Error listing URI's.")
      })
    };

    component.create_model = function()
    {
      client.post_project_models(
      {
        pid: component.project._id(),
        type: "parameter-image",
        name: component.model.name(),
        description: component.model.description(),
        marking: component.model.marking(),
        success: function(mid)
        {
          component.model._id(mid);
          client.put_model_inputs(
          {
            mid: component.model._id(),
            sid: component.original._id(),
            "deep-copy": true,
            success: function()
            {
              list_uris();
              component.tab(1);
            },
            error: dialog.ajax_error("Error duplicating model artifacts: "),
          });
        },
        error: dialog.ajax_error("Error creating model."),
      });
    }


    var callSearchAndReplace = function(search, replace, onSuccess) {
      client.get_model_command({
        mid: component.model._id(),
        command: "search-and-replace",
        parameters: {
          columns: component.media_columns(),
          search: search,
          replace: replace,
        },
        success: onSuccess,
        error: dialog.ajax_error("There was a problem remapping the data: "),
      });
    };

    var processSearchAndReplace = function(pair) {
      if (typeof pair !== "undefined") {
        var s = pair.search;
        var r = pair.replace.val();

        if (s === r)
          processSearchAndReplace(searchAndReplaceArr.pop());
        else {
          callSearchAndReplace(s, r, function() {
            processSearchAndReplace(searchAndReplaceArr.pop());
          });
        }
      } else {
        client.post_model_finish({
          mid: component.model._id(),
          success: function() {
            component.tab(2);
          }
        });
      }
    };

    component.finish = function() {
      processSearchAndReplace(searchAndReplaceArr.pop());
    }

    return component;
  }

  return {
    viewModel: constructor,
    template: { require: "text!" + server_root + "resources/wizards/remap-parameter-image/ui.html" },
  };
});
