/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

require(["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  ko.components.register("slycat-scrollbar",
  {
    viewModel: function(params)
    {
      var scrollbar = this;
      scrollbar.axis = ko.unwrap(params.axis) || "vertical";
      scrollbar.length = params.length || ko.observable(500);
      scrollbar.width = params.width || ko.observable(10);
      scrollbar.bar =
      {
        length: params.bar_length || ko.observable(scrollbar.length() * 0.1),
        width: params.bar_width || scrollbar.width,
        dragging: params.dragging || ko.observable(false),
        last_drag: null,
      };
      scrollbar.domain =
      {
        min: params.domain_min || ko.observable(0),
        value: params.domain_value || ko.observable(0.5),
        max: params.domain_max || ko.observable(1),
      };
      scrollbar.range =
      {
        min: ko.observable(0),
      };

      scrollbar.range.max = ko.pureComputed(function()
      {
        return scrollbar.length() - scrollbar.bar.length();
      });
      scrollbar.range.value = ko.pureComputed(function()
      {
        return (scrollbar.domain.value() - scrollbar.domain.min()) / (scrollbar.domain.max() - scrollbar.domain.min()) * (scrollbar.range.max() - scrollbar.range.min() + scrollbar.range.min());
      });
      scrollbar.style = ko.pureComputed(function()
      {
        var result = {};
        result[scrollbar.axis == "vertical" ? "height" : "width"] = scrollbar.length() + "px";
        result[scrollbar.axis == "vertical" ? "width" : "height"] = scrollbar.width() + "px";
        return result;
      });
      scrollbar.bar.style = ko.pureComputed(function()
      {
        var result = {};
        result[scrollbar.axis == "vertical" ? "height" : "width"] = scrollbar.bar.length() + "px";
        result[scrollbar.axis == "vertical" ? "width" : "height"] = scrollbar.bar.width() + "px";
        result[scrollbar.axis == "vertical" ? "top" : "left"] = scrollbar.range.value() + "px";
        return result;
      });
      scrollbar.bar.mousedown = function(model, event)
      {
        scrollbar.bar.dragging(true);
        scrollbar.bar.last_drag = [event.screenX, event.screenY];
        window.addEventListener("mousemove", scrollbar.bar.mousemove, true);
        window.addEventListener("mouseup", scrollbar.bar.mouseup, true);
      }
      scrollbar.bar.mousemove = function(event)
      {
        var new_range;
        if(scrollbar.axis == "vertical")
          new_range = scrollbar.range.value() + event.screenY - scrollbar.bar.last_drag[1];
        else
          new_range = scrollbar.range.value() + event.screenX - scrollbar.bar.last_drag[0];
        var new_value = (new_range - scrollbar.range.min()) / (scrollbar.range.max() - scrollbar.range.min()) * (scrollbar.domain.max() - scrollbar.domain.min()) + scrollbar.domain.min();

        scrollbar.domain.value(Math.max(scrollbar.domain.min(), Math.min(scrollbar.domain.max(), new_value)));
        scrollbar.bar.last_drag = [event.screenX, event.screenY];
      }
      scrollbar.bar.mouseup = function(event)
      {
        scrollbar.bar.dragging(false);
        window.removeEventListener("mousemove", scrollbar.bar.mousemove, true);
        window.removeEventListener("mouseup", scrollbar.bar.mouseup, true);
      }
    },
    template: { require: "text!" + server_root + "templates/slycat-scrollbar.html" }
  });
});
