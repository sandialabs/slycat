/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

///////////////////////////////////////////////////////////////////////////////////////////
// HTML5 DOM dendrogram control, for use with the timeseries model.

$.widget("timeseries.dendrogram",
{
  options:
  {
  	"server-root" : "",
    mid : null,
  	clusters:[],
  	cluster: 0,
  	cluster_data:null,
  	collapsed_nodes:null,
  	expanded_nodes:null,
  	selected_node_index:null,
  },

  _create: function()
  {
    this._set_cluster();
  },

  _set_cluster: function()
  {
  	var self = this;
  	self.container = d3.select("#dendrogram-viewer");

  	var cluster_data = this.options.cluster_data;
  	var collapsed_nodes = this.options.collapsed_nodes;
  	var expanded_nodes = this.options.expanded_nodes;
  	var selected_node_index = this.options.selected_node_index;
  	var server_root = self.options["server-root"];
  	var mid = self.options.mid;

  	var linkage = cluster_data["linkage"];
	  var waveforms = cluster_data["waveforms"];
	  var exemplars = cluster_data["exemplars"];
	  var subtrees = [];

	  $.each(waveforms, function(index, waveform)
    {
      subtrees.push({"node-index":subtrees.length, leaves:1, exemplar:exemplars[index], selected: false, "waveform-index" : index, "data-table-index" : waveform["data-table-index"]});
    });
    $.each(linkage, function(index, link)
    {
      subtrees.push({"node-index":subtrees.length, children:[subtrees[link[0]], subtrees[link[1]]], leaves:link[3], exemplar:exemplars[index + waveforms.length], selected: false, "waveform-index" : null, "data-table-index" : null})
    });

    var padding = 20;
    var diagram_width = this.element.parent().width() - padding - padding - 110;
    var diagram_height = this.element.parent().height() - padding - padding;

    var layout = d3.layout.cluster()
	    .size([diagram_height, diagram_width]) // Width and height are transposed here because the layout defaults top-to-buttom.
	    .separation(function() { return 1; })
	    ;

	  self.container.selectAll("g").remove();

	  var vis = self.container.append("svg:g")
      .attr("transform", "translate(" + padding + "," + padding + ")")
      ;

    var root = subtrees[subtrees.length - 1];
    root.x0 = diagram_height / 2;
    root.y0 = 0;

    // Compute the layout once for the entire tree so we can capture the max depth ...
    var nodes = layout.nodes(root).reverse();
    var max_depth = -1;
    nodes.forEach(function(d) { max_depth = Math.max(max_depth, d.depth); });

    // We have collapse/expand/selected node data. Let's go ahead and apply it.
    if( (collapsed_nodes!=null) || (expanded_nodes!=null) || (selected_node_index!=null) ){
      nodes.forEach(function(d) { 
        if(selected_node_index != undefined) {
          if( d["node-index"] == selected_node_index ) {
            select_node(self, d, true);
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
    if( (expanded_nodes==null) && (collapsed_nodes==null) ) {
      // Start showing the top four levels of the tree ...
      nodes.forEach(function(d) { if(d.depth == 3) toggle(d); });
    }
    // We have no selected node data. Let's select the root node.
    if(selected_node_index == null){
      select_node(self, root, true);
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

		// Helper function that renders a waveform as a sparkline.
    function sparkline(d, i)
    {
      if(d.exemplar == undefined)
        return "";

      var waveform = waveforms[d.exemplar];
      var values = waveform["values"];
      var data = [];
      for(var i = 0; i != values.length; ++i)
        data.push(values[i]);

      var width = 100;
      var height = 15;
      var min = d3.min(data);
      var max = d3.max(data);
      var x = d3.scale.linear().domain([0, data.length - 1]).range([0, width]);
      var y = d3.scale.linear().domain([max, min]).range([-height, height]).nice();

      var path = d3.svg.line()
        .x(function(d,i) { return x(i); })
        .y(function(d) { return y(d); })
        ;

      return path(data);
      return "M 0 0 L 50 0 L 100 -5";
    }


		// TODO the last selected node needs to be tracked elsewhere
    var last_selected_node = null;
    function select_node(context, d, skip_bookmarking)
    {
      if(last_selected_node === d)
        return;
      last_selected_node = d;
      if(!skip_bookmarking)
        context.element.trigger("node-selection-changed", d);

      function select_subtree(d, selection)
      {
        selection.push({"node-index" : d["node-index"], "waveform-index" : d["waveform-index"], "data-table-index" : d["data-table-index"]});
        d.selected = true;
        if(d.children)
          $.each(d.children, function(index, subtree) { select_subtree(subtree, selection); });
        if(d._children)
          $.each(d._children, function(index, subtree) { select_subtree(subtree, selection); });
      }

      var selection = []
      $.each(subtrees, function(index, subtree) { subtree.selected = false; });
      select_subtree(d, selection);

      self.container.selectAll(".node")
        .classed("selected", function(d) { return d.selected; })
        ;

      color_links();

      // TODO this needs to be implemented outside of the widget
      // function make_selection_update(selection)
      // {
      //   return function()
      //   {
      //     update_table_filter(selection, cluster_name, cluster_index);
      //     waveform_viewer.set_visible(selection);
      //   }
      // }
      // window.setTimeout(make_selection_update(selection), 750);
    }

		function color_links(){
      self.container.selectAll("path.link").attr("style", function(d){
        if(d.source.selected) {
          return "stroke: black;";
        }
        else if(checkChildren(d.target)){
          return "stroke: gray;";
        }
      });

      // Checks if target or any of its children are selected
      function checkChildren(target){
        if(target.selected)
          return true;
        else if(!target.children)
          return false;
        else {
          for(var i=0; i<target.children.length; i++){
            if(checkChildren(target.children[i]))
              return true
          }
          return false;
        }
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
        .on("dblclick", function(d) { 
        	// TODO this needs to be done outside this widget
          //table_viewer_instance.setWaveformColorsPerSelectedColumn(true);
          // Toggle the target node (expand if collapsed, collapse if expanded)
          toggle(d);
          // If target node is now expanded, expand its children up to a certain depth
          if(d.children) {
            // Change expandThisFar to however deep below the target node you want to expand
            var expandThisFar = 2;
            expandUpToLevel(d, d.depth + expandThisFar);
          }
          update_subtree(d);
        })
        .on("click", function(d) {
          // Shift+click expands current node
          if(d3.event.shiftKey){
          	// TODO this needs to be done outside this widget
            //table_viewer_instance.setWaveformColorsPerSelectedColumn(true); 
            toggle(d); 
            update_subtree(d);
          } 
          // Regular click just selects it
          else {
            select_node(self, d);
          }
        })
        .style("opacity", 1e-6)
        ;

      // Triangle
      var node_subtree = node_enter.append("svg:g")
        .attr("class", "subtree")
        .style("opacity", 1e-6)
        .style("display", function(d) { return d.leaves > 1 ? "inline" : "none"; })
        ;

      node_subtree.append("svg:path")
        .attr("class", "subtree-glyph")
        .attr("d", "M 0 0 L 40 -13 L 40 13 Z")
        .style("fill", "url(#subtree-gradient)")
        ;

      node_subtree.append("svg:text")
        .attr("x", 28)
        .attr("dy", ".4em")
        .attr("text-anchor", "middle")
        .text(function(d) { return d.leaves; })
        ;

      // Circle
      var node_glyph = node_enter.append("svg:g")
        .attr("class", "glyph")
        ;

      node_glyph.append("svg:circle")
        .attr("r", 4.5)
        // All circles are clickable so all should use a pointer cursor
        //.style("cursor", function(d) { return d.children || d._children ? "pointer" : ""; })
        .style("cursor", "pointer")
        .style("fill", function(d) { return d.children || d._children ? "#dbd9eb" : "white"; })
        ;

      // Sparkline
      var node_sparkline = node_enter.append("svg:g")
        .attr("class", "sparkline")
        .attr("transform", function(d) { return d.leaves > 1 ? "translate(45, 0)" : "translate(10, 0)"; }) // Move sparkline to the right according to whether it's an endpoint
        .style("opacity", 1e-6)
        .style("display", "none")
        ;

      node_sparkline.append("svg:path")
        .attr("d", sparkline)
        ;

      // Transition new nodes to their final position.
      var node_update = node.transition()
        .duration(duration)
        .attr("transform", function(d) { 
          return "translate(" + (d._children ? (diagram_width - 35) : d.y) + "," + d.x + ")"; // Draws extended horizontal lines for collapsed nodes
        })
        .style("opacity", 1.0)
        ;

      node_update.select(".subtree")
        .style("opacity", function(d) { return d._children ? 1.0 : 1e-6; })
        .style("display", function(d) { return d._children ? "inline" : "none"; })
        ;

      node_update.select(".sparkline")
        .style("opacity", function(d) { return d._children || (!d.children && !d._children) ? 1.0 : 1e-6; })
        .each("end", function() { d3.select(this).style("display", function(d) { return d._children || (!d.children && !d._children) ? "inline" : "none"; }); })
        ;

      // Transition exiting nodes to the parent's new position.
      var node_exit = node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
        .style("opacity", 1e-6)
        .remove()
        ;

      node_exit.select(".sparkline")
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

      color_links();

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

    // Setup the default selected node ...
    //this.select_node(this.options.node);
  },

  _setOption: function(key, value)
  {
    console.log("timeseries.dendrogram._setOption()", key, value);
    this.options[key] = value;

    if(key == "cluster_data")
    {
      this._set_cluster();
    }
  }

});