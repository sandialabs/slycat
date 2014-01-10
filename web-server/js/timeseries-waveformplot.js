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

    //this._set_visible();

    function panel_selection_callback(context)
    {
      return function()
      {
        var selection = [];

        context.select(selection);

        // TODO this needs to be done outside of this widget
        // if(table_viewer_instance != null) {
        //   table_viewer_instance.select_simulations(selection);
        // }
      }
    }

    
  },

  _set_visible: function(){
    var self = this;
    var visible = this.options.selection;
    this.waveforms = this.options.waveforms;

    // Cancel any previously started work
    self._stopProcessingWaveforms();

    var x_min = d3.min(this.waveforms, function(waveform) { return d3.min(waveform["times"]); });
    var x_max = d3.max(this.waveforms, function(waveform) { return d3.max(waveform["times"]); });
    var y_min = d3.min(this.waveforms, function(waveform) { return d3.min(waveform["values"]); });
    var y_max = d3.max(this.waveforms, function(waveform) { return d3.max(waveform["values"]); });

    this.x = d3.scale.linear()
      .domain([x_min, x_max])
      .range([0, this.diagram_width])
      ;

    this.y = d3.scale.linear()
      .domain([y_max, y_min])
      .range([0, this.diagram_height])
      ;

    var waveform_subset = [];
    $.each(visible, function(index, node)
    {
      if(node["waveform-index"] != null)
        waveform_subset.push(self.waveforms[node["waveform-index"]]);
    });

    this.container.selectAll("g.waveform").remove();
    this.container.selectAll("g.selection").remove();

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
          if(self.color_scale != null)
            return self.color_scale( self.color_array[ self.data_table_index_array.indexOf(d["data-table-index"]) ] ); 
          else
            return "black"; // TODO for now setting to black. Used to be white. Need to color according to data.
        })
        .attr("class", "unselected")
        //.on("click", waveform_selection_callback(self))
        ;
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
        for(var i = 0; i != d.times.length; ++i)
        {
          result += "M" + self.x(d.times[i]) + "," + self.y(d.values[i]);
          break;
        }
        for(var i = 1; i < d.times.length; ++i)
        {
          result += "L" + self.x(d.times[i]) + "," + self.y(d.values[i]);
        }

        return result;
      }
    }




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

  _setOption: function(key, value)
  {
    console.log("timeseries.waveform._setOption()", key, value);
    this.options[key] = value;

    if(key == "selection")
    {
      this._set_visible();
    }
  },

});