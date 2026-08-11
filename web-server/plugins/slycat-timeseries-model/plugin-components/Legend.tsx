import React from "react";
import ColorByLegend from "components/ColorByLegend";
import slycat_color_maps from "js/slycat-color-maps";
import { useAppSelector } from "../js/hooks";
import { selectColormap } from "../js/services/controlsSlice";
import { selectLegend } from "../js/services/legendSlice";

const LEGEND_BORDER = 20;
/** Matches legacy timeseries-legend label offset (border + label height). */
const LEGEND_LABEL_OFFSET = 23;
const TICK_LABEL_MAX_CHARS = 7;

export const Legend: React.FC = () => {
  const colormap = useAppSelector(selectColormap);
  const legend = useAppSelector(selectLegend);

  const background = slycat_color_maps.get_background(colormap).toString();

  const colorbarHeight = Math.max(0, legend.height - LEGEND_BORDER * 2);
  const model = slycat_color_maps.buildColorByLegendModel({
    colormap,
    variableKind: legend.v_type === "string" ? "string" : "numeric",
    min: legend.min ?? undefined,
    max: legend.max ?? undefined,
    uniqueValues: legend.uniqueValues ?? undefined,
  });

  return (
    <div
      id="legend-pane"
      className="ui-layout-east"
      style={{ background }}
    >
      <div
        className="load-status"
        style={{ display: legend.ready ? "none" : undefined }}
      />
      <div id="legend">
        {legend.ready && colorbarHeight > 0 && (
          <ColorByLegend
            model={model}
            label={legend.label}
            height={colorbarHeight}
            min={legend.min ?? undefined}
            max={legend.max ?? undefined}
            position={{
              x: LEGEND_BORDER + LEGEND_LABEL_OFFSET,
              y: LEGEND_BORDER,
            }}
            as="svg"
            svgWidth={legend.width}
            svgHeight={legend.height}
            tickLabelMaxChars={TICK_LABEL_MAX_CHARS}
          />
        )}
      </div>
    </div>
  );
};

export default Legend;
