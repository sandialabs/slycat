function SelectorBrush(plot_container) {
  this.plot_container = plot_container;
  this.data_container = null;
  this.x_scale = null;
  this.y_scale = null;
  this.brush = d3.svg.brush().on('brush', this.brush_action());
}

SelectorBrush.prototype.brush_action = function() {
  // return a function so that object scope ('this') is captured in closure when registering callback
  var self = this;
  return (function() {
     // only update brush selection for a mouse drag, not for a click
    var dragged_x = Math.abs(self.x_scale(self.brush.extent()[0][0]) - self.x_scale(self.brush.extent()[1][0])) > 5;
    var dragged_y = Math.abs(self.y_scale(self.brush.extent()[0][1]) - self.y_scale(self.brush.extent()[1][1])) > 5;
    if (dragged_x || dragged_y) {
      self.plot_container.scatterplot("brush_select", self.brush.extent());
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
