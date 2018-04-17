/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */


require(["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  ko.components.register("slycat-scrollbar",
  {
    viewModel: function(params)
    {
      var scrollbar = this;
      scrollbar.axis = ko.unwrap(params.axis) || "vertical";
      scrollbar.reverse = ko.unwrap(params.reverse) || false;
      scrollbar.length = params.length || ko.observable(500);
      scrollbar.thumb =
      {
        length: params.thumb_length || ko.observable(scrollbar.length() * 0.1),
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
        return scrollbar.length() - scrollbar.thumb.length();
      });
      scrollbar.range.value = ko.pureComputed(function()
      {
        var domain_min = scrollbar.domain.min();
        var domain_value = scrollbar.domain.value();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.range.min();
        var range_max = scrollbar.range.max();

        return (domain_value - domain_min) / (domain_max - domain_min) * (range_max - range_min) + range_min;
      });
      scrollbar.css = ko.pureComputed(function()
      {
        return scrollbar.axis + (scrollbar.thumb.dragging() ? " dragging" : "");
      });
      scrollbar.style = ko.pureComputed(function()
      {
        var result = {};
        result[scrollbar.axis == "vertical" ? "height" : "width"] = scrollbar.length() + "px";
        return result;
      });
      scrollbar.thumb.style = ko.pureComputed(function()
      {
        var axis = scrollbar.axis;
        var reverse = scrollbar.reverse;

        var result = {};
        result[axis == "vertical" ? "height" : "width"] = scrollbar.thumb.length() + "px";
        result[axis == "vertical" ? (reverse ? "bottom" : "top") : (reverse ? "right" : "left")] = scrollbar.range.value() + "px";
        return result;
      });
      scrollbar.thumb.mousedown = function(model, event)
      {
        scrollbar.thumb.dragging(true);
        scrollbar.thumb.last_drag = [event.pageX, event.pageY];
        window.addEventListener("mousemove", scrollbar.thumb.mousemove, true);
        window.addEventListener("mouseup", scrollbar.thumb.mouseup, true);
      }
      scrollbar.thumb.mousemove = function(event)
      {
        var domain_min = scrollbar.domain.min();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.range.min();
        var range_value = scrollbar.range.value();
        var range_max = scrollbar.range.max();
        var reverse = scrollbar.reverse;

        var drange = (scrollbar.axis == "vertical") ? event.pageY - scrollbar.thumb.last_drag[1] : event.pageX - scrollbar.thumb.last_drag[0];
        if(reverse)
          drange = -drange;
        var new_value = ((range_value + drange) - range_min) / (range_max - range_min) * (domain_max - domain_min) + domain_min;

        scrollbar.domain.value(Math.max(domain_min, Math.min(domain_max, new_value)));
        scrollbar.thumb.last_drag = [event.pageX, event.pageY];
      }
      scrollbar.thumb.mouseup = function(event)
      {
        scrollbar.thumb.dragging(false);
        window.removeEventListener("mousemove", scrollbar.thumb.mousemove, true);
        window.removeEventListener("mouseup", scrollbar.thumb.mouseup, true);
      }
    },
    template: { require: "text!" + server_root + "templates/slycat-scrollbar.html" }
  });
});
