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

  	this.x_slider = $("<slycat-range-slider params=\"axis:'vertical', length:length_slider, low:x_low, high:x_high\"></slycat-range-slider>")
      .appendTo(this.element)
      ;

    this.y_slider = $("<slycat-range-slider params=\"axis:'vertical', length:length_slider, low:x_low, high:x_high, reverse: true\"></slycat-range-slider>")
      .appendTo(this.element)
      ;

    this.feedback = $("<p>x: <span data-bind='text: x_low'></span> - <span data-bind='text: x_high'></span></p>")
    	.appendTo(this.element)
    	;

    var page = mapping.fromJS(
    {
      x_low: 0.3,
      x_high: 0.7,
      length_slider: 600,
    });

    ko.applyBindings(page, this.element[0]);

  },

});
});