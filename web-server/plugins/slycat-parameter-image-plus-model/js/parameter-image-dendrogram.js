/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  retains certain rights in this software. */

///////////////////////////////////////////////////////////////////////////////////////////
// HTML5 DOM dendrogram control, for use with the parameter-image model.

import server_root from "js/slycat-server-root";
import d3 from "js/d3.min";
import * as remotes from "js/slycat-remotes-webpack";
import URI from "urijs";

$.widget("parameter_image.dendrogram",
{
  options:
  {
    clusters:[],
    cluster: 0,
    cluster_data:null,
    collapsed_nodes:null,
    expanded_nodes:null,
    selected_nodes:null,
    color_array: null,
    colorscale: null,
    data_table_index_array: null,
    dendrogram_sort_order: true,
    highlight: [],
    hidden_simulations: [],
    images : [],
    square_size : 8,
    square_border_size : 1,
    selected_square_size : 16,
    selected_square_border_size : 2,
    hover_timeout : 1000,
    image_cache : {},
    cache_references : [ {} ],
    // image_cache needs to be shared between dendrogram and scatterplot, thus it is passed inside an array to keep it in sync.
    // http://api.jqueryui.com/jquery.widget/
    // All options passed on init are deep-copied to ensure the objects can be modified later without affecting the widget. 
    // Arrays are the only exception, they are referenced as-is. 
    // This exception is in place to support data-binding, where the data source has to be kept as a reference.
    login_dialog : null,
  },

  _create: function()
  {
    var self = this;

    this.remotes = remotes.create_pool();
    self.login_open = false;

    self.options.image_cache = self.options.cache_references[0];

    self.preview = $("<div id='image-preview'>")
      .on("mouseover", function(){
        self._clear_hover_timer();
      })
      .on("mouseout", function(d) {
        self._close_preview();
      })
      .on("click", function(d) {
        self._close_preview(true);
      })
      .appendTo( $("#scatterplot-pane") )
      ;

    self.preview_image = $("<img id='image-preview-image' />")
      .appendTo(self.preview)
      ;

    this._set_cluster();
  },

  _set_cluster: function()
  {
    var self = this;
    self.container = d3.select("#dendrogram-viewer");

    var cluster_data = this.options.cluster_data;
    var collapsed_nodes = this.options.collapsed_nodes;
    var expanded_nodes = this.options.expanded_nodes;
    var selected_nodes = this.options.selected_nodes;

    var linkage = cluster_data["linkage"];
    var input_indices = cluster_data["input-indices"];
    var exemplars = cluster_data["exemplars"];
    var subtrees = [];

    for(var i=0; i<input_indices.length; i++){
      subtrees.push({"node-index":subtrees.length, leaves:1, exemplar:exemplars[i], selected: false, "image-index" : i, "data-table-index" : input_indices[i]});
    }
    for(var i=0; i<linkage.length; i++){
      subtrees.push({"node-index":subtrees.length, children:[subtrees[linkage[i][0]], subtrees[linkage[i][1]]], leaves:linkage[i][3], exemplar:exemplars[i + input_indices.length], selected: false, "image-index" : null, "data-table-index" : null});
    }

    var padding = 20;
    var diagram_width = this.element.parent().width() - padding - padding - 30;
    var diagram_height = this.element.parent().height() - padding - padding;

    var layout = d3.layout.cluster()
      .size([diagram_height, diagram_width]) // Width and height are transposed here because the layout defaults top-to-buttom.
      .separation(function() { return 1; })
      ;

    self.container.selectAll("g").remove();

    self.sortControl = $('<div id="dendrogram-sort-control"></div>')
      .appendTo('#dendrogram-pane')
      .click(function() {
        if(!$(this).hasClass("selected")){
          self.options.dendrogram_sort_order = true;
          self._set_dendrogram_sort_order_state();
          self.element.trigger("sort-by-dendrogram-order");
        }
      })
      ;
    this._set_dendrogram_sort_order_state();

    var vis = self.container.append("svg:g")
      .attr("transform", "translate(" + padding + "," + padding + ")")
      ;

    var root = subtrees[subtrees.length - 1];
    self.root = root;
    root.x0 = diagram_height / 2;
    root.y0 = 0;

    // Compute the layout once for the entire tree so we can capture the max depth ...
    var nodes = layout.nodes(root).reverse();
    var max_depth = -1;
    nodes.forEach(function(d) { max_depth = Math.max(max_depth, d.depth); });

    // We have collapse/expand/selected node data. Let's go ahead and apply it.
    if( (collapsed_nodes!=null) || (expanded_nodes!=null) || (selected_nodes!=null) )
    {
      nodes.forEach(function(d) { 
        if(selected_nodes != null && selected_nodes.length>0) {
          if( selected_nodes.indexOf(d["node-index"]) > -1 ) {
            d.selected = true;
          }
        }
        if( collapsed_nodes && (collapsed_nodes.indexOf(d["node-index"]) > -1) && d.children ) {
          toggle(d);
        }
        else if ( expanded_nodes && (expanded_nodes.indexOf(d["node-index"]) > -1) && d._children ) {
          toggle(d);
        }
      });
    }
    // We have no data on expanded / collapsed nodes. Let's go ahead and just show the top four levels.
    if( (expanded_nodes==null) && (collapsed_nodes==null) ) 
    {
      // Start showing the top four levels of the tree ...
      nodes.forEach(function(d, index) { 
        if(d.depth == 3) 
        {
          toggle(d);
        }
      });
    }
    // We have no selected node data. Let's select the root node.
    if(selected_nodes == null)
    {
      select_node(self, root, true);
    } 
    else 
    {
      // We had selected node data, so let's style them and trigger the node-selection-changed event
      self._style_selected_nodes();
      self._color_links();
      // Find all selected nodes
      var selection = [];
      find_selected_nodes(root, selection);
      self.element.trigger("node-selection-changed", {node:null, skip_bookmarking:true, selection:selection});
    }

    // Initial update for the diagram ...
    update_subtree(root, true);

    // Helper function that draws dendrogram links with right-angles.
    function path(d, i)
    {
      if(d.target._children) {
        return "M" + d.source.y + "," + d.source.x + "V" + d.target.x + "H" + (diagram_width);
      }
      return "M" + d.source.y + "," + d.source.x + "V" + d.target.x + "H" + d.target.y;
    }

    function find_selected_nodes(d, selection)
    {
      if(d.selected)
        selection.push({"node-index" : d["node-index"], "image-index" : d["image-index"], "data-table-index" : d["data-table-index"]});
      if(d.children)
        for(var i=0; i<d.children.length; i++)
          find_selected_nodes(d.children[i], selection);
      if(d._children)
        for(var i=0; i<d._children.length; i++)
          find_selected_nodes(d._children[i], selection);
    }

    // Keeping track of already selected nodes becomes too complicated with multi selection
    //var last_selected_node = null;
    function select_node(context, d, skip_bookmarking)
    {
      // Keeping track of already selected nodes becomes too complicated with multi selection
      // if(last_selected_node === d)
      //   return;
      // last_selected_node = d;

      function select_subtree(d)
      {
        d.selected = true;
        if(d.children)
          for(var i=0; i<d.children.length; i++)
            select_subtree(d.children[i]);
        if(d._children)
          for(var i=0; i<d._children.length; i++)
            select_subtree(d._children[i]);
      }

      // Mark this node and all its children as selected
      select_subtree(d);

      // Sets the "selected" class on all selected nodes, thus coloring the circles in blue
      context._style_selected_nodes();

      // Colors the lines between the nodes to show what's selected
      context._color_links();

      // Find all selected nodes
      var selection = [];
      find_selected_nodes(root, selection);
      context.options.selected_nodes = context._getNodeIndexes(selection);
      
      context.element.trigger("node-selection-changed", {node:d, skip_bookmarking:skip_bookmarking, selection:selection});
    }

    function unselect_node(context, d, skip_bookmarking)
    {
      function unselect_subtree(d)
      {
        d.selected = false;
        if(d.children)
          for(var i=0; i<d.children.length; i++)
            unselect_subtree(d.children[i]);
        if(d._children)
          for(var i=0; i<d._children.length; i++)
            unselect_subtree(d._children[i]);
      }

      // Mark this node and all its children as unselected
      unselect_subtree(d);

      // Prunes selected nodes that have been orphaned
      prune_tree(root);

      // Sets the "selected" class on all selected nodes, thus coloring the circles in blue
      context._style_selected_nodes();

      // Colors the lines between the nodes to show what's selected
      context._color_links();

      // Find all selected nodes
      var selection = [];
      find_selected_nodes(root, selection);
      context.options.selected_nodes = context._getNodeIndexes(selection);

      context.element.trigger("node-selection-changed", {node:d, skip_bookmarking:skip_bookmarking, selection:selection});
    }

    function prune_tree(d){
      if(d.children || d._children) {
        // This is a branch node
        if(!d.selected){
          // Branch node is unselected, so just process its children
          if(d.children)
            $.each(d.children,  function(index, subtree) { prune_tree(subtree); })
          if(d._children)
            $.each(d._children, function(index, subtree) { prune_tree(subtree); })
          return false;
        }
        else {
          //Branch node is selected, so process its children and set its selected state accordingly
          var selected_state = false;
          var child_selected_state = false;
          if(d.children)
            $.each(d.children,  function(index, subtree) { 
              child_selected_state = prune_tree(subtree);
              selected_state = selected_state || child_selected_state; 
            })
          if(d._children)
            $.each(d._children, function(index, subtree) { 
              child_selected_state = prune_tree(subtree);
              selected_state = selected_state || child_selected_state; 
            })
          d.selected = selected_state;
          return selected_state;
        }
      }
      else {
        // This is a leaf node
        if(d.selected)
          return true;
        else
          return false;
      }
    }

    function update_subtree(source, skip_bookmarking)
    {
      var duration = d3.event && d3.event.altKey ? 5000 : 500;

      // Compute the new layout.
      var nodes = layout.nodes(root).reverse();

      // Normalize for fixed-depth.
      nodes.forEach(function(d) { if(d.children || d._children) d.y = d.depth * (diagram_width / max_depth); });

      // Update the nodes.
      var node = vis.selectAll("g.node")
        .data(nodes, function(d) { return d["node-index"]; })
        ;

      // Expand all child nodes up to a certain level, collapse all child when level is rached
      function expandUpToLevel(d, level) {
        if(d.children) {
          for(var i = 0; i < d.children.length; i++) {
            // If this child is at the correct depth and it is expanded, we collapse it
            if(d.children[i].depth == level && d.children[i].children) {
              toggle(d.children[i]);
            } 
            // If this child is above the correct depth and it is collapsed, we expand it and process its children
            else if(d.children[i].depth < level && d.children[i]._children) {
              toggle(d.children[i]);
              expandUpToLevel(d.children[i], level);
            }
            // If this child is above the correct depth and it is expanded, we just process its children
            else if(d.children[i].depth < level && d.children[i].children) {
              expandUpToLevel(d.children[i], level);
            }
          }
        } 
        // If d has no children, we do nothing
        else {
          return;
        }
      }

      // Create new nodes at the parent's previous position.
      var node_enter = node.enter().append("svg:g")
        .attr("class", "node")
        .classed("selected", function(d) { return d.selected; })
        .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
        .style("opacity", 1e-6)
        ;

      // Triangle
      var node_subtree = node_enter.append("svg:g")
        .attr("class", "subtree")
        .style("opacity", 1e-6)
        .style("display", function(d) { return d.leaves > 1 ? "inline" : "none"; })
        .on("click", function(d) {
          self._close_preview(true);
          toggle(d); 
          // Change expandThisFar to however deep below the target node you want to expand
          var expandThisFar = 9999;
          expandUpToLevel(d, d.depth + expandThisFar);
          update_subtree(d);
        })
        ;

      node_subtree.append("svg:path")
        .attr("class", "subtree-glyph")
        .attr("title", "Expand all")
        .attr("alt", "Expand all")
        .attr("d", "M 0 0 L 40 -13 L 40 13 Z")
        .style("fill", "url(#subtree-gradient)")
        ;

      // Due to a bug in Firefox, we cannot use css to change the fill style on path.subtree-glyph from above.
      // Instead we'll use css to display and hide this path.filled-glyph
      node_subtree.append("svg:path")
        .attr("class", "filled-glyph")
        .attr("title", "Expand all")
        .attr("alt", "Expand all")
        .attr("d", "M 0 0 L 40 -13 L 40 13 Z")
        .style("fill", "#7767b0")
        ;

      node_subtree.append("svg:text")
        .attr("x", 28)
        .attr("dy", ".4em")
        .attr("text-anchor", "middle")
        .attr("title", "Expand all")
        .attr("alt", "Expand all")
        .text(function(d) { return d.leaves; })
        ;

      node_subtree.append("svg:text")
        .attr("x", -9)
        .attr("dy", -5)
        .attr("text-anchor", "middle")
        .text("+")
        .style("fill", "black")
        .on("click", function(d) {
          self._close_preview(true);
          toggle(d);
          // Change expandThisFar to however deep below the target node you want to expand
          var expandThisFar = 2;
          expandUpToLevel(d, d.depth + expandThisFar);
          update_subtree(d);
          d3.event.stopPropagation();
        })
        ;

      // Circle
      var node_glyph = node_enter.append("svg:g")
        .attr("class", "glyph")
        .on("click", function(d) {
          self._close_preview(true);
          if(d3.event.ctrlKey || d3.event.metaKey) {
            if(d.selected) {
              unselect_node(self, d);
            } else {
              select_node(self, d);
            }
          } else {
            // Clear previous selection if user didn't Ctrl+click
            $.each(subtrees, function(index, subtree) { subtree.selected = false; });
            select_node(self, d);
          }
        })
        ;

      node_glyph.append("svg:circle")
        .attr("r", 4.5)
        .style("cursor", "pointer")
        .style("fill", function(d) { return d.children || d._children ? "#dbd9eb" : "white"; })
        ;

      node_glyph.append("svg:text")
        .attr("x", -9)
        .attr("dy", 13)
        .attr("text-anchor", "middle")
        .text("–")
        .style("fill", "black")
        .style("display", function(d) { return d._children || (!d.children && !d._children) ? "none" : "inline"; })
        .on("click", function(d) {
          self._close_preview(true);
          toggle(d);
          update_subtree(d);
          d3.event.stopPropagation();
        })
        ;

      // Square
      var vertical_lift = - (self.options.square_size / 2) - self.options.square_border_size ;
      var selected_vertical_lift = - (self.options.selected_square_size / 2) - self.options.selected_square_border_size;
      var trans_endpoint = "translate(25, 0)";
      var trans_notendpoint = "translate(65, 0)";

      var node_square = node_enter.append("svg:g")
        .attr("class", "square")
        .attr("transform", function(d) { return d.leaves > 1 ? trans_notendpoint : trans_endpoint; }) // Move to the right according to whether it's an endpoint
        .style("opacity", 1e-6)
        .style("display", "none")
        ;

      var node_square_rect = node_square.append("svg:rect")
        .style("stroke", "black")
        .style("fill", function(d, i){
          if(self.options.colorscale !== null && self.options.color_array != null){
            var index = d["data-table-index"];
            if(index != null) {
              var value = self.options.color_array[index];
              if(value != null)
                return self.options.colorscale(value);
              else
                return $("#color-switcher").colorswitcher("get_null_color");
            }
            else
              return "black";
          } else {
            return "black";
          }
        })
        .classed("nullValue", function(d, i){
          if (d["data-table-index"] == null || (d["data-table-index"] != null && self.options.color_array[d["data-table-index"]] !== null))
            return false;
          else
            return true;
        })
        .on("click", function(d){
          self._close_preview(true);
          self._handle_highlight(d, d3.event, this);
        })
        ;

      self._set_highlight();

      // Transition new nodes to their final position.
      var node_update = node.transition()
        .duration(duration)
        .attr("transform", function(d) { 
          return "translate(" + (d._children ? (diagram_width - 39) : d.y + 1) + "," + d.x + ")"; // Draws extended horizontal lines for collapsed nodes
        })
        .style("opacity", 1.0)
        ;

      node.classed("leaf", function(d) { return d._children || (!d.children && !d._children); });
      node.filter(".leaf")
        .on("mouseover", function(d) {
          self._open_preview(d);
        })
        .on("mouseout", function(d) {
          self._close_preview();
        })
        ;

      node_update.select(".subtree")
        .style("opacity", function(d) { return d._children ? 1.0 : 1e-6; })
        .style("display", function(d) { return d._children ? "inline" : "none"; })
        ;

      // Need to re-assign fill style to get around this firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=652991
      // It only seems to affect fill gradients and only when the URI changes, like it does for us with bookmarking.
      node_update.select(".subtree-glyph")
        .style("fill", "url(#subtree-gradient)")
        ;

      node_update.select(".square")
        .style("opacity", function(d) { return d._children || (!d.children && !d._children) ? 1.0 : 1e-6; })
        .each("end", function() { d3.select(this).style("display", function(d) { return d._children || (!d.children && !d._children) ? "inline" : "none"; }); })
        ;

      node_update.select(".glyph text")
        .style("display", function(d) { return d._children || (!d.children && !d._children) ? "none" : "inline"; })
        ;
      
      // Transition exiting nodes to the parent's new position.
      var node_exit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
        .style("opacity", 1e-6)
        .remove()
        ;

      node_exit.select(".square")
        .each("start", function() { d3.select(this).style("display", "none"); })
        ;
      
      // Update the links.
      var link = vis.selectAll("path.link")
        .data(layout.links(nodes), function(d) { return d.target["node-index"]; });

      // Enter any new links at the parent's previous position.
      link.enter().insert("svg:path", "g")
        .attr("class", "link")
        .attr("d", function(d)
        {
          var o = {x: source.x0, y: source.y0};
          return path({source: o, target: o});
        })
      .transition()
        .duration(duration)
        .attr("d", path);

      // Transition new links to their new position.
      link.transition()
        .duration(duration)
        .attr("d", path);

      // Transition exiting links to the parent's new position.
      link.exit().transition()
        .duration(duration)
        .attr("d", function(d)
        {
          var o = {x: source.x, y: source.y};
          return path({source: o, target: o});
        })
        .remove()
        ;

      self._color_links();

      // Stash the old positions for transition.
      nodes.forEach(function(d)
      {
        d.x0 = d.x;
        d.y0 = d.y;
      });

      // Bookmark expanded and collapsed nodes
      if(!skip_bookmarking){
        var expanded = [];
        var collapsed = [];
        function findExpandedAndCollapsedNodes(d){
          // If this node is expanded, add its node-index to the expanded array
          if(d.children) {
            expanded.push(d["node-index"]);
            // Recursively call this function for each child to capture any collapsed and expanded ones
            for(var i = 0; i < d.children.length; i++) {
              findExpandedAndCollapsedNodes(d.children[i]);
            }
          }
          // Otherwise if this node is collapsed, add its node-index to the collapsed array
          else if(d._children) {
            collapsed.push(d["node-index"]);
          }
        }
        findExpandedAndCollapsedNodes(root);
        self.options.expanded_nodes = expanded;
        self.options.collapsed_nodes = collapsed;
        self.element.trigger("expanded-collapsed-nodes-changed", {expanded:expanded, collapsed:collapsed});
      }
    }

    // Toggle children.
    function toggle(d)
    {
      if(d.children)
      {
        d._children = d.children;
        d.children = null;
      }
      else
      {
        d.children = d._children;
        d._children = null;
      }

      self.element.trigger("node-toggled", d);
    }
  },

  _clear_hover_timer: function()
  {
    var self = this;
    if(self.hover_timer)
    {
      window.clearTimeout(self.hover_timer);
      self.hover_timer = null;
    }
  },

  _open_preview: function(image)
  {
    var self = this;

    // Do nothing if we don't have an exemplar to show
    if(image.exemplar == undefined)
    {
      return;
    }

    self._clear_hover_timer();

    var image_uri = self.options.images[image.exemplar];

    // Open new preview only if we are not showing it already
    if(self.target_image != image_uri)
    {
      self.target_image = image_uri;
      self.preview_image.hide();
      self.preview.show();
      self._display_image(image_uri);
    }

  },

  _display_image: function(image_uri)
  {
    var self = this;

    // If the image is in the cache, display it
    if(image_uri in self.options.image_cache)
    {
      var url_creator = window.URL || window.webkitURL;
      var image_url = url_creator.createObjectURL(self.options.image_cache[image_uri]);
      self.preview_image.attr('src', image_url);
      self.preview_image.show();
      return;
    }

    if(!self.login_open)
    {
      self.login_open = true;
      var uri = URI(image_uri);
      self.remotes.get_remote({
        hostname: uri.hostname(),
        title: "Login to " + uri.hostname(),
        message: "Loading " + uri.pathname(),
        cancel: function() {
          self.login_open = false;
        },
        success: function(hostname) {
          var xhr = new XMLHttpRequest();
          var api = "/file";

          // xhr.image = image;
          //Double encode to avoid cherrypy's auto unencode in the controller
          xhr.open("GET", server_root + "remotes/" + hostname + api + uri.pathname(), true);
          xhr.responseType = "arraybuffer";
          xhr.onload = function(e) {
            // If we get 404, the remote session no longer exists because it timed-out.
            // If we get 500, there was an internal error communicating to the remote host.
            // Either way, delete the cached session and create a new one.
            if(this.status == 404 || this.status == 500) {
              self.remotes.delete_remote(uri.hostname());
              self._open_images(images);
              return;
            }
            // If we get 400, it means that the session is good and we're
            // communicating with the remote host, but something else went wrong
            // (probably file permissions issues).
            if(this.status == 400) {
              console.log(this);
              console.log(this.getAllResponseHeaders());
              var message = this.getResponseHeader("slycat-message");
              var hint = this.getResponseHeader("slycat-hint");

              if(message && hint)
              {
                window.alert(message + "\n\n" + hint);
              }
              else if(message)
              {
                window.alert(message);
              }
              else
              {
                window.alert("Error loading image " + this.image_uri + ": " + this.statusText);
              }
              return;
            } else {
              // We received the image, so put it in the cache and start-over.
              var array_buffer_view = new Uint8Array(this.response);
              var blob = new Blob([array_buffer_view], {type:this.getResponseHeader('content-type')});
              self.options.image_cache[image_uri] = blob;
              self._display_image(image_uri);
              return;
            }
          }

          xhr.send();
          self.login_open = false;
        },
      })
    }
  },

  _close_preview: function(immediate)
  {
    var self = this;

    if(immediate)
    {
      close_preview();
    }
    else
    {
      self.hover_timer = window.setTimeout( 
        function(){ 
          close_preview();
        }, 
        self.options.hover_timeout 
      );
    }

    function close_preview(){
      self.target_image = null;
      self.preview.hide();
      self.preview_image.hide();
    }

  },

  _set_color: function()
  {
    var self = this;

    this.container.selectAll("g.square rect")
      .style("fill", function(d, i){
        var index = d["data-table-index"];
        if(index != null) {
          var value = self.options.color_array[index];
          if(value != null)
            return self.options.colorscale(value);
          else
            return $("#color-switcher").colorswitcher("get_null_color");
        }
        else
          return "black";
      })
      .classed("nullValue", function(d, i){
        if (d["data-table-index"] == null || (d["data-table-index"] != null && self.options.color_array[d["data-table-index"]] !== null))
          return false;
        else
          return true;
      })
      ;
  },

  _set_highlight: function()
  {
    var self = this;

    var offset = - (self.options.square_size / 2) - (self.options.square_border_size  / 2);
    var selected_offset = - (self.options.selected_square_size / 2) - (self.options.selected_square_border_size / 2);
    var trans = "translate(" + offset + ", " + offset + ")";
    var trans_selected = "translate(" + selected_offset + ", " + selected_offset + ")";

    checkChildren(self.root);

    this.container.selectAll("g.square")
      .classed("highlight", function(d, i){
        if(d.highlight)
          return true;
        else
          return false;
      })
      ;

    this.container.selectAll("g.square rect")
      .attr("width", function(d){
        return d.highlight ? self.options.selected_square_size : self.options.square_size;
      })
      .attr("height", function(d){
        return d.highlight ? self.options.selected_square_size : self.options.square_size;
      })
      .style("stroke-width", function(d){
        return d.highlight ? self.options.selected_square_border_size : self.options.square_border_size;
      })
      .attr("transform", function(d) { 
        return d.highlight ? trans_selected : trans;  // Move up according to selected or not
      })
      ;

    // Checks if target or any of its children are highlighted
    function checkChildren(target){
      var highlight = false;
      if(target.children){
        for(var i=0; i<target.children.length; i++){
          if(checkChildren(target.children[i])){
            highlight = true;
          }
        }
        target.highlight = highlight;
      }
      else if(target._children){
        for(var i=0; i<target._children.length; i++){
          if(checkChildren(target._children[i])){
            highlight = true;
          }
        }
        target.highlight = highlight;
      }
      else if((target["data-table-index"] != null) && (self.options.highlight.indexOf(target["data-table-index"]) > -1)){
        target.highlight = true;
        highlight = true;
      }
      else {
        target.highlight = false;
        highlight = false;
      }
      return highlight;
    }
  },

  _handle_highlight: function(d, event, element)
  {
    var self = this;
    var data_table_indexes = getDataTableIndexesFromChildren(d);

    if(!event.ctrlKey && !d3.event.metaKey){
      self.options.highlight = data_table_indexes;
    }
    else {
      if(d.highlight){
        for(var i=0; i < data_table_indexes.length; i++){
          var index = self.options.highlight.indexOf(data_table_indexes[i]);
          if (index > -1) {
            self.options.highlight.splice(index, 1);
          }
        }
      }
      else {
        for(var i=0; i < data_table_indexes.length; i++){
          if(self.options.highlight.indexOf(data_table_indexes[i]) == -1)
            self.options.highlight.push(data_table_indexes[i]);
        }
      }
    }
    self._set_highlight();
    self.element.trigger("selection-changed", [self.options.highlight]);

    function getDataTableIndexesFromChildren(target){
      var data_table_indexes = [];
      if(target.children){
        for(var i=0; i<target.children.length; i++){
          if(target.children[i]["data-table-index"] != null)
            data_table_indexes.push(target.children[i]["data-table-index"]);
          else
            data_table_indexes = data_table_indexes.concat(getDataTableIndexesFromChildren(target.children[i]));
        }
      }
      else if(target._children){
        for(var i=0; i<target._children.length; i++){
          if(target._children[i]["data-table-index"] != null)
            data_table_indexes.push(target._children[i]["data-table-index"]);
          else
            data_table_indexes = data_table_indexes.concat(getDataTableIndexesFromChildren(target._children[i]));
        }
      }
      else if(target["data-table-index"] != null)
        data_table_indexes.push(target["data-table-index"]);

      return data_table_indexes;
    }
  },

  _set_dendrogram_sort_order_state: function()
  {
    var self = this;
    self.sortControl
      .attr("title", function(index, attr){return self.options.dendrogram_sort_order ? "Inputs are sorted in dendrogram order" : "Sort inputs in dendrogram order"})
      .toggleClass("selected", self.options.dendrogram_sort_order)
      ;
  },

  _set_hidden_simulations: function()
  {
    //console.log("setting hidden simulations in dendrogram");
    var self = this;

    var selection = [];
    
    update_selected_nodes(self.root, selection);
    
    self.options.selected_nodes = self._getNodeIndexes(selection);

    self._style_selected_nodes();
    self._color_links();

    self.element.trigger("node-selection-changed", {node:null, skip_bookmarking:false, selection:selection});

    function update_selected_nodes(d, selection)
    {
      var image_index = d["image-index"];
      if(image_index != null)
      {
        if(self.options.hidden_simulations.indexOf(image_index) > -1)
        {
          d.selected = false;
        }
        else
        {
          d.selected = true;
          selection.push({"node-index" : d["node-index"], "image-index" : d["image-index"], "data-table-index" : d["data-table-index"]});
        }
      }
      if(d.children)
        for(var i=0; i<d.children.length; i++)
          update_selected_nodes(d.children[i], selection);
      if(d._children)
        for(var i=0; i<d._children.length; i++)
          update_selected_nodes(d._children[i], selection);
    }
  },

  _style_selected_nodes: function()
  {
    var self = this;
    self.container.selectAll(".node")
      .classed("selected", function(d) { return d.selected; })
      ;


  },

  _color_links: function()
  {
    var self = this;
    self.container.selectAll("path.link").attr("style", function(d){
      if(checkChildren(d.target)){
        if(d.source.selected)
          return "stroke: black;"
        else
          return "stroke: #646464;"
      }
    });

    // Checks if target or any of its children are selected
    function checkChildren(target){
      if(target.selected)
        return true;
      else if(target.children){
        for(var i=0; i<target.children.length; i++){
          if(checkChildren(target.children[i]))
            return true
        }
      }
      else if(target._children){
        for(var i=0; i<target._children.length; i++){
          if(checkChildren(target._children[i]))
            return true
        }
      }
      return false;
    }
  },

  _getNodeIndexes: function(nodes)
  {
    var node_indexes = [];
    var node_index = null;

    for(var i=0; i<nodes.length; i++)
    {
      node_index = nodes[i]["node-index"];
      if(node_index != null)
        node_indexes.push(node_index);
    }

    return node_indexes;
  },

  resize_canvas: function()
  {
    this._set_cluster();
  },

  _setOption: function(key, value)
  {
    //console.log("timeseries.dendrogram._setOption()", key, value);
    this.options[key] = value;

    if(key == "cluster_data")
    {
      this._set_cluster();
    }
    else if(key == "color-options")
    {
      this.options.color_array = value.color_array;
      this.options.colorscale = value.colorscale;
      this._set_color();
    }
    else if(key == "colorscale")
    {
      this._set_color();
    }
    else if(key == "dendrogram_sort_order")
    {
      this._set_dendrogram_sort_order_state();
    }
    else if(key == "highlight")
    {
      if(value == undefined)
        this.options.highlight = [];
      this._set_highlight();
    }
    else if(key == "hidden_simulations")
    {
      this._set_hidden_simulations();
    }
    else if(key == "images")
    {
      // We don't need to do anything when images are updated, because they are always followed by cluster_data, which triggers a refresh
    }
  },
});