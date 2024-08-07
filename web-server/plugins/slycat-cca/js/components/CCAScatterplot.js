import $ from 'jquery';

import React from "react";
import { connect } from 'react-redux';
import { 
  setSimulationsSelected,
  addSimulationsSelected, 
  toggleSimulationsSelected 
} from '../actions';

import d3 from "d3";
import _ from "lodash";

import CCALegend from "./CCALegend";
import slycat_color_maps from "js/slycat-color-maps";

class CCAScatterplot extends React.Component {
  constructor(props) 
  {
    super(props);

    // Create a ref to the .cca-barplot-table
    this.cca_scatterplot = React.createRef();
  }

  componentDidMount() 
  {
    this.prep();
    this.update_indices();
    this.update_x();
    this.update_y();

    // We need v, so don't continue past here without it
    if(this.props.v === undefined){
      return;
    }
    
    this.update_color_domain();
    this.render_data();
    this.render_selection();
  }

  componentDidUpdate(prevProps, prevState, snapshot) 
  {
    // We need v, so don't continue without it
    if(this.props.v === undefined){
      return;
    }

    // When indices change
    if(!_.isEqual(prevProps.indices, this.props.indices))
    {
      // console.log("CCAScatterplot, componentDidUpdate, indices changed");
      this.update_indices();
      this.render_selection();
    }
    // When x changes
    if(!_.isEqual(prevProps.x, this.props.x))
    {
      // console.log("CCAScatterplot, componentDidUpdate, x changed");
      this.update_x();
      this.render_data();
      this.render_selection();
    }
    // When y changes
    if(!_.isEqual(prevProps.y, this.props.y))
    {
      // console.log("CCAScatterplot, componentDidUpdate, y changed");
      this.update_y();
      this.render_data();
      this.render_selection();
    }
    // When v changes
    if(!_.isEqual(prevProps.v, this.props.v))
    {
      // console.log("CCAScatterplot, componentDidUpdate, v changed");
      this.update_color_domain();
      this.render_data();
      this.render_selection();
    }
    // When selection changes
    if(!_.isEqual(prevProps.selection, this.props.selection)) 
    {
      // console.log("CCAScatterplot, componentDidUpdate, selection changed");
      this.render_selection();
    }
    // When colormap changes
    if(prevProps.colormap != this.props.colormap) 
    {
      // console.log("CCAScatterplot, componentDidUpdate, color colormap");
      this.update_color_domain();
      this.render_data();
      this.render_selection();
    }
    // When width changes
    if(prevProps.width != this.props.width)
    {
      this.prep();
      this.update_x();
      this.render_data();
      this.render_selection();
    }
    // When height changes
    if(prevProps.height != this.props.height)
    {
      this.prep();
      this.update_y();
      this.render_data();
      this.render_selection();
    }
  }

  prep = () => {
    this.start_drag = null;
    this.end_drag = null;

    // Getting context of main visible canvas
    this.main_canvas = this.cca_scatterplot.current;
    this.main_context = this.main_canvas.getContext("2d");

    // Creating a new data canvas and getting its context
    this.data_canvas = document.createElement("canvas");
    this.data_canvas.width = this.props.width;
    this.data_canvas.height = this.props.height;
    this.data_context = this.data_canvas.getContext("2d");

    // Creating a new selection canvas and getting its context
    this.selection_canvas = document.createElement("canvas");
    this.selection_canvas.width = this.props.width;
    this.selection_canvas.height = this.props.height;
    this.selection_context = this.selection_canvas.getContext("2d");
  }

  handle_mouse_down = (e) =>
  {
    // Prevents selecting text in legend when dragging
    e.preventDefault();
    this.start_drag = [this._offsetX(e), this._offsetY(e)];
    this.end_drag = null;
  }

  handle_mouse_move = (e) =>
  {
    if(this.start_drag) // Mouse is down ...
      {
        if(this.end_drag) // Already dragging ...
        {
          this.end_drag = [this._offsetX(e), this._offsetY(e)];

          var width = this.props.width;
          var height = this.props.height;

          this.main_context.clearRect(0, 0, width, height);
          this.main_context.drawImage(this.data_canvas, 0, 0);
          this.main_context.drawImage(this.selection_canvas, 0, 0);
          this.main_context.fillStyle = "rgba(255, 255, 0, 0.3)";
          this.main_context.fillRect(
            this.start_drag[0], 
            this.start_drag[1], 
            this.end_drag[0] - this.start_drag[0], 
            this.end_drag[1] - this.start_drag[1]
          );
          this.main_context.strokeStyle = "rgb(255, 255, 0)";
          this.main_context.lineWidth = 2.0;
          this.main_context.strokeRect(
            this.start_drag[0], 
            this.start_drag[1], 
            this.end_drag[0] - this.start_drag[0], 
            this.end_drag[1] - this.start_drag[1]
          );
        }
        else
        {
          if(Math.abs(this._offsetX(e) - this.start_drag[0]) > this.props.drag_threshold 
            || Math.abs(this._offsetY(e) - this.start_drag[1]) > this.props.drag_threshold) // Start dragging ...
          {
            this.end_drag = [this._offsetX(e), this._offsetY(e)];
          }
        }
      }
  }

