import { connect } from 'react-redux';
import { 
  changeFontSize, 
  changeFontFamily, 
  changeAxesVariableScale,
  changeVariableAliasLabels,
  clearAllVariableAliasLabels,
  setVariableRange,
  clearVariableRange,
  clearAllVariableRanges,
} from '../actions';
import React, { useState } from "react";
import ControlsButton from 'components/ControlsButton';
import SlycatTableIngestion from "js/slycat-table-ingestion-react";
import VariableAliasLabels from "components/VariableAliasLabels";
import ScatterplotOptions from "components/ScatterplotOptions";
import VariableRanges from "components/VariableRanges";
import "js/slycat-table-ingestion";
import ko from "knockout";
import "../../css/controls-button-var-options.css";
import $ from "jquery";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons'

export const DEFAULT_FONT_SIZE = 15;
export const DEFAULT_FONT_FAMILY = 'Arial';

class ControlsButtonVarOptions extends React.Component {
  constructor(props) {
    super(props);

    this.variableRangesRef = React.createRef();

    this.modalId = 'varOptionsModal';
    this.title = 'Display Settings';
  }

  componentDidMount() {
    // Showing and hiding Clear All buttons based on current tab
    let thisModal = $(`#${this.modalId}`);
    $(`a[data-toggle="tab"]`, thisModal).on('shown.bs.tab', function (e) {
      // First let's hide all .tabDependent elements
      $(`.tabDependent`, thisModal).addClass('d-none');
      // Now let's show the appropirate elements based on the 
      // newly activated tab's data-show attribute
      let newTab = e.target; // newly activated tab
      let previousTab = e.relatedTarget; // previous active tab
      $(`.${newTab.getAttribute('aria-controls')}`, thisModal).removeClass('d-none');
    });
  }

  closeModal = (e) => {
    // Write variable aliases to database
    let self = this;

    // If the model has project_data, write to it
    if(this.props.model.project_data !== undefined && this.props.model.project_data[0] !== undefined)
    {
      client.put_project_data_parameter({
        did: this.props.model.project_data[0],
        aid: 'variable_aliases',
        input: false,
        value: this.props.variable_aliases,
        success: function(response) {
          $('#' + self.modalId).modal('hide');
        },
        error: function(response) {
          // We have a pointer to project data but can't save to it.
          // Maybe it was deleted.
          // Let's save to the model's artifact instead.
          console.log("Oops, we have a pointer to project data but can't save to it. Let's save to the model's artifact instead.");
          self.writeAliasesToModelArtifact();
        },
      });
    }
    // Otherwise write to the model's artifact:variable_aliases attribute
    else
    {
      self.writeAliasesToModelArtifact();
    }
  }

  writeAliasesToModelArtifact = () => {
    let self = this;
    client.put_model_parameter({
      mid: this.props.model._id,
      aid: "variable_aliases",
      value: this.props.variable_aliases,
      input: false,
      success: function() {
        $('#' + self.modalId).modal('hide');
      },
      error: function() {
        console.log("Oops, can't even write aliases to model artifact. Closing dialog and popping up error dialog.");
        $('#' + self.modalId).modal('hide');
        dialog.ajax_error("There was an error saving the variable alias labels to the model's artifact.")();
      }
    });
  }

  clearAllVariableRanges = () => {
    // First clear all variable ranges in Redux state;
    this.props.clearAllVariableRanges();
    // Then let VariableRanges component know this happened because it needs
    // to update its local state accordingly. 
    this.variableRangesRef.current.clearAllVariableRanges();
  }

