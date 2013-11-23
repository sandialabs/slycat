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
    metadata: null,
    inputs:[],
    outputs:[],
    r2:[],
    wilks:[],
    x_loadings:[],
    y_loadings:[],
    component : 0,
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

    function negative_bar_width(value)
    {
      return value < 0 ? -100 * value + "px" : "0px";
    }

    function positive_bar_width(value)
    {
      return value > 0 ? 100 * value + "px" : "0px";
    }

    this.select_component = function(component)
    {
      this.element.find("td.bar.selected-component").css("display", "none");
      this.element.find(".selected-component").removeClass("selected-component");

      this.element.find("td.bar." + component_class(component)).css("display", "");
      this.element.find("." + component_class(component)).addClass("selected-component");
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

    function click_row(context, row, variable)
    {
      return function()
      {
        context.element.find("tr").removeClass("selected-variable");
        row.addClass("selected-variable");

        context.element.trigger("variable-changed", [variable]);
      }
    }

    var metadata = this.options.metadata;
    var inputs = this.options.inputs;
    var outputs = this.options.outputs;
    var r2 = this.options.r2;
    var wilks = this.options.wilks;
    var x_loadings = this.options.x_loadings;
    var y_loadings = this.options.y_loadings;
    var component_count = x_loadings.length;

    var row = $("<tr>").appendTo(this.element);
    $("<th>").appendTo(row);
    for(var component = 0; component != component_count; ++component)
    {
      $("<td class='bar'>").addClass(component_class(component)).appendTo(row);

      var th = $("<th class='label'><span class='selectCCAComponent'>CCA" + (component+1) + "</span><span class='sortCCAComponent icon-sort-off' /></th>").addClass(component_class(component))
      th.appendTo(row);
      $("span.selectCCAComponent", th).click(click_component(this, component));
      $("span.sortCCAComponent", th).click(sort_component(this, component));

      $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
    }

    // Add r-squared statistic ...
    var row = $("<tr class='r2'>").appendTo(this.element);
    $("<th>R<sup>2</sup></th>").appendTo(row);
    for(var component = 0; component != component_count; ++component)
    {
      $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
      $("<td class='value'>").html(Number(r2[component]).toFixed(3)).addClass(component_class(component)).appendTo(row);
      $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
    }

    // Add p statistic ...
    var row = $("<tr class='p'>").appendTo(this.element);
    $("<th>P</th>").appendTo(row);
    for(var component = 0; component != component_count; ++component)
    {
      $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
      $("<td class='value'>").html(Number(wilks[component]).toFixed(3)).addClass(component_class(component)).appendTo(row);
      $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
    }

    // Add input variables ...
    for(var i = 0; i != inputs.length; ++i)
    {
      var row = $("<tr class='input'>").addClass("index-" + inputs[i]).data("index", i).appendTo(this.element);
      row.click(click_row(this, row, inputs[i]));

      $("<th>").html(metadata["column-names"][inputs[i]]).appendTo(row);

      for(var component = 0; component != component_count; ++component)
      {
        $("<td class='input bar negative'/>")
          .append($("<div/>").css("width", negative_bar_width(x_loadings[component][i])))
          .addClass(component_class(component))
          .appendTo(row);

        $("<td class='input value'>").html(Number(x_loadings[component][i]).toFixed(3)).addClass(component_class(component)).appendTo(row);

        $("<td class='input bar positive'/>")
          .append($("<div/>").css("width", positive_bar_width(x_loadings[component][i])))
          .addClass(component_class(component))
          .appendTo(row);
      }
    }

    // Add output variables ...
    for(var i = 0; i != outputs.length; ++i)
    {
      var row = $("<tr class='output'>").addClass("index-" + outputs[i]).data("index", i).appendTo(this.element);
      row.click(click_row(this, row, outputs[i]));

      $("<th>").html(metadata["column-names"][outputs[i]]).appendTo(row);

      for(var component = 0; component != component_count; ++component)
      {
        $("<td class='output bar negative'/>")
          .append($("<div/>").css("width", negative_bar_width(y_loadings[component][i])))
          .addClass(component_class(component))
          .appendTo(row);

        $("<td class='output value'>").html(Number(y_loadings[component][i]).toFixed(3)).addClass(component_class(component)).appendTo(row);

        $("<td class='output bar positive'/>")
          .append($("<div/>").css("width", positive_bar_width(y_loadings[component][i])))
          .addClass(component_class(component))
          .appendTo(row);
      }
    }

    // Setup the default selected component ...
    this.element.find("td.bar").css("display", "none");
    this.select_component(this.options.component);
  },

  _setOption: function(key, value)
  {
    //console.log("cca.barplot._setOption()", key, value);
    this.options[key] = value;

    if(key == "component")
    {
      this.select_component(value);
    }
    else if(key == "variable")
    {
      this.element.find("tr").removeClass("selected-variable");
      this.element.find("tr." + ".index-" + value).addClass("selected-variable");
    }
    else if(key == "sort")
    {
      this.do_component_sort(this.options.sort[0], this.options.sort[1]);
    }
  }
});

