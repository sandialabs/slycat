/* eslint-disable no-undef */
import React from "react";
import { connect } from 'react-redux';
import { setVariableSelected, setCCAComponentSelected, setCCAComponentSorted } from '../actions';

import _ from "lodash";
// Using scrollintoview jQuery plugin instead of browser built-in functionality (DOM's scrollIntoView() function).
// DOM's scrollIntoView() works but has problems: 
//   1. scrolls each time it's called, even when element is already visible, to bring it to top or bottom of scroll area.
//   2. always scrolls in both directions, displayin left edge of target element even if user 
//      has already scrolled horizontally to display other CCA components.
//   3. lacks animation when scrolling
//   4. always scrolls to top or bottom of scroll area instead of the least amount needed to make it visible
// The jQuery plugin solves all these issues.
import "js/jquery.scrollintoview.min";

class CCABarplot extends React.Component {
  constructor(props) {
    super(props);

    // Create a ref to the .cca-barplot-table
    this.cca_barplot_table = React.createRef();

    // Create array of objects that represent rows for inputs and outputs
    this.inputs_rows =[];
    this.outputs_rows = [];

    this.props.inputs.map((input, input_index) => {
      let row = {};
      row.index = input;
      row.name = this.props.metadata["column-names"][input]
      this.props.x_loadings.map((x_loading, x_loading_index) => {
        row['x_loading_' + x_loading_index] = x_loading[input_index];
        row['x_loading_' + x_loading_index + '_abs'] = Math.abs(x_loading[input_index]);
      });
      this.inputs_rows.push(row);
    });
    this.props.outputs.map((output, output_index) => {
      let row = {};
      row.index = output;
      row.name = this.props.metadata["column-names"][output]
      this.props.y_loadings.map((y_loading, y_loading_index) => {
        row['y_loading_' + y_loading_index] = y_loading[output_index];
        row['y_loading_' + y_loading_index + '_abs'] = Math.abs(y_loading[output_index]);
      });
      this.outputs_rows.push(row);
    });
  }

  /* Sizing table */
  tableHeight = null;
  inputsHeight = null;
  outputsHeight = null;

