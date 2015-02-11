define("slycat-note-display", ["slycat-web-client", "slycat-bookmark-manager", "slycat-dialog", "URI", "domReady!"], function(web_client, bookmark_manager, dialog, URI){
  var module = {};

  function NotePanel(parent, container, panel) {
    this.parent = parent;
    this.container = container;
    this.panel = panel;
    this.expanded = container.attr('aria-expanded');
    this.setOverflow = (function(s){
      return function(elem){
        if(elem.find('div').toArray().reduce(function(acc, x){return acc + $(x).outerHeight();}, 0) > elem.height()){
          elem.attr('style', elem.attr('style') + " overflow-y: scroll;");
          s.setOverflow = function(){};
        }
      }
    })(this);
    this.panel.find('#note-pane').children().hide();
    panel.find('#note-pane').on('shown.bs.collapse', (function(this_arg){return function(){ this_arg.onExpand.call(this_arg); };})(this));
    panel.find('#note-pane').on('hidden.bs.collapse', (function(this_arg){return function(){ this_arg.onCollapse.call(this_arg); };})(this));
    panel.find('#note-pane').on('hide.bs.collapse', (function(this_arg){return function(){ this_arg.panel.find('#note-pane').children().hide(); };})(this));
  };

  NotePanel.prototype.show = function(){
    this.panel.show();
  }

  // Add a note to the panel:
  NotePanel.prototype.addNote = function(note_contents, callback){
    var note_element = $('<div>').append($('<p>').attr({style: 'overflow-wrap: break-word;'}).text(note_contents));
    this.container.find('.panel-body').append(note_element);
    this.setOverflow(this.container.find('.panel-body'));
    (callback || function(){})(note_element, note_contents);
  };

  // Add a linked note to the panel:
  NotePanel.prototype.addLinkedNote = function(link, note, callback){
    var note_element = $('<div>').append($('<a>').attr({href: link, style: 'overflow-wrap: break-word;'}).text(' ' + note)).append($("<hr>"))
    this.container.find('.panel-body').append(note_element);
    this.setOverflow(this.container.find('.panel-body'));
    (callback || function(){})(note_element, link, note)
  };

  NotePanel.prototype.onExpand = function(){
    this.panel.find('#note-pane').children().show();
    this.setOverflow(this.container.find('.panel-body'));
    this.expanded = !this.expanded;
    this.panel.find('#link-wrapper p:contains(<)').text('>');
  };


  NotePanel.prototype.onCollapse = function(){
    this.expanded = !this.expanded;
    this.panel.find('#link-wrapper p:contains(>)').text('<');
  };

  // Attach panel_class to the selector. In this case, we always use NotePanel.
  // The closure ensures we don't gc the class definition
  module.attach = (function(panel_class){
    return function(selector){ 
      var parent_object = $(selector);
      var input_group = $('<div>').attr({style: 'float: right; bottom: 0px; width: 100%; position: absolute;'}).append(
        $('<input>').attr({style: 'width: 75%;'})).append(
        $('<button>').addClass('btn btn-xs btn-success').text('Save'));
      var note_container = $('<div>').attr({id: 'note-pane', "aria-expanded": false, style: 'left: 40px;', role: 'tabpanel'}).addClass('panel-collapse fill-parent-height collapse').append(
        $('<div>').addClass('panel-body fill-parent-height').attr({style: 'min-width: 300px;'}).append(input_group));

      var note_panel = 
      $(selector).append(
        $('<div>').attr({id: 'note-panel', style: 'position: absolute; top: 0px; right: 0px; max-width: 20%;'}).addClass('panel affix-top-right fill-parent-height').append(
          $('<div>').attr({role: 'tab'}).addClass('fill-parent-height').append(
            $('<div>').attr({id: 'note-content-wrapper', style: 'clear: none;'}).addClass('fill-parent-height').append(
              $('<div>').attr({id: "link-wrapper", "data-toggle": 'collapse', style: "border-right: 2px solid rgb(231,231,231); width: 11px; float: left;", href: '#note-pane'}).addClass('link-cursor fill-parent-height').append(
                $('<div>').attr({style: "position: absolute; top: 50%;"}).append(
                  $('<p>').attr({style: 'cursor: inherit;'}).text('<')))).append(
              note_container))));

      var result = new panel_class(parent_object, note_container, note_panel);

      var current_notes = web_client.get_project_references({pid: model.project, success: function(refs){
        refs.filter(function(ref){ return ref.mid == model._id; }).forEach(
          function(ref){
            this.addLinkedNote(URI(window.location).setQuery({rid: ref._id, bid: ref.bid}), ref.name);
          }, result)
      }});

      var save_bookmark = (function(panel){
        return function(){
          var text_box = $(note_panel).find('input').prop('disabled', true);
          panel.addNote(text_box.val(), function(elem, note){
            web_client.post_project_references({
              pid: model.project,
              mid: model._id,
              bid: bookmark_manager.current_bid(),
              name: note,
              success: function(rid){
                var current_location = URI(window.location).removeQuery("rid").addQuery("rid", rid)
                result.addLinkedNote(current_location, note, function(new_elem){
                  elem.remove();
                  new_elem.scrollintoview();
                });
                window.history.replaceState(null, null, current_location.toString());
                text_box.prop('disabled', false);
              },
              error: function(request, status, reason_phrase){
                dialog.dialog();
              }
            });
          });
          text_box.val('');
        };
      })(result);

      //Allow the user to add notes by clicking save or pressing enter:
      input_group.find('button').on('click', save_bookmark);
      input_group.find('input').on('keypress', 
        function(e){
          if(e.keyCode == 13){
            save_bookmark();
          }
        });

      return result;
    }
  })(NotePanel);

  return module;
});
