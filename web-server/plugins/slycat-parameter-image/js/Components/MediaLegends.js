import { connect } from 'react-redux';
import React, { useState } from "react";
import slycat_threeD_color_maps from "js/slycat-threeD-color-maps";
import ScatterplotLegend from './ScatterplotLegend'; 

class MediaLegends extends React.PureComponent {

  render() {

    const legends = this.props.legends.map(legend => {
      return (
      <g 
        key={legend.uid}
        transform={`translate(${legend.x},${legend.y})`}
        className="legend"
      >
        <ScatterplotLegend 
          render={legend.render}
          fontSize={this.props.font_size}
          fontFamily={this.props.font_family}
          label={legend.label}
          gradient_data={legend.gradient_data}
          domain={legend.domain}
          height={legend.height}
          width={legend.width}
        />
      </g>
      )
    });

    return (
      <React.Fragment>
        {legends}
      </React.Fragment>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const three_d_colorvars = state.three_d_colorvars;
  const open_media = state.open_media ? state.open_media : [];

  const legends = open_media.map(media => {
    let threeDLegendLabel = "";
    let pointOrCell = false;
    let domain = null;
    
    const three_d_colorvar = three_d_colorvars ? three_d_colorvars[media.uid] : undefined;
    // If we have a 3D color variable, create a label for the legend
    if(three_d_colorvar)
    {
      const split = three_d_colorvar.split(':');
      pointOrCell = split[0];
      const variable = split[1];
      const component = split[2];
      threeDLegendLabel = `${variable}${component ? ` [${parseInt(component, 10) + 1}]` : ''}`;
      try {
        domain = state.derived.three_d_colorby_range[media.uri][three_d_colorvar];
      }
      catch (e) {
        // No need to do anything. With no domain, the legend just won't render.
        // console.log(`don't have enough state to get range`);
      }
    }
    const gradient_data = slycat_threeD_color_maps.get_gradient_data(state.threeDColormap);

    return {
      // only render if we have a color variable and it's a point or cell variable (not just solid color)
      // and we have a range
      render: three_d_colorvar && pointOrCell && domain,
      label: threeDLegendLabel,
      gradient_data: gradient_data,
      domain: domain,
      height: media.height,
      width: 10,
      uid: media.uid,
      x: media.x + media.width + 40,
      y: media.y,
    }
  });

  return {
    font_size: state.fontSize,
    font_family: state.fontFamily,
    legends: legends,
  }
}

export default connect(
  mapStateToProps,
  {}
)(MediaLegends)