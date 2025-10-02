import { connect } from "react-redux";
import {
  changeFontSize,
  changeFontFamily,
  changeAxesVariableScale,
  changeVariableAliasLabels,
  clearAllVariableAliasLabels,
  setVariableRange,
  clearVariableRange,
  clearAllVariableRanges,
  setThreeDVariableUserRange,
  clearThreeDVariableUserRange,
  clearAllThreeDVariableUserRanges,
} from "../actions";
import React, { useState } from "react";
import ControlsButton from "components/ControlsButton";
import SlycatTableIngestion from "components/TableIngestion/TableIngestion";
import VariableAliasLabels from "components/VariableAliasLabels";
import ScatterplotOptions from "components/ScatterplotOptions/ScatterplotOptions";
import VariableRanges from "components/VariableRanges";
import "js/slycat-table-ingestion";
import "../../css/controls-button-var-options.css";
import $ from "jquery";
import client from "js/slycat-web-client";
import * as dialog from "js/slycat-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUndo } from "@fortawesome/free-solid-svg-icons";

export const DEFAULT_FONT_SIZE = 15;
export const DEFAULT_FONT_FAMILY = "Arial";

class Caret extends React.PureComponent {
  render() {
    return (
      <>
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 16 16"
          className="bi bi-caret-right-fill ms-2 mb-1"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12.14 8.753l-5.482 4.796c-.646.566-1.658.106-1.658-.753V3.204a1 1 0 0 1 1.659-.753l5.48 4.796a1 1 0 0 1 0 1.506z" />
        </svg>
        <svg
          width="1em"
          height="1em"
          viewBox="0 0 16 16"
          className="bi bi-caret-down-fill ms-2 mb-1"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" />
        </svg>
      </>
    );
  }
}

class ClearAllButton extends React.PureComponent {
  render() {
    return (
      <div className="text-center">
        <button
          type="button"
          className="btn btn-danger mx-2 mb-2 mt-2"
          disabled={this.props.disable}
          onClick={this.props.handleClick}
        >
          {this.props.label}
        </button>
      </div>
    );
  }
}

class ControlsButtonVarOptions extends React.PureComponent {
  constructor(props) {
    super(props);

    this.variableRangesRef = React.createRef();
    this.threeDVariableRangesRef = React.createRef();

    this.modalId = "varOptionsModal";
    this.title = "Display Settings";
  }

  componentDidMount() {
    // Showing and hiding Clear All buttons based on current tab
    let thisModal = $(`#${this.modalId}`);
    $(`a[data-bs-toggle="tab"]`, thisModal).on("shown.bs.tab", function (e) {
      // First let's hide all .tabDependent elements
      $(`.tabDependent`, thisModal).addClass("d-none");
      // Now let's show the appropirate elements based on the
      // newly activated tab's data-show attribute
      let newTab = e.target; // newly activated tab
      let previousTab = e.relatedTarget; // previous active tab
      $(`.${newTab.getAttribute("aria-controls")}`, thisModal).removeClass("d-none");
    });
  }

  closeModal = (e) => {
    // Write variable aliases to database if user's role is not 'reader'
    let self = this;

    // For users with role 'reader', just close the dialog and stop.
    if (this.props.userRole == "reader") {
      $("#" + self.modalId).modal("hide");
      return;
    }

    // If the model has project_data, write to it
    if (
      this.props.model.project_data !== undefined &&
      this.props.model.project_data[0] !== undefined
    ) {
      client.put_project_data_parameter({
        did: this.props.model.project_data[0],
        aid: "variable_aliases",
        input: false,
        value: this.props.variable_aliases,
        success: function (response) {
          // console.log('wrote aliases to project_data');
          $("#" + self.modalId).modal("hide");
        },
        error: function (response) {
          // We have a pointer to project data but can't save to it.
          // Maybe it was deleted.
          // Let's save to the model's artifact instead.
          console.log(
            "Oops, we have a pointer to project data but can't save to it. Let's save to the model's artifact instead.",
          );
          self.writeAliasesToModelArtifact();
        },
      });
    }
    // Otherwise write to the model's artifact:variable_aliases attribute
    else {
      self.writeAliasesToModelArtifact();
    }
  };

