function SelectorBrush(plot_obj, plot_container) {
  this.plot_obj = plot_obj;
  this.plot_container = plot_container;
  this.data_container = null;
  this.x_scale = null;
  this.y_scale = null;
  this.drag_threshold = 5;
  this.click_radius = 3;
  this.brush = d3.svg.brush()
    .on('brushstart', this.hide_other_brushes())
    .on('brush', this.select_points());
}

SelectorBrush.prototype.hide_other_brushes = function() {
  // return a function so that object scope ('this') is captured in closure when registering callback
  var self = this;
  return (function() {
    d3.selectAll('.scatterplot rect.extent').style('display', 'none');
    d3.select(self.plot_obj.plot_ref).select('rect.extent').style('display', 'block');
  });
};

SelectorBrush.prototype.select_points = function() {
  // return a function so that object scope ('this') is captured in closure when registering callback
  var self = this;
  return (function() { //this will implicitly be passed event when action is triggered
    var x_lo = self.brush.extent()[0][0];
    var y_lo = self.brush.extent()[0][1];
    var x_hi = self.brush.extent()[1][0];
    var y_hi = self.brush.extent()[1][1];
    var dragged_x = Math.abs(self.x_scale(x_lo) - self.x_scale(x_hi)) > self.drag_threshold;
    var dragged_y = Math.abs(self.y_scale(y_lo) - self.y_scale(y_hi)) > self.drag_threshold;
    var selection;
    if (dragged_x || dragged_y) {
      selection = {
        "x_lo": x_lo,
        "y_lo": y_lo,
        "x_hi": x_hi,
        "y_hi": y_hi
      };
      self.plot_container.scatterplot("brush_select", selection, !event.ctrlKey);
    }
    else {
      // 'hi' values will be identical in the case of a click, so just use 'lo'
      selection = {
        "x_lo": self.x_scale.invert(self.x_scale(x_lo) - self.click_radius),
        "y_lo": self.y_scale.invert(self.y_scale(y_lo) + self.click_radius), // + b/c pixels indexed from top to bottom
        "x_hi": self.x_scale.invert(self.x_scale(x_lo) + self.click_radius),
        "y_hi": self.y_scale.invert(self.y_scale(y_lo) - self.click_radius)
      };
      self.plot_container.scatterplot("brush_select", selection, !event.ctrlKey);
    }
  });
};

SelectorBrush.prototype.initialize = function() {
  var self = this;
  // ensure data_group and axis scales are set first
  if (!(self.data_group == null || self.x_scale == null || self.y_scale == null)) {
    self.data_group.call(self.brush)
      .style({ // mimic the old drag box styling
        "fill": "#FF0",
        "fill-opacity": "0.3",
        "stroke": "#FF0"
      });
  }
};

SelectorBrush.prototype.load_data_group = function(data_group) { // takes a d3 <g> selection
  var self = this;
  self.data_group = data_group;
};

SelectorBrush.prototype.rescale = function(x_scale, y_scale) { // takes d3 scales
  var self = this;
  self.x_scale = x_scale;
  self.y_scale = y_scale;
  self.brush.x(self.x_scale).y(self.y_scale);
};
