/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/
// This module contains code for displaying and managing
// the movie pane on the right hand side of the UI.
//
// S. Martin
// 4/28/2017

import "jquery-ui";
import api_root from "js/slycat-api-root";
import server_root from "js/slycat-server-root";
import URI from "urijs";
import "js/slycat-login-controls";
import * as remotes from "js/slycat-remotes";
import { REMOTE_AUTH_LABELS } from "utils/ui-labels";
$.widget("mp.movies",
{
  options:
  {
    model: null,
    links: null,
    highlighted_simulations: [],
    pinned_simulations: [],
    movie_cache: {},
    color_scale: null,
    color_array: null,
    table_data: null,
    color_var_index: [],
    video_sync: false,
    video_sync_time: 0,
    frameLength: 1/25,
    update_interval: 1/25,
    current_video: null,
    playing_videos: [],
    video_times: {},
  },

  timeupdateTimeout: null,
  internal_pause: false,

  _create: function()
  {
    var self = this;
    self.videos_container = this.element;
    self.login_open = false;
    self.remotes = remotes.create_pool();
    self._open_movies(self.options.pinned_simulations);
  },

  _handle_highlighted_simulations: function()
  {
    var self = this;
  },

  _handle_color_change: function()
  {
    var self = this;
    $("#mp-movies .videoContainer").each(function(index, element){
      var index = $(element).data('index');
      $(element).css({
        'border-color':
        self.options.color_scale(self.options.table_data[0].data[self.options.color_var_index][index]),
      });
    });
  },

  _close_movies: function(simulation_indexes)
  {
    var self = this;
    for(var i=0; i < simulation_indexes.length; i++)
    {
      // If the movie being closed is the current_video, set it to the next open video or null
      if(self.options.current_video == simulation_indexes[i])
      {
        self._set_current_video(self.options.pinned_simulations[0] == undefined ? null : self.options.pinned_simulations[0]);
      }
      $(".videoContainer[data-index='" + simulation_indexes[i] + "']", self.videos_container)
        .remove()
        ;
    }
  },

  _open_movies: function(simulation_indexes)
  {

    var self = this;

    // If the list of movies is empty, we're done.
    if(simulation_indexes.length == 0) return;
    var movie_index = simulation_indexes[0];
    var movie_uri = self.options.links[movie_index];

    // If the video is already in the client cache, display it.
    if (movie_index in self.options.movie_cache) {
      console.log("Displaying movie " + movie_uri + " from client cache...");

      var url_creator = window.URL || window.webkitURL;
      var blob = self.options.movie_cache[movie_index];
      var movie_url = url_creator.createObjectURL(blob);

      var var_data = self.options.table_data[0].data[self.options.color_var_index];

      var border_color = 'black';
      if(self.options.color_scale !== null)
      {
        border_color = self.options.color_scale(var_data[movie_index]);
      }

      var video_container = $('<div>', {
          'data-index': movie_index,
          class: 'videoContainer',
        })
        .toggleClass('selected', movie_index == self.options.current_video)
        .css({
          'border-color': border_color,
        })
        .on('click', function(){
          // console.log("CLICK event handler starting" + movie_index);
          // Setting current_video on click so we know which video is "selected" and which to interact with
          // using controls when they're not synced
          self._set_current_video(movie_index);
        })
        .prependTo(self.videos_container)
        ;

      var video = $('<video>', {
          'data-index': movie_index,
          class: 'video',
          src: movie_url,
          loop: true,
        })
        .prop("controls",true)
        .css({
          'width': '100%',
        })
        .text('Video for index ' + movie_index)
        .on("play", function(){
          // console.log("PLAY event handler starting" + movie_index);
          if(self.options.video_sync)
          {
            self.play();
          }

          // Send time updates, but only from a single video (the currently selected one), otherwise there's
          // too much info being sent to update the rest of the UI with similar data.
          // console.log("$(this).data('index'), self.options.current_video: " + $(this).data('index') + ", " + self.options.current_video);
          if($(this).data('index') == self.options.current_video)
          {
            window.clearInterval(self.timeupdateTimeout);
            self.timeupdateTimeout = window.setInterval(
              self._handle_timeupdate,
              self.options.update_interval,
              self,
              this
            );
          }

          // Add current video to playing_videos option if it's not already there
          if(self.options.playing_videos.indexOf(movie_index) < 0)
          {
            self.options.playing_videos.push(movie_index);
            self.element.trigger("playing_videos", [self.options.playing_videos.slice()]);
          }

          // Also setting current_video on play because Chrome and Safari don't fire the click event on play
          if(!self.options.video_sync && self.options.current_video != movie_index)
          {
            self._set_current_video(movie_index);
          }
        })
        .on("pause", function(){
          // console.log("PAUSE event handler starting" + movie_index);
          window.clearInterval(self.timeupdateTimeout);
          if(!self.interact)
          {
            self.options.video_sync_time = this.currentTime;
            // Due to a Firefox bug, I need to set the paused video's time to it's currentTime because
            // Firefox pauses it a frame or two past where it claims the video is. Only need to do this
            // when video sync is off because when it's on, all videos, including current one, have their
            // currentTime updated.
            if(!self.options.video_sync)
            {
              this.currentTime = self.options.video_sync_time;
            }
            if(self.options.video_sync)
            {
              self.pause();
              self._update_video_sync_time();
            }
          }

          // Remove current video from playing_videos option if it's already there
          if(self.options.playing_videos.indexOf(movie_index) > -1)
          {
            self.options.playing_videos.splice(self.options.playing_videos.indexOf(movie_index), 1);
            self.element.trigger("playing_videos", [self.options.playing_videos.slice()]);
          }
          // Also setting current_video on pause because Chrome and Safari don't fire the click event on pause
          if(!self.options.video_sync && self.options.current_video != movie_index)
          {
            self._set_current_video(movie_index);
          }
          // Triggering event for tracking current video's time
          self.element.trigger("video_time", {id: movie_index, time: this.currentTime});
        })
        .on("seeked", function(){
          // console.log("SEEKED event handler starting" + movie_index);
          self.options.video_sync_time = this.currentTime;
          if(self.options.video_sync)
          {
            self._update_video_sync_time();
          }
          self.element.trigger("video_sync_time", self.options.video_sync_time);
          // Also setting current_video on seek because Chrome and Safari don't fire the click event on seek
          if(!self.options.video_sync && self.options.current_video != movie_index)
          {
            self._set_current_video(movie_index);
          }
          // Triggering event for tracking current video's time
          self.element.trigger("video_time", {id: movie_index, time: this.currentTime});
        })
        .on("timeupdate", function(){
          // Sending time updates through the PLAY even, not this one, because this one's frequency is too low.
        })
        .prependTo(video_container)
        ;

      if(self.options.video_sync)
      {
        video.get(0).currentTime = self.options.video_sync_time;
      }
      else if(self.options.video_times[movie_index] !== undefined)
      {
        video.get(0).currentTime = self.options.video_times[movie_index];
      }

      // Create the footer bar along the bottom of every video
      var frame_footer = $('<div class="frame-footer"></div>')
        .appendTo(video_container)
        ;

      // Create a close button ...
      var close_button = $('<i class="close-button frame-button fa fa-times" aria-hidden="true" title="Close"></i>')
        .click(function(){
          // pinned_simulations needs to exclude the to-be-closed movies before _close_movies is called
          self.options.pinned_simulations = _.without(self.options.pinned_simulations, movie_index);
          self._close_movies([movie_index]);
          self.element.trigger("pinned_simulations_changed", [self.options.pinned_simulations]);
        })
        .appendTo(frame_footer)
        ;

      // Create a download button ...
      var download_button = $('<a class="download-button frame-button fa fa-download" title="Download media file"></a>')
        .attr('href', movie_url)
        .attr('download', movie_uri.split('/').pop())
        .appendTo(frame_footer)
        ;

      // Create jump button ...
      var jump_button = $('<span class="jump-button frame-button"></span>')
        .click(function(){
          self.element.trigger("jump_to_simulation", movie_index);
        })
        .appendTo(frame_footer)
        ;

      var table_button = $('<i class="table-button jump-button frame-button fa fa-table"></i>')
        .attr('title', 'Jump to row ' + movie_index + ' in table')
        .attr("aria-hidden", "true")
        .appendTo(jump_button)
        ;

      var arrow_button = $('<i></i>')
        .attr('class', 'arrow-button jump-button frame-button fa fa-arrow-right')
        .attr('title', 'Jump to row ' + movie_index + ' in table')
        .attr("aria-hidden", "true")
        .appendTo(jump_button)
        ;

      var table_index = $('<span></span>')
        .attr('class', 'table-index jump-button frame-button')
        .attr('title', 'Index of current media. Click to jump to row ' + movie_index + ' in table.')
        .attr("aria-hidden", "true")
        .text(movie_index)
        .appendTo(jump_button)
        ;

      // If we don't currently have a current_video, just set it to this one
      if(self.options.current_video == null)
      {
        self._set_current_video(movie_index);
      }

      self._open_movies(simulation_indexes.slice(1));
      return;
    }

    // If we don't have a session for the movie hostname, create one.
    var uri = URI(movie_uri);
    var cached_uri = URI(api_root + "projects/" + self.options.model.project + "/cache/" + URI.encode(uri.host() + uri.path()));

    console.log("Attempting to load movie from server cache...");
    console.log("Loading movie " + movie_uri + " from server...");

    var xhr = new XMLHttpRequest();
    var api = "/file";

    xhr.movie_index = movie_index;
    xhr.open("GET", api_root + "projects/" + self.options.model.project + "/cache/" + URI.encode(uri.host() + uri.path()), true);
    xhr.responseType = "arraybuffer";

    xhr.onload = function(e){
      //If the movie isn't in cache, open an agent session:
      if (this.status == 404) {
        if(!self.login_open)
        {
          self.login_open = true;
          self.remotes.get_remote({
            hostname: uri.hostname(),
            title: `${REMOTE_AUTH_LABELS.signIn} to ${uri.hostname()}`,
            message: "Loading " + uri.pathname(),
            cancel: function() {
              self.login_open = false;
            },
            success: function(hostname) {
              var xhr = new XMLHttpRequest();
              var api = "/file";

              xhr.movie_index = movie_index;
              //Double encode to avoid cherrypy's auto unencode in the controller
              xhr.open("GET", api_root + "remotes/" + hostname + api + uri.pathname() + "?cache=project&project=" + self.options.model.project + "&key=" + URI.encode(URI.encode(uri.host() + uri.path())), true);
              xhr.responseType = "arraybuffer";
              xhr.onload = function(e) {
                // If we get 404, the remote session no longer exists because it timed-out.
                // If we get 500, there was an internal error communicating to the remote host.
                // Either way, delete the cached session and create a new one.
                if(this.status == 404 || this.status == 500) {
                  self.remotes.delete_remote(uri.hostname());
                  self._open_movies(simulation_indexes);
                  return;
                }
                // If we get 400, it means that the session is good and we're
                // communicating with the remote host, but something else went wrong
                // (probably file permissions issues).
                if(this.status == 400) {
                  var message = this.getResponseHeader("slycat-message");
                  var hint = this.getResponseHeader("slycat-hint");

                  if(message && hint) {
                    window.alert(message + "\n\n" + hint);
                  } else if(message) {
                    window.alert(message);
                  } else {
                    window.alert("Error loading image " + this.movie_index + ": " + this.statusText);
                  }

                  return;
                } else {
                  // We received the image, so put it in the cache and start-over.
                  var array_buffer_view = new Uint8Array(this.response);
                  var blob = new Blob([array_buffer_view], {type:this.getResponseHeader('content-type')});
                  self.options.movie_cache[movie_index] = blob;
                  self._open_movies(simulation_indexes);
                }
              }

              xhr.send();
              self.login_open = false;
            },
          })
        }
      } else {
        // We received the image, so put it in the cache and start-over.
        var array_buffer_view = new Uint8Array(this.response);
        var blob = new Blob([array_buffer_view], {type:this.getResponseHeader('content-type')});
        self.options.movie_cache[movie_index] = blob;
        self._open_movies(simulation_indexes);
      }
    }
    xhr.send();


  },

  _handle_timeupdate: function(self, video)
  {
    // console.log("handling timeupdate by sending current video time of: " + video.currentTime);
    self.options.video_sync_time = video.currentTime;
    self.element.trigger("video_sync_time", self.options.video_sync_time);
  },

  _handle_pinned_simulations: function(simulation_indexes)
  {
    var self = this;

    // Find pinned simulations that need to be opened
    var openPins = _.difference(simulation_indexes, self.options.pinned_simulations);

    // Find pinned simulations that need to be closed
    var closePins = _.difference(self.options.pinned_simulations, simulation_indexes);

    // Set state of pinned_simulations once we figured out what needs to be opened and closed
    // pinned_simulations needs to exclude the to-be-closed movies before _close_movies is called
    self.options.pinned_simulations = simulation_indexes;

    // Close
    self._close_movies(closePins);

    // Open
    self._open_movies(openPins);
  },

  _setOption: function(key, value)
  {
    if(key == "highlighted_simulations")
    {
      if(!_.isEmpty(_.xor(this.options[key], value)))
      {
        this.options[key] = value.slice();
        this._handle_highlighted_simulations();
      }
    }
    else if(key == "pinned_simulations")
    {
      if(!_.isEmpty(_.xor(this.options[key], value)))
      {
        this._handle_pinned_simulations(value.slice());
      }
    }
    else if(key == "color-options")
    {
      this.options[key] = value;
      this.options.color_scale = value.color_scale;
      this.options.color_array = value.color_array;
      this._handle_color_change();
    }
    else if(key == "video_sync")
    {
      if(this.options[key] != value)
      {
        this.options[key] = value;
        // Pause all videos if video_sync has been turned on. Otherwise we might be in a strange
        // state where some are playing and others arent.
        if(value)
        {
          var existing_video_sync_time = this.options.video_sync_time;
          this.internal_pause = true;
          this.pause();
          this.internal_pause = false;
          // Pausing videos sets video_sync_time to that of the last paused video, so we need to reset it
          // this.options.video_sync_time = existing_video_sync_time;
        }
        this._update_video_sync_time();
      }
    }
    else if(key == "video_sync_time")
    {
      if(this.options[key] != value)
      {
        this.options[key] = value;
        if(this.options.video_sync)
        {
          this._update_video_sync_time();
        }
      }
    }
    else if(key == "current_video")
    {
      if(this.options[key] != value)
      {
        this._set_current_video(value);
      }
    }
    else if(key == "color-var-options")
    {
      this.options[key] = value;
      this.options.color_var_index = value;
      this._handle_color_change();
    }
  },

  _is_video_playing: function(video)
  {
    var playing = !!(/*video.currentTime > 0 &&*/ !video.paused && !video.ended && video.readyState > 2);
    // console.log("****************" + playing + ": video is playing? " + playing);
    // console.log("currentTime: " + video.currentTime + ", paused: " + video.paused + ", ended: " + video.ended + ", readyState: " + video.readyState);
    return playing;
  },

  _update_video_sync_time: function()
  {
    var self = this;
    // Updating videos' sync time should not fire off additional seeked events
    $("video").each(function(index, video)
    {
      // Only update currentTime if the video is not playing
      var videoTargetTime = Math.min(self.options.video_sync_time, video.duration-0.000001);
      // There seems to be a bug where sometimes videoTargetTime is NaN, but I haven't been able to track it down.
      // Doesn't seem to have any negative effects though.
      // Leaving debug code in for future.
      // console.log("videoTargetTime: " + videoTargetTime);
      // if(isNaN(videoTargetTime))
      //   debugger;
      var playing = self._is_video_playing(video);
      if( !playing && video.currentTime != videoTargetTime )
      {
        video.currentTime = videoTargetTime;
      }
    });
  },

  jump_to_start: function()
  {
    var self = this;
    if(self.options.video_sync)
    {
      // Pause all videos
      $("video").each(function(index, video)
      {
        video.pause();
      });
      // Set sync time to 0
      self.options.video_sync_time = 0;

      // Update and bookmark
      self._update_video_sync_time();

      self.element.trigger("video_sync_time", self.options.video_sync_time);
    }
    else
    {
      var video = $("video[data-index='" + self.options.current_video + "']").get(0);
      if(video != null)
      {
        self._set_single_video_time(video, 0);
      }
    }
  },

  jump_to_end: function()
  {
    var self = this;
    if(self.options.video_sync)
    {
      var minLength = Infinity;
      // Pause all videos and log highest length
      $("video").each(function(index, video)
      {
        video.pause();
        minLength = Math.min(video.duration, minLength);
      });

      // Set sync time to max video length
      self.options.video_sync_time = minLength;

      // Update and bookmark
      self._update_video_sync_time();

      self.element.trigger("video_sync_time", self.options.video_sync_time);
    }
    else
    {
      var video = $("video[data-index='" + self.options.current_video + "']").get(0);
      if(video != null)
      {
        self._set_single_video_time(video, video.duration - self.options.frameLength);
      }
    }
  },

  frame_back: function()
  {
    var self = this;
    if(self.options.video_sync)
    {
      var videos = $("video");
      var firstVideo = videos.get(0);
      if(firstVideo != undefined)
      {
        self.options.video_sync_time = Math.max(firstVideo.currentTime - self.options.frameLength, 0);
        self.element.trigger("video_sync_time", self.options.video_sync_time);
      }

      // Pause all videos
      videos.each(function(index, video)
      {
        video.pause();
      });

      // Update and bookmark
      self._update_video_sync_time();
    }
    else
    {
      var video = $("video[data-index='" + self.options.current_video + "']").get(0);
      if(video != null)
      {
        var time = Math.max(video.currentTime - self.options.frameLength, 0);
        self._set_single_video_time(video, time);
      }
    }
  },

  frame_forward: function()
  {
    var self = this;
    if(self.options.video_sync)
    {
      var videos = $("video");
      var minLength = Infinity;
      var firstVideoDuration;

      // Pause all videos and log lowest length
      videos.each(function(index, video)
      {
        video.pause();
        minLength = Math.min(video.duration, minLength);
      });

      var firstVideo = videos.get(0);
      if(firstVideo != undefined)
      {
        self.options.video_sync_time = Math.min((firstVideo.currentTime + self.options.frameLength), (minLength - self.options.frameLength));
        // Update and bookmark
        self._update_video_sync_time();
        self.element.trigger("video_sync_time", self.options.video_sync_time);
      }
    }
    else
    {
      var video = $("video[data-index='" + self.options.current_video + "']").get(0);
      if(video != null)
      {
        var time = Math.min(video.currentTime + self.options.frameLength, video.duration - self.options.frameLength);
        self._set_single_video_time(video, time);
      }
    }
  },

  play: function()
  {
    var self = this;
    if(self.options.video_sync)
    {
      $("video").each(function(index, video)
      {
        video.play();
      });
    }
    else
    {
      var video = $("video[data-index='" + self.options.current_video + "']").get(0);
      if(video != null)
      {
        video.play();
      }
    }
  },

  pause: function()
  {
    var self = this;
    if(self.options.video_sync)
    {
      var videos = $("video");
      var firstVideo = videos.get(0);
      if(firstVideo != undefined && !self.internal_pause)
      {
        self.options.video_sync_time = firstVideo.currentTime;
        self.element.trigger("video_sync_time", self.options.video_sync_time);
      }

      videos.each(function(index, video)
      {
        video.pause();
        video.currentTime = self.options.video_sync_time;
      });

      self._update_video_sync_time();
    }
    else
    {
      var video = $("video[data-index='" + self.options.current_video + "']").get(0);
      if(video != null)
      {
        video.pause();
        self.options.video_sync_time = video.currentTime;
        video.currentTime = self.options.video_sync_time;
        self.element.trigger("video_sync_time", self.options.video_sync_time);
      }
    }
  },

  _set_single_video_time: function(video, time)
  {
    var self = this;
    if(video != null)
    {
      video.pause();
      video.currentTime = time;
      self.options.video_sync_time = time;
      self.element.trigger("video_sync_time", self.options.video_sync_time);
    }
  },

  _set_current_video: function(movie_index)
  {
    var self = this;
    // Make sure it's not already set to the movie_index
    if(self.options.current_video != movie_index)
    {
      self.options.current_video = movie_index;
      self.element.trigger("current_video", self.options.current_video);
      // Remove the selected class from all videoContainer elements
      $('#mp-movies .videoContainer').removeClass("selected");
      // Add the selected class to the videoContainer element with the current movie_index as its data-index attribute
      $("#mp-movies .videoContainer[data-index='" + movie_index + "']").addClass("selected");
    }
  },

});