  writeAliasesToModelArtifact = () => {
    let self = this;
    client.put_model_parameter({
      mid: this.props.model._id,
      aid: "variable_aliases",
      value: this.props.variable_aliases,
      input: false,
      success: function () {
        $("#" + self.modalId).modal("hide");
      },
      error: function () {
        console.log(
          "Oops, can't even write aliases to model artifact. Closing dialog and popping up error dialog.",
        );
        $("#" + self.modalId).modal("hide");
        dialog.ajax_error(
          "There was an error saving the variable alias labels to the model's artifact.",
        )();
      },
    });
  };

  clearAllVariableRanges = () => {
    const self = this;
    dialog.confirm({
      title: "Clear All Scatterplot Variable Ranges",
      message: "This will erase all Axis Min and Axis Max values that have been entered.",
      ok: function () {
        // First clear all variable ranges in Redux state;
        self.props.clearAllVariableRanges();
        // Then let VariableRanges component know this happened because it needs
        // to update its local state accordingly.
        self.variableRangesRef.current.clearAllVariableRanges();
      },
      cancel: function () {
        // Do nothing if cancel. The confirmation dialog will just close.
      },
    });
  };

  clearAllThreeDVariableUserRanges = () => {
    const self = this;
    dialog.confirm({
      title: "Clear All 3D Variable Ranges",
      message: "This will erase all 3D Legend Min and Max values that have been entered.",
      ok: function () {
        // First clear all variable ranges in Redux state;
        self.props.clearAllThreeDVariableUserRanges();
        // Then let VariableRanges component know this happened because it needs
        // to update its local state accordingly.
        self.threeDVariableRangesRef.current.clearAllVariableRanges();
      },
      cancel: function () {
        // Do nothing if cancel. The confirmation dialog will just close.
      },
    });
  };

  clearAllVariableAliasLabels = () => {
    const self = this;
    dialog.confirm({
      title: "Clear All Variable Alias Labels",
      message: "This will erase all labels that have been entered.",
      ok: function () {
        self.props.clearAllVariableAliasLabels();
      },
      cancel: function () {
        // Do nothing if cancel. The confirmation dialog will just close.
      },
    });
  };

  render() {
    let axes_variables = [];
    let disabledLogVariables = [];
    for (let axes_variable of this.props.axes_variables) {
      const index = axes_variable.key;
      const scale_type = this.props.axes_variables_scale?.[index] ?? "Linear";
      axes_variables.push({
        index: index,
        "Axis Type": scale_type,
        // 'Alex Testing Bool True': true,
        // 'Alex Testing Bool False': false,
        disabled: false,
        hidden: false,
        lastSelected: false,
        name: this.props.variable_aliases[index] ?? axes_variable.name,
        selected: false,
        tooltip: "",
      });

      // Check if variable is numeric
      const isNumericVariable =
        this.props.numericScatterplotVariables.find((variable) => variable.key === index) !==
        undefined;
      // Check if variable is greater than zero
      const isGreaterThanZero = this.props.table_statistics?.[index]?.min > 0;
      // Check if custom axis min variable range is 0 or less
      const isCustomAxisMinZeroOrLess = this.props.variableRanges?.[index]?.min <= 0;
      // If not numeric or not greater than zero or custom min variablel range is 0 or less,
      // add to disabledLogVariables
      // so we don't allow them for log scales.
      if (!isNumericVariable || !isGreaterThanZero || isCustomAxisMinZeroOrLess) {
        disabledLogVariables.push(index);
      }
    }
    // Testing various properties
    // axes_variables[1].disabled = true;
    // axes_variables[1].tooltip = 'Alex Testing Tooltip';
    // axes_variables[1].selected = true;

    let axes_properties = [
      {
        name: "Axis Type",
        type: "select",
        values: ["Linear", "Date & Time", "Log"],
        disabledValues: {
          Log: disabledLogVariables,
        },
      },
    ];
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
      { name: "Arial", fontFamily: "Arial" },
      { name: "Arial Black", fontFamily: "Arial Black" },
      { name: "Courier", fontFamily: "Courier" },
      { name: "Courier New", fontFamily: "Courier New" },
      { name: "Georgia", fontFamily: "Georgia" },
      { name: "Tahoma", fontFamily: "Tahoma" },
      { name: "Times", fontFamily: "Times" },
      { name: "Times New Roman", fontFamily: "Times New Roman" },
      { name: "Trebuchet MS", fontFamily: "Trebuchet MS" },
      { name: "Verdana", fontFamily: "Verdana" },
    ];

