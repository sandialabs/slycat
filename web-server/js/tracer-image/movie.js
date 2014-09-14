function Movie(plot) {
  // a plot has access to the image set for the specific cell of the grid
  this.plot = plot;
  this.movie_ref = this.plot.plot_ref + " .movie";
  this.jq_movie = $(this.movie_ref);
  this.d3_movie = d3.select(this.movie_ref).selectAll("img");
  this.hide();
  this.interval = 1000;
  this.show_interval = 2000; // length of time to show the image
  this.animation_interval = null;
  this.current_image = null;
  // TODO leverage bookmarker here for state of movie
  // start out of range and we increment when we ask for the next image
  this.current_image_index = -1;
}

Movie.prototype.build_movie = function() {
  // TODO images for "image set"
  // TODO this may just work after LG fixes controls wrt image set??
  this.d3_movie = this.d3_movie.data(this.plot.images).enter().append("img")
                               .attr("class","slide")
                               .attr("src", function(d){d})
                               .attr("opacity",0);
};

Movie.prototype.show = function() {
  this.resize();
};

Movie.prototype.resize = function() {
  $(this.jq_movie).css("width", $(this.plot.plot_ref + " .scatterplot-pane").width());
  $(this.jq_movie).css("height", 375);// TODO $(this.plot.plot_ref + " .scatterplot-pane").height());
};

Movie.prototype.hide = function() {
};

Movie.prototype.play = function() {
  console.debug("playing");
  var self = this;
  // TODO get ALL hostnames for the image set - assuming there can be more than one?
  // TODO set the hostname to something ... loop over all hostnames and get session cache for that hostname
  // TODO right now we just look at the first image
  if(!login.logged_into_host_for_file(this.plot.images[0])) {
    console.debug("stopping and showing login prompt");
    this.stop();
    console.debug("stopped it");
    login.show_prompt();
  } else {
    console.debug("already logged in");
    this.build_movie();
    this.show();
    this.d3_movie.transition().duration(this.interval)
                 .delay(function(d,i){return i * this.show_interval;})
                 .attr("opacity",1);
    console.debug("playing2");
  }
};

Movie.prototype.stop = function() {

};

Movie.prototype.step = function() {

};

Movie.prototype.next_image = function() {
  this.increment_current_image_index();
  if(this.plot.images) {
    this.current_image = this.plot.images[this.current_image_index];
  }
  return this.current_image;
};

Movie.prototype.increment_current_image_index = function() {
  // TODO consider direction of play when we get there
  if(this.plot.images && this.current_image_index >= this.plot.images.length) {
    this.current_image_index = 0;
  }
  this.current_image_index = this.current_image_index + 1; 
};