  componentDidMount() {
    let barplotGroupOutputs = $('.barplotGroup.outputs');
    let barplotGroupInputs = $('.barplotGroup.inputs');
    let barplotViewport = $('.barplotViewport');

    /* Sizing table */
    this.tableHeight = $('#barplot-table').height();
    this.inputsHeight = $('.barplotGroup.inputs').height();
    this.outputsHeight = $('.barplotGroup.outputs').height();

    this.scroll_selected_component_into_view();
    this.resize_canvas();

    $(".barplotCanvas.input").bind("scroll", function(){
      $(".barplotHeaderColumns").css("margin-left", "-" + $(this).scrollLeft() + "px");
      $(".barplotColumn.input").css("margin-top", "-" + $(this).scrollTop() + "px");
    });

    $(".barplotCanvas.output").bind("scroll", function(){
      $(".barplotHeaderColumns").css("margin-left", "-" + $(this).scrollLeft() + "px");
      $(".barplotColumn.output").css("margin-top", "-" + $(this).scrollTop() + "px");
      $(".barplotCanvas.input").scrollLeft( $(this).scrollLeft() );
    });

    // Resizing functionality
    let barplotGroupOutputsOriginalHeight = barplotGroupOutputs.height();
    barplotGroupInputs.resizable({
      containment: barplotViewport,
      handles: "s",
      minHeight: Math.max(4, barplotViewport.height()-this.outputsHeight),
      maxHeight: this.inputsHeight,
      resize: function(event,ui){
        // ui.size.height is unreliable, so getting the new height directly from element
        barplotGroupOutputs.height( barplotGroupOutputsOriginalHeight + (ui.originalSize.height - ui.element.height()) );
      },
      start: function(event,ui){
        barplotGroupOutputsOriginalHeight = barplotGroupOutputs.height();
      },
    });
    // Shifting default resize handle to left to stop overlap over scrollbar.
    var barplotCanvasInputElement = $(".barplotCanvas.input")[0];
    var verticalScrollbarWidth = barplotCanvasInputElement.offsetWidth - barplotCanvasInputElement.clientWidth;
    var resizeHandle = $(".barplotGroup.inputs .ui-resizable-s").css("left", "-" + verticalScrollbarWidth + "px");

    // Adding hover class to resize handle
    resizeHandle.hover(function(){$(this).addClass("ui-resizable-hover");}, function(){$(this).removeClass("ui-resizable-hover");});

    // Adding toggle control to resize handle
    var toggleControl = $("<div class='toggle-control-s' />").appendTo(resizeHandle);
    toggleControl
      .hover(
        function(){
          $(this).addClass("toggle-control-hover");
          resizeHandle.removeClass("ui-resizable-hover");
        }, 
        function(){
          $(this).removeClass("toggle-control-hover");
          resizeHandle.addClass("ui-resizable-hover");
        }
      )
      .click(
        function(){
          var barplotGroupInputsHeight = barplotGroupInputs.height();
          var barplotGroupOutputsHeight = barplotGroupOutputs.height();
          var expanded = barplotGroupInputsHeight >= barplotGroupInputs.resizable("option", "maxHeight") || barplotGroupOutputsHeight == 0;
          if(expanded){
            var amountToCollapse = barplotGroupOutputsOriginalHeight - barplotGroupOutputsHeight;
            // In some edge cases, the amountToCollapse can come out to a negative number, in which case we don't want to expand
            if(amountToCollapse < 0) {
              amountToCollapse = 0;
            }
            barplotGroupInputs.height(barplotGroupInputsHeight - amountToCollapse);
            barplotGroupOutputs.height(barplotGroupOutputsHeight + amountToCollapse);
          } else {
            barplotGroupOutputsOriginalHeight = barplotGroupOutputs.height();
            var inputsMaxHeight = this.inputsHeight;
            var amountToExpand = Math.min(barplotGroupOutputsHeight, inputsMaxHeight-barplotGroupInputsHeight);
            barplotGroupOutputs.height(barplotGroupOutputsHeight - amountToExpand);
            barplotGroupInputs.height(barplotGroupInputsHeight + amountToExpand);
          }
        }
      );

    // Can't figure out how to do this in CSS so setting explicit height here :(
    $(".barplotHeaderColumn.mask.col0").height( $(".barplotHeader .barplotRow:first-child").height() );

    // When the component mounts, we scroll the selected variable and selected CCA component into view
    this.scroll_selected_variable_into_view();
    this.scroll_selected_component_into_view();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    // When the selected component changes, we need to scroll the first output cell of the selected component into view
    // and resize the table
    if (this.props.cca_component_selected !== prevProps.cca_component_selected)
    {
      this.scroll_selected_component_into_view();
      this.resize_canvas();
    }
    // When the sorted CCA component or its direction changes
    // or when the selected variable changes,
    // scroll the selected variable into view.
    if ( this.props.cca_component_sort_direction !== prevProps.cca_component_sort_direction ||
         this.props.cca_component_sorted !== prevProps.cca_component_sorted ||
         this.props.variable_selected !== prevProps.variable_selected
       )
    {
      this.scroll_selected_variable_into_view();
    }
  }

  sort_rows = () =>
  {
    if(this.props.cca_component_sorted != undefined)
    {
      // Default sort direction to descending
      this.sort_direction = this.props.cca_component_sort_direction != undefined ? this.props.cca_component_sort_direction : 'descending';
      // Translate sort direction to lodash terms
      let lodashDirection = this.sort_direction == 'ascending' ? 'asc' : 'desc';
      this.inputs_rows = _.orderBy(this.inputs_rows, ['x_loading_' + this.props.cca_component_sorted + '_abs'], [lodashDirection]);
      this.outputs_rows = _.orderBy(this.outputs_rows, ['y_loading_' + this.props.cca_component_sorted + '_abs'], [lodashDirection]);
    }
  }

