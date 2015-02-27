define("slycat-parameter-image-note-manager", ["slycat-server-root"], function(server_root) {

  function NoteManager() {
    var self = this;
    self.notes = [];
    self.button = $("<button>Add Note</button>")
                    .prependTo($('#controls'))
                    .on('click', function() {
                      self.add_note();
                    });
  }

  NoteManager.prototype.add_note = function() {
    var self = this;
    var text_area = $('<textarea placeholder="Write a note..."></textarea>');
    $('.media-layer').append(text_area);
    text_area.stickies();
    self.notes.push({
      text: '',
    });
  };

  return NoteManager;
});
