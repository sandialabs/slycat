/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/

import api_root from "js/slycat-api-root";
import ko from "knockout";
import mapping from "knockout-mapping";
import scrubber from "../html/slycat-scrubber.html";

function constructor(params) {
    var scrollbar = this;
    scrollbar.axis = ko.unwrap(params.axis) || "vertical";
    scrollbar.reverse = ko.unwrap(params.reverse) || false;
    scrollbar.color = params.color || ko.observable(null);
    scrollbar.hover_background_color = params.hover_background_color || ko.observable(null);
    scrollbar.background_color = ko.observable('transparent');
    scrollbar.length = params.length || ko.observable(500);
    scrollbar.height = params.height || ko.observable(20);
    scrollbar.thumb =
        {
            length: params.thumb_width || ko.observable(10),
            height: params.thumb_height || ko.observable(15),
            dragging: params.dragging || ko.observable(false),
            last_drag: null,
        };
    scrollbar.domain =
        {
            min: params.domain_min || ko.observable(0),
            value: params.domain_value || ko.observable(0.5),
            max: params.domain_max || ko.observable(1),
        };
    scrollbar.domain.value.subscribe(function (newValue) {
        $("#waveform-viewer").trigger("diagram_time_changed", newValue);
    });
    scrollbar.range =
        {
            min: ko.observable(0),
        };
    scrollbar.range.max = ko.pureComputed(function () {
        return scrollbar.length() - scrollbar.thumb.length();
    });
    scrollbar.range.value = ko.pureComputed(function () {
        var domain_min = scrollbar.domain.min();
        var domain_value = scrollbar.domain.value();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.range.min();
        var range_max = scrollbar.range.max();

        return (domain_value - domain_min) / (domain_max - domain_min) * (range_max - range_min) + range_min;
    });
    scrollbar.css = ko.pureComputed(function () {
        return scrollbar.axis + (scrollbar.thumb.dragging() ? " dragging" : "");
    });
    scrollbar.style = ko.pureComputed(function () {
        var result = {};
        result[scrollbar.axis == "vertical" ? "height" : "width"] = scrollbar.length() + "px";
        result["border-color"] = "black";
        result["border-radius"] = "0px";
        result["border-width"] = "0px 0 0 0";
        result["background-color"] = scrollbar.background_color();
        return result;
    });
    scrollbar.thumb.style = ko.pureComputed(function () {
        var axis = scrollbar.axis;
        var reverse = scrollbar.reverse;

        var result = {};
        // result[axis == "vertical" ? "height" : "width"] = scrollbar.thumb.length() + "px";
        result["width"] = '17px';
        result["height"] = (scrollbar.height() + scrollbar.thumb.height()) + "px";
        result["border-left"] = scrollbar.thumb.length() + "px solid transparent";
        result["border-right"] = scrollbar.thumb.length() + "px solid transparent";
        result["border-top"] = scrollbar.thumb.height() + "px solid " + scrollbar.color();
        result[axis == "vertical" ? (reverse ? "bottom" : "top") : (reverse ? "right" : "left")] = scrollbar.range.value() + "px";
        result["background-color"] = scrollbar.color();
        result["border-radius"] = "0px";
        result["background-clip"] = "padding-box";
        // content-box also seems to work
        // result["background-clip"] = "content-box";

        return result;
    });
    scrollbar.click = function (model, event) {
        var domain_min = scrollbar.domain.min();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.range.min();
        var range_value = scrollbar.range.value();
        var range_max = scrollbar.range.max();
        var reverse = scrollbar.reverse;

        var proportion_of_range = (event.offsetX - scrollbar.thumb.length()) / (range_max - range_min);
        var new_value = ((domain_max - domain_min) * proportion_of_range) + domain_min

        scrollbar.domain.value(Math.max(domain_min, Math.min(domain_max, new_value)));
    }
    scrollbar.mouseover = function (model, event) {
        scrollbar.background_color(scrollbar.hover_background_color());
    }
    scrollbar.mouseout = function (model, event) {
        scrollbar.background_color('transparent');
    }
    scrollbar.thumb.mousedown = function (model, event) {
        scrollbar.thumb.dragging(true);
        scrollbar.thumb.last_drag = [event.pageX, event.pageY];
        window.addEventListener("mousemove", scrollbar.thumb.mousemove, true);
        window.addEventListener("mouseup", scrollbar.thumb.mouseup, true);
    }
    scrollbar.thumb.click = function (model, event) {
        // Stop propagation of the click on the thumb so it does not register
        // as a click on the scrollbar.
        event.stopPropagation();
    }
    scrollbar.thumb.mousemove = function (event) {
        var domain_min = scrollbar.domain.min();
        var domain_max = scrollbar.domain.max();
        var range_min = scrollbar.range.min();
        var range_value = scrollbar.range.value();
        var range_max = scrollbar.range.max();
        var reverse = scrollbar.reverse;

        var drange = (scrollbar.axis == "vertical") ? event.pageY - scrollbar.thumb.last_drag[1] : event.pageX - scrollbar.thumb.last_drag[0];
        if (reverse)
            drange = -drange;
        var new_value = ((range_value + drange) - range_min) / (range_max - range_min) * (domain_max - domain_min) + domain_min;

        scrollbar.domain.value(Math.max(domain_min, Math.min(domain_max, new_value)));
        scrollbar.thumb.last_drag = [event.pageX, event.pageY];
    }
    scrollbar.thumb.mouseup = function (event) {
        scrollbar.thumb.dragging(false);
        window.removeEventListener("mousemove", scrollbar.thumb.mousemove, true);
        window.removeEventListener("mouseup", scrollbar.thumb.mouseup, true);
    }
}

export default {
  viewModel: constructor,
  template: scrubber,
};


