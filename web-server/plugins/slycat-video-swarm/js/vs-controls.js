/*
Copyright 2013 National Technology & Engineering Solutions of Sandia, LLC (NTESS). 
Under the terms of Contract DE-NA0003525 with NTESS, the U.S. Government 
retains certain rights in this software.
*/

import api_root from "js/slycat-api-root";
import * as remotes from "js/slycat-remotes.js";
import * as dialog from "js/slycat-dialog";
//import _ from "js/lodash";
import Papa from "papaparse";
import "jquery-ui";

$.widget("mp.controls",
{
  options:
  {
    model: null,
    aid: null,
    metadata : null,
    color_variable : null,
    color_variables : [],
    highlighted_simulations : [],
    pinned_simulations: [],
    video_sync : false,
    video_sync_time : 0,
    current_video : null,
    playing_videos : [],
  },

  _create: function()
  {
    var self = this;
    var scatterplot_controls = $("#scatterplot-controls", this.element);
    var selection_controls = $("#selection-controls", this.element);
    var video_controls = $("#video-controls", this.element);
    this.video_controls = video_controls;
    var playback_controls = $("#playback-controls", this.element);
    this.playback_controls = playback_controls;

    this.color_control = $('<div class="btn-group"></div>')
      .appendTo(scatterplot_controls)
      ;
    this.color_button = $('\
      <button class="btn dropdown-toggle btn-sm btn-outline-dark" type="button" id="color-dropdown" data-toggle="dropdown" aria-expanded="false" title="Change Point Color"> \
        Point Color \
      </button> \
      ')
      .appendTo(self.color_control)
      ;

    this.color_items = $('<div id="y-axis-switcher" class="dropdown-menu" aria-labelledby="color-dropdown">')
      .appendTo(self.color_control)
      ;

    // Alex disabling selection_control because it was a drop-down with a single item. Replacing it with at "Pin Selected" button.
    // this.selection_control = $('<div class="btn-group"></div>')
    //   .appendTo(selection_controls)
    //   ;
    // this.selection_button = $('\
    //   <button class="btn btn-primary dropdown-toggle" type="button" id="selection-dropdown" data-toggle="dropdown" aria-expanded="true" title="Perform Action On Selection"> \
    //     Selection Action \
    //   </button> \
    //   ')
    //   .appendTo(self.selection_control)
    //   ;
    // this.selection_items = $('<ul id="selection-switcher" class="dropdown-menu" role="menu" aria-labelledby="selection-dropdown">')
    //   .appendTo(self.selection_control)
    //   ;

    this.pin_selected_button = $('<button type="button" title="Show selected videos" class="btn btn-sm btn-outline-dark">Pin Selected</button>')
      .click(function(){
        var menu_item = $(this).parent();
        // Check if highlighted_simulations are already in pinned_simulations. If so, return false.
        // console.log("Pinned: " + self.options.pinned_simulations);
        // console.log("Highlighted: " + self.options.highlighted_simulations);
        var newPins = _.difference(self.options.highlighted_simulations, self.options.pinned_simulations);
        // console.log("newPins: " + newPins);
        if(_.isEmpty(newPins))
        {
          // console.log("No new pins, so returning false.");
          // No new pins, so returnsing false
          return false;
        }
        // Otherwise, create a new array of all highlighted_simulations and pinned simulations and trigger with that new array. Don't update local pinned_simulations.
        else
        {
          // console.log("New pins exist. Here are the new pinned_simulations: " + _.union(self.options.pinned_simulations, newPins));
          self.element.trigger("pinned_simulations_changed", [_.union(self.options.pinned_simulations, newPins)]);
        }
      })
      .appendTo(selection_controls)
      ;
    
    this.close_all_button = $('<button type="button" class="btn btn-sm btn-outline-dark">Close All Pins</button>')
      .click(function(){
        self.element.trigger("pinned_simulations_changed", [[]]);
      })
      .appendTo(selection_controls)
      ;

    this.csv_button = $("\
      <button class='btn btn-sm btn-outline-dark' title='Download Data Table'> \
        <span class='fa fa-download' aria-hidden='true'></span> \
      </button> \
      ")
      .click(function(){
        if (self.options.highlighted_simulations.length == 0) {
          self._write_data_table();
        } else {
          openCSVSaveChoiceDialog();
        }
      })
      .appendTo(selection_controls)
      ;

    this.video_sync_button_wrapper = $("<div class='input-group-prepend'></div>")
      .appendTo(video_controls)
      ;

    this.video_sync_button = $("\
        <button class='btn btn-sm btn-outline-dark slycatControlsButtonToggle' data-toggle='button'> \
          <span class='fa fa-video-camera' aria-hidden='true'></span> \
        </button> \
      ")
      .click(function(){
        self.options.video_sync = !$(this).hasClass('active');
        self._respond_pinned_simulations_changed();
        self.element.trigger("video_sync", !$(this).hasClass('active'));
        this.title = self.options.video_sync ? 'Unsync videos' : 'Sync videos';
      })
      .attr('title', self.options.video_sync ? 'Unsync videos' : 'Sync videos')
      .appendTo(self.video_sync_button_wrapper)
      ;

    this.video_sync_time = $("\
      <input type='text' class='form-control form-control-sm video-sync-time' placeholder='Time'> \
      ")
      .focusout(function(){
        handleVideoSyncTimeChange(this);
      })
      .keypress(function(e){
        if(e.which == 13)
        {
          handleVideoSyncTimeChange(this);
        }
      })
      .appendTo(video_controls)
      ;

    this.jump_to_start_button = $("\
      <button class='btn btn-sm btn-outline-dark' title='Jump to beginning'> \
        <span class='fa fa-fast-backward' aria-hidden='true'></span> \
      </button> \
      ")
      .click(function(){
        self.element.trigger("jump-to-start");
      })
      .appendTo(playback_controls)
      ;

    this.frame_back_button = $("\
      <button class='btn btn-sm btn-outline-dark' title='Skip one frame back'> \
        <span class='fa fa-backward' aria-hidden='true'></span> \
      </button> \
      ")
      .click(function(){
        self.element.trigger("frame-back");
      })
      .appendTo(playback_controls)
      ;

    this.play_button = $("\
      <button class='btn btn-sm btn-outline-dark play-button' title='Play'> \
        <span class='fa fa-play' aria-hidden='true'></span> \
      </button> \
      ")
      .click(function(){
        self.element.trigger("play");
        $(this).hide();
        self.pause_button.show();
      })
      .appendTo(playback_controls)
      ;

    this.pause_button = $("\
      <button class='btn btn-sm btn-outline-dark pause-button' title='Pause'> \
        <span class='fa fa-pause' aria-hidden='true'></span> \
      </button> \
      ")
      .click(function(){
        self.element.trigger("pause");
        $(this).hide();
        self.play_button.show();
      })
      .hide()
      .appendTo(playback_controls)
      ;

    this.frame_forward = $("\
      <button class='btn btn-sm btn-outline-dark' title='Skip one frame forward'> \
        <span class='fa fa-forward' aria-hidden='true'></span> \
      </button> \
      ")
      .click(function(){
        self.element.trigger("frame-forward");
      })
      .appendTo(playback_controls)
      ;

    this.jump_to_end_button = $("\
      <button class='btn btn-sm btn-outline-dark' title='Jump to end'> \
        <span class='fa fa-fast-forward' aria-hidden='true'></span> \
      </button> \
      ")
      .click(function(){
        self.element.trigger("jump-to-end");
      })
      .appendTo(playback_controls)
      ;

    function handleVideoSyncTimeChange(element)
    {
      var val = parseFloat($(element).val());
      if(isNaN(val))
      {
        val = 0;
      }
      $(element).val(val);
      self.options.video_sync_time = val;
      self.element.trigger("video_sync_time", val);
    }

    function openCSVSaveChoiceDialog(){
      var txt = "";
      var buttons_save = [
        {className: "btn-light", label:"Cancel"}, 
        {className: "btn-primary", label:"Save Entire Table", icon_class:"fa fa-table"}
      ];

      if(self.options.highlighted_simulations.length > 0)
      {
        txt += "You have " + self.options.highlighted_simulations.length + " rows selected. ";
        buttons_save.splice(buttons_save.length-1, 0, {className: "btn-primary", label:"Save Selected", icon_class:"fa fa-check"});
      }

      txt += "What would you like to do?";

      dialog.dialog(
      {
        title: "Download Choices",
        message: txt,
        buttons: buttons_save,
        callback: function(button)
        {
          if(button.label == "Save Entire Table")
            self._write_data_table();
          else if(button.label == "Save Selected")
            self._write_data_table( self.options.highlighted_simulations );
        },
      });
    }

    self._set_color_variables();
    self._set_selection_control();
    self._set_video_sync();
    self._set_video_sync_time();
    self._respond_pinned_simulations_changed();
  },

  _write_data_table: function(selectionList)
  {
    var self = this;
    $.ajax(
    {
      type : "POST",
      url : api_root + "models/" + self.options.model._id + "/arraysets/" + self.options.aid + "/data",
      data: JSON.stringify({"hyperchunks": "0/.../..."}),
      contentType: "application/json",
      success : function(result)
      {
        self._write_csv( self._convert_to_csv(result, selectionList), self.options.model.name + "_data_table.csv" );
      },
      error: function(request, status, reason_phrase)
      {
        window.alert("Error retrieving data table: " + reason_phrase);
      }
    });
  },

  _write_csv: function(csvData, defaultFilename)
  {
    var blob = new Blob([ csvData ], {
      type : "application/csv;charset=utf-8;"
    });
    var csvUrl = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = csvUrl;
    link.style = "visibility:hidden";
    link.download = defaultFilename || "slycatDataTable.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  _convert_to_csv: function(array, sl)
  {
    // Note that array.data is column-major:  array.data[0][*] is the first column
    var self = this;
    
    // Converting data array from column major to row major
    var rowMajorData = _.zip(...array);

    // If we have a selection list, remove everything but those elements from the data array
    if(sl != undefined && sl.length > 0)
    {
      // sl is in the order the user selected the rows, so sort it.
      // We want to end up with rows in the same order as in the original data.
      sl.sort();
      // Only keep elements at the indexes specified in sl
      rowMajorData = _.at(rowMajorData, sl);
    }

    // Creating an array of column headers by removing the last one, which is the Index that does not exist in the data
    var headers = self.options.metadata["column-names"].slice(0, -1);

    // Adding headers as first element in array of data rows
    rowMajorData.unshift(headers);

    // Creating CSV from data array
    var csv = Papa.unparse(rowMajorData);
    return csv;
  },

  _set_color_variables: function()
  {
    var self = this;
    this.color_items.empty();
    for(var i = 0; i < this.options.color_variables.length; i++) {
      $("<a href='#' class='dropdown-item'>")
        .toggleClass("active", self.options.color_variable == self.options.color_variables[i])
        .attr("data-colorvariable", this.options.color_variables[i])
        .appendTo(self.color_items)
        .html(this.options.metadata["column-names"][this.options.color_variables[i]])
        .click(function()
        {
          var menu_item = $(this);
          if(menu_item.hasClass("active"))
            return false;

          self.color_items.find("a").removeClass("active");
          menu_item.addClass("active");

          self.element.trigger("color-selection-changed", menu_item.attr("data-colorvariable"));
        })
        ;
    }
  },

  _set_video_sync: function()
  {
    var self = this;
    this.video_sync_button.toggleClass("active", self.options.video_sync);
    this.video_sync_button.attr("aria-pressed", self.options.video_sync);
  },

  _set_video_sync_time: function()
  {
    var self = this;
    this.video_sync_time.val(self.options.video_sync_time);
  },

  _set_selection_control: function()
  {
    var self = this;
    // Alex disabling selection_control because it was a drop-down with a single item. Replacing it with at "Pin Selected" button.
    // this.selection_items.empty();
    
    // // Finish with global actions
    // $('<li role="presentation" class="dropdown-header"></li>')
    //   .text("Scatterplot Points")
    //   .appendTo(self.selection_items)
    //   ;

    // self.pin_item = $("<li role='presentation'>")
    //   .appendTo(self.selection_items)
    //   .append(
    //     $('<a role="menuitem" tabindex="-1">')
    //       .html("Pin")
    //       .attr("data-value", "pin")
    //       .click(function()
    //       {
    //         var menu_item = $(this).parent();
    //         if(menu_item.hasClass("disabled"))
    //           return false;

    //         // Check if highlighted_simulations are already in pinned_simulations. If so, return false.
    //         // console.log("Pinned: " + self.options.pinned_simulations);
    //         // console.log("Highlighted: " + self.options.highlighted_simulations);
    //         var newPins = _.difference(self.options.highlighted_simulations, self.options.pinned_simulations);
    //         // console.log("newPins: " + newPins);
    //         if(_.isEmpty(newPins))
    //         {
    //           // console.log("No new pins, so returning false.");
    //           // No new pins, so returnsing false
    //           return false;
    //         }
    //         // Otherwise, create a new array of all highlighted_simulations and pinned simulations and trigger with that new array. Don't update local pinned_simulations.
    //         else
    //         {
    //           // console.log("New pins exist. Here are the new pinned_simulations: " + _.union(self.options.pinned_simulations, newPins));
    //           self.element.trigger("pinned_simulations_changed", [_.union(self.options.pinned_simulations, newPins)]);
    //         }
    //       })
    //   )
    //   ;

    // Set state
    self._set_selection();
  },

  _set_selected_color: function()
  {
    var self = this;
    self.color_items.find("a").removeClass("active");
    self.color_items.find('a[data-colorvariable="' + self.options.color_variable + '"]').addClass("active");
  },

  _set_selection: function()
  {
    var self = this;
    // Alex disabling selection_control because it was a drop-down with a single item. Replacing it with at "Pin Selected" button.
    // self.selection_button.toggleClass("disabled", this.options.highlighted_simulations.length == 0);
    self._set_pin_item_state();
  },

  _set_pin_item_state: function()
  {
    var self = this;
    // Disable pin button when all highlighted_simulations are already part of pinned_simulations
    // Alex disabling selection_control because it was a drop-down with a single item. Replacing it with at "Pin Selected" button.
    // self.pin_item.toggleClass("disabled", _.isEmpty(_.difference(self.options.highlighted_simulations, self.options.pinned_simulations)) );
    self.pin_selected_button.prop("disabled", _.isEmpty(_.difference(self.options.highlighted_simulations, self.options.pinned_simulations)));
  },

  _respond_pinned_simulations_changed: function()
  {
    var self = this;
    var frame;
    var any_video_open = false;
    var any_video_playing = false;
    var current_frame_video = false;
    var current_frame_video_playing = false;
    for(var i=0; i < self.options.pinned_simulations.length; i++)
    {
      frame = self.options.pinned_simulations[i];
      any_video_open = true;
      if(frame == self.options.current_video)
      {
        current_frame_video = true;
        if(self.options.playing_videos.indexOf(frame) > -1)
        {
          current_frame_video_playing = true;
          any_video_playing = true;
          break;
        }
      }
      if(self.options.playing_videos.indexOf(frame) > -1)
      {
        any_video_playing = true;
      }
      // No need to keep searching if we found a video and the current frame is also a video
      if(any_video_open && current_frame_video && any_video_playing && current_frame_video_playing)
      {
        break;
      }
    }
    // console.log("any_video_open: " + any_video_open + ", any_video_playing: " + any_video_playing + ", current_frame_video: " + current_frame_video + ", current_frame_video_playing: " + current_frame_video_playing);
    // Hide / show video controls based on whether any videos are open
    this.video_controls.add(this.playback_controls).toggle(any_video_open);
    // Disable playback controls when the current frame is no a video and sync videos is not toggled
    $('button', this.playback_controls).prop("disabled", !(self.options.video_sync || current_frame_video));
    // Disable close all button when there are no pinned simulations
    this.close_all_button.prop("disabled", self.options.pinned_simulations.length == 0);
    self._set_pin_item_state();

    // Enable play or pause based on what's playing
    if( (self.options.video_sync && any_video_playing) || (!self.options.video_sync && current_frame_video_playing) )
    {
      self.pause_button.show();
      self.play_button.hide();
    }
    else
    {
      self.pause_button.hide();
      self.play_button.show();
    }
  },

  _setOption: function(key, value)
  {
    var self = this;

    if(key == "color_variable")
    {
      if(value != this.options[key])
      {
        this.options[key] = value;
        self._set_selected_color();
      }
    }
    else if(key == 'color_variables')
    {
      this.options[key] = value;
      self._set_color_variables();
    }
    else if(key == 'highlighted_simulations')
    {
      if(!_.isEmpty(_.xor(this.options[key], value)))
      {
        this.options[key] = value.slice();
        self._set_selection();
      }
    }
    else if(key == "pinned_simulations")
    {
      if(!_.isEmpty(_.xor(this.options[key], value)))
      {
        this.options[key] = value.slice();
        self._respond_pinned_simulations_changed();
      }
    }
    else if(key == 'video_sync_time')
    {
      if(this.options[key] != value)
      {
        this.options[key] = value;
        self._set_video_sync_time();
      }
    }
    else if(key == 'current_video')
    {
      if(this.options[key] != value)
      {
        this.options[key] = value;
        self._respond_pinned_simulations_changed();
      }
    }
    else if(key == "playing_videos")
    {
      if(!_.isEmpty(_.xor(this.options[key], value)))
      {
        this.options[key] = value.slice();
        self._respond_pinned_simulations_changed();
      }
    }
  },
});

