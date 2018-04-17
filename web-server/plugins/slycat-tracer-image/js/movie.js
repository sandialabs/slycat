/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("Movie", ["slycat-server-root", "d3"], function(server_root, d3){
  function Movie(model, table) {
    this.open = false;
    this.stopped = true;
    this.frame = null;
    this.d3_movie = null;
    this.interval = 400;
    this.current_image = null;
    // TODO leverage bookmarker here for state of movie
    // start out of range and we increment when we ask for the next image
    this.current_image_index = -1;
    this.height = null;
    this.width = null;
    this.loaded_image_count = 0;
    this.errored_image_count = 0;
    this.open_control = null; //handle to foreignObject so SVG can manipulate
    
    //Test for which video types are supported
    var formats = {webm:"webm", h264:"mp4"};
    //Specific check for chromium issue #54036
    var codecs = {h264: function(){return document.createElement("video").canPlayType('video/mp4; codecs="mp4v.20.8"');}}
    this.movie = [];
    this.model = model;
    this.table = table;
    this.login = model.login;
    this.video_type = ["h264", "webm"].filter(function(encoding){return codecs[encoding] ? codecs[encoding]() : formats[encoding]})
                          .map(function(encoding){return formats[encoding];})[0];
    this.fps = 25;

    console.debug("Using " + this.video_type + " for movie encoding");
  }

  Movie.prototype.add_loader = function(plot) {
    var self = this;
    this.show();
    if(!this.loader){
      this.loader = new LoadingAnimation({
        start : this.loaded_image_count,
        end : plot.scatterplot_obj.scatterplot("get_option", "images").filter(function(x){return x.length > 0;}).length,
        errored : this.errored_image_count,
        selector : plot.grid_ref,
        radius : function(){return 3*plot.scatterplot_obj.attr("height") / 8},
        complete_callback : function(){
            self.built = true;
            self.play();
          },
        resize_parent : $(plot.scatterplot_obj.scatterplot("get_option", "display_pane")),
      });
    }
    else {
      this.loader.options.start = this.loaded_image_count;
    }
    this.loader.init();
  }

  Movie.prototype.build_open_button = function(container, plot) {
    var self = this;

    var width = 28,
        height = 28;

    self.open_control = container.append('g')
      .classed('open-movie', true)
      .on('click', function() {
        d3.event.stopPropagation();
        if(!self.agent_id){
          self.agent_id = self.login.get_agent(plot.images.filter(function(x){return x;})[0]);
        }
        self.agent_id ? self.build_server_movie.call(self, plot) : self.login.show_prompt(plot.images.filter(function(uri){return uri;}).map(function(uri){return {uri: uri};}), function(){self.build_server_movie(plot)}, self);
        plot.movie = self;
      })
      .on('mousedown', function() {
        d3.event.stopPropagation();
      })
      .on('mouseup', function() {
        d3.event.stopPropagation();
      })
      .attr('width', width)
      .attr('height', height);

    var radius = self.open_control.attr('width')/2;

    self.open_control.append('image')
        .attr('xlink:href', plot.scatterplot_obj.scatterplot("get_option", "server_root") +
          "resources/models/tracer-image/build-movie.png")
        .attr('transform', 'translate(' + self.open_control.attr("width")/2 + ',0)')
        .attr('width', width)
        .attr('height', height);

  };

  Movie.prototype.build_close_button = function(plot, container) {
    var self = this;
    var close_button = container.append("g")
          .classed("close-movie", true);
    close_button.append("rect")
      .attr("x", 5)
      .attr("y", 5)
      .attr("width", 16)
      .attr("height", 16)
      .attr("rx", 2)
      .attr("ry", 2)
      .style("fill", "rgba(0%,0%,0%,0.2)")
      .on("click", function() {
        self.hide(plot);
      });
    close_button.append("path")
      .attr("d", "M" + (8) + " " + (8) + " l10 10 m0 -10 l-10 10")
      .style("stroke", "rgba(100%,100%,100%, 0.8)")
      .style("stroke-width", 3)
      .style("pointer-events", "none");
  };

  Movie.prototype.show = function() {
    var self = this;
    // TODO .show() for reopens
    $(plot.plot_ref + ' .scatterplot').hide();
    $('svg .image-layer').hide();
    self.open = true;
    self.resize();
    $(self.container).show();
  };

  Movie.prototype.resize = function(plot) {
    var self = this;
    if(self.video){
      var scatter_plot = $(plot.plot_ref + ' .scatterplot');
      var height = Number(scatter_plot.attr("height"));
      var width = Number(scatter_plot.attr("width"));
      self.foreign_object
        .attr({
          width: width - 56,
          height : height
        })
      $(self.video.video)
        .attr("width", width - 56)
        .attr("height", height);
      this.adjust_style_for_webkit(plot);
    }
  };

  Movie.prototype.hide = function(plot) {
    var self = this;
    $(plot.plot_ref + " .movie").remove();
    $(plot.plot_ref + ' .scatterplot').show();
    $('svg .image-layer').show();
    $('.open-movie').show();
    plot.movie = null;
  };

  Movie.prototype.build_server_movie = function(plot) {
    var self = this;
    var image_index = plot.images_index;
    self.agent_id = this.login.get_agent(plot.images.filter(function(url){return url && url.length > 0})[0]);
    $('.open-movie').hide();

    if(!self.movie[image_index]){
      this.model.get_image_column(plot.images_index, function(images) {
        $.ajax({
          type: "POST",
          url: server_root + "remotes/" + self.agent_id + "/videos",
          contentType: "application/json",
          data: JSON.stringify({
            "content-type": "video/" + self.video_type,
            images: images
                      .filter(function(url){ return url != null && url.length > 0; })
                      .map(function(url){return url.slice(url.split("/", 3).join().length)})
          }),
          success: function(movie){
            self.movie[image_index] = movie;
            self.show_movie(plot, image_index);
          }
        });
      });
    }
    else{
      self.build_movie_player(plot, image_index);
    }
  }

  Movie.prototype.build_controls = function(container) {
    var self = this;

    var toggle_pause_play = function(){
      var video_update = self.video.paused() ? self.video.play() : self.video.pause();
    };

    var step = function(steps){
      return function(){
        var current_frame = self.video.currentTime() * self.fps;
        self.video.currentTime((current_frame + steps)/self.fps);
      }
    };

    var set_position = function(time){
      return function(){
        self.video.currentTime(time);
      }
    };

    var toggle_repeat = function(){
      self.video.loop(!self.video.loop());
      d3.select("#movie-loop-toggle").attr("opacity", self.video.loop() ? 1 : 0)
    }

    var controls = [{name: "Play", id: "play-pause", action: toggle_pause_play, image: "resources/models/tracer-image/play.png"},
        {name: "Go to Beginning", id: "begin", action: set_position(0), image: "resources/models/tracer-image/rewind.png"},
        {name: "Step Back", id: "back", action: step(-1), image: "resources/models/tracer-image/frame-rewind.png"},
        {name: "Step Forward", id: "forward", action: step(1), image: "resources/models/tracer-image/frame-forward.png"},
        {name: "Go to end", id: "end", action: set_position(this.video.duration() - (1/this.fps)), image: "resources/models/tracer-image/fast-forward.png"},
        {name: "Loop", id: "repeat", action: toggle_repeat, image: "resources/models/tracer-image/repeat.png"}];

    var control_pane = container.append('rect')
        .attr({
          height: 30 * controls.length,
          width: 34,
          rx: 2,
          ry: 2,
          style: "fill: rgba(0, 0, 0, 0.2);",
        })
    var built_controls = {};

    controls.forEach(function(control, index){
      built_controls[control.id] = container
        .append("image")
          .attr({"xlink:href": server_root + control.image,
            width: 28,
            height: 28,
            y: 30*index,
            x: 2,
            id: "movie-" + control.id})
          .on("click", control.action);
    });

    var repeat = $("#movie-repeat");

    container
      .insert('rect', '#movie-repeat')
        .attr({
          id : "movie-loop-toggle",
          width : repeat.attr("width"),
          height : repeat.attr("height"),
          x : repeat.attr("x"),
          y : repeat.attr("y"),
          rx : 2,
          ry : 2,
          fill : "#ff0",
          "fill-opacity" : "0.3",
          stroke : "#ff0",
          "stroke-opacity" : "0.8",
          opacity : 0
        });

    this.video.on("playing", function(){built_controls["play-pause"].attr("href", server_root + "resources/models/tracer-image/pause.png")})
    this.video.on("pause", function(){built_controls["play-pause"].attr("href", server_root + "resources/models/tracer-image/play.png")})
  }

  Movie.prototype.show_movie = function(plot, image_index) {
    var video_progress = "Creating video.";
    var self = this;

    var wait_until_build = function(){
      setTimeout(function(){$.ajax({
          type: "GET",
          accepts: "application/json",
          url: server_root + "remotes/" + self.agent_id + "/videos/" + self.movie[image_index].sid + "/status",
          success: function(result){
            if(result.message == "Creating video." || result.message == "Not ready."){
              wait_until_build();
              return;
            }
            self.build_movie_player(plot, image_index);
          },
          error: function(){
            console.debug(arguments);
          }
        });}, 1000);
    }

    wait_until_build();
  }

  Movie.prototype.build_movie_player = function(plot, image_index){
    var width = $(plot.grid_ref).attr("width") - 56;
    var height = $(plot.grid_ref).attr("height");
    
    $(plot.plot_ref + ' .scatterplot').hide();
    $('svg .image-layer').hide();

    this.video = d3.select(plot.plot_ref)
      .insert("g", ":first-child")
        .classed("movie", true)

    this.build_close_button(plot, d3.select(plot.plot_ref + " .movie"));

    this.foreign_object = this.video
      .append("foreignObject")
        .attr({
          width: width,
          height: height,
          x: 28
        })

    this.video = this.foreign_object
      .append("xhtml:body")
        .style("background", "transparent")
      .append("xhtml:video")
        .attr({
          id: "test_video",
          preload:true,
          height: height,
          width: width,
          x: 32
        })

    if(navigator.userAgent.match("WebKit")){
      var offset = $(plot.grid_ref).attr("transform").split(/[( ,)]/);
      var left = Number(offset[1]) + 28;
      var top = Number(offset[2]);
      //WebKit has a bug with rendering video elements in an svg foreignObject:
      this.video.attr("style", "position: relative; left: " + left + "px; top: " + top + "px;") 
    }

    this.video
      .append("xhtml:source")
        .attr({
          src: server_root + "remotes/" + this.agent_id + "/videos/" + this.movie[image_index].sid,
          type: "video/" + this.video_type
        });

    var self = this;

    this.video = new Popcorn(plot.plot_ref + " video");
    this.video.on("loadeddata", function(){
        self.setup_hooks.call(self, plot);
        self.build_controls.call(self, d3.select(plot.plot_ref + " .movie").append("g").attr("transform", "translate(0,30)"));
      })

    this.adjust_style_for_webkit(plot);
  }

  Movie.prototype.get_status = function(image_index) {
    $.ajax({
      type: "GET",
      url : server_root + "remotes/" + this.agent_id + "/videos/" + this.movie[image_index].sid + "/status",
      success : function(){console.debug(arguments)},
      error : function(){console.debug(arguments)},
    });
  }

  Movie.prototype.setup_hooks = function(plot){
    var self = this;
    var indices = plot.images.map(function(x,i){return [x,i];}).filter(function(value){return value[0];});
    //For now, our framerate is 25 frames/second, which is the default default for ffmpeg.
    var timify = function(frame_number, repetitions){
      var value = Math.floor(frame_number/self.fps);
      for(var i = 0; i < repetitions; i++){
        value = Math.floor(value/60);
      }
      return value;
    };

    var update_events = [];

    for(var i = 0; i < this.video.duration() * this.fps; i++){
      //In the SMPTE format: HH:MM:SS.Frame
      var time = timify(i, 3) + ":" + (timify(i, 2) % 60) + ":" + (timify(i, 1) % 60) + "." + (i % this.fps);

      var update_index = (function(idx, indices){
        return function(paused){
          if(paused){
            self.table.select_rows([indices[idx][1]]);
            return;
          }
          $(".scatterplot").scatterplot("option", "selection", [indices[idx][1]]);
        };
      })(i, indices);

      update_events[i] = update_index;
    }

    this.video.on("timeupdate", function(){
      update_events[Math.floor(d3.min([self.video.currentTime() * self.fps, update_events.length - 1]))](self.video.paused());
    });

    this.video.on("pause", function(){
      update_events[Math.floor(d3.min([self.video.currentTime() * self.fps, update_events.length - 1]))](true);
    });
  } 

  if(navigator.userAgent.match("WebKit")){
    Movie.prototype.adjust_style_for_webkit = function(plot){
      var offset = $(plot.grid_ref).attr("transform").split(/[( ,)]/);
      var left = Number(offset[1]) + 28;
      var top = Number(offset[2]);
      //WebKit has a bug with rendering video elements in an svg foreignObject:
      $(this.video.video).attr("style", "position: relative; left: " + left + "px; top: " + top + "px;") 
    }
  }
  else {
    Movie.prototype.adjust_style_for_webkit = function(){}
  }

  return Movie;
});
