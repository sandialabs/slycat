define("slycat-note-display", ["domReady!"], function(){
  var module = {};

  function NotePanel(parent, container, panel) {
    this.parent = parent;
    this.container = container;
    this.panel = panel;
    this.expanded = container.attr('aria-expanded');

    /* var rotators = this.panel.find('.vertical').add(this.panel.find('.unvertical'));
    rotators.on('resize', function(){
      $(this).width($(this).parent().height())
      $(this).height($(this).parent().width())
    }); */

    panel.find('#link-wrapper').on('click', (function(this_arg){
      return function(){(this_arg.expanded ? this_arg.onExpand : this_arg.onCollapse).call(this_arg)};
    })(this));
  };

  NotePanel.prototype.show = function(){
    this.panel.show();
  }

  // Add a note to the panel:
  NotePanel.prototype.addNote = function(note_contents, callback){
    var note_element = $('<div>').append($('<p>').text(note_contents));
    this.container.find('.panel-body').append(note_element);
    (callback || function(){})(note_element, note_contents)
  };

  // Add a linked note to the panel:
  NotePanel.prototype.addLinkedNote = function(link, note, callback){
    var note_element = $('<div>').append($('<a>').text(link + ':')).append($('<p>').text(' ' + note))
    this.container.find('.panel-body').append(note_element);
    (callback || function(){})(note_element, link, note)
  };

  NotePanel.prototype.onExpand = function(){
    this.expanded = !this.expanded;
    this.panel.find('a:contains(<)').text('>');
  };


  NotePanel.prototype.onCollapse = function(){
    this.expanded = !this.expanded;
    this.panel.find('a:contains(>)').text('<');
  };

  // Attach panel_class to the selector. In this case, we always use NotePanel.
  // The closure ensures we don't gc the class definition
  module.attach = (function(panel_class){
    return function(selector){ 
      var parent_object = $(selector).hide();
      var note_container = $('<div>').attr({id: 'note-pane', "aria-expanded": false, style: 'left: 40px;', role: 'tabpanel'}).addClass('panel-collapse collapse').append(
        $('<div>').addClass('panel-body'));
      var note_panel = 
      $(selector).append(
        $('<div>').attr({id: 'note-panel', style: 'position: absolute; top: 0px; right: 0px; max-width: 20%; height: 100%'}).addClass('panel affix-top-right').append(
          $('<div>').attr({role: 'tab', style: 'height: 100%;'}).append(
            $('<div>').attr({id: 'note-content-wrapper', style: 'height: 100%;'}).append(
              $('<div>').attr({id: "link-wrapper", "data-toggle": 'collapse', style: "height: 100%; width: 11px; float: left;", href: '#note-pane'}).addClass('link-cursor').append(
                $('<div>').attr({style: "position: absolute; top: 50%;"}).append(
                  $('<a>').attr({style: 'cursor: inherit;'}).text('<')))).append(note_container))));

      return new panel_class(parent_object, note_container, note_panel);
    }
  })(NotePanel);

  return module;
});
