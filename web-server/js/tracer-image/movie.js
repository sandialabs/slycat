/*
 Copyright 2013, Sandia Corporation. Under the terms of Contract
 DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
 rights in this software.
 */

function Movie(plot) {
  // a plot has access to the image set for the specific cell of the grid
  this.plot = plot;
  this.stopped = true;
  this.movie_ref = this.plot.plot_ref + " .movie";
  this.jq_movie = $(this.movie_ref);
  this.d3_movie = d3.select(this.movie_ref).selectAll("image");
  this.interval = 400;
  this.current_image = null;
  // TODO leverage bookmarker here for state of movie
  // start out of range and we increment when we ask for the next image
  this.current_image_index = -1;
  this.height = null;
  this.width = null;
  this.open_control = null; //handle to foreignObject so SVG can manipulate
}

Movie.prototype.build_movie = function() {
  var self = this;
  // TODO images for "image set"
  // TODO this may just work after LG fixes controls wrt image set??
  self.height = $(this.plot.grid_ref).attr("height");
  self.width = $(this.plot.grid_ref).attr("width");
  this.d3_movie = this.d3_movie
                      .data(this.plot.images.filter(function(d){return d.length > 0;}))
                      .enter().append("image")
                      .attr({width : self.width,
                             height : self.height,
                             "xlink:href" : function(d) {
                               return self.plot.image_url_for_session(d);
                             }
                            }
                           );
  self.build_close_button(d3.select(self.movie_ref));
};

Movie.prototype.build_open_button = function(container) {
  var self = this;
  self.open_control = container.append('foreignObject')
    .classed('open-movie', true) //need a class since d3 can't select foreignObject elements properly in Chrome
    .attr('width', 50) //TODO: make this sizing not be stupid
    .attr('height', 40);
  var open_body = self.open_control.append('xhtml:body')
    .style('background', 'transparent');;
  var open_button = open_body.append('button')
    .classed('play-movie', true)
    .on('click', function() {
      self.play();
    });
  open_button.append('img')
    .attr('src', '/style/play.png');
}

Movie.prototype.build_close_button = function(container) {
  var self = this;
  var close_button = container.append("g")
        .classed("close-movie", true);
  close_button.append("rect")
    .attr("x", 5)
    .attr("y", 5)
    .attr("width", 16)
    .attr("height", 16)
    .attr("rx", 2)
    .attr("ry", 2)
    .style("fill", "rgba(0%,0%,0%,0.2)")
    .on("click", function() {
      self.hide();
      self.stop();
    });
  close_button.append("path")
    .attr("d", "M" + (8) + " " + (8) + " l10 10 m0 -10 l-10 10")
    .style("stroke", "rgba(100%,100%,100%, 0.8)")
    .style("stroke-width", 3)
    .style("pointer-events", "none");
};

Movie.prototype.show = function() {
  var self = this;
  $(self.plot.plot_ref + ' .scatterplot').hide();
  self.resize();
};

Movie.prototype.resize = function() {
  self.width = $(this.plot.plot_ref + " .scatterplot-pane").width();
  self.height = 375; // TODO $(this.plot.plot_ref + " .scatterplot-pane").height());
  $(this.jq_movie).css("width", self.width);
  $(this.jq_movie).css("height", self.height);
};

// when the movie is over (reached end of loop), repeat by calling loop again
Movie.prototype.check_for_loop_end = function(transition, d3_obj, callback) {
  var n = 0;
  transition
    .each(function() {++n;})
    .each("end", function() {if(!--n) callback.apply(d3_obj, arguments);});
};

Movie.prototype.loop = function() {
  var self = this;
  this.stopped = false;
  // see http://stackoverflow.com/questions/23875661/looping-through-a-set-of-images-using-d3js
  // and see my jsfiddel related to this - http://jsfiddle.net/1270p51q/2/
  var indices_with_images = this.plot.images
      .map(function(d,i){return [d,i];})
      .filter(function(d){return d[0].length > 0;})
      .map(function(d){return d[1];});
  var update_selected_image = function(uri, index)
  {
    if(!self.stopped) {
      table.select_rows([indices_with_images[index]]);
    }
  };

  self.d3_movie.transition().attr("opacity",0);
  self.d3_movie.transition()
               .attr("opacity",1).each("start", update_selected_image)
               .delay(function(d,i){return i * self.interval;})
               .call(self.check_for_loop_end, self, self.loop)
};

Movie.prototype.play = function() {
  this.stopped = false;
  // TODO get ALL hostnames for the image set - assuming there can be more than one?
  // TODO set the hostname to something ... loop over all hostnames and get session cache for that hostname
  // TODO right now we just look at the first image

  if(!login.logged_into_host_for_file(this.plot.images[0])) {
    this.stop();
    var plot = $(this.plot.plot_ref + " .scatterplot");
    var images = plot.scatterplot("get_option", "images")
      .filter(function(image){ return image.length > 0; })
      .map(function(image, index)
      {
        return {index : image.index,
          uri : image.trim(),
          image_class : "open-image",
        }
      });
    login.show_prompt(images, this.play, this);
  } else {
    this.build_movie();
    this.show();
    this.loop();
    return true;
  }
};

Movie.prototype.stop = function() {
  this.stopped = true;
};

Movie.prototype.step = function() {

};

Movie.prototype.hide = function() {
  var self = this;
  //self.close_body.style('visibility', 'hidden');
  $(self.movie_ref).hide();
  $(self.plot.plot_ref + ' .scatterplot').show();
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
