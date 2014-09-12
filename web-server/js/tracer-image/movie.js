function Movie(plot) {
  // a plot has access to the image set for the specific cell of the grid
  this.plot = plot;
  this.jq_movie = $(this.plot.plot_ref + " .movie");
  this.jq_movie_img = $(this.plot.plot_ref + " .movie img");
  this.hide();
  this.interval = 3;
  this.animation_interval = null;
  this.current_image = null;
  // TODO leverage bookmarker here for state of movie
  // start out of range and we increment when we ask for the next image
  this.current_image_index = -1;
}

Movie.prototype.show = function() {
  this.resize();
  this.jq_movie.show();
};

Movie.prototype.resize = function() {
  $(this.jq_movie).css("width", $(this.plot.plot_ref + " .scatterplot-pane").width());
  $(this.jq_movie).css("height", 375);//$(this.plot.plot_ref + " .scatterplot-pane").height());
};

Movie.prototype.hide = function() {
  this.plot.show();
  this.jq_movie.hide();
};

Movie.prototype.play = function() {
  var self = this;
  this.show();
  // set the starting image - first image in the sequence
  $(this.jq_movie_img).attr('src', this.next_image());
  // set an interval to run through our images and "play" them 
  this.animation_interval = setInterval(function() {
    $(self.jq_movie_img).attr('src', self.next_image());
  });
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
