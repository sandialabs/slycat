import React from "react";
import { connect } from 'react-redux';

import d3 from "d3";

import slycat_color_maps from "js/slycat-color-maps";
class CCALegend extends React.Component 
{
  constructor(props) {
    super(props);

    // Create refs
    this.legend_layer_ref = React.createRef();
    this.legend_axis_layer_ref = React.createRef();
  }

  componentDidMount() 
  {
    this.legend_layer = d3.select(this.legend_layer_ref.current);
    this.legend_axis_layer = d3.select(this.legend_axis_layer_ref.current);

    this.update_legend_axis();

    // Handles moving the legend with mouse drag
    let self = this;
    this.legend_layer.call(
      d3.behavior.drag()
        .on('drag', function(){
          // Make sure mouse is inside scatterplot
          if( 0 <= d3.event.y && d3.event.y <= self.props.canvas_height && 0 <= d3.event.x && d3.event.x <= self.props.canvas_width ){
            var theElement = d3.select(this);
            var transx = Number(theElement.attr("data-transx"));
            var transy = Number(theElement.attr("data-transy"));
            transx += d3.event.dx;
            transy += d3.event.dy;
            theElement.attr("data-transx", transx);
            theElement.attr("data-transy", transy);
            theElement.attr('transform', "translate(" + transx + ", " + transy + ")");
          }
        })
        .on("dragstart", function() {
          self.state = "moving";
          d3.event.sourceEvent.stopPropagation(); // silence other listeners
        })
        .on("dragend", function() {
          self.state = "";
          d3.select(this).attr("data-status", "moved");
        })
    );
  }

  componentDidUpdate(prevProps, prevState, snapshot) 
  {
    this.update_legend_axis();
  }

  update_legend_axis = () =>
  {
    var range = [0, parseInt(this.props.height)];

    // Legend scale never goes Log, so we don't pass the v_axis_type parameter to ensure that.
    // self.legend_scale = self._createScale(self.options.v_string, self.options.scale_v, range, true, self.options.v_axis_type);
    let legend_scale = this._createScale(this.props.v_string, this.props.scale_v, range, true);

    this.legend_axis = d3.svg.axis()
      .scale(legend_scale)
      .orient("right")
      .ticks(range[1]/50)
      ;
    this.legend_axis_layer
      .attr("transform", "translate(" + parseInt(this.legend_layer.select("rect.color").attr("width")) + ",0)")
      .call(this.legend_axis)
      .style("font-size", this.props.scatterplot_font_size)
      .style("font-family", this.props.scatterplot_font_family)
      ;
  }

  _createScale = (string, values, range, reverse, type) =>
  {
    // console.log("_createScale: " + type);
    // Make a time scale for 'Date & Time' variable types
    if(type == 'Date & Time')
    {
      let dates = [];
      let date = NaN;
      for(let date of values)
      {
        // Make sure Date is valid before adding it to array, so we get a scale with usable min and max
        date = new Date(date.toString())
        if(!isNaN(date))
          dates.push(date);
      }
      // console.log("unsorted dates: " + dates);
      dates.sort(function(a, b){
        return a - b;
      });
      // console.log('sorted dates: ' + dates);
      var domain = [dates[0], dates[dates.length-1]];
      // console.log('domain: ' + domain);
      if(reverse === true)
      {
        domain.reverse();
      }
      return d3.time.scale()
        .domain(domain)
        .range(range)
        ;
    }
    // For numeric variables
    else if(!string)
    {
      // Log scale if 'Log' variable types
      if(type == 'Log')
      {
        var domain = [d3.min(values), d3.max(values)];
        if(reverse === true)
        {
          domain.reverse();
        }
        return d3.scale.log()
          .domain(domain)
          .range(range)
          ;
      }
      // Linear scale otherwise
      else 
      {
        var domain = [d3.min(values), d3.max(values)];
        if(reverse === true)
        {
          domain.reverse();
        }
        return d3.scale.linear()
          .domain(domain)
          .range(range)
          ;
      }
    }
    // For string variables, make an ordinal scale
    else
    {
      var uniqueValues = d3.set(values).values().sort();
      if(reverse === true)
      {
        uniqueValues.reverse();
      }
      return d3.scale.ordinal()
        .domain(uniqueValues)
        .rangePoints(range)
        ;
    }
  }

  handle_mouse_down = (e) =>
  {
    console.log('legend g mouse down');
  }

  handle_mouse_move = (e) =>
  {
    console.log('legend g mouse move');
  }

  handle_mouse_up = (e) =>
  {
    console.log('legend g mouse up');
  }

  render() {
    // Prevent rendering if certain props are undefined
    const requiredProps = [
      this.props.variable_selected_label,
      this.props.v_string,
    ];
    for(let requiredProp of requiredProps) {
      if(requiredProp === undefined) {
        return null;
      }
    }

    let label_x = -15;
    let label_y = this.props.height / 2;

    return (
      <React.Fragment>
        <React.StrictMode>
          <svg id="legend" 
            ref={this.cca_legend_ref} 
            width={"100%"} 
            height={"100%"} 
            // style={{opacity: ".99",}}
          >
            <g className="legend" 
              ref={this.legend_layer_ref} 
              transform={`translate(${this.props.position.x + 110},${this.props.position.y})`}
              data-transx={this.props.position.x + 110}
              data-transy={this.props.position.y}
              // These handlers are unused currently, but might be helpful in the future
              // onMouseDown={this.handle_mouse_down}
              // onMouseMove={this.handle_mouse_move}
              // onMouseUp={this.handle_mouse_up}
            >
              <g className="legend-axis" 
                ref={this.legend_axis_layer_ref}
              />
              <defs>
                <linearGradient id="color-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    {
                      this.props.gradient.map((gradient_item, gradient_index) => 
                        (
                          <stop 
                            offset={`${gradient_item.offset}%`}
                            stopColor={gradient_item.color}
                            key={gradient_index}
                          />
                        )
                      )
                    }
                </linearGradient>
              </defs>
              <rect className="color" width="10" 
                height={this.props.height} x="0" y="0"
                style={{fill: "url(#color-gradient)"}}
              />
              <text className="label" 
                style={{
                  textAnchor: "middle",
                  fontWeight: "bold",
                  fontSize: this.props.scatterplot_font_size,
                  fontFamily: this.props.scatterplot_font_family,
                }}
                x={label_x} 
                y={label_y}
                transform={"rotate(-90," + label_x +"," + label_y + ")"}
              >{this.props.variable_selected_label}</text>
            </g>
          </svg>
        </React.StrictMode>
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  return {
    // colormap: state.colormap,
    variable_selected: state.variable_selected,
    variable_selected_label: ownProps.table_metadata["column-names"][state.variable_selected],
    // variable_selected_label: state.derived.variable_selected_label,
    v_string: ownProps.table_metadata["column-types"][state.variable_selected]=="string",
    // v_string: state.derived.v_string,
    scatterplot_font_family: state.scatterplot_font_family,
    scatterplot_font_size: state.scatterplot_font_size,
    gradient: slycat_color_maps.get_gradient_data(state.colormap),
    // cca_component_selected: state.cca_component_selected,
    // cca_component_sorted: state.cca_component_sorted,
    // cca_component_sort_direction: state.cca_component_sort_direction,
  }
};

export default connect(
  mapStateToProps,
  null
)(CCALegend)
