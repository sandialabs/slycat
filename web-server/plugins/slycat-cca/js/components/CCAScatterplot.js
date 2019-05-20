import React from "react";
import { Provider } from 'react-redux';

import d3 from "d3";

import api_root from "js/slycat-api-root";

class CCAScatterplot extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      component: this.props.component,
    };

    // Create a ref to the .cca-barplot-table
    this.cca_scatterplot = React.createRef();
  }

  componentDidMount() {
    let self = this;

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

    this.update_x();
    this.update_y();
    this.update_color_domain();
    this.render_data();
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    
  }

  render_data = () =>
  {
    var width = this.main_canvas.width;
    var height = this.main_canvas.height;

    this.data_context.setTransform(1, 0, 0, 1, 0, 0);
    this.data_context.clearRect(0, 0, width, height);

    // Draw labels ...
    this.data_context.font = "10pt Arial";
    this.data_context.textAlign = "center";
    this.data_context.fillStyle = "black";

    this.data_context.save();
    this.data_context.textBaseline = "alphabetic";
    this.data_context.translate(width / 2, height - 5);
    this.data_context.fillText("Input Metavariable", 0, 0);
    this.data_context.restore();

    this.data_context.save();
    this.data_context.textBaseline = "top";
    this.data_context.translate(5, height / 2);
    this.data_context.rotate(-Math.PI / 2);
    this.data_context.fillText("Output Metavariable", 0, 0);
    this.data_context.restore();

    var count = this.props.x.length;
    var x = this.props.x;
    var y = this.props.y;
    var v = this.props.v;
    var indices = this.props.indices;
    var color = this.props.color;

    // Draw points using rectangles ...
    if(count < 50000)
    {
      var cx, cy,
       square_size = 8,
       border_width = 1,
       half_border_width = border_width / 2,
       fillWidth = square_size - (2 * border_width),
       fillHeight = fillWidth,
       strokeWidth = square_size - border_width,
       strokeHeight = strokeWidth;

      for(var i = 0; i != count; ++i)
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
      var size = 2;
      var offset = size / 2;
      for(var i = 0; i != count; ++i)
      {
        this.data_context.fillStyle = color(v[indices[i]]);
        this.data_context.fillRect(Math.round(this.x_scale(x[i]) - offset), Math.round(this.y_scale(y[i]) - offset), size, size);
      }
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
    this.x_scale = d3.scale.linear().domain([d3.min(this.props.x), d3.max(this.props.x)]).range([0 + this.props.border, this.main_canvas.width - this.props.border]);
  }

  update_y = () =>
  {
    this.y_scale = d3.scale.linear().domain([d3.min(this.props.y), d3.max(this.props.y)]).range([this.main_canvas.height - this.props.border, 0 + this.props.border]);
  }

  update_color_domain = () =>
  {
    var v_min = d3.min(this.props.v);
    var v_max = d3.max(this.props.v);
    var domain = []
    var domain_scale = d3.scale.linear().domain([0, this.props.color.domain().length]).range([v_min, v_max]);
    for(var i in this.props.color.domain())
      domain.push(domain_scale(i));
    this.props.color.domain(domain);
  }

  resize_canvas = () =>
  {
    let self = this;
  }

  clickComponent = (index, e) =>
  {
    this.setState({component: index});
  }

  render() {

    return (
      <React.Fragment>
        <React.StrictMode>
          <canvas id="scatterplot" 
            ref={this.cca_scatterplot} 
            width={this.props.width} 
            height={this.props.height} 
            style={{
              width: this.props.width + 'px', 
              height: this.props.height + 'px'
            }}
            ></canvas>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

export default CCAScatterplot
