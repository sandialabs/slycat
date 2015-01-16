function LoadingAnimation(options){
  this.options = {
    start : 0,
    end : 100,
    errored : 0,
    complete_color : "#b8e186",
    incomplete_color : "#bababa",
    error_color : "#f03b20",
    radius : function(){ return 120; },
    thickness : 20,
    selector : "#load_screen",
    tween_rate : 1000,
    complete_callback : function(){},
    resize_parent : $("svg"),
  };

  for(var option in options) {
    this.options[option] = options[option]
  }

  this.color_scale = d3.scale.ordinal()
      .range([this.options.complete_color, this.options.incomplete_color, this.options.error_color]);

  this.get_angles = function(d){ return [d.startAngle, d.endAngle]; };

  this.transitions = 0;
  this.errors = 0;

  this.resize_function = this.resize;
}

LoadingAnimation.prototype.init = function(){
  var self = this;

  var percentage = function(x, y){x / y * 100}

  this.target = $(this.options.selector);

  var loaded = this.options.start;
  var errored = this.options.errored;
  var unloaded = this.options.end - (loaded + errored);
  this.state = [loaded, unloaded, errored];

  this.group = d3.select(this.options.selector)
    .append("g");

  this.pie = d3.layout.pie()
      .sort(null);

  this.labels = this.group
    .append("g");

  this.title = this.labels.selectAll("text")
      .data(["Loading"])
    .enter().append("text");

  this.paths = this.group.selectAll("path")
      .data(this.pie(this.state))
    .enter().append("path")

  this.resize(true);

  this.options.resize_parent.resize(function(){ self.resize_function(false); });
}

LoadingAnimation.prototype.resize = function(initial_setup){
  var self = this;

  if(this.update_interval || this.update_interval == 0) {
    clearInterval(this.update_interval);
  }

  var x_offset = this.target.attr("width")/2;
  var y_offset = 3*this.target.attr("height")/8;

  this.group
      .attr("transform", "translate(" + x_offset + "," + y_offset + ")");
  
  this.arc = d3.svg.arc()
      .outerRadius(this.options.radius())
      .innerRadius(this.options.radius() - this.options.thickness);

  var color_scale = this.color_scale;

  this.angles = this.pie(this.state).map(this.get_angles);

  this.labels
      .attr("transform", "translate(" + (-3*this.options.radius()/8) + ",0)");

  this.title
      .text(function(d){ return d; })
      .style("font-size", 18)
      .style("fill", this.options.incomplete_color)
      .style("stroke", this.options.incomplete_color)
      .style("text-align", "center");

  //Firefox having different behavior:
  if($.browser.mozilla) {
    this.title
      .attr("transform", "translate(" + 3*this.options.radius()/16 + ",0)")
  }

  this.paths
      .attr("d", this.arc)
      .style("fill", function(_, i){ return color_scale(i); })

  this.update_interval = setInterval(function(){ self.animate.call(self); }, this.options.tween_rate + 50)
}

LoadingAnimation.prototype.animate = function(){
  var self = this;

  var delta = this.transitions;
  var error_delta = this.errors;

  this.transitions = 0;
  this.errors = 0;

  var change = [delta, -(delta + error_delta), error_delta];

  for(var i = 0; i < change.length; i++) {
    this.state[i] += change[i];
  }

  if(this.state[1] < 0) {
    this.state[1] = 0;
  }

  this.group.selectAll("path")
      .data(this.pie(this.state))
    .transition()
      .duration(this.options.tween_rate)
      .attr("d", this.arc)
      .attrTween("d", function(d, i){
          return function(v){
            return self.arc({
              value: d,
              startAngle: 2*d3.mean([v*d.startAngle, (1-v)*self.angles[i][0]]),
              endAngle: 2*d3.mean([v*d.endAngle, (1-v)*self.angles[i][1]]),
              data: d
            });
          }
        })
      .filter(function(d,i){return i == 0;}).each("end", function(){
          self.angles = self.pie(self.state).map(self.get_angles);
            if(self.state[1] <= 0) {
              self.remove();
              self.options.complete_callback();
            }
        });
}

LoadingAnimation.prototype.update = function(delta){
  this.transitions += delta;
}

LoadingAnimation.prototype.update_error = function(delta){
  this.errors += delta;
}

LoadingAnimation.prototype.remove = function(){
  //'Unregister' the resize function; it won't work shortly
  this.resize_function = function(){};
  this.group.remove();

  clearInterval(this.update_interval);
}