    const fontItems = fonts.map((font, index) => (
      <li key={index}>
        <a
          onClick={this.props.changeFontFamily}
          style={{ fontFamily: font.fontFamily }}
          className={`dropdown-item {font.fontFamily == this.props.font_family ? 'active' : 'notactive'}`}
          data-value={font.name}
        >
          {font.name}
        </a>
      </li>
    ));

    let scatterplotVariableRanges = (
      <>
        <VariableRanges
          variables={this.props.numericScatterplotVariables}
          variableRanges={this.props.variableRanges}
          setVariableRange={this.props.setVariableRange}
          clearVariableRange={this.props.clearVariableRange}
          inputLabel="Axis"
          ref={this.variableRangesRef}
          axesVariablesScale={this.props.axes_variables_scale}
        />
        <ClearAllButton
          label="Clear All Scatterplot Variable Ranges"
          disable={Object.keys(this.props.variableRanges).length === 0}
          handleClick={this.clearAllVariableRanges}
        />
      </>
    );

    return (
      <React.Fragment>
        {/* Defining custom CSS properties so non-React code can use customized font size
            and family as defined in this UI. Technically <style> elements are not allowed
            inside the <body> tag, but browsers have no problem with it. This should go away once we
            are converted to React. */}
        <style type="text/css">
          :root
          {`{
          --custom-font-size: ${this.props.font_size}px;
          --custom-font-family: ${this.props.font_family};
        }`}
        </style>

        <div className="modal fade" data-bs-backdrop="false" id={this.modalId}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h3 className="modal-title">{this.title}</h3>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                  onClick={this.closeModal}
                ></button>
              </div>
              <div className="modal-body">
                <ul className="nav nav-tabs" role="tablist">
                  <li className="nav-item">
                    <a
                      className="nav-link active"
                      id="axes-scales-tab"
                      data-bs-toggle="tab"
                      href="#axes-scales-tab-content"
                      role="tab"
                      aria-controls="axes-scales-tab-content"
                      aria-selected="true"
                    >
                      <h5 className="mb-0">Axes Scales</h5>
                    </a>
                  </li>
                  <li className="nav-item">
                    <a
                      className="nav-link"
                      id="variable-ranges-tab"
                      data-bs-toggle="tab"
                      href="#variable-ranges-tab-content"
                      role="tab"
                      aria-controls="variable-ranges-tab-content"
                      aria-selected="false"
                    >
                      <h5 className="mb-0">Variable Ranges</h5>
                    </a>
                  </li>
                  {/* Show variable alias labels UI only to non-readers  */}
                  {this.props.userRole != "reader" && (
                    <li className="nav-item">
                      <a
                        className="nav-link"
                        id="variable-alias-tab"
                        data-bs-toggle="tab"
                        href="#variable-alias-tab-content"
                        role="tab"
                        aria-controls="variable-alias-tab-content"
                        aria-selected="false"
                      >
                        <h5 className="mb-0">Variable Alias Labels</h5>
                      </a>
                    </li>
                  )}
                  <li className="nav-item">
                    <a
                      className="nav-link"
                      id="scatterplot-options-tab"
                      data-bs-toggle="tab"
                      href="#scatterplot-options-tab-content"
                      role="tab"
                      aria-controls="scatterplot-options-tab-content"
                      aria-selected="false"
                    >
                      <h5 className="mb-0">Plot Options</h5>
                    </a>
                  </li>
                </ul>

                <div className="tab-content mt-4 mb-2 mx-3">
                  <div
                    className="tab-pane active"
                    id="axes-scales-tab-content"
                    role="tabpanel"
                    aria-labelledby="axes-scales-tab"
                  >
                    <div className="slycat-axes-font">
                      <div className="row align-items-center gx-2">
                        <div className="col-auto">
                          <label className="col-form-label" htmlFor="font-family">
                            Font
                          </label>
                        </div>
                        <div className="col-auto">
                          <div className="input-group input-group-sm dropdown font-family-dropdown">
                            <button
                              className="btn btn-sm border-secondary text-dark dropdown-toggle"
                              type="button"
                              id="font-family"
                              data-bs-toggle="dropdown"
                              aria-haspopup="true"
                              aria-expanded="false"
                              style={{ fontFamily: this.props.font_family }}
                            >
                              {this.props.font_family}
                            </button>
                            <ul className="dropdown-menu" aria-labelledby="dropdownMenu1">
                              {fontItems}
                            </ul>
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              title="Reset font family to default"
                              value={DEFAULT_FONT_FAMILY}
                              onClick={this.props.changeFontFamily}
                              disabled={this.props.font_family == DEFAULT_FONT_FAMILY}
                            >
                              <FontAwesomeIcon icon={faUndo} />
                            </button>
                          </div>
                        </div>
                        <div className="col-auto">
                          <label className="ms-5 col-form-label" htmlFor="font-size">
                            Size
                          </label>
                        </div>
                        <div className="col-auto">
                          <div className="input-group input-group-sm">
                            <input
                              type="number"
                              className="form-control form-control-sm border border-secondary"
                              id="font-size"
                              max="40"
                              min="8"
                              step="1"
                              style={{ width: "70px" }}
                              value={this.props.font_size}
                              onChange={this.props.changeFontSize}
                            />
                            <button
                              className="btn btn-outline-secondary"
                              type="button"
                              title="Reset font size to default"
                              value={DEFAULT_FONT_SIZE}
                              disabled={this.props.font_size == DEFAULT_FONT_SIZE}
                              onClick={this.props.changeFontSize}
                            >
                              <FontAwesomeIcon icon={faUndo} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <hr />
                    <SlycatTableIngestion
                      uniqueID="varOptions"
                      variables={axes_variables}
                      properties={axes_properties}
                      onChange={this.props.changeAxesVariableScale}
                    />
                  </div>
                  <div
                    className="tab-pane"
                    id="variable-ranges-tab-content"
                    role="tabpanel"
                    aria-labelledby="variable-ranges-tab"
                  >
                    {/* Show this scatterplot variable ranges UI on its own when there are no 3D variables.  */}
                    {this.props.threeDVariables.length == 0 && <>{scatterplotVariableRanges}</>}
                    {/* When there are 3D variables, show both variable ranges components inside an accordion */}
                    {this.props.threeDVariables.length > 0 && (
                      <div className="accordion" id="accordionRanges">
                        <div className="card">
                          <div className="card-header" id="headingOne">
                            <h2 className="mb-0">
                              <button
                                className="btn btn-link btn-block text-center"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#collapseOne"
                                aria-expanded="true"
                                aria-controls="collapseOne"
                              >
                                Scatterplot Variables
                                <Caret />
                              </button>
                            </h2>
                          </div>
                          <div
                            id="collapseOne"
                            className="collapse show"
                            aria-labelledby="headingOne"
                            data-parent="#accordionRanges"
                          >
                            <div className="card-body">{scatterplotVariableRanges}</div>
                          </div>
                        </div>
                        <div className="card">
                          <div className="card-header" id="headingTwo">
                            <h2 className="mb-0">
                              <button
                                className="btn btn-link btn-block text-center collapsed"
                                type="button"
                                data-bs-toggle="collapse"
                                data-bs-target="#collapseTwo"
                                aria-expanded="false"
                                aria-controls="collapseTwo"
                              >
                                3D Variables
                                <Caret />
                              </button>
                            </h2>
                          </div>
                          <div
                            id="collapseTwo"
                            className="collapse"
                            aria-labelledby="headingTwo"
                            data-parent="#accordionRanges"
                          >
                            <div className="card-body">
                              <VariableRanges
                                variables={this.props.threeDVariables}
                                variableRanges={this.props.three_d_variable_user_ranges}
                                setVariableRange={this.props.setThreeDVariableUserRange}
                                clearVariableRange={this.props.clearThreeDVariableUserRange}
                                inputLabel="3D Legend"
                                ref={this.threeDVariableRangesRef}
                              />
                              <ClearAllButton
                                label="Clear All 3D Variable Ranges"
                                disable={
                                  Object.keys(this.props.three_d_variable_user_ranges).length === 0
                                }
                                handleClick={this.clearAllThreeDVariableUserRanges}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Show variable alias labels UI only to non-readers  */}
                  {this.props.userRole != "reader" && (
                    <div
                      className="tab-pane"
                      id="variable-alias-tab-content"
                      role="tabpanel"
                      aria-labelledby="variable-alias-tab"
                    >
                      <VariableAliasLabels
                        variableAliases={this.props.variable_aliases}
                        metadata={this.props.metadata}
                        onChange={this.props.changeVariableAliasLabels}
                      />
                    </div>
                  )}
                  <div
                    className="tab-pane"
                    id="scatterplot-options-tab-content"
                    role="tabpanel"
                    aria-labelledby="scatterplot-options-tab"
                  >
                    <ScatterplotOptions />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <div className="me-auto">
                  <button
                    type="button"
                    className="btn btn-danger me-2 tabDependent variable-alias-tab-content d-none"
                    disabled={Object.keys(this.props.variable_aliases).length === 0}
                    onClick={this.clearAllVariableAliasLabels}
                  >
                    Clear All Variable Alias Labels
                  </button>
                </div>
                <button type="button" className="btn btn-primary" onClick={this.closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        <ControlsButton
          icon="gear"
          title={this.title}
          data_toggle="modal"
          data_target={"#" + this.modalId}
          button_style={this.props.button_style}
          id="controls-button-var-options"
        />
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const variable_aliases = state.derived.variableAliases;

  const getVariableAlias = (index) => {
    if (variable_aliases[index] !== undefined) {
      return variable_aliases[index];
    }
    return ownProps.metadata["column-names"][index];
  };

  let indexCounter = 0;
  const numericScatterplotVariables = ownProps.metadata["column-names"].flatMap((name, index) => {
    if (ownProps.metadata["column-types"][index] != "string") {
      return [
        {
          key: index,
          index: indexCounter++,
          name: getVariableAlias(index),
          min: state.derived.table_statistics?.[index]?.min,
          max: state.derived.table_statistics?.[index]?.max,
        },
      ];
    }
    return [];
  });

  const threeDVariables = Object.entries(state.three_d_variable_data_ranges).map(
    ([key, value], index) => {
      // console.debug("threeDVariables", key, value, index);
      const [pointOrCell, varName, component] = key.split(":");
      const name = `${varName}${component ? `[${parseInt(component, 10) + 1}]` : ``}`;
      return {
        key: key,
        index: index,
        name: name,
        min: value.min,
        max: value.max,
      };
    },
  );

  return {
    font_size: state.fontSize,
    font_family: state.fontFamily,
    axes_variables_scale: state.axesVariables,
    variable_aliases: variable_aliases,
    variableRanges: state.variableRanges,
    numericScatterplotVariables: numericScatterplotVariables,
    threeDVariables: threeDVariables,
    three_d_variable_user_ranges: state.three_d_variable_user_ranges,
    userRole: state.derived.userRole,
    table_statistics: state.derived.table_statistics,
  };
};

export default connect(mapStateToProps, {
  changeFontSize,
  changeFontFamily,
  changeAxesVariableScale,
  changeVariableAliasLabels,
  clearAllVariableAliasLabels,
  setVariableRange,
  clearVariableRange,
  clearAllVariableRanges,
  setThreeDVariableUserRange,
  clearThreeDVariableUserRange,
  clearAllThreeDVariableUserRanges,
})(ControlsButtonVarOptions);
