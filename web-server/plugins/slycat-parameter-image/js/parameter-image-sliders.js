/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-parameter-image-sliders", ["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping) {
$.widget("parameter_image.sliders",
{

	options:
  {
    mid : null,
  },

  _create: function()
  {
  	var self = this;

  	// this.x_slider = $("<slycat-range-slider params=\"axis:'vertical', length:length, low:x_low, high:x_high\"></slycat-range-slider>")
   //    .appendTo(this.element)
   //    ;

   //  this.y_slider = $("<slycat-range-slider params=\"axis:'vertical', length:length, low:x_low, high:x_high, reverse: true\"></slycat-range-slider>")
   //    .appendTo(this.element)
   //    ;

    // this.z_slider = $("<div>").
    // 	.data("bind", {
    // 		component : {
    // 			name : "slycat-range-slider",
    // 			params : {
    // 				axis : "vertical",
    // 				length : length,
    // 				low : x_low,
    // 				high : x_high,
    // 				reverse : true,
    // 			},
    // 		},
    // 	})
    // 	.appendTo(this.element)
    // 	;

    // this.z_slider = $("<div>")
    // 	.data("bind", {
    // 		component : {
    // 			name : "slycat-range-slider",
    // 			params : {
    // 				axis : "vertical",
    // 				length : 'length',
    // 				low : 'x_low',
    // 				high : 'x_high',
    // 				reverse : true,
    // 			},
    // 		},
    // 	})
    // 	.appendTo(this.element)
    // 	;


    // this.feedback = $("<p>x: <span data-bind='text: x_low'></span> - <span data-bind='text: x_high'></span></p>")
    // 	.appendTo(this.element)
    // 	;

    var sliders = {
    	sliders : [
    		{ params: "axis:'vertical', length:length, low:x_low, high:x_high" },
    		{ params: "axis:'vertical', length:length, low:x_low, high:x_high" },
    		{ params: "axis:'vertical', length:length, low:x_low, high:x_high" },
    		{ params: "axis:'vertical', length:length, low:x_low, high:x_high" },
    	]
    }

    ko.applyBindings(sliders, this.element[0]);

    // this.container = $("<div data-bind='foreach: sliders'>")

    var page = mapping.fromJS(
    {
      x_low: 0.3,
      x_high: 0.7,
      length: 600,
    });

    // ko.applyBindings(page, this.element[0]);

  },

});
});