  render() {
    let axes_variables = [];
    for(let [index, axes_variable] of this.props.axes_variables.entries())
    {
      let scale_type = 'Linear';
      if(this.props.axes_variables_scale[index] !== undefined)
      {
        scale_type = this.props.axes_variables_scale[index];
      }
      axes_variables.push({
        "Axis Type": scale_type,
        // 'Alex Testing Bool True': true,
        // 'Alex Testing Bool False': false,
        "disabled": false,
        "hidden": false,
        "lastSelected": false,
        "name": this.props.variable_aliases[index] || axes_variable.name,
        "selected": false,
        "tooltip": '',
      });
    }
    // Testing various properties
    // axes_variables[1].disabled = true;
    // axes_variables[1].tooltip = 'Alex Testing Tooltip';
    // axes_variables[1].selected = true;

    let axes_properties = [{name: 'Axis Type', 
                            type: 'select', 
                            values: ['Linear','Date & Time','Log']
                          }];
    // // Testing boolean property
    // axes_properties.push({
    //   name: 'Alex Testing Bool True',
    //   type: 'bool',
    // });
    // // Testing boolean property
    // axes_properties.push({
    //   name: 'Alex Testing Bool False',
    //   type: 'bool',
    // });

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

    const fontItems = fonts.map((font, index) => (
      <a key={index} 
        href='#' 
        onClick={this.props.changeFontFamily}
        style={{fontFamily: font.fontFamily}} 
        className={`dropdown-item {font.fontFamily == this.props.font_family ? 'active' : 'notactive'}`}
        data-value={font.name}
      >
        {font.name}
      </a>
    ));

    return (
      <React.Fragment>
        <div className='modal fade' data-backdrop='false' id={this.modalId}>
          <div className='modal-dialog modal-lg'>
            <div className='modal-content'>
              <div className='modal-header'>
                <h3 className='modal-title'>{this.title}</h3>
                <button type='button' className='close' aria-label='Close' 
                  onClick={this.closeModal} 
                >
                  <span aria-hidden='true'>&times;</span>
                </button>
              </div>
              <div className='modal-body'>

                <ul className='nav nav-tabs' role='tablist'>
                  <li className='nav-item'>
                    <a className='nav-link active' id='axes-scales-tab' data-toggle='tab' 
                      href='#axes-scales-tab-content' role='tab' aria-controls='axes-scales-tab-content' aria-selected='true'>
                      <h5 className='mb-0'>Axes Scales</h5>
                    </a>
                  </li>
                  <li className='nav-item'>
                    <a className='nav-link' id='variable-ranges-tab' data-toggle='tab' 
                      href='#variable-ranges-tab-content' role='tab' aria-controls='variable-ranges-tab-content' aria-selected='false'>
                      <h5 className='mb-0'>Variable Ranges</h5>
                    </a>
                  </li>
                  <li className='nav-item'>
                    <a className='nav-link' id='variable-alias-tab' data-toggle='tab' 
                      href='#variable-alias-tab-content' role='tab' aria-controls='variable-alias-tab-content' aria-selected='false'>
                      <h5 className='mb-0'>Variable Alias Labels</h5>
                    </a>
                  </li>
                  <li className='nav-item'>
                   <a className='nav-link' id='scatterplot-options-tab' data-toggle='tab' 
                     href='#scatterplot-options-tab-content' role='tab' aria-controls='scatterplot-options-tab-content' aria-selected='false'>
                     <h5 className='mb-0'>Point Formatting</h5>
                   </a>
                 </li>
                </ul>

                <div className='tab-content mt-4 mb-2 mx-3'>
                  <div className='tab-pane active' id='axes-scales-tab-content' role='tabpanel' aria-labelledby='axes-scales-tab'>
                    <div className='slycat-axes-font'>
                      <div className='form-inline'>
                        <div className='form-group'>
                          <label className='pr-2' htmlFor='font-family'>Font</label>
                          <div className='btn-group btn-group-sm'>
                            <div className='btn-group dropdown font-family-dropdown'>
                              <button 
                                className='btn btn-sm border-secondary text-dark dropdown-toggle' 
                                type='button' 
                                id='font-family' 
                                data-toggle='dropdown' 
                                aria-haspopup='true' 
                                aria-expanded='false' 
                                style={{fontFamily: this.props.font_family}}>
                                {this.props.font_family}
                              </button>
                              <div className='dropdown-menu' aria-labelledby='dropdownMenu1'>
                                {fontItems}
                              </div>
                            </div>
                            <button 
                              className='btn btn-outline-secondary' 
                              type='button'
                              title='Reset font family to default.'
                              value={DEFAULT_FONT_FAMILY}
                              onClick={this.props.changeFontFamily}
                              disabled={this.props.font_family == DEFAULT_FONT_FAMILY}
                            >
                              <FontAwesomeIcon icon={faTimes} />
                            </button>
                          </div>
                        </div>
                        <div className='form-group'>
                          <label className='ml-5 pr-2' htmlFor='font-size'>Size</label>
                          <div className='input-group input-group-sm'>
                            <input type='number' 
                              className='form-control form-control-sm border border-secondary' 
                              id='font-size' 
                              max='40' 
                              min='8' 
                              step='1' 
                              style={{width: "70px"}}
                              value={this.props.font_size} 
                              onChange={this.props.changeFontSize}
                            />
                            <div className='input-group-append'>
                              <button 
                                className='btn btn-outline-secondary' 
                                type='button'
                                title='Reset font size to default.'
                                value={DEFAULT_FONT_SIZE}
                                disabled={this.props.font_size == DEFAULT_FONT_SIZE}
                                onClick={this.props.changeFontSize}
                              >
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <hr />
                    <SlycatTableIngestion 
                      uniqueID='varOptions'
                      variables={axes_variables}
                      properties={axes_properties}
                      onChange={this.props.changeAxesVariableScale}
                    />
                  </div>
                  <div className='tab-pane' id='variable-ranges-tab-content' role='tabpanel' aria-labelledby='variable-ranges-tab'>
                    <VariableRanges 
                      metadata={this.props.metadata}
                      table_statistics={this.props.table_statistics}
                      numericVariables={this.props.numericVariables}
                      variableRanges={this.props.variableRanges}
                      setVariableRange={this.props.setVariableRange}
                      clearVariableRange={this.props.clearVariableRange}
                      ref={this.variableRangesRef}
                    />
                  </div>
                  <div className='tab-pane' id='variable-alias-tab-content' role='tabpanel' aria-labelledby='variable-alias-tab'>
                    <VariableAliasLabels 
                      variableAliases={this.props.variable_aliases}
                      metadata={this.props.metadata}
                      onChange={this.props.changeVariableAliasLabels}
                    />
                  </div>
                  <div className='tab-pane' id='scatterplot-options-tab-content' role='tabpanel' aria-labelledby='scatterplot-options-tab'>
                    <ScatterplotOptions />
                  </div>
                </div>

              </div>
              <div className='modal-footer'>
                <div className='mr-auto'>
                  <button type='button' 
                    className='btn btn-danger mr-2 tabDependent variable-ranges-tab-content d-none' 
                    disabled={Object.keys(this.props.variableRanges).length === 0}
                    onClick={this.clearAllVariableRanges}
                  >
                    Clear All Variable Ranges
                  </button>
                  <button type='button' 
                    className='btn btn-danger mr-2 tabDependent variable-alias-tab-content d-none'
                    disabled={Object.keys(this.props.variable_aliases).length === 0}
                    onClick={this.props.clearAllVariableAliasLabels}
                  >
                    Clear All Variable Alias Labels
                  </button>
                </div>
                <button type='button' 
                  className='btn btn-primary' 
                  onClick={this.closeModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        <ControlsButton 
          icon='fa-cog' title={this.title} data_toggle='modal' data_target={'#' + this.modalId} 
          button_style={this.props.button_style} id='controls-button-var-options' 
        />
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  let names = ownProps.metadata['column-names'];
  let variableAliases = state.derived.variableAliases;

  let getVariableAlias = (index) => {
    let alias = names[index];
    if(variableAliases[index] !== undefined)
    {
      alias = variableAliases[index];
    }
    return alias;
  }

  let numericVariables = names
    .flatMap((name, index) => {
    if(ownProps.metadata['column-types'][index] != 'string')
    {
      return [{
        index: index,
        name: getVariableAlias(index),
        dataMin: ownProps.table_statistics[index].min,
        dataMax: ownProps.table_statistics[index].max,
      }];
    }
    return [];
  });

  return {
    font_size: state.fontSize,
    font_family: state.fontFamily,
    axes_variables_scale: state.axesVariables,
    variable_aliases: state.derived.variableAliases,
    numericVariables: numericVariables,
    variableRanges: state.variableRanges,
  }
}

export default connect(
  mapStateToProps,
  {
    changeFontSize,
    changeFontFamily,
    changeAxesVariableScale,
    changeVariableAliasLabels,
    clearAllVariableAliasLabels,
    setVariableRange,
    clearVariableRange,
    clearAllVariableRanges,
  }
)(ControlsButtonVarOptions)