  handle_mouse_up = (e) =>
  {
    // Break out if the target was acutally inside the legend or the legend itself,
    // otherwise letting go of the legend after a drag deselects all selected scatterplot points by 
    // triggering this event.
    if(document.querySelector('#legend .legend').contains(e.target))
    {
      return;
    }

    let newSelection = [];

    // console.log("e.target: " + e.target);
    // console.log("e.currentTarget: " + e.currentTarget);

    let x = this.props.x;
    let y = this.props.y;
    let count = x.length;

    if(this.start_drag && this.end_drag) // Rubber-band selection ...
    {
      let x1 = this.x_scale.invert(Math.min(this.start_drag[0], this.end_drag[0]));
      let y1 = this.y_scale.invert(Math.max(this.start_drag[1], this.end_drag[1]));
      let x2 = this.x_scale.invert(Math.max(this.start_drag[0], this.end_drag[0]));
      let y2 = this.y_scale.invert(Math.min(this.start_drag[1], this.end_drag[1]));

      for(let i = 0; i != count; ++i)
      {
        if(x1 <= x[i] && x[i] <= x2 && y1 <= y[i] && y[i] <= y2)
        {
          newSelection.push(this.props.indices[i]);
        }
      }
      if(e.ctrlKey || e.metaKey) {
        this.props.addSimulationsSelected(newSelection);
      }
      else {
        this.props.setSimulationsSelected(newSelection);
      }
    }
    else // Pick selection ...
    {
      let x1 = this.x_scale.invert(this._offsetX(e) - this.props.pick_distance);
      let y1 = this.y_scale.invert(this._offsetY(e) + this.props.pick_distance);
      let x2 = this.x_scale.invert(this._offsetX(e) + this.props.pick_distance);
      let y2 = this.y_scale.invert(this._offsetY(e) - this.props.pick_distance);

      for(let i = count-1; i > -1; i--)
      {
        if(x1 <= x[i] && x[i] <= x2 && y1 <= y[i] && y[i] <= y2)
        {
          newSelection.push(this.props.indices[i]);
          break;
        }
      }
      if(e.ctrlKey || e.metaKey) {
        this.props.toggleSimulationsSelected(newSelection);
      }
      else {
        this.props.setSimulationsSelected(newSelection);
      }
    }

    this.start_drag = null;
    this.end_drag = null;
  }

  render_data = () =>
  {
    let width = this.main_canvas.width;
    let height = this.main_canvas.height;

    this.data_context.setTransform(1, 0, 0, 1, 0, 0);
    this.data_context.clearRect(0, 0, width, height);

    // Draw labels ...
    this.data_context.font = this.props.font_size + " " + this.props.font_family;
    this.data_context.textAlign = "center";
    this.data_context.fillStyle = "black";

    this.data_context.save();
    this.data_context.textBaseline = "alphabetic";
    this.data_context.translate(
      ((width - this.props.border.left - this.props.border.right) / 2) + this.props.border.left, 
      height - this.props.border.bottom + this.props.label_offset.x
    );
    this.data_context.fillText("Input Metavariable", 0, 0);
    this.data_context.restore();

    this.data_context.save();
    this.data_context.textBaseline = "top";
    this.data_context.translate(
      this.props.border.left - this.props.label_offset.y, 
      ((height - this.props.border.top - this.props.border.bottom) / 2) + this.props.border.top
    );
    this.data_context.rotate(-Math.PI / 2);
    this.data_context.fillText("Output Metavariable", 0, 0);
    this.data_context.restore();

    let count = this.props.x.length;
    let x = this.props.x;
    let y = this.props.y;
    let v = this.props.v;
    let indices = this.props.indices;
    let color = this.color;

    // Draw points using rectangles ...
    if(count < 50000)
    {
      let cx, cy,
       square_size = 8,
       border_width = 1,
       half_border_width = border_width / 2,
       fillWidth = square_size - (2 * border_width),
       fillHeight = fillWidth,
       strokeWidth = square_size - border_width,
       strokeHeight = strokeWidth;

      for(let i = 0; i != count; ++i)
      {
        cx = Math.round( this.x_scale(x[i]) - (square_size/2) - border_width );
        cy = Math.round( this.y_scale(y[i]) - (square_size/2) - border_width );
        this.data_context.fillStyle = color(v[indices[i]]);
        this.data_context.fillRect(cx + border_width, cy + border_width, fillWidth, fillHeight);
        this.data_context.strokeRect(cx + half_border_width, cy + half_border_width, strokeWidth, strokeHeight);
      }
    }
    // Draw points using tiny rectangles ...
    else
    {
      let size = 2;
      let offset = size / 2;
      for(let i = 0; i != count; ++i)
      {
        this.data_context.fillStyle = color(v[indices[i]]);
        this.data_context.fillRect(Math.round(this.x_scale(x[i]) - offset), Math.round(this.y_scale(y[i]) - offset), size, size);
      }
    }

    this.render_data_selection();
  }

