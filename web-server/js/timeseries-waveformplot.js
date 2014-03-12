/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

///////////////////////////////////////////////////////////////////////////////////////////
// HTML5 DOM waveform visualization, for use with the timeseries model.

$.widget("timeseries.waveformplot",
{
  options:
  {
  	"server-root" : "",
    mid : null,
    waveforms : null,
    selection : null,
    highlight : null,
    color : d3.scale.linear().domain([-1, 0, 1]).range(["blue", "white", "red"]),
  },

  _create: function()
  {
    var self = this;

    this.waveforms = this.options.waveforms;
    this.container = d3.select("#waveform-viewer");
    this.width = $("#waveform-pane").width();
    this.height = $("#waveform-pane").height();
    this.padding = 20;
    this.diagram_width = this.width - this.padding - this.padding;
    this.diagram_height = this.height - this.padding - this.padding;

    this.waveformPieContainer = $("#waveform-progress");
    this.waveformPie = $("#waveform-progress .waveformPie")
    this.waveformPie.knob({
                  'min':0,
                  'readOnly':true,
                  'displayInput':false,
                  'fgColor':'#7767B0',
                  'bgColor':'#DBD9EB',
                  'width':200,
                  'height':200,
                  'thickness':0.35,
                  'step':1,
                });
    this.waveformProcessingTimeout = null;
    this.previewWaveformsTimeout = null;
    this.showWaveformPieContainerTimeout = null;
    this.color_array = null;
    this.color_scale = null;
    this.data_table_index_array = null;

    this.container.selectAll("g").remove();

    this.visualization = this.container.append("svg:g")
      .attr("transform", "translate(" + this.padding + "," + this.padding + ")")
      ;

    this.visualization.append("svg:rect")
      .attr("width", this.diagram_width)
      .attr("height", this.diagram_height)
      .attr("pointer-events", "all")
      .style("fill", "transparent")
      .on("click", panel_selection_callback(self)) // unselect all the waveforms when someone clicks in the panel but not on a waveform
//            .call(d3.behavior.zoom().x(this.x).y(this.y).on("zoom", redraw_waveforms));
      ;

    this._set_visible();

    function panel_selection_callback(context)
    {
      return function()
      {
        context.options.highlight = [];
        context._select();
        context.element.trigger("waveform-selection-changed", [context.options.highlight]);
      }
    }
  },

  _set_visible: function(){
    var self = this;
    var visible = this.options.selection;
    this.waveforms = this.options.waveforms;

    // Cancel any previously started work
    self._stopProcessingWaveforms();

    var x_min = d3.min(this.waveforms, function(waveform) { return d3.min(waveform["time"]); });
    var x_max = d3.max(this.waveforms, function(waveform) { return d3.max(waveform["time"]); });
    var y_min = d3.min(this.waveforms, function(waveform) { return d3.min(waveform["value"]); });
    var y_max = d3.max(this.waveforms, function(waveform) { return d3.max(waveform["value"]); });

    this.x = d3.scale.linear()
      .domain([x_min, x_max])
      .range([0, this.diagram_width])
      ;

    this.y = d3.scale.linear()
      .domain([y_max, y_min])
      .range([0, this.diagram_height])
      ;

    var waveform_subset = [];
    if(visible !== null) {
      $.each(visible, function(index, waveform_index)
      {
        waveform_subset.push(self.waveforms[waveform_index]);
      });
    }
    else {
      waveform_subset = self.waveforms;
    }

    this.container.selectAll("g.waveform").remove();
    this.container.selectAll("g.selection").remove();
    this.container.selectAll("rect.selectionMask").remove();

    waveformsContainer = this.visualization;

    waveforms = waveformsContainer.selectAll("g.waveform")
      .data(waveform_subset)
      .enter()
      .append("svg:g")
      .attr("class", "waveform")
      //.style("visibility", "hidden")
      //.style("display", "none")
      ;

    var waveformsLength = waveforms[0].length;
    self.waveformPie.trigger(
      'configure',
      {
        "max":waveformsLength,
      }
    );

    // Don't want the progress indicator showing up every time. Only if the delay is longer than 1 second.
    self.showWaveformPieContainerTimeout = setTimeout(function(){
      self.waveformPieContainer.show(0);
    }, 1000);

    timedProcessArray(waveforms[0], processWaveform, finishedProcessingWaveforms);
    previewWaveforms();

    function timedProcessArray(items, process, callback){
      var timeout = 100; //how long to yield control to UI thread
      var todo = items.concat(); //create a clone of the original

      self.waveformProcessingTimeout = setTimeout(function(){
        var start = +new Date();
        do {
          process(todo.shift());
        } while (todo.length > 0 && (+new Date() - start < 50));

        if (todo.length > 0){
          self.waveformProcessingTimeout = setTimeout(arguments.callee, timeout);
        } else {
          callback(items);
        }

        self.waveformPie.val(waveformsLength - todo.length).trigger('change');
      }, timeout);
    }

    function processWaveform(waveform){
      d3.select(waveform).append("svg:path")
        .attr("d", self.make_sax_line())
        //.style("visibility", "hidden") // paths are added in a hidden state, otherwise the browser chokes trying to render them as they are being added
        .style("display", "none")
        .style("stroke", function(d, i) { 
          if(self.options.color_scale != null)
            return self.options.color_scale( self.options.color_array[ self.options.data_table_index_array.indexOf(d["input-index"]) ] ); 
          else
            return "white";
        })
        .attr("class", "unselected")
        .on("click", waveform_selection_callback(self))
        ;
    }

    function waveform_selection_callback(context){
      return function(d)
      {
        context.options.highlight = [d['input-index']];
        context._select();
        context.element.trigger("waveform-selection-changed", [context.options.highlight]);
        d3.event.stopPropagation();
      }
    }

    function finishedProcessingWaveforms(){

      // Cancelling the timeout that was set to delay progress indicator display
      clearTimeout(self.showWaveformPieContainerTimeout);
      self.waveformPieContainer.hide();
      clearTimeout(self.previewWaveformsTimeout);
      
      self.visualization.selectAll("path").
        style("display", "block") // displaying the hidden paths
        ;
    }

    function previewWaveforms(timeout, maxIterations){
      if (timeout == null)
        timeout = 100
      if (maxIterations == null)
        maxIterations = 6;

      self.previewWaveformsTimeout = setTimeout( function(){
          self.visualization.selectAll("path").
            style("display", "block") // displaying the hidden paths
            ;

          maxIterations--;
          timeout = timeout * 2;

          if (maxIterations > 0) {
            self.previewWaveformsTimeout = setTimeout(arguments.callee, timeout);
          }
      }, timeout );
    }

    this.make_sax_line = function()
    {
      var self = this;
      return function(d)
      {

        result = "";
        for(var i = 0; i != d["time"].length; ++i)
        {
          result += "M" + self.x(d.time[i]) + "," + self.y(d["value"][i]);
          break;
        }
        for(var i = 1; i < d["time"].length; ++i)
        {
          result += "L" + self.x(d["time"][i]) + "," + self.y(d["value"][i]);
        }

        return result;
      }
    }
  },

  /* Highlights waveforms */
  _select: function()
  {
    var self = this;

    // Only highlight a waveform if it's part of the current selection
    var selection = self.options.selection;
    var highlight = self.options.highlight;
    var inCurrentSelection = [];
    for(var i=0; i<highlight.length; i++){
      if( selection.indexOf(highlight[i]) > -1 ){
        inCurrentSelection.push(highlight[i]);
      }
    }
    highlight = inCurrentSelection;

    var waveform_subset = [];
    $.each(highlight, function(index, node_index)
    {
      if(node_index < self.waveforms.length)
        waveform_subset.push(self.waveforms[node_index]);
    });

    this.container.selectAll("g.selection").remove();
    this.container.selectAll("rect.selectionMask").remove();

    if(highlight.length > 0) {
      this.visualization.append("svg:rect")
        .attr("width", this.diagram_width)
        .attr("height", this.diagram_height)
        .attr("pointer-events", "none")
        .style("fill", $("#color-switcher").colorswitcher("get_background") )
        .style("fill-opacity", $("#color-switcher").colorswitcher("get_opacity") )
        .attr("class", "selectionMask")
        ;
    }

    var waveforms = this.visualization.selectAll("g.selection")
      .data(waveform_subset)
    .enter().append("svg:g")
      .attr("class", "selection");

    // Turning off yellow highlighting now that the background waveforms are faded out.
    // waveforms.append("svg:path")
    //   .attr("d", this.make_sax_line())
    //   .style("fill", "none")
    //   .style("stroke", "yellow")
    //   .style("stroke-width", 5.0)
    //   ;

    waveforms.append("svg:path")
      .attr("d", this.make_sax_line())
      .style("stroke", function(d, i) { 
        if (self.options.color_scale != null && self.options.color_array != null && self.options.data_table_index_array != null)
          return self.options.color_scale( self.options.color_array[ self.options.data_table_index_array.indexOf(d["input-index"]) ] );
        else
          return "white";
      })
      .attr("class", "highlight")
      ;
  },

  _stopProcessingWaveforms: function()
  {
    var self = this;
    // Cancel any previously started work
    clearTimeout(self.waveformProcessingTimeout);
    clearTimeout(self.previewWaveformsTimeout);
    clearTimeout(self.showWaveformPieContainerTimeout);
    self.waveformPieContainer.hide();
  },

  _set_color: function()
  {
    var self = this;

    // this.container.selectAll("g.waveform path")
    //   .style("stroke", function(d, i) { 
    //     return color_scale(color_array[i]); 
    //   })
    //   ;

    // No use coloring waveforms if none exist, for example, during initial creation of waveform plot
    if(this.container.selectAll("g.waveform path, g.selection path.highlight").pop().length > 0){
      this.container.style("display", "none");
      // Coloring both the standard waveforms (g.waveform path) and the ones used to show selected simulations (g.selection path.highlight)
      timedColorWaveforms(this.container.selectAll("g.waveform path, g.selection path.highlight").pop(), colorWaveform, finishedColoringWaveforms);
    }

    function timedColorWaveforms(items, process, callback){
      var timeout = 100; //how long to yield control to UI thread
      var todo = items.concat(); //create a clone of the original

      self.waveformProcessingTimeout = setTimeout(function(){
        var start = +new Date();
        do {
          process(todo.shift());
        } while (todo.length > 0 && (+new Date() - start < 50));

        if (todo.length > 0){
          self.waveformProcessingTimeout = setTimeout(arguments.callee, timeout);
        } else if (callback != null) {
          callback(items);
        }
      }, timeout);
    }

    function colorWaveform(waveform){
      d3.select(waveform).style("stroke", function(d, i) { 
        return self.options.color_scale( self.options.color_array[ self.options.data_table_index_array.indexOf(d["input-index"]) ] );
      })
      ;
    }

    function finishedColoringWaveforms(){

      self.container.style("display", "block");
      
    }
  },

  _setOption: function(key, value)
  {
    //console.log("timeseries.waveform._setOption()", key, value);
    this.options[key] = value;

    if(key == "selection")
    {
      this._set_visible();
    }
    else if(key == "highlight")
    {
      this._select();
    }
    else if(key == "color-scale")
    {
      this.options.color_array = value.color_array;
      this.options.color_scale = value.colormap;
      this.options.data_table_index_array = value.data_table_index_array;
      this._set_color();
    }
  },

});