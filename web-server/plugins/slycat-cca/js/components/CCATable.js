import slick_grid_css from "slickgrid/slick.grid.css";
import slick_default_theme_css from "slickgrid/slick-default-theme.css";
import slick_headerbuttons_css from "slickgrid/plugins/slick.headerbuttons.css";
import slick_slycat_theme_css from "css/slick-slycat-theme.css";

import "slickgrid/slick.interactions.js";
import "slickgrid/slick.core";
import "slickgrid/slick.grid";
import "slickgrid/plugins/slick.rowselectionmodel";
import "slickgrid/plugins/slick.headerbuttons";
import "slickgrid/plugins/slick.autotooltips";

import React from "react";
import { connect } from 'react-redux';
import { setVariableSelected, setVariableSorted, setSimulationsSelected } from '../actions';

import api_root from "js/slycat-api-root";
import SlickGridDataProvider from "./SlickGridDataProvider";

import * as table_helpers from "js/slycat-table-helpers-react";
import slycat_color_maps from "js/slycat-color-maps";

class CCATable extends React.Component {
  constructor(props) {
    super(props);

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

  _color_variable = (variable) =>
  {
    let self = this;

    var columns = self.grid.getColumns();
    for(var i in columns)
    {
      var column = columns[i];
      if(this.props.colormap !== null && column.id == variable)
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

  set_sort = (column, order) =>
  {
    let self = this;

    // Dispatch setVariableSorted action whenever header is clicked.
    self.props.setVariableSorted(column);

    self.data.set_sort(column, order);
    self.data.get_indices("sorted", self.props.row_selection, function(sorted_rows)
    {
      self.grid.invalidate();
      table_helpers._set_selected_rows_no_trigger(self);
    });
  }

  _array_equal = (a, b) =>
  {
    return $(a).not(b).length == 0 && $(b).not(a).length == 0;
  }

  componentDidMount() {
    let self = this;

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

      for(var i in self.columns)
      {
        self.columns[i].header.buttons[0].cssClass = "icon-sort-off";
        self.columns[i].header.buttons[0].tooltip = "Sort ascending";
        self.columns[i].header.buttons[0].command = "sort-ascending";
        grid.updateColumnHeader(self.columns[i].id);
      }

      if(command == "sort-ascending")
      {
        button.cssClass = 'icon-sort-ascending';
        button.command = 'sort-descending';
        button.tooltip = 'Sort descending';
        self.set_sort(column.id, "ascending");
      }
      else if(command == "sort-descending")
      {
        button.cssClass = 'icon-sort-descending';
        button.command = 'sort-ascending';
        button.tooltip = 'Sort ascending';
        self.set_sort(column.id, "descending");
      }
    });

    this.grid.registerPlugin(header_buttons);
    this.grid.registerPlugin(new Slick.AutoTooltips({enableForHeaderCells:true}));

    this.grid.setSelectionModel(new Slick.RowSelectionModel());
    this.grid.onSelectedRowsChanged.subscribe(function(e, selection)
    {
      self.data.get_indices("unsorted", selection.rows, function(unsorted_rows)
      {
        // Need to convert to a normal Array because sometimes unsorted_rows comes back as
        // an Int32Array, which does not bookmark correctly.
        let unsorted_rows_array = Array.from(unsorted_rows);
        self.props.setSimulationsSelected(unsorted_rows_array);
      });
    });
    this.grid.onHeaderClick.subscribe(function (e, args)
    {
      // Dispatch setVariableSelected action whenever header is clicked.
      // When it's the same variable as current, react doesn't update any components
      // so no need to check for it here.
      if (self.props.metadata["column-types"][args.column.id] != "string")
      {
        self.props.setVariableSelected(args.column.field);
      }
    });

    this._color_variable(this.props.variable_selection);

    this.grid.init();

    table_helpers._set_selected_rows_no_trigger(this);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // Color variable when selected variable changes
    if(prevProps.variable_selection !== this.props.variable_selection) {
      this._color_variable(this.props.variable_selection);
    }
    // Color variable when colormap changes
    if(prevProps.colormap !== this.props.colormap) {
      this._color_variable(this.props.variable_selection);
    }
    // Set selected rows when selection changes
    // First check if props.row_selection changed during this update
    if(_.xor(prevProps.row_selection, this.props.row_selection).length > 0) {
      // Then check if the selected rows aren't already selected in the grid
      let self = this;
      this.data.get_indices("unsorted", this.grid.getSelectedRows(), function(unsorted_rows)
      {
        if(_.xor(unsorted_rows, self.props.row_selection).length > 0) {
          table_helpers._set_selected_rows_no_trigger(self);
        }
      });
    }
    // Resize
    if(prevProps.width != this.props.width || prevProps.height != this.props.height)
    {
      this.grid.resizeCanvas();
    }
  }

  handle_component_change_transition = () =>
  {
    
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

const mapStateToProps = state => {
  return {
    mid: state.derived.model_id,
    inputs: state.derived.input_columns,
    outputs: state.derived.output_columns,
    others: state.derived.other_columns,
    metadata: state.derived.table_metadata,
    row_selection: state.simulations_selected,
    colormap: slycat_color_maps.get_color_scale(state.colormap),
    sort_variable: state.variable_sorted,
    sort_order: state.variable_sort_direction,
    variable_selection: state.variable_selected,
    width: state.derived.table_width,
    height: state.derived.table_height,
  }
};

export default connect(
  mapStateToProps,
  { 
    setVariableSelected,
    setVariableSorted,
    setSimulationsSelected,
  }
)(CCATable)