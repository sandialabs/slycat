import React, { useEffect, useState } from "react";
import ColorByLegend from "components/ColorByLegend";
import slycat_color_maps from "js/slycat-color-maps";
import { useAppSelector } from "../js/hooks";
import {
  MDS_LEGEND_RIGHT_INSET,
  MDS_LEGEND_Y,
} from "../js/mds-legend-layout";
import { selectColormap } from "../js/services/controlsSlice";
import { selectLegend } from "../js/services/legendSlice";

/**
 * Video Swarm color-by legend: Redux host for shared ColorByLegend.
 * Overlay SVG stays pointer-events:none; ColorByLegend re-enables hits when
 * draggable so MDS rubber-band selection is unaffected outside the legend.
 */
export const VSColorByLegend: React.FC = () => {
  const colormap = useAppSelector(selectColormap);
  const legend = useAppSelector(selectLegend);
  const [paneSize, setPaneSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const pane = document.getElementById("mp-mds-pane");
    if (!pane) {
      return;
    }

    const updateSize = () => {
      setPaneSize({ width: pane.clientWidth, height: pane.clientHeight });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(pane);
    return () => observer.disconnect();
  }, []);

  const legendHeight = Math.max(0, paneSize.height - MDS_LEGEND_Y * 2);
  if (
    !legend.ready ||
    !legend.label ||
    legend.min == null ||
    legend.max == null ||
    legendHeight <= 0 ||
    paneSize.width <= 0 ||
    paneSize.height <= 0
  ) {
    return null;
  }

  const min = legend.min ?? undefined;
  const max = legend.max ?? undefined;
  const model = slycat_color_maps.buildColorByLegendModel({
    colormap,
    variableKind: "numeric",
    min,
    max,
  });

  return (
    <svg
      id="vs-colorby-legend"
      width={paneSize.width}
      height={paneSize.height}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <ColorByLegend
        as="g"
        model={model}
        label={legend.label}
        height={legendHeight}
        min={min}
        max={max}
        position={{
          x: paneSize.width - MDS_LEGEND_RIGHT_INSET,
          y: MDS_LEGEND_Y,
        }}
        draggable
        dragBounds={{ width: paneSize.width, height: paneSize.height }}
      />
    </svg>
  );
};

export default VSColorByLegend;
