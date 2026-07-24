import { connect } from "react-redux";
import React from "react";
import { createPortal } from "react-dom";
import slycat_threeD_color_maps from "js/slycat-threeD-color-maps";
import ThreeDMediaLegend, { GradientStop } from "./ThreeDMediaLegend";
import { setThreeDColorByLegend } from "../actions";
import { getThreeDDataRange, ThreeDDataRange } from "../three-d-data-range";
import { RootState } from "../store";
import _ from "lodash";

const MIN_LEGEND_HEIGHT = 40;
const LEGEND_HEIGHT_INSET = 60;
// Horizontal spacing: tighter than the original, with a little breathing room.
// LEGEND_X_GAP is derived from BACKGROUND_X so the legend never overlaps the frame.
const FRAME_LEGEND_GAP = 0;
const BACKGROUND_X = -28;
const LEGEND_X_GAP = -BACKGROUND_X + FRAME_LEGEND_GAP;
const LEGEND_Y_OFFSET = 20;
const GRADIENT_WIDTH = 10;
const LEGEND_CONTENT_X_OFFSET = 6;
const DEFAULT_LEGEND_WIDTH = 200;
const BACKGROUND_WIDTH_PAD = 16;
const BACKGROUND_HEIGHT_INSET = 21;
const BACKGROUND_Y = -19.5;

type MediaLegendItem = {
  render: boolean;
  label: string;
  gradient_data: GradientStop[];
  domain: ThreeDDataRange | null;
  height: number;
  width: number;
  legend_height: number;
  gradient_width: number;
  uid: string;
  x: number;
  y: number;
  z_index: number;
};

type MediaLegendsProps = {
  font_size: number;
  font_family: string;
  legends: MediaLegendItem[];
  background_color: [number, number, number];
  setThreeDColorByLegend: (uid: string, width: number, height: number) => void;
};

class MediaLegends extends React.PureComponent<MediaLegendsProps> {
  render() {
    const mediaLayer =
      typeof document !== "undefined"
        ? document.querySelector("#scatterplot .media-layer")
        : null;

    const legends = this.props.legends
      .filter((legend) => legend.render && legend.domain != null)
      .map((legend) => {
        // Background already sits in [0, width+pad] / [0, height-inset] after the
        // inner translate; do not add -BACKGROUND_X/Y again (that oversized the SVG).
        const svgWidth = legend.width + BACKGROUND_WIDTH_PAD;
        const svgHeight = legend.height - BACKGROUND_HEIGHT_INSET;
        const onLegendMouseDown = (e: React.MouseEvent) => {
          // Match .media-layer: don't start scatterplot rubber-band selection
          e.stopPropagation();
          e.preventDefault();
          e.currentTarget.dispatchEvent(
            new CustomEvent("slycat-bring-frame-to-front", {
              bubbles: true,
              detail: { uid: legend.uid },
            }),
          );
        };
        return (
          <svg
            key={legend.uid}
            className="threeD-media-legend"
            width={svgWidth}
            height={svgHeight}
            style={{
              position: "absolute",
              left: legend.x + BACKGROUND_X,
              top: legend.y + BACKGROUND_Y,
              zIndex: legend.z_index,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            <g
              transform={`translate(${-BACKGROUND_X}, ${-BACKGROUND_Y})`}
              style={{ pointerEvents: "auto" }}
              onMouseDown={onLegendMouseDown}
            >
              <rect
                height={legend.height - BACKGROUND_HEIGHT_INSET}
                width={legend.width + BACKGROUND_WIDTH_PAD}
                fill={`rgb(${this.props.background_color})`}
                stroke="black"
                x={BACKGROUND_X}
                y={BACKGROUND_Y}
              />
              <ThreeDMediaLegend
                fontSize={this.props.font_size}
                fontFamily={this.props.font_family}
                label={legend.label}
                gradient_data={legend.gradient_data}
                domain={legend.domain as ThreeDDataRange}
                height={legend.legend_height}
                gradient_width={legend.gradient_width}
                x_offset={LEGEND_CONTENT_X_OFFSET}
                uid={legend.uid}
                setThreeDColorByLegend={this.props.setThreeDColorByLegend}
              />
            </g>
          </svg>
        );
      });

    if (!mediaLayer) {
      return null;
    }

    return createPortal(<React.Fragment>{legends}</React.Fragment>, mediaLayer);
  }
}

const mapStateToProps = (state: RootState) => {
  const three_d_colorvars = state.three_d_colorvars;
  const open_media = state.open_media ? state.open_media : [];
  const hidden_simulations = state.data.hidden_simulations;
  const show_threeD_legends = state.show_threeD_legends;
  const not_hidden_open_media = _.filter(
    open_media,
    (o) => hidden_simulations.indexOf(o.index) < 0,
  );

  const legends: MediaLegendItem[] = not_hidden_open_media.map((media) => {
    let threeDLegendLabel = "";
    let pointOrCell = "";
    let domain: ThreeDDataRange | null = null;
    let gradient_data: GradientStop[] = [];

    const three_d_colorvar = three_d_colorvars
      ? three_d_colorvars[media.uid]
      : undefined;
    // If we have a 3D color variable and it's not ':' (i.e., Solid color), create a label for the legend
    if (three_d_colorvar && three_d_colorvar !== ":") {
      const split = three_d_colorvar.split(":");
      pointOrCell = split[0];
      const variable = split[1];
      const component = split[2];
      threeDLegendLabel = `${variable}${
        component ? ` [${parseInt(component, 10) + 1}]` : ""
      }`;
      domain = getThreeDDataRange(state, three_d_colorvar);
      if (domain != null) {
        gradient_data = slycat_threeD_color_maps.get_gradient_data(
          state.threeDColormap,
        );
      }
    }

    const measured = state.derived.three_d_colorby_legends[media.uid];
    const width = measured ? measured.width : DEFAULT_LEGEND_WIDTH;

    return {
      // only render if legends are enabled, we have a color variable that is a
      // point or cell variable (not just solid color), and we have a range
      render: Boolean(
        show_threeD_legends && three_d_colorvar && pointOrCell && domain,
      ),
      label: threeDLegendLabel,
      gradient_data,
      domain,
      height: media.height,
      width,
      legend_height: Math.max(media.height - LEGEND_HEIGHT_INSET, MIN_LEGEND_HEIGHT),
      gradient_width: GRADIENT_WIDTH,
      uid: media.uid,
      x: media.x + media.width + LEGEND_X_GAP,
      y: media.y + LEGEND_Y_OFFSET,
      z_index: media.z_index ?? 0,
    };
  });

  return {
    font_size: state.fontSize,
    font_family: state.fontFamily,
    legends,
    background_color: state.threeD_background_color,
  };
};

export default connect(mapStateToProps, {
  setThreeDColorByLegend,
})(MediaLegends);
