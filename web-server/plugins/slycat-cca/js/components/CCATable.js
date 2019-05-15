import slick_grid_css from "slickgrid/slick.grid.css";
import slick_default_theme_css from "slickgrid/slick-default-theme.css";
import slick_headerbuttons_css from "slickgrid/plugins/slick.headerbuttons.css";
import slick_slycat_theme_css from "css/slick-slycat-theme.css";

import "jquery-ui";
import "slickgrid/lib/jquery.event.drag-2.3.0";
import "slickgrid/lib/jquery.event.drop-2.3.0";
import "slickgrid/slick.core";
import "slickgrid/slick.grid";
import "slickgrid/plugins/slick.rowselectionmodel";
import "slickgrid/plugins/slick.headerbuttons";
import "slickgrid/plugins/slick.autotooltips";

import React from "react";
import { Provider } from 'react-redux';

import api_root from "js/slycat-api-root";
import SlickGridDataProvider from "./SlickGridDataProvider";

import * as table_helpers from "js/slycat-table-helpers-react";


class CCATable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      component: this.props.component,
    };

    // Create a ref to the .cca-barplot-table
    this.cca_table = React.createRef();

    this.columns = [];
    this.columns.push(this.make_column(this.props.metadata["column-count"]-1, "headerSimId", "rowSimId"));
    for(var i in this.props.inputs)
      this.columns.push(this.make_column(this.props.inputs[i], "headerInput", "rowInput"));
    for(var i in this.props.outputs)
      this.columns.push(this.make_column(this.props.outputs[i], "headerOutput", "rowOutput"));
    for(var i in this.props.others)
      this.columns.push(this.make_column(this.props.others[i], "headerOther", "rowOther"));

    this.data = new SlickGridDataProvider({
      api_root : api_root,
      mid : this.props.mid,
      aid : this.props.aid,
      metadata : this.props.metadata,
      sort_column : this.props.sort_variable,
      sort_order : this.props.sort_order,
      inputs : this.props.inputs,
      outputs : this.props.outputs,
    });

    this.trigger_row_selection = true;
  }

  make_column = (column_index, header_class, cell_class) =>
  {
    return {
      id : column_index,
      field : column_index,
      name : this.props.metadata["column-names"][column_index],
      sortable : false,
      headerCssClass : header_class,
      cssClass : cell_class,
      formatter : this.cell_formatter,
      header :
      {
        buttons :
        [
          {
            cssClass : this.props.sort_variable == column_index ? (this.props.sort_order == "ascending" ? "icon-sort-ascending" : "icon-sort-descending") : "icon-sort-off",
            tooltip : this.props.sort_variable == column_index ? (this.props.sort_order == "ascending" ? "Sort descending" : "Sort ascending") : "Sort ascending",
            command : this.props.sort_variable == column_index ? (this.props.sort_order == "ascending" ? "sort-descending" : "sort-ascending") : "sort-ascending"
          }
        ]
      }
    };
  }

  cell_formatter = (row, cell, value, columnDef, dataContext) =>
  {
    if(columnDef.colormap)
      return "<div class='highlightWrapper" + (value==null ? " null" : "") + ( d3.hcl(columnDef.colormap(value)).l > 50 ? " light" : " dark") + "' style='background:" + columnDef.colormap(value) + "'>" + this.value_formatter(value) + "</div>";
    else if(value==null)
      return "<div class='highlightWrapper" + (value==null ? " null" : "") + "'>" + this.value_formatter(value) + "</div>";
    return this.value_formatter(value);
  }

  value_formatter = (value) =>
  {
    return value == null ? "&nbsp;" : (value + "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  _color_variables = (variables) =>
  {
    var self = this;

    var columns = self.grid.getColumns();
    for(var i in columns)
    {
      var column = columns[i];
      if(this.props.colormap !== null && $.inArray(column.id, variables) != -1)
      {
        // Make a copy of our global colormap, then adjust its domain to match our column-specific data.
        column.colormap = self.props.colormap.copy();

        var new_domain = []
        var domain_scale = d3.scale.linear().domain([0, column.colormap.range().length]).range([self.props.metadata["column-min"][column.id], self.props.metadata["column-max"][column.id]]);
        for(var i in column.colormap.range())
          new_domain.push(domain_scale(i));
        column.colormap.domain(new_domain);

        column.cssClass = column.cssClass.split(" ")[0] + " highlight";
      }
      else
      {
        column.colormap = null;
        column.cssClass = column.cssClass.split(" ")[0];
      }
    }

    self.grid.invalidate();
  }

  componentDidMount() {
    var self = this;

    this.grid = new Slick.Grid(this.cca_table.current, this.data, this.columns, {explicitInitialization : true, enableColumnReorder : false});

    this.data.onDataLoaded.subscribe(function (e, args) {
      for (var i = args.from; i <= args.to; i++) {
        self.grid.invalidateRow(i);
      }
      self.grid.render();
    });

    let header_buttons = new Slick.Plugins.HeaderButtons();
    header_buttons.onCommand.subscribe(function(e, args)
    {
      var column = args.column;
      var button = args.button;
      var command = args.command;
      var grid = args.grid;

      for(var i in this.columns)
      {
        this.columns[i].header.buttons[0].cssClass = "icon-sort-off";
        this.columns[i].header.buttons[0].tooltip = "Sort ascending";
        this.columns[i].header.buttons[0].command = "sort-ascending";
        grid.updateColumnHeader(this.columns[i].id);
      }

      if(command == "sort-ascending")
      {
        button.cssClass = 'icon-sort-ascending';
        button.command = 'sort-descending';
        button.tooltip = 'Sort descending';
        set_sort(column.id, "ascending");
      }
      else if(command == "sort-descending")
      {
        button.cssClass = 'icon-sort-descending';
        button.command = 'sort-ascending';
        button.tooltip = 'Sort ascending';
        set_sort(column.id, "descending");
      }
    });

    this.grid.registerPlugin(header_buttons);
    this.grid.registerPlugin(new Slick.AutoTooltips({enableForHeaderCells:true}));

    this.grid.setSelectionModel(new Slick.RowSelectionModel());
    this.grid.onSelectedRowsChanged.subscribe(function(e, selection)
    {
      // Don't trigger a selection event unless the selection was changed by user interaction (i.e. not outside callers or changing the sort order).
      if(this.trigger_row_selection)
      {
        this.data.get_indices("unsorted", selection.rows, function(unsorted_rows)
        {
          // ToDo: update state here
          // self.options["row-selection"] = unsorted_rows;
          // self.element.trigger("row-selection-changed", [unsorted_rows]);
        });
      }
      this.trigger_row_selection = true;
    });
    this.grid.onHeaderClick.subscribe(function (e, args)
    {
      // ToDo: update state here
      // if( !self._array_equal([args.column.field], self.options["variable-selection"]) && (self.options.metadata["column-types"][args.column.id] != "string") )
      // {
      //   self.options["variable-selection"] = [args.column.field];
      //   self._color_variables(self.options["variable-selection"]);
      //   self.element.trigger("variable-selection-changed", [self.options["variable-selection"]]);
      // }
    });

    this._color_variables(this.props.variable_selection);

    this.grid.init();

    table_helpers._set_selected_rows_no_trigger(this);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    
  }

  resize_canvas = () =>
  {
    
  }

  handle_component_change_transition = () =>
  {
    
  }

  clickComponent = (index, e) =>
  {
    this.setState({component: index});
  }

  render() {

    return (
      <React.Fragment>
        <React.StrictMode>
          <div id="table" ref={this.cca_table}></div>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

export default CCATable