  render_selection = () =>
  {
    var x = this.props.x;
    var y = this.props.y;
    var v = this.props.v;
    var color = this.color;
    var indices = this.props.indices;

    this.selection_context.setTransform(1, 0, 0, 1, 0, 0);
    this.selection_context.clearRect(0, 0, this.props.width, this.props.height);

    var selection_count = this.props.selection.length;
    var cx, cy,
       square_size = 16,
       border_width = 2,
       half_border_width = border_width / 2,
       fillWidth = square_size - (2 * border_width),
       fillHeight = fillWidth,
       strokeWidth = square_size - border_width,
       strokeHeight = strokeWidth;

    this.selection_context.strokeStyle = "black";
    this.selection_context.lineWidth = border_width;

    for(var i = 0; i != selection_count; ++i)
    {
      var global_index = this.props.selection[i];
      var local_index = this.inverse_indices[global_index];
      this.selection_context.fillStyle = color(v[global_index]);
      cx = Math.round( this.x_scale(x[local_index]) - (square_size/2) - border_width );
      cy = Math.round( this.y_scale(y[local_index]) - (square_size/2) - border_width );
      this.selection_context.fillRect(cx + border_width, cy + border_width, fillWidth, fillHeight);
      this.selection_context.strokeRect(cx + half_border_width, cy + half_border_width, strokeWidth, strokeHeight);
    }

    this.render_data_selection();
  }

  render_data_selection = () =>
  {
    this.main_context.clearRect(0, 0, this.props.width, this.props.height);
    this.main_context.drawImage(this.data_canvas, 0, 0);
    this.main_context.drawImage(this.selection_canvas, 0, 0);
  }

  update_x = () =>
  {
    this.x_scale = d3.scale.linear()
      .domain([d3.min(this.props.x), d3.max(this.props.x)])
      .range([0 + this.props.border.left, this.main_canvas.width - this.props.border.right])
      ;
  }

  update_y = () =>
  {
    this.y_scale = d3.scale.linear()
      .domain([d3.min(this.props.y), d3.max(this.props.y)])
      .range([this.main_canvas.height - this.props.border.bottom, 0 + this.props.border.top])
      ;
  }

  update_color_domain = () =>
  {
    // console.log("CCAScatterplot update_color_domain()");
    this.color = slycat_color_maps.get_color_scale(this.props.colormap);
    var v_min = d3.min(this.props.v);
    var v_max = d3.max(this.props.v);
    var domain = []
    var domain_scale = d3.scale.linear().domain([0, this.color.domain().length]).range([v_min, v_max]);
    for(var i in this.color.domain()) {
      domain.push(domain_scale(i));
    }
    this.color.domain(domain);
  }

  update_indices = () =>
  {
    this.inverse_indices = {};
    var count = this.props.indices.length;
    for(var i = 0; i != count; ++i) {
      this.inverse_indices[this.props.indices[i]] = i;
    }
  }

  _offsetX = (e) =>
  {
    return e.pageX - e.currentTarget.getBoundingClientRect().left - $(document).scrollLeft();
  }

  _offsetY = (e) =>
  {
    return e.pageY - e.currentTarget.getBoundingClientRect().top - $(document).scrollTop();
  }

  resize_canvas = () =>
  {
    
  }

  render() {
    return (
      <React.Fragment>
        <React.StrictMode>
          <div 
            // This container div is necessary because event handlers must be attached to a parent of both 
            // the legend and the canvas, since the legend's svg element covers up the canvas element
            style={{
              width: '100%', 
              height: '100%',
              background: this.props.background,
            }}
            onMouseDown={this.handle_mouse_down}
            onMouseMove={this.handle_mouse_move}
            onMouseUp={this.handle_mouse_up}
          >
            <canvas id='scatterplot' 
              ref={this.cca_scatterplot} 
              width={this.props.width} 
              height={this.props.height} 
              style={{
                width: this.props.width + 'px', 
                height: this.props.height + 'px'
              }}
            />
            <CCALegend
              height={this.props.height - this.props.border.top - this.props.border.bottom}
              canvas_width={this.props.width} 
              canvas_height={this.props.height} 
              position={{
                x: this.props.width - this.props.border.left - this.props.border.right,
                y: this.props.border.top
              }}
            />
            
          </div>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  let v = state.derived.column_data[state.variable_selected] !== undefined ?
    state.derived.column_data[state.variable_selected].values :
    undefined;

  return {
    indices: state.derived.indices,
    x: state.derived.x[state.cca_component_selected],
    y: state.derived.y[state.cca_component_selected],
    v: v,
    colormap: state.colormap,
    selection: state.simulations_selected,
    gradient: slycat_color_maps.get_gradient_data(state.colormap),
    background: slycat_color_maps.get_background(state.colormap).toString(),
    width: state.derived.scatterplot_width,
    height: state.derived.scatterplot_height,
  }
};

export default connect(
  mapStateToProps,
  {
    setSimulationsSelected,
    addSimulationsSelected,
    toggleSimulationsSelected,
  }
)(CCAScatterplot)
