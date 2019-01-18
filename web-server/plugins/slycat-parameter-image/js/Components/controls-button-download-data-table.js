import Papa from "papaparse";
import api_root from "js/slycat-api-root";
import _ from "lodash";
import {dialog} from "js/slycat-dialog";
import React from "react";
import ControlsButton from './controls-button';

/***
 * react component for downloading a data table
 */
class ControlsButtonDownloadDataTable extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  /**
   * this function handles the click event for the
   * download button
   */
  handleClick() {
    if (this.props.selection.length === 0
        && this.props.hidden_simulations.length === 0) {
      this._write_data_table();
    } else {
      this.openCSVSaveChoiceDialog();
    }
  }

  /**
   * helper function for taking a selection list and calling
   * the rest api to get the table and slice out all the
   * data we do not wish to download
   * @param selectionList list of selected members of the
   * table
   * @private
   */
  _write_data_table(selectionList) {
    let self = this;
    $.ajax(
    {
      type : "POST",
      url : api_root + "models/" + this.props.mid + "/arraysets/"
          + this.props.aid + "/data",
      data: JSON.stringify({"hyperchunks": "0/.../..."}),
      contentType: "application/json",
      success : function(result)
      {
        ControlsButtonDownloadDataTable._write_csv( self._convert_to_csv(result, selectionList),
            self.props.model_name + "_data_table.csv" );
      },
      error: function(request, status, reason_phrase)
      {
        window.alert("Error retrieving data table: " + reason_phrase);
      }
    });
  }

  static _write_csv(csvData, defaultFilename) {
    let blob = new Blob([ csvData ], {
      type : "application/csv;charset=utf-8;"
    });
    let csvUrl = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.href = csvUrl;
    link.style = "visibility:hidden";
    link.download = defaultFilename || "slycatDataTable.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

    /**
     * converts an array to a csv file
     * @param array that will be turned into a csv
     * @param sl slice that will be cut out of the array
     * @returns {*|void}
     * @private
     */
  _convert_to_csv(array, sl) {
    // Note that array.data is column-major:
    // array.data[0][*] is the first column
    // Converting data array from column major to row major
    let rowMajorData = _.zip(...array);
    // If we have a selection list, remove everything
    // but those elements from the data array
    if(sl !== undefined && sl.length > 0)
    {
      // sl is in the order the user selected the rows, so sort it.
      // We want to end up with rows in the
      // same order as in the original data.
      sl.sort();
      // Only keep elements at the indexes specified in sl
      rowMajorData = _.at(rowMajorData, sl);
    }
    // Creating an array of column headers by removing the last one,
    // which is the Index that does not exist in the data
    let headers = this.props.metadata["column-names"].slice(0, -1);
    // Adding headers as first element in array of data rows
    rowMajorData.unshift(headers);
    // Creating CSV from data array
    return Papa.unparse(rowMajorData);
  }

  openCSVSaveChoiceDialog() {
    let self = this;
    let txt = "";
    let buttons_save = [
      {className: "btn-default", label:"Cancel"},
      {className: "btn-primary", label:"Save Entire Table",
          icon_class:"fa fa-table"}
    ];

    if(this.props.selection.length > 0)
    {
      txt += "You have " + this.props.selection.length
          + " rows selected. ";
      buttons_save.splice(buttons_save.length-1,
          0, {className: "btn-primary",
          label:"Save Selected", icon_class:"fa fa-check"});
    }
    if(this.props.hidden_simulations.length > 0)
    {
      let visibleRows = this.props.metadata['row-count']
          - this.props.hidden_simulations.length;
      txt += "You have " + visibleRows + " rows visible. ";
      buttons_save.splice(buttons_save.length-1, 0,
          {className: "btn-primary", label:"Save Visible",
              icon_class:"fa fa-eye"});
    }

    txt += "What would you like to do?";
    //if the dialog button notices that the user has selected
    //something other than the unchanged table (eg filters) then
    //the user gets a selection of what they want to do
    dialog(
    {
      title: "Download Choices",
      message: txt,
      buttons: buttons_save,
      callback: function(button)
      {
        if(button.label === "Save Entire Table")
          self._write_data_table();
        else if(button.label === "Save Selected")
          self._write_data_table( self.props.selection );
        else if(button.label === "Save Visible")
          self._write_data_table( self._filterIndices() );
      },
    });
  }

  /**
   * Remove hidden_simulations from indices
   */
  _filterIndices() {
    let indices = this.props.indices;
    let hidden_simulations = this.props.hidden_simulations;
    let filtered_indices = ControlsButtonDownloadDataTable._cloneArrayBuffer(indices);
    let length = indices.length;

    // Remove hidden simulations and NaNs and empty strings
    for(let i=length-1; i>=0; i--){
      let hidden = $.inArray(indices[i], hidden_simulations) > -1;
      if(hidden) {
        filtered_indices.splice(i, 1);
      }
    }

    return filtered_indices;
  }

  /**
   * Clones an ArrayBuffer or Array
   */
  static _cloneArrayBuffer(source) {
    // Array.apply method of turning an ArrayBuffer into a normal
    // array is very fast (around 5ms for 250K) but
    // doesn't work in WebKit with arrays longer than about 125K
    // if(source.length > 1)
    // {
    //   return Array.apply( [], source );
    // }
    // else if(source.length == 1)
    // {
    //   return [source[0]];
    // }
    // return [];

    // For loop method is much shower (around 300ms for 250K)
    // but works in WebKit. Might be able to speed things up by
    // using ArrayBuffer.subarray() method to make smallery
    // arrays and then Array.apply those.
    let clone = [];
    for(let i = 0; i < source.length; i++)
    {
      clone.concat([source[i]]);
    }
    return clone;
  }

  render() {
    return (
      <ControlsButton icon="fa-download" title="Download Data Table" click={this.handleClick} button_style={this.props.button_style} />
    );
  }
}

export default ControlsButtonDownloadDataTable