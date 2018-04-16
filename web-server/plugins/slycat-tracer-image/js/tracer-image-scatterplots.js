/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

//////////////////////////////////////////////////////////////////////////////////
// d3js.org scatterplot visualization, for use with the parameter-image model.

define("tracer-image-scatterplot-widget", ["d3", "PlotControl"], function(d3, PlotControl) {
  $.widget("tracer_image.scatterplot", {
    options: {
      object_ref : null,
      scatterplot_obj : null,
      selector_brush : null,
      width : null,
      height : null,
      //The parent to use for resizing purposes:
      display_pane : "",
      dimension_adjustments: {width: function(){return 0}, height: function(){return 0;}},
      indices : [],
      x : [],
      y : [],
      v : [],
      t : [],
      images : [],
      selection : [],
      color : d3.scale.linear().domain([-1, 0, 1]).range(["blue", "white", "red"]),
      border : 50,
      server_root : "",
      open_images : [],
      gradient : null,
      hidden_simulations : [],
      filtered_indices : [],
      filtered_selection : [],
    },

    _create: function() {
      var self = this;

      self.model = self.options.scatterplot_obj.model;
      self.login = self.options.scatterplot_obj.login;
      self.grid = self.options.scatterplot_obj.grid_obj;
      self.hover_timer = null;
      self.close_hover_timer = null;
      self.opening_image = null;
      self.state = "";
      self.start_drag = null;
      self.current_drag = null;
      self.end_drag = null;

      out = self;

      self.numeric_variables = [];
      for(var i = 0; i < self.model.metadata["column-count"]; i++) { // model is currently in global scope (init.js)
        if(self.model.metadata["column-types"][i] != 'string')
          self.numeric_variables.push(i);
      }

      self.image_variables = self.model.image_columns;

      // Setup the scatterplot ...
      self.group = d3.select(self.element.get(0));

      self.svg = d3.select($(self.group[0]).parents("svg")[0]);

      self._build_x_axis();
      self._build_y_axis();
      self._build_image_control();
      self._build_color_legend();
      self._build_movie_start();

      self.datum_layer = self.group.append("g").attr("class", "datum-layer");
      self.selector_brush = self.options.selector_brush;
      //TODO self.options.scatterplot_obj.scatterplot_obj is possible, the object naming is clearly bad
      self.selected_layer = self.group.append("g");
      self.selection_layer = self.group.append("g");

      var top_layer = $(self.group[0]).parents("svg");
      var image_layer_check = top_layer.find("g.image-layer")[0];

      self.image_layer = image_layer_check ? d3.select(image_layer_check) : d3.select(top_layer[0]).append("g").attr("class", "image-layer");
      self.image_layer = self.image_layer.append("g")
        .classed("plot-image-layer", true)
        .attr("id", self.options.scatterplot_obj.plot_id.replace("plot", "images"));

      self.image_cache = {};

      self.updates = {};
      self.update_timer = null;
      self._schedule_update({
        update_indices:true,
        update_width:true,
        update_height:true,
        update_x:true,
        update_y:true,
        update_color_domain:true,
        render_data:true,
        render_selection:true,
        open_images:true,
        render_legend:true,
        update_legend_colors:true,
        update_legend_position:true,
        update_legend_axis:true,
      });

      self.legend_layer
        .call(
          d3.behavior.drag()
            .on('drag', function(){
              d3.event.sourceEvent.stopPropagation();
              // Make sure mouse is inside svg element
              if( 0 <= d3.event.y && d3.event.y <= self.options.height && 0 <= d3.event.x && d3.event.x <= self.options.width ){
                var theElement = d3.select(this);
                var transx = Number(theElement.attr("data-transx"));
                var transy = Number(theElement.attr("data-transy"));
                transx += d3.event.dx;
                transy += d3.event.dy;
                theElement.attr("data-transx", transx);
                theElement.attr("data-transy", transy);
                theElement.attr('transform', "translate(" + transx + ", " + transy + ")");
              }
            })
            .on("dragstart", function(e) {
              d3.event.sourceEvent.stopPropagation();
              self.state = "moving";
              d3.event.sourceEvent.stopPropagation(); // silence other listeners
            })
            .on("dragend", function(e) {
              d3.event.sourceEvent.stopPropagation();
              self.state = "";
              // self._sync_open_images();
              d3.select(this).attr("data-status", "moved");
            })
        )
      ;

      self.element.mouseup(function(e)
                           {
                           });
      self._filterIndices();
    },

    _filterIndices: function()
    {
      var self = this;
      var x = self.options.x;
      var y = self.options.y;
      var indices = self.options.indices;
      var selection = self.options.selection;
      var hidden_simulations = self.options.hidden_simulations;

      var filtered_indices;
      if(indices.length > 1)
        filtered_indices = Array.apply( [], indices );
      else
        filtered_indices = [indices[0]];

      var filtered_selection = selection.slice(0);
      var length = indices.length;

      // Remove hidden simulations and NaNs
      for(var i=length-1; i>=0; i--){
        var hidden = $.inArray(indices[i], hidden_simulations) > -1;
        var nan_check = Number.isNaN ? Number.isNaN : isNaN;
        var NaNValue = nan_check(x[i]) || nan_check(y[i]);
        if(hidden || NaNValue) {
          filtered_indices.splice(i, 1);
          var selectionIndex = $.inArray(indices[i], filtered_selection);
          if( selectionIndex > -1 ) {
            filtered_selection.splice(selectionIndex, 1);
          }
        }
      }

      self.options.filtered_indices = filtered_indices;
      self.options.filtered_selection = filtered_selection;
    },

    _build_x_axis: function() {
      var self = this;
      self.x_axis_layer = self.group.append("g").attr("class", "x-axis");
      self.x_control = new PlotControl({
        plot: self.options.scatterplot_obj,
        container: self.x_axis_layer,
        control_type: 'x',
        label_text: 'X variable:',
        variables: self.numeric_variables.slice(0, self.numeric_variables.length-1),
        column_names: self.model.metadata['column-names']
      });
      self.x_control.build();
    },

    _build_y_axis: function() {
      var self = this;
      self.y_axis_layer = self.group.append("g").attr("class", "y-axis");
      self.y_control = new PlotControl({
        plot: self.options.scatterplot_obj,
        container: self.y_axis_layer,
        control_type: 'y',
        label_text: 'Y variable:',
        variables: self.numeric_variables.slice(0, self.numeric_variables.length-1),
        column_names: self.model.metadata['column-names']
      });
      self.y_control.build();
    },

    _build_color_legend: function() {
      var self = this;
      self.legend_layer = self.group.append("g").attr("class", "legend");

      self.color_control = new PlotControl({
        plot: self.options.scatterplot_obj,
        container: self.legend_layer,
        control_type: 'v',
        label_text: 'Color variable:',
        variables: self.numeric_variables.slice(0, self.numeric_variables.length-1),
        column_names: self.model.metadata['column-names']
      });
      self.color_control.build();
      self.legend_axis_layer = self.legend_layer.append("g").attr("class", "legend-axis");
    },

    _build_image_control: function() {
      var self = this;
      self.image_control_layer = self.x_axis_layer.append("g").attr("class", "image-select");

      self.image_control = new PlotControl({
        plot: self.options.scatterplot_obj,
        container: self.image_control_layer,
        control_type: 'images',
        label_text: 'Image set:',
        variables: self.image_variables,
        column_names: self.model.metadata['column-names'],
      });
      self.image_control.build();

    },

    _build_movie_start: function(){
      this.movie_start_layer = this.x_axis_layer.append("g").attr({"class": "movie-start", transform:"translate(" + 50 + " 0)"});

      this.model.movie.build_open_button(this.movie_start_layer, this.options.scatterplot_obj);
    },

    _setOption: function(key, value)
    {
      var self = this;

      //console.log("parameter_image.scatterplot._setOption()", key, value);
      self.options[key] = value;

      if(key == "indices")
      {
        self._filterIndices();
        self._schedule_update({update_indices:true, render_selection:true});
      }

      else if(key == "x")
      {
        self._filterIndices();
        self._close_hidden_simulations();
        self._schedule_update({update_x:true, update_leaders:true, render_data:true, render_selection:true});
      }

      else if(key == "y")
      {
        self._filterIndices();
        self._close_hidden_simulations();
        self._schedule_update({update_y:true, update_leaders:true, render_data:true, render_selection:true});
      }

      else if(key == "v")
      {
        self._schedule_update({update_color_domain:true, render_data:true, render_selection:true, update_legend_axis:true});
      }

      else if(key == "images")
      {
      }

      else if(key == "selection")
      {
        self._filterIndices();
        self._schedule_update({render_selection:true});
      }

      else if(key == "color")
      {
        self._schedule_update({update_color_domain:true, render_data:true, render_selection:true});
      }

      else if(key == "width")
      {
        self._schedule_update({update_width:true, update_x:true, update_leaders:true, render_data:true, render_selection:true});
      }

      else if(key == "height")
      {
        self._schedule_update({update_height:true, update_y:true, update_leaders:true, render_data:true, render_selection:true, update_legend_position:true, update_legend_axis:true});
      }

      else if(key == "border")
      {
        self._schedule_update({update_x:true, update_y:true, update_leaders:true, render_data:true, render_selection:true, update_legend_position:true});
      }

      else if(key == "gradient")
      {
        self._schedule_update({update_legend_colors:true, });
      }

      else if(key == "hidden_simulations")
      {
        self._filterIndices();
        self._schedule_update({render_data:true, render_selection:true, });
        self._close_hidden_simulations();
      }
    },

    force_update: function(updates)
    {
      this._schedule_update(updates);
    },

    _schedule_update: function(updates)
    {
      var self = this;

      for(var key in updates)
        self.updates[key] = updates[key];

      if(self.update_timer)
        return;

      self.update_timer = window.setTimeout(function() { self._update(); }, 0);
    },

    _update: function()
    {
      var self = this;

      //console.log("parameter_image.scatterplot._update()", self.updates);
      self.update_timer = null;

      function pickNumberFormat(min, max) {
        /* There will likely be suboptimally formatted numbers - but before you spend too long trying to pick a better format,
         be warned that like many things in JS, the number formats are completely insane and seem to deliberately violate
         the principle of least surprise. This is a valiant but doomed attempt to make them less broken. */
        var format = '.3g';
        if ((Math.abs(min) < .001 && min != 0) || (Math.abs(max) < .001 && max != 0)) {
          format = '.1e';
        }
        return format;
      }

      if(self.updates["update_width"])
      {
        $(self.options.display_pane).resize();
        self.options.width = self.element.parents(self.options.display_pane).width() * self.options.scalar.x;
        self.options.width += self.options.dimension_adjustments.width();
        self.element.attr("width", self.options.width);
        self.group.attr("width", self.options.width);
        if(this.options.scatterplot_obj.movie) {
          self.model.movie.resize(self.options.scatterplot_obj);
        }
      }

      if(self.updates["update_height"])
      {
        $(self.options.display_pane).resize();
        self.options.height = self.element.parents(self.options.display_pane).height() * self.options.scalar.y;
        self.options.height += self.options.dimension_adjustments.height();
        self.element.attr("height", self.options.height);
        self.group.attr("height", self.options.height);
        if(this.options.scatterplot_obj.movie) {
          self.model.movie.resize(self.options.scatterplot_obj);
        }
      }

      if(self.updates["update_indices"])
      {
        self.inverse_indices = {};
        var count = self.options.indices.length;
        for(var i = 0; i != count; ++i)
          self.inverse_indices[self.options.indices[i]] = i;
      }

      if(self.updates["update_x"])
      {
        var total_width = self.options.width;
        var total_height = self.options.height;
        var width = Math.min(total_width, total_height);
        var height = Math.min(total_width, total_height);
        var width_offset = (total_width - width) / 2;
        var height_offset = (total_height - height) / 2;

        var x_min = d3.min(self.options.x);
        var x_max = d3.max(self.options.x);

        self.x_scale = d3.scale.linear()
          .domain([x_min, x_max])
          .range([0 + width_offset + self.options.border, total_width - width_offset - self.options.border]);
        self.x_axis = d3.svg.axis()
          .scale(self.x_scale)
          .orient("bottom")
          .tickFormat(d3.format(pickNumberFormat(x_min, x_max)));
        self.x_axis_layer
          .attr("transform", "translate(0," + (total_height - height_offset - self.options.border - 40) + ")")
          .call(self.x_axis);

        //Check to see if any axis label overlaps the next one:
        if(self.x_axis_layer.selectAll("text")[0].reduce(function(acc, x, i, arr){
          return acc || (arr[i+1] && ($(x).position().left + x.getComputedTextLength() > $(arr[i+1]).position().left));
        }, false)){

          self.x_axis_layer.selectAll("text")
            .attr("y", function(d,i){return Number($(this).attr("y")) + (i%2 ? 12 : 0);});
        }

        var range = self.x_scale.range();
        var range_midpoint = (range[1] - range[0])/2 + range[0];
        //account for control width and leave space for image control
        var control_x_offset = range_midpoint - Number(self.x_control.foreign_object.attr('width'))/2 - 60;
        self.x_control.foreign_object.attr('transform', 'translate(' + control_x_offset + ',30)');
        self.movie_start_layer.attr('transform', 'translate(' + (control_x_offset - self.x_control.foreign_object.attr("width")/2 - 40) + ',30)');
      }

      if(self.updates["update_y"])
      {
        var total_width = self.options.width;
        var total_height = self.options.height;
        var width = Math.min(total_width, total_height);
        var height = Math.min(total_width, total_height);
        var width_offset = (total_width - width) / 2;
        var height_offset = (total_height - height) / 2;
        self.y_axis_offset = 0 + width_offset + self.options.border;

        var y_min = d3.min(self.options.y);
        var y_max = d3.max(self.options.y);

        self.y_scale = d3.scale.linear()
          .domain([y_min, y_max])
          .range([total_height - height_offset - self.options.border - 40, 0 + height_offset + self.options.border]);
        self.y_axis = d3.svg.axis()
          .scale(self.y_scale)
          .orient("left")
          .tickFormat(d3.format(pickNumberFormat(y_min, y_max)));
        self.y_axis_layer
          .attr("transform", "translate(" + self.y_axis_offset + ",0)")
          .call(self.y_axis);

        var range = self.y_scale.range();
        var range_midpoint = (range[1] - range[0])/2 + range[0];
        var control_y_offset = range_midpoint - Number(self.y_control.foreign_object.attr('height'))/2; //account for control width

        var text_width = d3.max(self.y_axis_layer.selectAll('text')[0].map(function(textElem) { return textElem.getComputedTextLength(); }));
        var control_x_offset = -15 - text_width - Number(self.y_control.foreign_object.attr('width')); // - ((tick to axis offset = 10) + 5)

        self.y_control.foreign_object.attr('transform', 'translate(' + control_x_offset + ',' + control_y_offset + ')');
      }

      if(self.updates["update_y"] || self.updates["update_x"])
      {
        var domain = self.x_scale.range();
        var domain_midpoint = (domain[1] - domain[0])/2 + domain[0];
        var image_control_offset = domain_midpoint - Number(self.image_control.foreign_object.attr('width'))/2 + 60;
        self.image_control_layer.attr("transform", "translate(" + image_control_offset + ",30)");

        //update brush since scale(s) changed in prior if-clauses
        self.selector_brush.rescale(self.x_scale, self.y_scale);
        self.selector_brush.initialize();
      }

      if(self.updates["update_color_domain"])
      {
        var v_min = d3.min(self.options.v);
        var v_max = d3.max(self.options.v);
        var domain = [];
        var domain_scale = d3.scale.linear()
              .domain([0, self.options.color.domain().length])
              .range([v_min, v_max]);
        for(var i in self.options.color.domain())
          domain.push(domain_scale(i));
        self.options.color.domain(domain);
      }

      if(self.updates["render_data"])
      {
        var x = self.options.x;
        var y = self.options.y;
        var v = self.options.v;
        var indices = self.options.indices;
        var filtered_indices = self.options.filtered_indices;

        self.group.select(".time-paths").remove();

        var make_line = d3.svg.line();
        var color_scale = d3.scale.linear()
              .domain([0, filtered_indices.length])
              .range(["white", "black"]);

        var time_line_group = self.group.insert("g", ".datum-layer + g")
              .attr("class", "time-paths");

        self.selector_brush.load_data_group(time_line_group);
        self.selector_brush.initialize();

        /*Workaround for #258:
         * d3 brush creates an inverted cross on windows (For r,g,b, the cursor color becomes 256-r, 256-g, 256-b)
         * For (128,128,128) the cursor "dissappears"
         * Instead, use the parent's cursor.
         */
        d3.select($(time_line_group[0][0]).find(".background")[0]).style("cursor", "inherit")

        var get_length = function(from_index, to_index){
          var from = [self.x_scale(x[from_index]), self.y_scale(y[from_index])];
          var to = [self.x_scale(x[to_index]), self.y_scale(y[to_index])];
          return Math.abs(from[0] - to[0]) + Math.abs(from[1] - to[1]);
        }

        var get_closest_image_index = function(lower_node, upper_node){
          var next_index,
              next_args = [lower_node, upper_node];
          //In a tie, go up.
          if(lower_node['l'] < upper_node['l']){
            next_index = upper_node['i'];
            //TODO: Add weight to be the length of the path element.
            next_args = [lower_node, {l: upper_node['l'] + get_length(upper_node['i'], upper_node['i'] + 1), i: upper_node['i'] + 1}];
          }
          else {
            next_index = lower_node['i'];
            next_args = [{l: lower_node['l'] + get_length(lower_node['i'], lower_node['i'] - 1), i: lower_node['i'] - 1}, upper_node];
          }

          if(next_index >= 0 && next_index < self.options.images.length && self.options.images[next_index]) {
            return next_index;
          }

          return get_closest_image_index.apply(this, next_args);
        };

        var offsets = this._get_plot_offsets();

        filtered_indices.map(function(d) {
          return [self.x_scale(x[d]), self.y_scale(y[d])];
        }).reduce(function(prev, next, index) {
          // Get the endpoints in reverse order, we'll subtract the index later:
          var endpoints = [next, prev];
          var find_closest = function(change_selection) {
            return function() {
              var e = d3.event;
              var coord = [d3.event.offsetX - offsets[0], d3.event.offsetY - offsets[1]];
              //Just doing this for a rough comparison, why bother with expensive math like sqrt and exponents:
              var distance = endpoints.map(function(point) {
                return Math.abs(point[0] - coord[0]) + Math.abs(point[1] - coord[1]);
              });
              ////For reference, this is the more accurate way to do it:
              //var distance = endpoints.map(function(point){ var dx = (point[0] - coord[0]); var dy = (point[1] = coord[1]); return Math.sqrt(dx*dx + dy*dy); })
              var image_index = get_closest_image_index
                    .apply(this, distance.map(function(dist, j) {
                      return {l: dist, i: index - j};
                    }).sort(function(a,b){
                      return a.i - b.i;
                    })
                    );
              if(change_selection) {
                if (e.ctrlKey || e.metaKey) {
                  var not_selected = (self.options.selection.indexOf(image_index) == -1);
                  if (not_selected) {
                    self.options.selection.push(image_index);
                  }
                }
                else {
                  self.options.selection = [image_index];
                }
                self._schedule_update({render_selection:true});
                self.element.trigger("selection-changed", [self.options.selection]);
              }
              self._schedule_hover(image_index);
            };
          };
          // thicker line colored according to color var selected
          time_line_group.append("path")
            .attr("stroke", self.options.color(v[index]))
            .attr("stroke-width", 3)
            .attr("d", function(){return make_line([prev, next])})
            .attr("index", index)
            .on('mousedown', find_closest(true))
            .on('mouseover', find_closest(false));
          // thinner black/white timeline in center
          time_line_group.append("path")
            .attr("stroke", color_scale(index))
            .attr("stroke-width", 1)
            .attr("d", function(){return make_line([prev, next])})
            .attr("index", index)
            .on('mousedown', find_closest(true));
          return next;
        });
      }

      if(self.updates["render_selection"])
      {
        var x = self.options.x;
        var y = self.options.y;
        var v = self.options.v;
        var indices = self.options.indices;
        var filtered_selection = self.options.filtered_selection;
        var nan_check = Number.isNaN ? Number.isNaN : isNaN;

        var x_scale = self.x_scale;
        var y_scale = self.y_scale;

        self.selected_layer.selectAll(".selection").remove();

        var square = self.selected_layer.selectAll(".selection")
              .data(filtered_selection, function(d, i){
                return d;
              });
        square.enter()
          .append("rect")
          .attr("class", "selection")
          .attr("width", 12)
          .attr("height", 12)
          .attr("data-index", function(d, i) {
            return d;
          })
          .on("mouseover", function(d, i) {
            self._schedule_hover(d);
          })
          .on("mouseout", function(d, i) {
            self._cancel_hover();
          })
        ;
        square
          .attr("x", function(d, i) {
            return x_scale( x[$.inArray(d, indices)] ) - 6;
          })
          .attr("y", function(d, i) {
            return y_scale( y[$.inArray(d, indices)] ) - 6;
          })
          .attr("fill", function(d, i) {
            var value = v[$.inArray(d, indices)];
            if(nan_check(value))
              return $("#color-switcher").colorswitcher("get_null_color");
            else
              return self.options.color(value);
          });
      }

      // Used to open an initial list of images at startup only
      if(self.updates["open_images"])
      {
        var images_for_plot = self.options.open_images.filter(function(image){return image.image_layer_id == self.image_layer.attr("id");});
        // This is just a convenience for testing - in practice, these parameters should always be part of the open image specification.
        images_for_plot
          .forEach(function(image) {
            if(image.uri === undefined)
              image.uri = self.options.images[image.index];
            if(image.width === undefined)
              image.width = 200;
            if(image.height === undefined)
              image.height = 200;
          });

        // Transform the list of initial images so we can pass them to _open_images()
        var width = Number(self.group.attr("width")); //self.group refers to <g class="scatterplot" ...>
        var height = Number(self.group.attr("height"));

        self.options.open_images.forEach(function(image, index)
                                         {
                                           image.image_class = "open-image";
                                           image.x = width * image.relx;
                                           image.y = height * image.rely;
                                           image.target_x = self.x_scale(self.options.x[image.index]);
                                           image.target_y = self.y_scale(self.options.y[image.index]);
                                           image.data_id = index;
                                         });

        self._open_images(self.options.open_images);
      }

      // Update leader targets anytime we resize or change our axes ...
      if(self.updates["update_leaders"])
      {
        var offset = self._get_plot_offsets();
        $(self.image_layer[0][0]).find(".open-image").each(function(index, frame)
                                                           {
                                                             var frame = $(frame);
                                                             var image_index = Number(frame.attr("data-index"));
                                                             frame.find(".leader")
                                                               .attr("x2", offset[0] + self.x_scale(self.options.x[image_index])-Number(frame.attr("data-transx")) )
                                                               .attr("y2", offset[1] + self.y_scale(self.options.y[image_index])-Number(frame.attr("data-transy")) )
                                                               .attr("data-targetx", offset[0] + self.x_scale(self.options.x[image_index]))
                                                               .attr("data-targety", offset[1] + self.y_scale(self.options.y[image_index]))
                                                             ;
                                                           });
      }

      if(self.updates["render_legend"]) {
        var gradient = self.legend_layer.append("defs").append("linearGradient");
        gradient.attr("id", "color-gradient")
          .attr("x1", "0%").attr("y1", "0%")
          .attr("x2", "0%").attr("y2", "100%");
        var colorbar = self.legend_layer.append("rect")
              .classed("color", true)
              .attr("x", 0)
              .attr("y", 0)
              .style("fill", "url(#color-gradient)");
      }

      if(self.updates["update_legend_colors"])
      {
        var gradient = self.legend_layer.select("#color-gradient");
        var stop = gradient.selectAll("stop").data(self.options.gradient);
        stop.exit().remove();
        stop.enter().append("stop");
        stop
          .attr("offset", function(d) { return d.offset + "%"; })
          .attr("stop-color", function(d) { return d.color; })
        ;
      }

      if(self.updates["update_legend_position"])
      {
        var total_width = Number(self.group.attr("width"));
        var total_height = Number(self.group.attr("height"));
        var width = Math.min(total_width, total_height);
        var height = Math.min(total_width, total_height);
        var rectWidth = 10;
        // rectHeight attr used to be set to 200 in render, but then overwritten to this. deleted former from render.
        var rectHeight = parseInt((height - self.options.border - 40)/2);
        var datum_layer_width = self.x_axis_layer.node().getBBox().width;
        var width_offset = (total_width + datum_layer_width) / 2;
        if( self.legend_layer.attr("data-status") != "moved" ) {
          var transx = parseInt(width_offset + 40);
          var transy = parseInt((total_height/2)-(rectHeight/2)-10);
          self.legend_layer
            .attr("transform", "translate(" + transx + "," + transy + ")")
            .attr("data-transx", transx)
            .attr("data-transy", transy);
        }
        self.legend_layer.select("rect.color")
          .attr("height", rectHeight)
          .attr('width', rectWidth);

        var legend_width = rectWidth + self.legend_axis_layer.node().getBBox().width;
        var control_width = Number(self.color_control.foreign_object.attr('width'));
        var control_height = Number(self.color_control.foreign_object.attr('height'));
        //TODO: figure out how to use the <select>'s width instead of the <foreignObject>'s... then won't need to subtract the arbitrary -10
        var horizontal_offset = (control_width - legend_width)/2 - 10;
        // use (rectHeight + 10) y-transform to put control below legend
        self.color_control.foreign_object.attr('transform', 'translate(-' + horizontal_offset + ',-' + (control_height + 5) + ')');
      }

      if(self.updates["update_legend_axis"]) {
        var v_min = d3.min(self.options.v);
        var v_max = d3.max(self.options.v);

        self.legend_scale = d3.scale.linear()
          .domain([v_max, v_min])
          .range([0, parseInt(self.legend_layer.select("rect.color").attr("height"))]);
        self.legend_axis = d3.svg.axis()
          .scale(self.legend_scale)
          .orient("right")
          .tickFormat(d3.format(pickNumberFormat(v_min,v_max)));
        self.legend_axis_layer
          .attr("transform", "translate(" + (parseInt(self.legend_layer.select("rect.color").attr("width")) + 1) + ",0)")
          .call(self.legend_axis);
      }

      self.updates = {}; // THIS LINE IS ABSOLUTELY CRITICAL, YOU WILL CRY LOOKING FOR THE BUG IF YOU ACCIDENTALLY REMOVE IT
    },

    _sync_open_images: function()
    {
      var self = this;

      // Get the scatterplot width so we can convert absolute to relative coordinates.
      var width = Number(self.group.attr("width"));
      var height = Number(self.group.attr("height"));
      var open_images = [];
      $(".open-image").each(function(index, frame)
                            {
                              var frame = $(frame);
                              var image = frame.find("image.image");
                              open_images.push({
                                index : Number(frame.attr("data-index")),
                                uri : frame.attr("data-uri"),
                                relx : Number(frame.attr("data-transx")) / width,
                                rely : Number(frame.attr("data-transy")) / height,
                                width : Number(image.attr("width")),
                                height : Number(image.attr("height")),
                                image_layer_id : frame.closest(".plot-image-layer").attr("id")
                              });
                            });
      self.element.trigger("open-images-changed", [open_images]);
    },

    _open_images: function(images)
    {
      var self = this;

      var relevant_images = images.map(function(image, index){
          image.image_layer_id = image.image_layer_id || "image_0_0";
          image.data_id = image.data_id || self.options.open_images.length + index + 1;
          return image})
        .filter(function(image){ return image.image_layer_id == self.image_layer.attr("id");});

      // If the list of images is empty, we're done.
      if(relevant_images.length == 0)
        return;

      var image = relevant_images[0];

      // Don't open images for hidden simulations
      if($.inArray(image.index, self.options.hidden_simulations) != -1) {
        self._open_images(relevant_images.slice(1));
        return;
      }

      // // Don't open image if it's already open
      // if($(".open-image[data-uri='" + image.uri + "']").size() > 0) {
      //   self._open_images(images.slice(1));
      //   return;
      // }

      // If image is hover and we are no longer loading this image, we're done.
      if( image.image_class == "hover-image" &&
          self.opening_image != image.index
        )
      {
        return;
      }

      // Create scaffolding and status indicator if we already don't have one
      if( self.image_layer.select("g." + image.image_class + "[data-uri='" + image.uri + "'][data-id='" + image.data_id + "']").empty() ){
        // Define a default size for every image. Should have come in set by hover height/width though.
        image.width = image.width || 200;
        image.height = image.height || 200;

        // Define a default position for every image.
        if(image.x === undefined)
        {
          // We force the image to the left or right side of the screen, based on the target point position.
          var width = self.group.attr("width");
          var range = self.x_scale.range();
          var relx = (self.x_scale(self.options.x[image.index]) - range[0]) / (range[1] - range[0]);

          if(relx < 0.5)
            image.x = parseInt(relx * range[0]);
          else
            image.x = parseInt(width - ((width - range[1]) * (1.0 - relx)) - image.width);
        }
        if(image.y === undefined)
        {
          var height = self.group.attr("height");
          var target_y = self.y_scale(self.options.y[image.index]);
          image.y = parseInt((target_y / height) * (height - image.height));
        }

        // Tag associated point with class
        self.datum_layer.selectAll("square[data-index='" + image.index + "']")
          .classed("openHover", true);

        var frame = self.image_layer.append("g")
              .attr({"data-uri": image.uri,
              "data-transx": image.x,
              "data-transy": image.y,
              "transform": "translate(" + image.x + ", " + image.y + ")",
              "class": image.image_class + " image-frame",
              "data-index": image.index,
              "data-uri": image.uri,
              "data-id": image.data_id})
              .call(
                d3.behavior.drag()
                  .on('drag', function(){
                    var svg_container = $(self.svg[0]).parent();
                    //console.log("frame drag");
                    // Make sure mouse is inside svg element
                    if( 0 <= d3.event.y && d3.event.y <= svg_container.height() && 0 <= d3.event.x && d3.event.x <= svg_container.width() ){
                      var theElement = d3.select(this);
                      var transx = Number(theElement.attr("data-transx"));
                      var transy = Number(theElement.attr("data-transy"));
                      transx += d3.event.dx;
                      transy += d3.event.dy;
                      theElement.attr("data-transx", transx);
                      theElement.attr("data-transy", transy);
                      theElement.attr('transform', "translate(" + transx + ", " + transy + ")");

                      var leader = theElement.select(".leader");
                      leader.attr("x2", Number(leader.attr("data-targetx")) - transx);
                      leader.attr("y2", Number(leader.attr("data-targety")) - transy);
                    }
                  })
                  .on("dragstart", function() {
                    //console.log("frame dragstart");
                    self.state = "moving";
                    // Verify source event target
                    var sourceEventTarget = d3.select(d3.event.sourceEvent.target);
                    if(sourceEventTarget.classed("outline") || sourceEventTarget.classed("image"))
                    {
                      d3.event.sourceEvent.stopPropagation(); // silence other listeners
                      // Reset tracking of hover image if we are starting to drag a hover image
                      var frame = d3.select(this);

                      if(frame.classed("hover-image"))
                      {
                        self.opening_image = null;
                        if(self.close_hover_timer)
                        {
                          window.clearTimeout(self.close_hover_timer);
                          self.close_hover_timer = null;
                        }
                        frame.classed("hover-image", false).classed("open-image", true);
                        image.image_class = "open-image";
                        // Remove openHover class tag from any points that might have it
                        self.datum_layer.selectAll("square.openHover")
                          .classed("openHover", false)
                        ;
                      }
                    }
                  })
                  .on("dragend", function() {
                    //console.log("frame dragend");
                    self.state = "";
                    self._sync_open_images();
                  })
              )
              .on("mousedown", function(){
                //console.log("frame mousedown");
                //d3.event.stopPropagation();
                // Verify that click is on image, not something else like the close button
                if(d3.event.target.classList.contains("image"))
                {
                  // Move this image to the top of the Z order ...
                  $(d3.event.target.parentNode).detach().appendTo(self.image_layer.node());
                }
              })
              .on("mouseup", function(){
                //console.log("frame mouseup");
                //d3.event.stopPropagation();
              })
        ;

        // Create the leader line ...
        if("target_x" in image && "target_y" in image)
        {
          var offsets = self._get_plot_offsets();

          frame.append("line")
            .attr("class", "leader")
            .attr("x1", (image.width / 2))
            .attr("y1", (image.height / 2))
            .attr("x2", image.target_x - Number(frame.attr("data-transx")) + Number(offsets[0]))
            .attr("y2", image.target_y - Number(frame.attr("data-transy")) + Number(offsets[1]))
            .attr("data-targetx", image.target_x + Number(offsets[0]))
            .attr("data-targety", image.target_y + Number(offsets[1]))
            .style("stroke", "black")
            .style("stroke-width", 1.0)
          ;
        }

        // Create an outline ...
        var outline = frame.append("rect")
              .attr("class", "outline")
              .attr("x", 0)
              .attr("y", 0)
              .attr("width", image.width + 1)
              .attr("height", image.height + 1)
              .style("stroke", "black")
              .style("stroke-width", "1px")
              .style("fill", "white");

        // // Create the loading image ...
        // var timeout_image = frame.append("image")
        //   .attr("class", "loading-image")
        //   .attr("xlink:href", "/css/ajax-loader.gif")
        //   .attr("x", (image.width / 2)-16)
        //   .attr("y", (image.height / 2)-16)
        //   .attr("width", 32)
        //   .attr("height", 32)
        //   ;

        // Schedule timeout for hover
        self.close_hover_timer = window.setTimeout(function() {self._hover_timeout(image.index, 0);}, 1000);
      }

      // If the image is already in the cache, display it.
      if(image.uri in self.image_cache)
      {
        console.log("Displaying image " + image.uri + " from cache");
        var url_creator = window.URL || window.webkitURL;
        var image_url = url_creator.createObjectURL(self.image_cache[image.uri]);

        // Define a default size for every image.
        image.width = image.width || 200;
        image.height = image.height || 200;

        // Define a default position for every image.
        if(image.x === undefined)
        {
          // We force the image to the left or right side of the screen, based on the target point position.
          var width = self.group.attr("width");
          var range = self.x_scale.range();
          var relx = (self.x_scale(self.options.x[image.index]) - range[0]) / (range[1] - range[0]);

          if(relx < 0.5)
            image.x = relx * range[0];
          else
            image.x = width - ((width - range[1]) * (1.0 - relx)) - image.width;
        }
        if(image.y === undefined)
        {
          var height = self.group.attr("height");
          var target_y = self.y_scale(self.options.y[image.index]);
          image.y = (target_y / height) * (height - image.height);
        }

        var frame = self.image_layer.select("g." + image.image_class + "[data-uri='" + image.uri + "'][data-id='" + image.data_id + "']");

        // Create the image ...
        var svgImage = frame.append("image")
              .attr("class", "image")
              .attr("xlink:href", image_url)
              .attr("x", 0.5)
              .attr("y", 0.5)
              .attr("width", image.width)
              .attr("height", image.height)
              .attr("data-ratio", image.width / image.height)
        ;

        // Create a resize handle
        var resize_handle = frame.append("g")
              .attr("class", "resize-handle")
              .attr('transform', "translate(" + (image.width-9) + ", " + (image.height-9) + ")")
              .call(
                d3.behavior.drag()
                  .on('drag', function(){
                    var svg_container = $(self.svg[0]).parent();
                    //console.log("resize drag");
                    // Make sure mouse is inside svg element
                    if( 0 <= d3.event.y && d3.event.y <= svg_container.height() && 0 <= d3.event.x && d3.event.x <= svg_container.width() ){
                      var frame = d3.select(this.parentNode);
                      var theImage = frame.select("image.image");
                      var width = Number(theImage.attr("width"));
                      var height = Number(theImage.attr("height"));
                      var theRectangle = frame.select("rect.outline");
                      var theHandle = d3.select(this);
                      var theLine = frame.select("line.leader");
                      var thePin = frame.select('.pin-button');
                      var ratio = Number(theImage.attr("data-ratio"));
                      var newWidth, newHeight;
                      var x = d3.event.x;
                      var y = d3.event.y;
                      var min = 50;
                      if(x < min)
                        x = min;
                      if(y < min)
                        y = min;
                      newWidth = x;
                      newHeight = newWidth / ratio;
                      if(newHeight > y) {
                        newHeight = y;
                        newWidth = newHeight * ratio;
                      }
                      theImage.attr("width", newWidth);
                      theImage.attr("height", newHeight);
                      theRectangle.attr("width", newWidth+1);
                      theRectangle.attr("height", newHeight+1);
                      theHandle.attr('transform', "translate(" + (newWidth-9) + ", " + (newHeight-9) + ")");
                      thePin.attr('transform',  'translate(' + (newWidth-20) + ',0)');
                      theLine.attr("x1", (newWidth / 2));
                      theLine.attr("y1", (newHeight / 2));
                    }
                  })
                  .on("dragstart", function() {
                    //console.log("resize dragstart");
                    self.state = "resizing";
                    d3.selectAll([this.parentNode, d3.select("#scatterplot").node()]).classed("resizing", true);
                    d3.event.sourceEvent.stopPropagation(); // silence other listeners
                    // Reset tracking of hover image if we are starting to drag a hover image
                    var frame = d3.select(this.parentNode);
                    if(frame.classed("hover-image"))
                    {
                      self.opening_image = null;
                      if(self.close_hover_timer)
                      {
                        window.clearTimeout(self.close_hover_timer);
                        self.close_hover_timer = null;
                      }
                      frame.classed("hover-image", false).classed("open-image", true);
                      image.image_class = "open-image";

                      // Remove openHover class tag from any points that might have it
                      self.datum_layer.selectAll("square.openHover")
                        .classed("openHover", false)
                      ;
                    }
                  })
                  .on("dragend", function() {
                    //console.log("resize dragend");
                    d3.selectAll([this.parentNode, d3.select("#scatterplot").node()]).classed("resizing", false);
                    self.state = "";
                    self._sync_open_images();
                  })
              )
              .on("mousedown", function(){
                //console.log("resize mousedown");
                //d3.event.stopPropagation(); // silence other listeners
              })
              .on("mouseup", function(){
                //console.log("resize mouseup");
                //d3.event.stopPropagation(); // silence other listeners
              })
        ;

        resize_handle.append("path")
          .attr("d", "M0,8 L8,0 M4,8 L8,4")
          .style("stroke", "#878787")
          .style("stroke-width", 1)
          .style("pointer-events", "none");

        resize_handle.append("rect")
          .attr("class", "resize-handle-mousetarget")
          .attr("width", 10)
          .attr("height", 10)
          .attr("fill", "transparent");

        // Create a close button ...
        var close_button = frame.append("g")
              .attr("class", "close-button");

        close_button.append("rect")
          .attr("x", 5)
          .attr("y", 5)
          .attr("width", 16)
          .attr("height", 16)
          .attr("rx", 2)
          .attr("ry", 2)
          .style("fill", "rgba(0%,0%,0%,0.2)")
          .on("mousedown", function(){
            //console.log("close button mousedown");
            d3.event.stopPropagation(); // silence other listeners
          })
          .on("mouseup", function(){
            //console.log("close button mouseup");
            d3.event.stopPropagation(); // silence other listeners
          })
          .on("click", function()
              {
                //console.log("close button click");
                d3.event.stopPropagation(); // silence other listeners
                var frame = d3.select(d3.event.target.parentNode.parentNode);
                frame.remove();
                self._sync_open_images();
              })
        ;
        close_button.append("path")
          .attr("d", "M" + (8) + " " + (8) + " l10 10 m0 -10 l-10 10")
          .style("stroke", "rgba(100%,100%,100%, 0.8)")
          .style("stroke-width", 3)
          .style("pointer-events", "none")
        ;

        // Create a pin button ...
        var pin_button = frame.append("g")
              .attr("class", "pin-button")
              .attr('transform', "translate(" + (image.width-20) + ",0)");
        pin_button.append("image")
          .attr("class", "pin-icon")
          .attr("x", 2)
          .attr("y", 2)
          .attr("width", 16)
          .attr("height", 16)
          .attr("xlink:href", "/resources/pages/tracer-image/pin.png")
          .on("mousedown", function(){
            //console.log("pin button mousedown");
            d3.event.stopPropagation(); // silence other listeners
          })
          .on("mouseup", function(){
            //console.log("pin button mouseup");
            d3.event.stopPropagation(); // silence other listeners
          })
          .on("click", function()
              {
                d3.event.stopPropagation(); // silence other listeners
                // Reset tracking of hover image
                self.opening_image = null;
                if(self.close_hover_timer)
                {
                  window.clearTimeout(self.close_hover_timer);
                  self.close_hover_timer = null;
                }

                // Remove openHover class tag from any points that might have it
                self.datum_layer.selectAll("square.openHover")
                  .classed("openHover", false)
                ;

                var frame = d3.select(d3.event.target.parentNode.parentNode);
                var theImage = frame.select("image.image");
                var theRectangle = frame.select("rect.outline");
                var theHandle = frame.select("g.resize-handle");
                var theLine = frame.select("line.leader");
                frame.classed("hover-image", false)
                  .classed("open-image", true);
                var thePin = frame.select('.pin-button');

                // Adjust image position
                var imageHeight = 200;
                var imageWidth = 200;
                var width = self.group.attr("width");
                var range = self.x_scale.range();
                var relx = (self.x_scale(self.options.x[image.index]) - range[0]) / (range[1] - range[0]);
                var x, y;
                var offsets = self._get_plot_offsets();

                if(relx < 0.5)
                  x = relx * range[0];
                else
                  x = width - ((width - range[1]) * (1.0 - relx)) - imageWidth;
                x += offsets[0];

                var height = self.group.attr("height");
                var target_y = self.y_scale(self.options.y[image.index]);
                y = (target_y / height) * (height - imageHeight) + offsets[1];

                frame
                  .attr("data-transx", x)
                  .attr("data-transy", y)
                  .attr('transform', "translate(" + x + ", " + y + ")");

                // Adjust image size
                theImage.attr("width", imageWidth);
                theImage.attr("height", imageHeight);
                theRectangle.attr("width", imageWidth+1);
                theRectangle.attr("height", imageHeight+1);
                theHandle.attr('transform', "translate(" + (imageWidth-9) + ", " + (imageHeight-9) + ")");
                thePin.attr('transform',  'translate(' + (imageWidth-20) + ',0)');

                // Adjust line
                theLine
                  .attr("x1", (imageWidth / 2))
                  .attr("y1", (imageHeight / 2))
                  .attr("x2", Number(theLine.attr("data-targetx")) - x)
                  .attr("y2", Number(theLine.attr("data-targety")) - y);

                self._sync_open_images();
              });

        if(!image.no_sync)
          self._sync_open_images();
        self._open_images(relevant_images.slice(1));
        return;
      }

      // If we don't have a session for the image hostname, create one.
      var parser = document.createElement("a");
      parser.href = image.uri.substr(0, 5) == "file:" ? image.uri.substr(5) : image.uri;
      if(!(parser.hostname in self.login.session_cache)) {
        self._open_session(relevant_images);
        return;
      }

      // Retrieve the image.
      console.log("Loading image " + image.uri + " from server");
      var xhr = new XMLHttpRequest();
      xhr.image = image;
      xhr.open("GET", self.options.server_root + "remotes/" + self.login.session_cache[parser.hostname] + "/image" + parser.pathname, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function(e) {
        // If we get 404, the remote session no longer exists because it timed-out.
        // If we get 500, there was an internal error communicating to the remote host.
        // Either way, delete the cached session and create a new one.
        if(this.status == 404 || this.status == 500) {
          delete self.login.session_cache[parser.hostname];
          self._open_session(relevant_images);
          return;
        }
        // If we get 400, it means that the session is good and we're
        // communicating with the remote host, but something else went wrong
        // (probably file permissions issues).
        if(this.status == 400) {
	        console.log(this);
          window.alert("Couldn't load image " + this.image.uri + ": " + this.statusText);
          return;
        }

        // We received the image, so put it in the cache and start-over.
        var array_buffer_view = new Uint8Array(this.response);
        var blob = new Blob([array_buffer_view], {type:"image/jpeg"});
        self.image_cache[image.uri] = blob;
        // Adding lag for testing purposed. This should not exist in production.
        // setTimeout(function(){
        self._open_images(images);
        return;
        // }, 5000);
      }
      xhr.send();
    },

    _close_hidden_simulations: function()
    {
      var self = this;
      $("g.image-frame")
        .filter(function(){
          return $.inArray($(this).data("index"), self.options.filtered_indices) == -1
        })
        .remove()
      ;
    },

    _open_session: function(images)
    {
      this.login.show_prompt(images, this.grid.open_images, this.grid);
    },

    _schedule_hover: function(image_index)
    {
      var self = this;

      // Disable hovering whenever anything else is going on ...
      if(self.state != "")
        return;

      // Disable hovering when there is no uri
      if(self.options.images[self.options.indices[image_index]].trim() == "")
        return;

      // // Disable hovering on points that already have open imges ...
      // var uri = self.options.images[self.options.indices[image_index]];
      // if($(".open-image[data-uri='" + uri + "']").size() != 0)
      //   return;

      // Cancel any pending hover ...
      self._cancel_hover();

      // Start the timer for the new hover ...
      self.hover_timer = window.setTimeout(function() { self._open_hover(image_index); }, 250);
    },

    _cancel_hover: function()
    {
      var self = this;
      if(self.hover_timer)
      {
        window.clearTimeout(self.hover_timer);
        self.hover_timer = null;
      }
    },

    _open_hover: function(image_index)
    {
      var self = this;

      // Verify that we don't already have an open hover for the associated point
      if( self.datum_layer.select("square.openHover[data-index='" + image_index + "']").empty() )
      {
        self._close_hover();
        self.opening_image = image_index;

        var width = self.group.attr("width");
        var height = self.group.attr("height"); // self.group is <g class="scatterplot" ...>
        var hover_width = Math.min(width, height) * 0.85; //initial image width comes from this
        var hover_height = Math.min(width, height) * 0.85; //initial image height comes from this

        var offsets = self._get_plot_offsets();

        self._open_images([{
          index : self.options.indices[image_index],
          uri : self.options.images[self.options.indices[image_index]].trim(),
          image_class : "hover-image",
          x : Number(offsets[0]) + self.x_scale(self.options.x[image_index]) + 10,
          y : Number(offsets[1]) + Math.min(self.y_scale(self.options.y[image_index]) + 10, self.group.attr("height") - hover_height - self.options.border - 10),
          width : hover_width,
          height : hover_height,
          target_x : self.x_scale(self.options.x[image_index]),
          target_y : self.y_scale(self.options.y[image_index]),
          no_sync : true,
          image_layer_id : self.image_layer.attr("id")
        }]);

        // self.close_hover_timer = window.setTimeout(function() {self._hover_timeout(image_index, 0);}, 1000);
      }
    },

    _hover_timeout: function(image_index, time)
    {
      var self = this;
      var checkInterval = 50;
      var cutoff = 1000;

      if(time > cutoff)
      {
        self._close_hover();
        return;
      }
      else if(self._is_hovering(image_index))
      {
        self.close_hover_timer = window.setTimeout(function(){self._hover_timeout(image_index, 0);}, checkInterval);
      }
      else
      {
        self.close_hover_timer = window.setTimeout(function(){self._hover_timeout(image_index, time+checkInterval);}, checkInterval);
      }
    },

    _is_hovering: function(image_index)
    {
      var self = this;
      var hoverEmpty = self.image_layer.selectAll(".hover-image[data-index='" + image_index + "']:hover").empty();
      var squareEmpty = self.datum_layer.selectAll("square[data-index='" + image_index + "']:hover").empty();
      var selectedSquareEmpty = self.selected_layer.selectAll("square[data-index='" + image_index + "']:hover").empty();

      return !(hoverEmpty && squareEmpty && selectedSquareEmpty);
    },

    _close_hover: function()
    {
      var self = this;

      self.opening_image = null;

      if(self.close_hover_timer)
      {
        window.clearTimeout(self.close_hover_timer);
        self.close_hover_timer = null;
      }

      // Cancel any pending hover ...
      self._cancel_hover();

      // Close any current hover images ...
      self.image_layer.selectAll(".hover-image").remove();

      // Remove openHover class tag from any points that might have it
      self.datum_layer.selectAll("square.openHover")
        .classed("openHover", false)
      ;
    },

    get_option: function(option)
    {
      return this.options[option];
    },

    brush_select: function(selection /* hash */, drop_existing_selection /* boolean */, drag_finished /* boolean */) {
      var self = this;
      var x = self.options.x;
      var y = self.options.y;

      if (drop_existing_selection) {
        self.options.selection = [];
        self.options.filtered_selection = [];
      }

      for(var i = 0; i <= x.length; ++i) {
        if(selection.x_lo <= x[i] && x[i] <= selection.x_hi && selection.y_lo <= y[i] && y[i] <= selection.y_hi) {
          if (drop_existing_selection) {
            self.options.selection.push(self.options.indices[i]);
          }
          else {
            var index = self.options.selection.indexOf(self.options.indices[i]);
            if(index == -1) { // not found
              // select a new point
              self.options.selection.push(self.options.indices[i]);
            }
            else {
              // deselect an existing point
              //self.options.selection.splice(index, 1);
            }
          }
        }
      }

      self._filterIndices();
      self.options.scatterplot_obj.grid_obj.global_soft_select(self.options.filtered_selection.slice(0));
      if (drag_finished) {
        // updates table selection and bookmarks
        self.element.trigger("selection-changed", [self.options.selection]);
      }
    },

    _get_plot_offsets: function(){
      var offsets = $(this.options.scatterplot_obj.grid_ref).attr("transform").split(new RegExp("[( ,)]"));
      return [Number(offsets[1]), Number(offsets[2])];
    }
  });
});
