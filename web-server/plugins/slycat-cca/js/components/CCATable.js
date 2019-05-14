import React from "react";
import { Provider } from 'react-redux';

import api_root from "js/slycat-api-root";

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
      return "<div class='highlightWrapper" + (value==null ? " null" : "") + ( d3.hcl(columnDef.colormap(value)).l > 50 ? " light" : " dark") + "' style='background:" + columnDef.colormap(value) + "'>" + value_formatter(value) + "</div>";
    else if(value==null)
      return "<div class='highlightWrapper" + (value==null ? " null" : "") + "'>" + value_formatter(value) + "</div>";
    return value_formatter(value);
  }

  componentDidMount() {
    
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
          <div ref={this.cca_table}>
            I am your new React Slickgrid table
          </div>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

export default CCATable