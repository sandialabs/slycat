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
      scrollbar.axis = ko.observable("horizontal");
      scrollbar.width = ko.observable(500);
      scrollbar.height = params.height || ko.observable(10);
      scrollbar.bar =
      {
        width: ko.observable(10),
        height: ko.observable(10),
        last_drag: ko.observable(null),
      };
      scrollbar.domain =
      {
        min: ko.observable(0),
        value: ko.observable(0.5),
        max: ko.observable(1),
      };
      scrollbar.range =
      {
        min: ko.observable(0),
      };

      console.log("scrollbar", scrollbar);

      scrollbar.range.max = ko.pureComputed(function()
      {
        if(scrollbar.axis() == "vertical")
          return scrollbar.height() - scrollbar.bar.height();
        else
          return scrollbar.width() - scrollbar.bar.width();
      });
      scrollbar.range.value = ko.pureComputed(function()
      {
        return (scrollbar.domain.value() - scrollbar.domain.min()) / (scrollbar.domain.max() - scrollbar.domain.min()) * (scrollbar.range.max() - scrollbar.range.min() + scrollbar.range.min());
      });
      scrollbar.bar.style = ko.pureComputed(function()
      {
        var result = {};
        result.width = scrollbar.bar.width() + "px";
        result.height = scrollbar.bar.height() + "px";
        if(scrollbar.axis() == "vertical")
          result.top = scrollbar.range.value() + "px";
        else
          result.left = scrollbar.range.value() + "px";
        return result;
      });
      scrollbar.bar.mousedown = function(model, event)
      {
        scrollbar.bar.last_drag([event.screenX, event.screenY]);
        window.addEventListener("mousemove", scrollbar.bar.mousemove, true);
        window.addEventListener("mouseup", scrollbar.bar.mouseup, true);
      }
      scrollbar.bar.mousemove = function(event)
      {
        var new_range;
        if(scrollbar.axis() == "vertical")
          new_range = scrollbar.range.value() + event.screenY - scrollbar.bar.last_drag()[1];
        else
          new_range = scrollbar.range.value() + event.screenX - scrollbar.bar.last_drag()[0];
        var new_value = (new_range - scrollbar.range.min()) / (scrollbar.range.max() - scrollbar.range.min()) * (scrollbar.domain.max() - scrollbar.domain.min()) + scrollbar.domain.min();

        scrollbar.domain.value(Math.max(scrollbar.domain.min(), Math.min(scrollbar.domain.max(), new_value)));
        scrollbar.bar.last_drag([event.screenX, event.screenY]);
      }
      scrollbar.bar.mouseup = function(event)
      {
        scrollbar.bar.last_drag(null);
        window.removeEventListener("mousemove", scrollbar.bar.mousemove, true);
        window.removeEventListener("mouseup", scrollbar.bar.mouseup, true);
      }
    },
    template: { require: "text!" + server_root + "templates/slycat-scrollbar.html" }
  });
});