  resize_canvas = () =>
  {
    let tableWidth = 20; // Adding space for scrollbars
    $(".barplotHeaderColumn", this.cca_barplot_table.current).each(
      function(index){
        let maxWidth = Math.max.apply( null, $(".col" + index + " .wrapper").map( function () {
          return $( this ).outerWidth(true);
        }).get() );
        $(".col" + index).width(maxWidth);
      }
    );

    // Width of table is set to sum of outerWidths(true), which includes content, padding, border, and margin, of all the columns.
    $(".barplotHeaderColumn", this.cca_barplot_table.current).each(
      function(index){
        tableWidth += $(this).outerWidth(true);
      }
    );

    let barplotPaneWidth = $('#barplot-pane').width();
    $('#barplot-table').width(Math.min(tableWidth, barplotPaneWidth));
    if(tableWidth > barplotPaneWidth) {
      $('.barplotCanvas.output').css("overflow", "scroll");
      $('.barplotCanvas.input').css("overflow-y", "scroll");
    } else {
      $('.barplotCanvas.output').css("overflow", "auto");
      $('.barplotCanvas.input').css("overflow-y", "auto");
    }

    // Assuming we need vertical resize for now. We add this class later after the table size is determined.
    $("#barplot-table").removeClass("noVerticalResize");

    let increaseHeight = 0;
    let barplotPaneHeight = $('#barplot-pane').height();
    $('#barplot-table').height(Math.min(this.tableHeight, barplotPaneHeight));
    let viewportHeight = $("#barplot-table").height() - $('.barplotHeader').outerHeight(true);
    if(this.tableHeight > barplotPaneHeight) {
      // Table is taller than pane, so need to size down inputs and/or output and make them scrollable
      let halfViewportHeight = Math.floor(viewportHeight / 2);
      if(this.inputsHeight > halfViewportHeight) {
        if(this.outputsHeight > halfViewportHeight) {
          // Both inputs and outputs are too big, so inputs get sized to 50% of available area and outputs get the rest. 
          // Sizing both to 50% of available area was causing problems in Chrome with fractions of pixels. 
          $(".barplotGroup.inputs").height( halfViewportHeight );
          $(".barplotGroup.outputs").height( viewportHeight - $(".barplotCanvas").height() );
        } else {
          // Only inputs need to be sized down
          $(".barplotGroup.inputs").height( viewportHeight - this.outputsHeight );
          $(".barplotGroup.outputs").height( this.outputsHeight );
        }
      } else {
        // Only outputs needs to be sized down
        $(".barplotGroup.inputs").height( this.inputsHeight );
        $(".barplotGroup.outputs").height( viewportHeight - this.inputsHeight );
      }
    } else {
      // We have room to show everything, so size things to their full height.
      $(".barplotGroup.inputs").height( this.inputsHeight );
      $(".barplotGroup.outputs").height( this.outputsHeight );
      // Check to see if we have horizontal scrollbars and try to make additional space for it
      let barplotCanvasOutputElement = $(".barplotCanvas.output")[0];
      let horizontalScrollbarHeight = barplotCanvasOutputElement.offsetHeight - barplotCanvasOutputElement.clientHeight;
      let extraSpace = barplotPaneHeight - this.tableHeight;
      increaseHeight = Math.min(horizontalScrollbarHeight, extraSpace);
      if(increaseHeight > 0) {
        $('#barplot-table').height( $('#barplot-table').height() + increaseHeight );
        $(".barplotGroup.outputs").height( $(".barplotGroup.outputs").height() + increaseHeight );
      }
      // Check to see if we need resizing
      if(horizontalScrollbarHeight <= extraSpace) {
        // We don't need resizing, so mark table as such so we can hide the resize handle
        $("#barplot-table").addClass("noVerticalResize");
      }
    }

    // Resetting the inputs resizer max height after table resize
    let barplotCanvasOutputElement = $(".barplotCanvas.output")[0];
    let horizontalScrollbarHeight = barplotCanvasOutputElement.offsetHeight - barplotCanvasOutputElement.clientHeight;
    // Making sure widget exists before calling methods on it.
    if($(".barplotGroup.inputs").data("ui-resizable"))
    {
      $(".barplotGroup.inputs").resizable("option", {
        // Need to take into account horizontal scroll bar height
        minHeight: Math.max(4, viewportHeight-(this.outputsHeight+horizontalScrollbarHeight-increaseHeight)),
        maxHeight: this.inputsHeight,
      });
    }
    // Shifting default resize handle to left to stop overlap over scrollbar.
    let barplotCanvasInputElement = $(".barplotCanvas.input")[0];
    let verticalScrollbarWidth = barplotCanvasInputElement.offsetWidth - barplotCanvasInputElement.clientWidth;
    $(".barplotGroup.inputs .ui-resizable-s").css("left", "-" + verticalScrollbarWidth + "px");
  }

  scroll_selected_component_into_view = () =>
  {
    // Scroll the first output cell of the selected component into view
    $(".rowOutput.selected-component", this.cca_barplot_table.current).first().scrollintoview({direction: "horizontal",});
  }

  scroll_selected_variable_into_view = () =>
  {
    // Scroll the selected variable row into view
    $(".barplotRow.selected-variable", this.cca_barplot_table.current).scrollintoview({direction: "vertical",});
  }

