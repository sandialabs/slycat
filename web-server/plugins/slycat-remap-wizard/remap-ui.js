/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import server_root from "js/slycat-server-root";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import ko from 'knockout';
import mapping from "knockout-mapping";
import remapUI from "./remap-ui.html";

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
    type: component.original['model-type']()
  });
  component.media_columns = mapping.fromJS([]);
  component.search = ko.observable("");
  component.replace = ko.observable("");

  /** contains all the seach and replace pairs to be fed to the backend for update... */
  var searchAndReplaceArr = [];

  client.get_model_parameter(
  {
    mid: component.original._id(),
    aid: "image-columns",
    success: function(value)
    {
      mapping.fromJS(value, component.media_columns);
    },
  });

  component.cancel = function()
  {
    if(component.model._id())
      client.delete_model({ mid: component.model._id() });
  };


  var build_panel = function($container) {
    var $panel = $("<div />").addClass("panel panel-default");
    var $header = $("<div />").addClass("panel-heading");
    var $body = $("<div />").addClass("panel-body");

    $panel
      .append($header)
      .append($body);

    $container.append($panel);

    return {
      $header: $header,
      $body: $body
    };
  };

  var build_item = function(value) {
    var $wrapper = $("<div />").css("padding-bottom", 5);
    var $current = $("<div />");
    var $replace = $("<div />");

    var $currentLabel = $("<span />").addClass("remap-ui-label faded").text("Current: ");
    var $currentValue = $("<span />").css('opacity', 0.5).text(value);
    $current.append($currentLabel).append($currentValue);

    var $replaceLabel = $("<span />").addClass("remap-ui-label shorter").text("New: ");
    var $replaceValue = $("<input />")
      .attr("type", "text")
      .addClass("remap-ui-input")
      .val(value);
    $replace.append($replaceLabel).append($replaceValue);

    $wrapper
      .append($current)
      .append($replace);

    searchAndReplaceArr.push({
      search: value,
      $replace: $replaceValue
    });

    return $wrapper;
  };

  var build_column_block = function(name, uris) {
    var $wrapper = $("<div />").css("padding-bottom", 15);
    var $columns = $("<div />").css("margin-bottom", 3).text("Column(s): " + name);

    $wrapper.append($columns);

    uris.forEach(function(uri) {
      $wrapper.append(build_item(uri));
    });

    return $wrapper;
  };

  var display_uris = function(result) {
    var uris = result.uris;
    var $container = $("#path-structure-container");

    for (var h in uris) {
      if (uris.hasOwnProperty(h)) {
        var panelObj = build_panel($container);
        var host = uris[h];
        var $item = build_item(h);

        panelObj.$header.append($item);

        for (var c in host) {
          if (host.hasOwnProperty(c)) {
            panelObj.$body.append(build_column_block(c, host[c]));
          }
        }
      }
    }
  };

  var list_uris = function() {
    client.get_model_command({
      mid: component.model._id(),
      type: "remap-wizard",
      command: "list-uris",
      parameters: {
        columns: component.media_columns()
      },
      success: function(result) {
        display_uris(result);
      },
      error: dialog.ajax_error("Error listing URI's.")
    });
  };

  component.create_model = function()
  {
    client.post_project_models(
    {
      pid: component.project._id(),
      type: component.model.type(),
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
  };

  var callSearchAndReplace = function(search, replace, onSuccess) {
    client.post_model_command({
      mid: component.model._id(),
      type: "remap-wizard",
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
      var r = pair.$replace.val();

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
  
  component.go_to_model = function() {
    location = server_root + 'models/' + component.model._id();
  };

  component.finish = function() {
    processSearchAndReplace(searchAndReplaceArr.pop());
  };

  return component;
}

export default {
  viewModel: constructor,
  template: remapUI,
};