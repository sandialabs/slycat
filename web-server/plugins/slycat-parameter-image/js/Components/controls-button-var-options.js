import Papa from "papaparse";
import api_root from "js/slycat-api-root";
import _ from "lodash";
import {dialog} from "js/slycat-dialog";
import React from "react";
import ControlsButton from './controls-button';
import "js/slycat-table-ingestion";
import ko from "knockout";
import "../../css/controls-button-var-options.css";

/***
 * react component for downloading a data table
 */
class ControlsButtonVarOptions extends React.Component {
  constructor(props) {
    super(props);

    this.closeModal = this.closeModal.bind(this);
    this.apply = this.apply.bind(this);
    this.modalId = 'varOptionsModal';
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
        ControlsButtonVarOptions._write_csv( self._convert_to_csv(result, selectionList),
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

  openVarOptionsDialog() {
    let self = this;
    let txt = "";
    let buttons_save = [
      {className: "btn-default", label:"Cancel"},
      {className: "btn-primary", label:"Save Entire Table",
          icon_class:"fa fa-table"}
    ];
  }

  closeModal(e) {
    $('#' + this.modalId).modal('hide');
  }

  apply(e) {
    $('#' + this.modalId).modal('hide');
  }

  render() {
    var variablesKO = ko.observableArray();
    variablesKO.push({Categorical: false,
                                                    Classification: 'Neither',
                                                    Editable: false,
                                                    category: false,
                                                    disabled: false,
                                                    hidden: false,
                                                    image: false,
                                                    input: false,
                                                    lastSelected: false,
                                                    name: 'Model',
                                                    output: false,
                                                    rating: false,
                                                    selected: false,
                                                    tooltip: '',
                                                    type: 'string'});

    let axes_variables = [];
    for(let axes_variable of this.props.axes_variables)
    {
      axes_variables.push({
        'Axis Type': 'Linear',
        disabled: false,
        hidden: false,
        lastSelected: false,
        name: axes_variable.name,
        selected: false,
        tooltip: '',
      });
    }

    const fonts = [
      {name: "Arial", fontFamily: "Arial", },
      {name: "Arial Black", fontFamily: "Arial Black", },
      {name: "Courier", fontFamily: "Courier", },
      {name: "Courier New", fontFamily: "Courier New", },
      {name: "Georgia", fontFamily: "Georgia", },
      {name: "Tahoma", fontFamily: "Tahoma", },
      {name: "Times", fontFamily: "Times", },
      {name: "Times New Roman", fontFamily: "Times New Roman", },
      {name: "Trebuchet MS", fontFamily: "Trebuchet MS", },
      {name: "Verdana", fontFamily: "Verdana", },
    ];

    const fontItems = fonts.map((font, index) =>
      <li key={index} style={{fontFamily: font.fontFamily}}><a href="#">{font.name}</a></li>
    );

    return (
      <React.Fragment>
        <ControlsButton icon="fa-cog" title="Set Variable Options" data_toggle="modal" data_target={'#' + this.modalId} />
        <div className="modal fade" data-backdrop="static" id={this.modalId}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">Edit Axes Scales</h3>
              </div>
              <div className="modal-body">
                <div className="slycat-axes-font">
                  <div className="form-inline">
                    <div className="form-group">
                      <label htmlFor="font-family">Font</label>
                      <div className="dropdown font-family-dropdown">
                        <button className="btn btn-default dropdown-toggle" type="button" id="font-family" 
                          data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                          Dropdown
                          <span className="caret"></span>
                        </button>
                        <ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
                          {fontItems}
                        </ul>
                      </div>
                    </div>
                    <div className="form-group">
                      <label htmlFor="font-size">Size</label>
                      <input type="number" className="form-control" id="font-size"  max="40" min="6" step="1" defaultValue="10" />
                    </div>
                  </div>
                </div>
                <hr />
                <slycat-table-ingestion 
                  params={`variables: ` + JSON.stringify(axes_variables) + `,
                          properties: [
                            {name: 'Axis Type', type: 'select', values: ['Linear','Date & Time','Log']}
                          ]`}
                ></slycat-table-ingestion>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-default" onClick={this.closeModal}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={this.apply}>
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default ControlsButtonVarOptions