  render() {
    this.sort_rows();

    const barplotHeaderColumns = this.props.x_loadings.map((item, index) => (
      <div 
        className={`
          barplotHeaderColumn \
          col${index+1} \
          cca${index + 1} \
          ${this.props.cca_component_selected == index ? 'selected-component' : ''}
        `}
        key={index}
      >
        <div className='wrapper'>
          <div className='negativeSpacer spacer' />
          <div className='barplotHeaderColumnLabelWrapper'>
            <span className='selectCCAComponent' 
              onClick={() => this.props.setCCAComponentSelected(index)}>
              CCA{index + 1}
            </span>
            <span 
              className={`
                sortCCAComponent \
                ${this.props.cca_component_sorted == index ? 
                  (this.props.cca_component_sort_direction == 'ascending' ? 'icon-sort-ascending' : 'icon-sort-descending') : 
                  'icon-sort-off'}
              `}
              onClick={() => this.props.setCCAComponentSorted(index)}
            />
          </div>
          <div className='positiveSpacer spacer' />
        </div>
      </div>
    ));

    const rSquaredStatistics = this.props.x_loadings.map((item, index) => (
      <div 
        className={`barplotCell col${index+1} \
          ${this.props.cca_component_selected == index ? 'selected-component' : ''}`} 
        key={index}
      >
        <div className='wrapper'>
          <div className='negativeSpacer spacer' />
          <div className='barplotCellValue'>
            {Number(this.props.r2[index]).toFixed(3)}
          </div>
          <div className='positiveSpacer spacer' />
        </div>
      </div>
    ));


    const pStatistics = this.props.x_loadings.map((item, index) => (
      <div 
        className={`barplotCell col${index+1} \
          ${this.props.cca_component_selected == index ? 'selected-component' : ''}`} 
        key={index}
      >
        <div className='wrapper'>
          <div className='negativeSpacer spacer' />
          <div className='barplotCellValue'>
            {Number(this.props.wilks[index]).toFixed(3)}
          </div>
          <div className='positiveSpacer spacer' />
        </div>
      </div>
    ));

    const negative_bar_width = (value) =>
    {
      return value < 0 ? -100 * value + "px" : "0px";
    }

    const positive_bar_width = (value) =>
    {
      return value > 0 ? 100 * value + "px" : "0px";
    }

    const input_labels =
      (<div className='barplotColumn input'>
        {this.inputs_rows.map((inputs_item, inputs_index) => 
          (<div 
            className={`barplotCell col0 rowInput inputLabel \
              row${inputs_index} \
              variable${inputs_item.index} \
              ${this.props.variable_selected == inputs_item.index ? 'selected-variable' : ''} \
              `}
            data-loadings_index={inputs_index}
            data-variable={inputs_item.index}
            key={inputs_index}
            onClick={() => this.props.setVariableSelected(inputs_item.index)}
          >
            <div className='wrapper'>
              {inputs_item.name}
            </div>
          </div>)
        )}
      </div>)
    ;

    const input_values = 
      (<div className='barplotCanvas input'>
        {this.inputs_rows.map((inputs_item, inputs_index) => 
          (<div 
            className={`barplotRow rowInput \
              row${inputs_index} \
              variable${inputs_item.index} \
              ${this.props.variable_selected == inputs_item.index ? 'selected-variable' : ''} \
              `}
            data-loadings_index={inputs_index}
            data-variable={inputs_item.index}
            key={inputs_index}
            onClick={() => this.props.setVariableSelected(inputs_item.index)}
          >
            {this.props.x_loadings.map((x_loadings_item, x_loadings_index) =>
              (<div 
                className={`barplotCell rowInput \
                  row${inputs_index} \
                  col${x_loadings_index+1} \
                  variable${inputs_item.index} \
                  ${this.props.cca_component_selected == x_loadings_index ? 'selected-component' : ''} \
                  ${this.props.variable_selected == inputs_item.index ? 'selected-variable' : ''} \
                  `}
                key={x_loadings_index}
              >
                <div className='wrapper'>
                  <div className='negativeSpacer spacer'>
                    <div className={`negative cca${x_loadings_index + 1}`} 
                      style={{width: negative_bar_width(inputs_item['x_loading_' + x_loadings_index])}}
                    />
                  </div>
                  <div className='barplotCellValue'>
                    {Number(inputs_item['x_loading_' + x_loadings_index]).toFixed(3)}
                  </div>
                  <div className='positiveSpacer spacer'>
                    <div className={`positive cca${x_loadings_index + 1}`} 
                      style={{width: positive_bar_width(inputs_item['x_loading_' + x_loadings_index])}}
                    />
                  </div>
                </div>
              </div>)
            )}
          </div>)
        )}
      </div>)
    ;

    const output_labels =
      (<div className='barplotColumn output'>
        {this.outputs_rows.map((outputs_item, outputs_index) =>
          (<div 
            className={`barplotCell col0 rowOutput outputLabel \
              row${outputs_index + this.props.inputs.length} \
              variable${outputs_item.index} \
              ${this.props.variable_selected == outputs_item.index ? 'selected-variable' : ''} \
              `}
            data-loadings_index={outputs_index}
            data-variable={outputs_item.index}
            key={outputs_index}
            onClick={() => this.props.setVariableSelected(outputs_item.index)}
          >
            <div className='wrapper'>
              {outputs_item.name}
            </div>
          </div>)
        )}
      </div>)
    ;

    const output_values =
      (<div className='barplotCanvas output'>
        {this.outputs_rows.map((outputs_item, outputs_index) =>
          (<div 
            className={`barplotRow rowOutput \
              row${outputs_index + this.props.inputs.length} \
              variable${outputs_item.index} \
              ${this.props.variable_selected == outputs_item.index ? 'selected-variable' : ''} \
              `}
            data-loadings_index={outputs_index}
            data-variable={outputs_item.index}
            key={outputs_index}
            onClick={() => this.props.setVariableSelected(outputs_item.index)}
          >
            {this.props.y_loadings.map((y_loadings_item, y_loadings_index) =>
              (<div 
                className={`barplotCell rowOutput \
                  row${outputs_index + this.props.inputs.length} \
                  col${y_loadings_index+1} \
                  variable${outputs_item.index} \
                  ${this.props.cca_component_selected == y_loadings_index ? 'selected-component' : ''} \
                  ${this.props.variable_selected == outputs_item.index ? 'selected-variable' : ''} \
                  `}
                key={y_loadings_index}
              >
                <div className='wrapper'>
                  <div className='negativeSpacer spacer'>
                    <div className={`negative cca${y_loadings_index + 1}`} 
                      style={{width: negative_bar_width(outputs_item['y_loading_' + y_loadings_index])}}
                    />
                  </div>
                  <div className='barplotCellValue'>
                    {Number(outputs_item['y_loading_' + y_loadings_index]).toFixed(3)}
                  </div>
                  <div className='positiveSpacer spacer'>
                    <div className={`positive cca${y_loadings_index + 1}`} 
                      style={{width: positive_bar_width(outputs_item['y_loading_' + y_loadings_index])}}
                    />
                  </div>
                </div>
              </div>)
            )}
          </div>)
        )}
      </div>)
    ;

    return (
      <React.Fragment>
        <React.StrictMode>
          <div className='cca-barplot-table' ref={this.cca_barplot_table}>
            <div className='barplotHeader'>
              <div className='barplotRow'>
                <div className='barplotHeaderColumn mask col0'>
                  <div className='wrapper'>&nbsp;</div>
                </div>
                <div className='barplotHeaderColumns'>
                  {barplotHeaderColumns}
                </div>
              </div>
              <div className='barplotRow'>
                <div className='barplotCell mask col0' id='rsquared-label'>
                  <div className='wrapper'>R<sup>2</sup></div>
                </div>
                <div className='barplotHeaderColumns'>
                  {rSquaredStatistics}
                </div>
              </div>
              <div className='barplotRow'>
                <div className='barplotCell mask col0'>
                  <div className='wrapper'>P</div>
                </div>
                <div className='barplotHeaderColumns'>
                  {pStatistics}
                </div>
              </div>
            </div>
            <div className='barplotViewport'>
              <div className='barplotGroup inputs'>
                {input_labels}
                {input_values}
              </div>
              <div className='barplotGroup outputs'>
                {output_labels}
                {output_values}
              </div>
            </div>
          </div>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => {
  return {
    variable_selected: state.variable_selected,
    cca_component_selected: state.cca_component_selected,
    cca_component_sorted: state.cca_component_sorted,
    cca_component_sort_direction: state.cca_component_sort_direction,
    metadata: state.derived.table_metadata,
    inputs: state.derived.input_columns,
    outputs: state.derived.output_columns,
    r2: state.derived.r2,
    wilks: state.derived.wilks,
    x_loadings: state.derived.x_loadings,
    y_loadings: state.derived.y_loadings,
  }
};

export default connect(
  mapStateToProps,
  { 
    setVariableSelected, 
    setCCAComponentSelected,
    setCCAComponentSorted,
  }
)(CCABarplot)
