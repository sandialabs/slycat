import { connect } from "react-redux";
import React from "react";
import slycat_threeD_color_maps from "js/slycat-threeD-color-maps";
import ScatterplotLegend from "./ScatterplotLegend";
import {
  threeDColorByLegendsSet,
  selectThreeDColorByLegends,
} from "../features/derived/derivedSlice";
import { getDataRange } from "../vtk-geometry-viewer";
import _ from "lodash";

class MediaLegends extends React.PureComponent {
  render() {
    const legends = this.props.legends.map((legend) => {
      if (!legend.render) {
        return;
      }
      return (
        <g key={legend.uid} transform={`translate(${legend.x},${legend.y})`} className="legend">
          <rect
            height={legend.height - 21}
            width={legend.width + 40}
            fill={`rgb(${this.props.background_color})`}
            stroke="black"
            x="-41"
            y="-19.5"
          />
          <ScatterplotLegend
            fontSize={this.props.font_size}
            fontFamily={this.props.font_family}
            label={legend.label}
            gradient_data={legend.gradient_data}
            domain={legend.domain}
            height={legend.legend_height}
            gradient_width={legend.gradient_width}
            x_offset={10}
            uid={legend.uid}
            setThreeDColorByLegend={this.props.threeDColorByLegendsSet}
          />
        </g>
      );
    });

    return <React.Fragment>{legends}</React.Fragment>;
  }
}

const mapStateToProps = (state, ownProps) => {
  const three_d_colorvars = state.three_d_colorvars;
  const open_media = state.open_media ? state.open_media : [];
  const hidden_simulations = state.data.hidden_simulations;
  const not_hidden_open_media = _.filter(
    open_media,
    (o) => hidden_simulations.indexOf(o.index) < 0,
  );
  // console.group(`MediaLegends.js mapStateToProps`);
  // console.debug(`open_media: %o, not_hidden_open_media: %o`, open_media, not_hidden_open_media);
  // console.debug(`hidden_simulations: %o`, hidden_simulations);
  // console.groupEnd();

  const legends = not_hidden_open_media.map((media) => {
    let threeDLegendLabel = "";
    let pointOrCell = false;
    let domain = null;

    const three_d_colorvar = three_d_colorvars ? three_d_colorvars[media.uid] : undefined;
    // If we have a 3D color variable and it's not ':' (i.e., Solid color), create a label for the legend
    if (three_d_colorvar && three_d_colorvar !== ":") {
      const split = three_d_colorvar.split(":");
      pointOrCell = split[0];
      const variable = split[1];
      const component = split[2];
      threeDLegendLabel = `${variable}${component ? ` [${parseInt(component, 10) + 1}]` : ""}`;
      try {
        domain = getDataRange(three_d_colorvar);
        // console.log(`globalDomain for ${media.uri} is ${domain}`);
      } catch (e) {
        // No need to do anything. With no domain, the legend just won't render.
        // console.log(`don't have enough state to get range`);
      }
    }
    const gradient_data = slycat_threeD_color_maps.get_gradient_data(state.threeDColormap);
    const width = selectThreeDColorByLegends(state)[media.uid]
      ? selectThreeDColorByLegends(state)[media.uid].width
      : 200;

    return {
      // only render if we have a color variable and it's a point or cell variable (not just solid color)
      // and we have a range
      render: three_d_colorvar && pointOrCell && domain,
      label: threeDLegendLabel,
      gradient_data: gradient_data,
      domain: domain,
      height: media.height,
      width: width,
      legend_height: media.height - 60,
      gradient_width: 10,
      uid: media.uid,
      x: media.x + media.width + 40,
      y: media.y + 20,
    };
  });

  return {
    font_size: state.fontSize,
    font_family: state.fontFamily,
    legends: legends,
    background_color: state.threeD_background_color,
  };
};

export default connect(mapStateToProps, {
  threeDColorByLegendsSet,
})(MediaLegends);
