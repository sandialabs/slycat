/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import api_root from "js/slycat-api-root";
import _ from "lodash";
import "jquery-ui";
import "./stickies.core";

function NoteManager(model_id, bookmarker, bookmark) {
  var self = this;
  self.model_id = model_id;
  self.bookmarker = bookmarker;
  self.bookmark = bookmark;

  if ('notes' in bookmark && bookmark['notes'].length > 0) {
    self.notes = bookmark['notes'];
    var ids = $.map(self.notes, function(note) { return note.id; });
    self.id_counter = Math.max.apply(Math, ids) + 1; //ensure there are no id collisions
    $.each(self.notes, function(index, note) {
      self.build_note_in_dom(note);
    });
  } else {
    self.notes = [];
    self.id_counter = 0;
  }

  self.button = $("<button class='btn btn-sm btn-outline-dark' title='Add Note'> \
                     <span class='fa fa-comment-o' aria-hidden='true'></span> \
                   </button>")
                .prependTo($('#controls #add-note'))
                .on('click', function() {
                  self.add_note();
                });
};

NoteManager.prototype.build_note_in_dom = function(attributes) {
  var self = this;
  var text_area = $('<textarea placeholder="Write a note...">' + attributes.text + '</textarea>');
  $('.media-layer').append(text_area);
  text_area.stickies();
  var note = text_area.parent();
  var close_button = note.find('i.fa.fa-close');
  var header = note.find('.ui-sticky-header');
  var title_button = $('<i class="fa fa-text-height">');
  var note_button = $('<i class="fa fa-file-text-o">');
  header.append(title_button).append(note_button);

  note.attr('id', 'note-' + attributes.id);
  note.css({
    'top': attributes.top,
    'left': attributes.left,
    'width': attributes.width,
    'height': attributes.height
  });
  text_area.css({
    'width': parseInt(header.css('width')) - 7,
    'height': note.outerHeight() - header.outerHeight() - 7
  });

  if (attributes.title) {
    note.addClass('title');
    title_button.hide();
  }
  else {
    note_button.hide();
  }

  title_button.on('click', function() {
    title_button.hide();
    note_button.show();
    note.addClass('title');
    self.edit_note(attributes.id, { title: true });
  });

  note_button.on('click', function() {
    note_button.hide();
    title_button.show();
    note.removeClass('title');
    self.edit_note(attributes.id, { title: false });
  });

  close_button.on('click', function() {
    //clicks also trigger another event handler in stickies.core that calls _destroy()
    //var id = parseInt($(event.target).parent().parent().attr('id').match(/note-(\d+)/)[1]);
    self.remove_note(attributes.id);
  });

  text_area.on('keyup', _.debounce(function(event) {
    self.edit_note(attributes.id, { text: event.target.value });
  }, 1000));

  note.on('dragstop', function(event) {
    self.edit_note(attributes.id, { top: $(event.target).css('top'), left: $(event.target).css('left') });
  });

  note.on('resize', function(event) {
    text_area.css({
      'width': parseInt(header.css('width')) - 7,
      'height': note.outerHeight() - header.outerHeight() - 7
    });
  });

  note.on('resizestop', function(event) {
    self.edit_note(attributes.id, { width: $(event.target).css('width'), height: $(event.target).css('height') });
  });
};

NoteManager.prototype.add_note = function() {
  var self = this;
  var note = {
    id: self.id_counter++,
    text: '',
    title: false,
    top: window.innerHeight/2 + 'px',
    left: window.innerWidth/2 + 'px',
    width: '140px',
    height: '110px'
  };
  self.notes.push(note);
  self.build_note_in_dom(note);
  self.sync_remote();
};

NoteManager.prototype.remove_note = function(id) {
  var self = this;
  var note_index;
  self.notes = self.notes.filter(function(note) {
      return note.id !== id;
    });
  self.sync_remote();
};

NoteManager.prototype.edit_note = function(id, attributes) {
  var self = this;
  var note_index;
  $.each(self.notes, function(index, note) {
    if (note.id === id) {
      note_index = index;
      // TODO break
    }
  });
  for (var attr in attributes) {
    self.notes[note_index][attr] = attributes[attr];
  }
  self.sync_remote();
};

NoteManager.prototype.sync_remote = function() {
  var self = this;
  // logging every open image is too slow, so just log the count instead.
  $.ajax({
    type : "POST",
    url : api_root + "events/models/" + self.model_id + "/select/opennotes/count/" + self.notes.length
  });
  self.bookmarker.updateState({ "notes" : self.notes });
};

export default NoteManager;