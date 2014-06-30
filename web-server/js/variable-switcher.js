/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

$.widget("parameter_image.variableswitcher",
{
  options:
  {
    "x-variable" : null,
    "y-variable" : null,
    "image-variable" : null,
    x : [],
    y : [],
    images : [],
  },

  _create: function()
  {
    var self = this;

    this.x_label = $("<label for='x-axis-switcher'>X Axis:</label>")
      .appendTo(this.element)
      ;
    this.x_select = $("<select id='x-axis-switcher' name='x-axis-switcher' />")
      .appendTo(this.element)
      ;

    this.y_label = $("<label for='y-axis-switcher'>Y Axis:</label>")
      .appendTo(this.element)
      ;
    this.y_select = $("<select id='y-axis-switcher' name='y-axis-switcher' />")
      .appendTo(this.element)
      ;

    this.images_label = $("<label for='images-switcher'>Image Set:</label>")
      .appendTo(this.element)
      ;
    this.images_select = $("<select id='images-switcher' name='images-switcher' />")
      .appendTo(this.element)
      ;
    // $.each(this.color_maps, function(key, value)
    // {
    //   var button = $("<span>")
    //     .addClass("color")
    //     .toggleClass("selected", key == self.options.colormap)
    //     .appendTo(self.container)
    //     .attr("data-colormap", key)
    //     .html(value.label)
    //     .click(function()
    //     {
    //       if($(this).hasClass("selected"))
    //         return;

    //       self.options.colormap = this.getAttribute("data-colormap");
    //       self.container.find(".color").removeClass("selected");
    //       $(this).addClass("selected");

    //       self.element.trigger("colormap-changed", [self.options.colormap]);
    //     })
    //     ;
    // });
  },

  _setOption: function(key, value)
  {
    //console.log("sparameter_image.variableswitcher._setOption()", key, value);
    this.options[key] = value;

    if(key == "images")
    {
      
    }
    else if(key == 'x')
    {

    }
    else if(key == 'y')
    {

    }
  },

});
