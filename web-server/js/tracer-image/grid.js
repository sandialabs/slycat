$(document).ready(function() {
});
function setup_grid() {
  if(!grid_ready) {
    grid_ready = true;
    $("#grid-pane .load-status").css("display", "none");
    $("#grid").grid({
      width: $("#grid-pane").width(),
      height: $("#grid-pane").height(),
      size: [2,2],
      x: x,
      y: y
    });
  }
}
