define("NoteAccordion", ["domReady!"], function(){
  module = {};

  var NoteAccordion = function(pane, triggers){
    var expandedWidth = 400;
    var expanded = false;
    this.toggleExpansion = function(){
      expanded = !expanded;
      $(this).animate({width: expanded ? "0px" : expandedWidth}, 250);
    }

    this.addNote = function(text){
    }

    triggers.delegate(pane, "click", toggleExpansion);
  }

  module.create = function(pane, triggers){
  }
});
