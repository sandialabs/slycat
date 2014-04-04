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
    tableHeight : null,
    inputsHeight: null,
    outputsHeight: null,
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
      this.element.find(".selected-component").removeClass("selected-component");
      this.element.find(".col" + (component+1)).addClass("selected-component");
      this.resize_canvas();
    }

    this.do_component_sort = function(component, sort_order)
    {
      var sort_icon = $(".barplotHeaderColumn." + component_class(component) + " .sortCCAComponent", self.element);
      $("span.sortCCAComponent", self.element).removeClass("icon-sort-descending icon-sort-ascending").addClass("icon-sort-off");
      $(sort_icon).removeClass("icon-sort-off").addClass("icon-sort-" + sort_order);

      var inputLabels  = $('.inputLabel', self.element);
      var outputLabels = $('.outputLabel', self.element);
      var inputRows    = $('.barplotRow.rowInput', self.element);
      var outputRows   = $('.barplotRow.rowOutput', self.element);

      inputLabels.sort(inputSortFunction).appendTo($('.barplotColumn.input', self.element));
      inputRows.sort(inputSortFunction).appendTo($('.barplotCanvas.input', self.element));

      outputLabels.sort(outputSortFunction).appendTo($('.barplotColumn.output', self.element));
      outputRows.sort(outputSortFunction).appendTo($('.barplotCanvas.output', self.element));

      self.element.trigger("component-sort-changed", [component, sort_order]);

      function inputSortFunction(a,b){
        var loadings = self.options.x_loadings;
        return sortFunction(a,b,loadings);
      }

      function outputSortFunction(a,b){
        var loadings = self.options.y_loadings;
        return sortFunction(a,b,loadings);
      }

      function sortFunction(a,b,loadings){
        var a_loadings_index = $(a).data('loadings_index');
        var b_loadings_index = $(b).data('loadings_index');

        var aa = loadings[component][a_loadings_index];
        if (isNaN(aa)) aa = 0;
        var bb = loadings[component][b_loadings_index];
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
        context.element.find(".selected-variable").removeClass("selected-variable");
        context.element.find(".row" + variable).addClass("selected-variable");
        // row.addClass("selected-variable");

        // this.element.find(".selected-variable").removeClass("selected-variable");
        // this.element.find(".row" + value).addClass("selected-variable");

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

    var barplotHeader = $("<div class='barplotHeader'>").appendTo(this.element);
    var barplotRow = $('<div class="barplotRow">').appendTo(barplotHeader);
    var blank = $('<div class="barplotHeaderColumn mask col0"><div class="wrapper">&nbsp;</div></div>').appendTo(barplotRow);
    var barplotHeaderColumns = $('<div class="barplotHeaderColumns">').appendTo(barplotRow);

    for(var component = 0; component != component_count; ++component)
    {
      var barplotHeaderColumn = $('<div class="barplotHeaderColumn"><div class="wrapper"><div class="negativeSpacer spacer" /><div class="barplotHeaderColumnLabelWrapper"><span class="selectCCAComponent">CCA' + (component+1) + '</span><span class="sortCCAComponent icon-sort-off" /></div><div class="positiveSpacer spacer" /></div></div>')
        .addClass('col' + (component+1))
        .addClass(component_class(component))
        .appendTo(barplotHeaderColumns);
      $("span.selectCCAComponent", barplotHeaderColumn).click(click_component(this, component));
      $("span.sortCCAComponent", barplotHeaderColumn).click(sort_component(this, component));

      //var th = $("<th class='label'><span class='selectCCAComponent'>CCA" + (component+1) + "</span><span class='sortCCAComponent icon-sort-off' /></th>").addClass(component_class(component))
      //th.appendTo(row);
      // $("span.selectCCAComponent", th).click(click_component(this, component));
      // $("span.sortCCAComponent", th).click(sort_component(this, component));

      // $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
    }

    // Add r-squared statistic ...
    var barplotRow = $('<div class="barplotRow">').appendTo(barplotHeader);
    $('<div class="barplotCell mask col0" id="rsquared-label"><div class="wrapper">R<sup>2</sup></div></div>').appendTo(barplotRow);
    var barplotHeaderColumns = $('<div class="barplotHeaderColumns">').appendTo(barplotRow);
    for(var component = 0; component != component_count; ++component)
    {
      var barplotCell = $('<div class="barplotCell" />').addClass('col' + (component+1)).appendTo(barplotHeaderColumns);
      var barplotCellWrapper = $('<div class="wrapper" />').appendTo(barplotCell);
      var barplotCellNegativeSpacer = $('<div class="negativeSpacer spacer" />').appendTo(barplotCellWrapper);
      var barplotCellValue = $('<div class="barplotCellValue" />').html(Number(r2[component]).toFixed(3)).appendTo(barplotCellWrapper);
      var barplotCellPositiveSpacer = $('<div class="positiveSpacer spacer" />').appendTo(barplotCellWrapper);
      // $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
      // $("<td class='value'>").html(Number(r2[component]).toFixed(3)).addClass(component_class(component)).appendTo(row);
      // $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
    }

    // Add p statistic ...
    var barplotRow = $('<div class="barplotRow">').appendTo(barplotHeader);
    $('<div class="barplotCell mask col0"><div class="wrapper">P</div></div>').appendTo(barplotRow);
    var barplotHeaderColumns = $('<div class="barplotHeaderColumns">').appendTo(barplotRow);
    for(var component = 0; component != component_count; ++component)
    {
      var barplotCell = $('<div class="barplotCell" />').addClass('col' + (component+1)).appendTo(barplotHeaderColumns);
      var barplotCellWrapper = $('<div class="wrapper" />').appendTo(barplotCell);
      var barplotCellNegativeSpacer = $('<div class="negativeSpacer spacer" />').appendTo(barplotCellWrapper);
      var barplotCellValue = $('<div class="barplotCellValue" />').html(Number(wilks[component]).toFixed(3)).appendTo(barplotCellWrapper);
      var barplotCellPositiveSpacer = $('<div class="positiveSpacer spacer" />').appendTo(barplotCellWrapper);
      // $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
      // $("<td class='value'>").html(Number(wilks[component]).toFixed(3)).addClass(component_class(component)).appendTo(row);
      // $("<td class='bar'>").addClass(component_class(component)).appendTo(row);
    }

    var barplotViewport = $('<div class="barplotViewport">').appendTo(this.element);

    // Add input variables ...
    var barplotGroup = $('<div class="barplotGroup inputs">').appendTo(barplotViewport);
    var barplotColumn = $('<div class="barplotColumn input">').appendTo(barplotGroup);
    var barplotCanvas = $('<div class="barplotCanvas input">').appendTo(barplotGroup);

    for(var i = 0; i != inputs.length; ++i)
    {
      var variableName = $('<div class="barplotCell col0 rowInput inputLabel" />').addClass('row' + i).appendTo(barplotColumn);
      variableName.data('loadings_index', i);
      var variableNameWrapper = $('<div class="wrapper" />').html(metadata["column-names"][inputs[i]]).appendTo(variableName);
      variableName.click( click_row(this, variableName, inputs[i]) );

      var barplotRow = $('<div class="barplotRow rowInput">').addClass('row' + i).appendTo(barplotCanvas);
      barplotRow.data('loadings_index', i);
      barplotRow.click( click_row(this, barplotRow, inputs[i]) );

      for(var component = 0; component != component_count; ++component)
      {
        var barplotCell = $('<div class="barplotCell rowInput">').addClass('row' + i + ' col' + (component+1)).appendTo(barplotRow);
        var barplotCellWrapper = $('<div class="wrapper" />').appendTo(barplotCell);
        var barplotCellNegativeSpacer = $('<div class="negativeSpacer spacer" />').appendTo(barplotCellWrapper);
        var barplotCellNegative = $('<div class="negative" />').css("width", negative_bar_width(x_loadings[component][i])).addClass(component_class(component)).appendTo(barplotCellNegativeSpacer);
        var barplotCellValue = $('<div class="barplotCellValue" />').html(Number(x_loadings[component][i]).toFixed(3)).appendTo(barplotCellWrapper);
        var barplotCellPositiveSpacer = $('<div class="positiveSpacer spacer" />').appendTo(barplotCellWrapper);
        var barplotCellPositive = $('<div class="positive" />').css("width", positive_bar_width(x_loadings[component][i])).addClass(component_class(component)).appendTo(barplotCellPositiveSpacer);


        // $("<td class='input bar negative'/>")
        //   .append($("<div/>").css("width", negative_bar_width(x_loadings[component][i])))
        //   .addClass(component_class(component))
        //   .appendTo(row);

        // $("<td class='input value'>").html(Number(x_loadings[component][i]).toFixed(3)).addClass(component_class(component)).appendTo(row);

        // $("<td class='input bar positive'/>")
        //   .append($("<div/>").css("width", positive_bar_width(x_loadings[component][i])))
        //   .addClass(component_class(component))
        //   .appendTo(row);
      }
    }

    // Add output variables ...
    var barplotGroup = $('<div class="barplotGroup outputs">').appendTo(barplotViewport);
    var barplotColumn = $('<div class="barplotColumn output">').appendTo(barplotGroup);
    var barplotCanvas = $('<div class="barplotCanvas output">').appendTo(barplotGroup);

    for(var i = 0; i != outputs.length; ++i)
    {
      var variableName = $('<div class="barplotCell col0 rowOutput outputLabel">').addClass('row' + (i + inputs.length)).appendTo(barplotColumn);
      variableName.data('loadings_index', i);
      var variableNameWrapper = $('<div class="wrapper" />').html(metadata["column-names"][outputs[i]]).appendTo(variableName);
      variableName.click( click_row(this, variableName, outputs[i]) );

      var barplotRow = $('<div class="barplotRow rowOutput">').addClass('row' + (i + inputs.length)).appendTo(barplotCanvas);
      barplotRow.data('loadings_index', i);
      barplotRow.click( click_row(this, barplotRow, outputs[i]) );

      for(var component = 0; component != component_count; ++component)
      {
        var barplotCell = $('<div class="barplotCell rowOutput">').addClass('row' + (i + inputs.length) + ' col' + (component+1)).appendTo(barplotRow);
        var barplotCellWrapper = $('<div class="wrapper" />').appendTo(barplotCell);
        var barplotCellNegativeSpacer = $('<div class="negativeSpacer spacer" />').appendTo(barplotCellWrapper);
        var barplotCellNegative = $('<div class="negative" />').css("width", negative_bar_width(y_loadings[component][i])).addClass(component_class(component)).appendTo(barplotCellNegativeSpacer);
        var barplotCellValue = $('<div class="barplotCellValue" />').html(Number(y_loadings[component][i]).toFixed(3)).appendTo(barplotCellWrapper);
        var barplotCellPositiveSpacer = $('<div class="positiveSpacer spacer" />').appendTo(barplotCellWrapper);
        var barplotCellPositive = $('<div class="positive" />').css("width", positive_bar_width(y_loadings[component][i])).addClass(component_class(component)).appendTo(barplotCellPositiveSpacer);

        // $("<td class='output bar negative'/>")
        //   .append($("<div/>").css("width", negative_bar_width(y_loadings[component][i])))
        //   .addClass(component_class(component))
        //   .appendTo(row);

        // $("<td class='output value'>").html(Number(y_loadings[component][i]).toFixed(3)).addClass(component_class(component)).appendTo(row);

        // $("<td class='output bar positive'/>")
        //   .append($("<div/>").css("width", positive_bar_width(y_loadings[component][i])))
        //   .addClass(component_class(component))
        //   .appendTo(row);
      }
    }

    

    /* Sizing table */
    this.options.tableHeight = $('#barplot-table').height();
    this.options.inputsHeight = $('.barplotGroup.inputs').height();
    this.options.outputsHeight = $('.barplotGroup.outputs').height();
    // No need to call resize_canvas here since select_component calls it anyway.
    //this.resize_canvas();
    this.select_component(this.options.component);

    $(".barplotCanvas.input").bind("scroll", function(){
      $(".barplotHeaderColumns").css("margin-left", "-" + $(this).scrollLeft() + "px");
      $(".barplotColumn.input").css("margin-top", "-" + $(this).scrollTop() + "px");
    });

    $(".barplotCanvas.output").bind("scroll", function(){
      $(".barplotHeaderColumns").css("margin-left", "-" + $(this).scrollLeft() + "px");
      $(".barplotColumn.output").css("margin-top", "-" + $(this).scrollTop() + "px");
      $(".barplotCanvas.input").scrollLeft( $(this).scrollLeft() );
    });

    $(".barplotColumn.input").mousewheel(function(event) {
      $(".barplotCanvas.input").scrollTop( $(".barplotCanvas.input").scrollTop() + -(event.deltaY * event.deltaFactor) );
    });
    $(".barplotColumn.output").mousewheel(function(event) {
      $(".barplotCanvas.output").scrollTop( $(".barplotCanvas.output").scrollTop() + -(event.deltaY * event.deltaFactor) );
    });
    $(".barplotHeader").mousewheel(function(event) {
      $(".barplotCanvas.output").scrollLeft( $(".barplotCanvas.output").scrollLeft() + (event.deltaX * event.deltaFactor) );
    });
  },

  resize_canvas: function()
  {
    var tableWidth = 20;  // Adding 25px space for scrollbars
    $(".barplotHeaderColumn").each(
      function(index){
        var maxWidth = Math.max.apply( null, $(".col" + index + " .wrapper").map( function () {
          return $( this ).innerWidth();
        }).get() );
        $(".col" + index).width(maxWidth);
        tableWidth += maxWidth;
      }
    );
    var barplotPaneWidth = $('#barplot-pane').width();
    $('#barplot-table').width(Math.min(tableWidth, barplotPaneWidth));
    if(tableWidth > barplotPaneWidth) {
      $('.barplotCanvas.output').css("overflow", "scroll");
      $('.barplotCanvas.input').css("overflow-y", "scroll");
    } else {
      $('.barplotCanvas.output').css("overflow", "auto");
      $('.barplotCanvas.input').css("overflow-y", "auto");
    }

    var barplotPaneHeight = $('#barplot-pane').height();
    $('#barplot-table').height(Math.min(this.options.tableHeight, barplotPaneHeight));
    if(this.options.tableHeight > barplotPaneHeight) {
      // Table is taller than pane, so need to size down inputs and/or output and make them scrollable
      var viewportHeight = $("#barplot-table").height() - $('.barplotHeader').height();
      var halfViewportHeight = Math.floor(viewportHeight / 2);
      if(this.options.inputsHeight > halfViewportHeight) {
        if(this.options.outputsHeight > halfViewportHeight) {
          // Both inputs and outputs are too big, so inputs get sized to 50% of available area and outputs get the rest. 
          // Sizing both to 50% of available area was causing problems in Chrome with fractions of pixels. 
          $(".barplotCanvas.input").height( halfViewportHeight );
          $(".barplotGroup.inputs").height( halfViewportHeight );
          $(".barplotCanvas.output").height( viewportHeight - $(".barplotCanvas").height() );
          $(".barplotGroup.outputs").height( viewportHeight - $(".barplotCanvas").height() );
        } else {
          // Only inputs need to be sized down
          $(".barplotCanvas.input").height( viewportHeight - this.options.outputsHeight );
          $(".barplotGroup.inputs").height( viewportHeight - this.options.outputsHeight );
          $(".barplotCanvas.output").height( this.options.outputsHeight );
          $(".barplotGroup.outputs").height( this.options.outputsHeight );
        }
      } else {
        // Only outputs needs to be sized down
        $(".barplotCanvas.input").height( this.options.inputsHeight );
        $(".barplotGroup.inputs").height( this.options.inputsHeight );
        $(".barplotCanvas.output").height( viewportHeight - this.options.inputsHeight );
        $(".barplotGroup.outputs").height( viewportHeight - this.options.inputsHeight );
      }
    } else {
      // We have room to show everything, so size things to their full height.
      $(".barplotCanvas.input").height( this.options.inputsHeight );
      $(".barplotGroup.inputs").height( this.options.inputsHeight );
      $(".barplotCanvas.output").height( this.options.outputsHeight );
      $(".barplotGroup.outputs").height( this.options.outputsHeight );
    }
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
      this.element.find(".selected-variable").removeClass("selected-variable");
      this.element.find(".row" + value).addClass("selected-variable");
      // Using scrollintoview jQuery plugin instead of browser built-in functionality (DOM's scrollIntoView() function).
      // DOM's scrollIntoView() works but has problems: 
      //   1. scrolls each time it's called, even when element is already visible, to bring it to top or bottom of scroll area.
      //   2. always scrolls in both directions, displayin left edge of target element even if user has already scrolled horizontally to display other CCA components.
      //   3. lacks animation when scrolling
      //   4. always scrolls to top or bottom of scroll area instead of the least amount needed to make it visible
      // The jQuery plugin solves all these issues.
      //this.element.find(".barplotRow.row" + value).get(0).scrollIntoView();
      this.element.find(".barplotRow.row" + value).scrollintoview({direction: "vertical",});
    }
    else if(key == "sort")
    {
      this.do_component_sort(this.options.sort[0], this.options.sort[1]);
    }
  }
});

