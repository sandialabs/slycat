/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

$.widget("parameter_image.variableswitcher",
{
  options:
  {
    metadata : null,
    "x-variable" : null,
    "y-variable" : null,
    "image-variable" : null,
    x_variables : [],
    y_variables : [],
    image_variables : [],

  },

  _create: function()
  {
    var self = this;

    this.x_label = $("<label for='x-axis-switcher'>X Axis:</label>")
      .appendTo(this.element)
      ;
    this.x_select = $("<select id='x-axis-switcher' name='x-axis-switcher' />")
      .change(function(){
        self.element.trigger("x-selection-changed", this.value);
        console.log("x change to " + this.value);
      })
      .appendTo(this.element)
      ;

    this.y_label = $("<label for='y-axis-switcher'>Y Axis:</label>")
      .appendTo(this.element)
      ;
    this.y_select = $("<select id='y-axis-switcher' name='y-axis-switcher' />")
      .change(function(){
        self.element.trigger("y-selection-changed", this.value);
        console.log("y change to " + this.value);
      })
      .appendTo(this.element)
      ;

    this.images_label = $("<label for='images-switcher'>Image Set:</label>")
      .appendTo(this.element)
      ;
    this.images_select = $("<select id='images-switcher' name='images-switcher' />")
      .change(function(){
        self.element.trigger("images-selection-changed", this.value);
        console.log("image change to " + this.value);
      })
      .appendTo(this.element)
      ;

    self._set_x();
    self._set_y();
    self._set_images();
  },

  _set_x: function()
  { 
    var self = this;
    this.x_select.empty();
    for(var i = 0; i < this.options.x_variables.length; i++) {
      $("<option />")
        .text(this.options.metadata['column-names'][this.options.x_variables[i]])
        .attr("value", this.options.x_variables[i])
        .attr("selected", function(){
          return self.options["x-variable"] == self.options.x_variables[i] ? "selected" : false;
        })
        .appendTo(this.x_select)
        ;
    }
  },

  _set_y: function()
  { 
    var self = this;
    this.y_select.empty();
    for(var i = 0; i < this.options.y_variables.length; i++) {
      $("<option />")
        .text(this.options.metadata['column-names'][this.options.y_variables[i]])
        .attr("value", this.options.y_variables[i])
        .attr("selected", function(){
          return self.options["y-variable"] == self.options.y_variables[i] ? "selected" : false;
        })
        .appendTo(this.y_select)
        ;
    }
  },

  _set_images: function()
  { 
    var self = this;
    this.images_select.empty();
    for(var i = 0; i < this.options.image_variables.length; i++) {
      $("<option />")
        .text(this.options.metadata['column-names'][this.options.image_variables[i]])
        .attr("value", this.options.image_variables[i])
        .attr("selected", function(){
          return self.options["image-variable"] == self.options.image_variables[i] ? "selected" : false;
        })
        .appendTo(this.images_select)
        ;
    }
  },

  _setOption: function(key, value)
  {
    //console.log("sparameter_image.variableswitcher._setOption()", key, value);
    this.options[key] = value;

    if(key == "image_variables")
    {
      self._set_images();
    }
    else if(key == 'x_variables')
    {
      self._set_x();
    }
    else if(key == 'y_variables')
    {
      self._set_y();
    }
  },

});
