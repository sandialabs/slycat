/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

require(["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  ko.components.register("slycat-range-slider",
  {
    viewModel: function(params)
    {
      var scrollbar = this;
      scrollbar.axis = ko.unwrap(params.axis) || "vertical";
      scrollbar.invert = params.invert || ko.observable(false);
      scrollbar.reverse = ko.unwrap(params.reverse) || false;
      scrollbar.length = params.length || ko.observable(500);
      scrollbar.low_thumb =
      {
        length: params.thumb_length || ko.observable(12),
        dragging: params.dragging || ko.observable(false),
        last_drag: null,
      };
      scrollbar.high_thumb =
      {
        length: params.thumb_length || ko.observable(12),
        dragging: params.dragging || ko.observable(false),
        last_drag: null,
      };
      scrollbar.domain =
      {
        min: params.min || ko.observable(0),
        low_value: params.low || ko.observable(0.33),
        high_value: params.high || ko.observable(0.66),
        max: params.max || ko.observable(1),
      };
      scrollbar.low_range =
      {
        min: ko.observable(0),
      };
      scrollbar.low_range.max = ko.pureComputed(function()
      {
        return scrollbar.length() - scrollbar.low_thumb.length() - scrollbar.high_thumb.length();
      });
      scrollbar.high_range =
      {
      };
      scrollbar.high_range.min = ko.pureComputed(function()
      {
        return scrollbar.low_thumb.length();
      });
      scrollbar.high_range.max = ko.pureComputed(function()
      {
        return scrollbar.length() - scrollbar.high_thumb.length();
      });
      scrollbar.low_range.value = ko.pureComputed(function()
      {
        var domain_min = scrollbar.domain.min();
        var domain_value = scrollbar.domain.low_value();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.low_range.min();
        var range_max = scrollbar.low_range.max();

        return (domain_value - domain_min) / (domain_max - domain_min) * (range_max - range_min) + range_min;
      });
      scrollbar.high_range.value = ko.pureComputed(function()
      {
        var domain_min = scrollbar.domain.min();
        var domain_value = scrollbar.domain.high_value();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.high_range.min();
        var range_max = scrollbar.high_range.max();

        return (domain_value - domain_min) / (domain_max - domain_min) * (range_max - range_min) + range_min;
      });
      scrollbar.css = ko.pureComputed(function()
      {
        return scrollbar.axis + (scrollbar.low_thumb.dragging() || scrollbar.high_thumb.dragging() || scrollbar.range.dragging() ? " dragging" : "") + (scrollbar.invert() ? " invert" : "");
      });
      scrollbar.style = ko.pureComputed(function()
      {
        var result = {};
        result[scrollbar.axis == "vertical" ? "height" : "width"] = scrollbar.length() + "px";
        return result;
      });
      scrollbar.range = {
        dragging: params.dragging || ko.observable(false),
        last_drag: null
      };
      scrollbar.range.style = ko.pureComputed(function()
      {
        var axis = scrollbar.axis;
        var reverse = scrollbar.reverse;
        var low_value = scrollbar.low_range.value() + scrollbar.low_thumb.length() / 2;
        var high_value = scrollbar.high_range.value() + scrollbar.high_thumb.length() / 2;


        var result = {};
        result[axis == "vertical" ? (reverse ? "bottom" : "top") : (reverse ? "right" : "left")] = low_value + "px";
        result[axis == "vertical" ? "height" : "width"] = high_value - low_value + "px";
        return result;
      });
      scrollbar.low_thumb.style = ko.pureComputed(function()
      {
        var axis = scrollbar.axis;
        var reverse = scrollbar.reverse;

        var result = {};
        result[axis == "vertical" ? "height" : "width"] = scrollbar.low_thumb.length() + "px";
        result[axis == "vertical" ? (reverse ? "bottom" : "top") : (reverse ? "right" : "left")] = scrollbar.low_range.value() + "px";
        return result;
      });
      scrollbar.high_thumb.style = ko.pureComputed(function()
      {
        var axis = scrollbar.axis;
        var reverse = scrollbar.reverse;

        var result = {};
        result[axis == "vertical" ? "height" : "width"] = scrollbar.high_thumb.length() + "px";
        result[axis == "vertical" ? (reverse ? "bottom" : "top") : (reverse ? "right" : "left")] = scrollbar.high_range.value() + "px";
        return result;
      });
      scrollbar.low_thumb.mousedown = function(model, event)
      {
        scrollbar.low_thumb.dragging(true);
        scrollbar.low_thumb.last_drag = [event.pageX, event.pageY];
        window.addEventListener("mousemove", scrollbar.low_thumb.mousemove, true);
        window.addEventListener("mouseup", scrollbar.low_thumb.mouseup, true);
      }
      scrollbar.high_thumb.mousedown = function(model, event)
      {
        scrollbar.high_thumb.dragging(true);
        scrollbar.high_thumb.last_drag = [event.pageX, event.pageY];
        window.addEventListener("mousemove", scrollbar.high_thumb.mousemove, true);
        window.addEventListener("mouseup", scrollbar.high_thumb.mouseup, true);
      }
      scrollbar.range.mousedown = function(model, event)
      {
        scrollbar.range.dragging(true);
        scrollbar.range.last_drag = [event.pageX, event.pageY];
        window.addEventListener("mousemove", scrollbar.range.mousemove, true);
        window.addEventListener("mouseup", scrollbar.range.mouseup, true);
      }
      scrollbar.low_thumb.mousemove = function(event)
      {
        var domain_min = scrollbar.domain.min();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.low_range.min();
        var range_value = scrollbar.low_range.value();
        var range_max = scrollbar.low_range.max();
        var reverse = scrollbar.reverse;

        var drange = (scrollbar.axis == "vertical") ? event.pageY - scrollbar.low_thumb.last_drag[1] : event.pageX - scrollbar.low_thumb.last_drag[0];
        if(reverse)
          drange = -drange;
        var new_value = ((range_value + drange) - range_min) / (range_max - range_min) * (domain_max - domain_min) + domain_min;

        scrollbar.domain.low_value(
          Math.max(
            domain_min, 
            Math.min(
              domain_max, 
              scrollbar.domain.high_value(), 
              new_value
            )
          )
        );
        scrollbar.low_thumb.last_drag = [event.pageX, event.pageY];
      }
      scrollbar.high_thumb.mousemove = function(event)
      {
        var domain_min = scrollbar.domain.min();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.high_range.min();
        var range_value = scrollbar.high_range.value();
        var range_max = scrollbar.high_range.max();
        var reverse = scrollbar.reverse;

        var drange = (scrollbar.axis == "vertical") ? event.pageY - scrollbar.high_thumb.last_drag[1] : event.pageX - scrollbar.high_thumb.last_drag[0];
        if(reverse)
          drange = -drange;
        var new_value = ((range_value + drange) - range_min) / (range_max - range_min) * (domain_max - domain_min) + domain_min;

        scrollbar.domain.high_value(
          Math.max(
            domain_min, 
            scrollbar.domain.low_value(), 
            Math.min(domain_max, new_value)
          )
        );
        scrollbar.high_thumb.last_drag = [event.pageX, event.pageY];
      }
      scrollbar.range.mousemove = function(event)
      {
        var domain_min = scrollbar.domain.min();
        var domain_max = scrollbar.domain.max();
        var low_range_min = scrollbar.low_range.min();
        var low_range_value = scrollbar.low_range.value();
        var low_range_max = scrollbar.low_range.max();
        var high_range_min = scrollbar.high_range.min();
        var high_range_value = scrollbar.high_range.value();
        var high_range_max = scrollbar.high_range.max();
        var range = scrollbar.domain.high_value() - scrollbar.domain.low_value();
        var reverse = scrollbar.reverse;

        var drange = (scrollbar.axis == "vertical") ? event.pageY - scrollbar.range.last_drag[1] : event.pageX - scrollbar.range.last_drag[0];
        if(reverse)
          drange = -drange;
        var high_new_value = ((high_range_value + drange) - high_range_min) / (high_range_max - high_range_min) * (domain_max - domain_min) + domain_min;
        var low_new_value = ((low_range_value + drange) - low_range_min) / (low_range_max - low_range_min) * (domain_max - domain_min) + domain_min;

        scrollbar.domain.low_value(
          Math.max(
            domain_min, 
            Math.min(
              domain_max - range, 
              scrollbar.domain.high_value(), 
              low_new_value
            )
          )
        );
        scrollbar.domain.high_value(
          Math.max(
            domain_min + range, 
            scrollbar.domain.low_value(), 
            Math.min(
              domain_max, 
              high_new_value
            )
          )
        );
        scrollbar.range.last_drag = [event.pageX, event.pageY];
      }
      scrollbar.low_thumb.mouseup = function(event)
      {
        scrollbar.low_thumb.dragging(false);
        window.removeEventListener("mousemove", scrollbar.low_thumb.mousemove, true);
        window.removeEventListener("mouseup", scrollbar.low_thumb.mouseup, true);
      }
      scrollbar.high_thumb.mouseup = function(event)
      {
        scrollbar.high_thumb.dragging(false);
        window.removeEventListener("mousemove", scrollbar.high_thumb.mousemove, true);
        window.removeEventListener("mouseup", scrollbar.high_thumb.mouseup, true);
      }
      scrollbar.range.mouseup = function(event)
      {
        scrollbar.range.dragging(false);
        window.removeEventListener("mousemove", scrollbar.range.mousemove, true);
        window.removeEventListener("mouseup", scrollbar.range.mouseup, true);
      }
    },
    template: { require: "text!" + server_root + "templates/slycat-range-slider.html" }
  });
});
