/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

///////////////////////////////////////////////////////////////////////////////////////////
// HTML5 DOM barplot visualization, for use with the cca model.

$.widget("cca.barplot",
{
  options:
  {
    inputs:[],
    outputs:[],
    r2:[],
    wilks:[],
    x_loadings:[],
    y_loadings:[],
    component : null,
    variable : null,
    sort : [null, null],
  },

  _create: function ()
  {
    var self = this;

    function component_class(component)
    {
      return "cca" + (component + 1);
    }

    this.select_component = function(component)
    {
      d3.select(this.element.get(0)).selectAll(".selected-component")
        .classed("selected-component", false)
        ;

      d3.select(this.element.get(0)).selectAll("." + component_class(component))
        .classed("selected-component", true)
        ;

      d3.select(this.element.get(0)).selectAll("td.bar").filter(function() { return !d3.select(this).classed(component_class(component)); })
          .transition()
            .duration(500)
            .attr("width", 0)
        ;

      d3.select(this.element.get(0)).selectAll("td.bar").filter(function() { return !d3.select(this).classed(component_class(component)); })
        .selectAll("div")
          .transition()
            .duration(500)
            .style("width", "0px")
        ;

      d3.select(this.element.get(0)).selectAll("td.bar").filter(function() { return d3.select(this).classed(component_class(component)); })
          .transition()
            .duration(500)
            .attr("width", 100)
        ;

      function negative_bar_width(data, component)
      {
        return function(d, i)
        {
          var index = $(this).parent().parent().data("index");
          return data[component][index] < 0 ? -100 * data[component][index] + "px" : "0px";
        }
      }

      function positive_bar_width(data, component)
      {
        return function(d, i)
        {
          var index = $(this).parent().parent().data("index");
          return data[component][index] > 0 ? 100 * data[component][index] + "px" : "0px";
        }
      }

      d3.select(this.element.get(0)).selectAll("td.input.bar.negative." + component_class(component) + " div")
        .transition()
          .duration(500)
          .style("width", negative_bar_width(this.x_loadings, component))
        ;

      d3.select(this.element.get(0)).selectAll("td.input.bar.positive." + component_class(component) + " div")
        .transition()
          .duration(500)
          .style("width", positive_bar_width(this.x_loadings, component))
        ;

      d3.select(this.element.get(0)).selectAll("td.output.bar.negative." + component_class(component) + " div")
        .transition()
          .duration(500)
          .style("width", negative_bar_width(this.y_loadings, component))
        ;

      d3.select(this.element.get(0)).selectAll("td.output.bar.positive." + component_class(component) + " div")
        .transition()
          .duration(500)
          .style("width", positive_bar_width(this.y_loadings, component))
        ;
    }

    this.do_component_sort = function(component, sort_order)
    {
      var sort_icon = $("th." + component_class(component) + " .sortCCAComponent", self.element)

      $("span.sortCCAComponent", self.element).removeClass("icon-sort-descending icon-sort-ascending").addClass("icon-sort-off");
      $(sort_icon).removeClass("icon-sort-off").addClass("icon-sort-" + sort_order);


      $("tbody tr.input", self.element).sort(sortFunction).appendTo(self.element);
      $("tbody tr.output", self.element).sort(sortFunction).appendTo(self.element);

      self.element.trigger("component-sort-changed", [component, sort_order]);

      function sortFunction(a,b){
        var selector = "td.value:eq(" + component + ")";
        var value_a = $(selector, a).text();
        var value_b = $(selector, b).text();
        var aa = parseFloat(value_a.replace(/[^0-9.-]/g,''));
        if (isNaN(aa)) aa = 0;
        var bb = parseFloat(value_b.replace(/[^0-9.-]/g,''));
        if (isNaN(bb)) bb = 0;
        var result;
        if(sort_order == 'descending')
          result = Math.abs(bb)-Math.abs(aa);
        else
          result = Math.abs(aa)-Math.abs(bb);
        return result;
      }
    }

    function click_component(context, component)
    {
      return function()
      {
        context.select_component(component);
        context.element.trigger("component-changed", component);
      }
    }

    function sort_component(context, component)
    {
      return function()
      {
        var sort_order = 'descending';
        if( $(this).hasClass('icon-sort-descending') )
          sort_order = 'ascending';

       context.do_component_sort(component, sort_order);
      }
    }

    function click_row(context, row, variable_type, variable_index)
    {
      return function()
      {
        context.element.find("tr").removeClass("selected-variable");
        row.addClass("selected-variable");

        context.element.trigger("variable-changed", [variable_type, variable_index]);
      }
    }

    var inputs = this.options.inputs;
    var outputs = this.options.outputs;
    var r2 = this.options.r2;
    var wilks = this.options.wilks;
    this.x_loadings = this.options.x_loadings;
    this.y_loadings = this.options.y_loadings;
    var cca_count = this.x_loadings.length;

    var row = $("<tr>").appendTo(this.element);
    $("<th>").appendTo(row);
    for(var j = 0; j != cca_count; ++j)
    {
      $("<td class='bar'>").addClass(component_class(j)).appendTo(row);

      var th = $("<th class='label'><span class='selectCCAComponent'>CCA" + (j+1) + "</span><span class='sortCCAComponent icon-sort-off' /></th>").addClass(component_class(j))
      th.appendTo(row);
      $("span.selectCCAComponent", th).click(click_component(this, j));
      $("span.sortCCAComponent", th).click(sort_component(this, j));

      $("<td class='bar'>").addClass(component_class(j)).appendTo(row);
    }

    // Add r-squared statistic ...
    var row = $("<tr class='r2'>").appendTo(this.element);
    $("<th>R<sup>2</sup></th>").appendTo(row);
    for(var j = 0; j != cca_count; ++j)
    {
      $("<td class='bar'>").addClass(component_class(j)).appendTo(row);
      $("<td class='value'>").html(Number(r2[j]).toFixed(3)).addClass(component_class(j)).appendTo(row);
      $("<td class='bar'>").addClass(component_class(j)).appendTo(row);
    }

    // Add p statistic ...
    var row = $("<tr class='p'>").appendTo(this.element);
    $("<th>P</th>").appendTo(row);
    for(var j = 0; j != cca_count; ++j)
    {
      $("<td class='bar'>").addClass(component_class(j)).appendTo(row);
      $("<td class='value'>").html(Number(wilks[j]).toFixed(3)).addClass(component_class(j)).appendTo(row);
      $("<td class='bar'>").addClass(component_class(j)).appendTo(row);
    }

    // Add input variables ...
    for(var i = 0; i != inputs.length; ++i)
    {
      var row = $("<tr class='input'>").addClass("index-" + i).data("index", i).appendTo(this.element);
      row.click(click_row(this, row, "input", i));

      $("<th>").html(inputs[i]).appendTo(row);

      for(var j = 0; j != cca_count; ++j)
      {
        $("<td class='input bar negative'><div></div></td>").addClass(component_class(j)).appendTo(row);
        $("<td class='input value'>").html(Number(this.x_loadings[j][i]).toFixed(3)).addClass(component_class(j)).appendTo(row);
        $("<td class='input bar positive'><div></div></td>").addClass(component_class(j)).appendTo(row);
      }
    }

    // Add output variables ...
    for(var i = 0; i != outputs.length; ++i)
    {
      var row = $("<tr class='output'>").addClass("index-" + i).data("index", i).appendTo(this.element);
      row.click(click_row(this, row, "output", i));

      $("<th>").html(outputs[i]).appendTo(row);

      for(var j = 0; j != cca_count; ++j)
      {
        $("<td class='output bar negative'><div></div></td>").addClass(component_class(j)).appendTo(row);
        $("<td class='output value'>").html(Number(this.y_loadings[j][i]).toFixed(3)).addClass(component_class(j)).appendTo(row);
        $("<td class='output bar positive'><div></div></td>").addClass(component_class(j)).appendTo(row);
      }
    }

    d3.select(this.element.get(0)).selectAll("td.bar")
      .attr("width", 0)
      ;
    d3.select(this.element.get(0)).selectAll("td.bar div")
      .style("width", "0px")
      ;
  },

  _setOption: function(key, value)
  {
    console.log("cca.barplot._setOption()", key, value);
    this.options[key] = value;

    if(key == "component")
    {
      this.select_component(this.options.component);
    }
    else if(key == "variable")
    {
      var type = this.options.variable[0];
      var index = this.options.variable[1];
      this.element.find("tr").removeClass("selected-variable");
      if(type == "input" || type == "output")
        this.element.find("tr." + type + ".index-" + index).addClass("selected-variable");
    }
    else if(key == "sort")
    {
      this.do_component_sort(this.options.sort[0], this.options.sort[1]);
    }
  }
});

