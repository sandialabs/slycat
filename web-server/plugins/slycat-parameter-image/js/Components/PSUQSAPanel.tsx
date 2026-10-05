import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import client from "js/slycat-web-client";
import { Heatmap } from "./Heatmap";
import { setXIndex, setYIndex } from "../actions";
import { selectVariableLabels } from "../selectors";
import {
  setStatus,
  setError,
  setHeatmapResult,
  selectUqsaActiveView,
  selectUqsaStatus,
  selectUqsaError,
  selectUqsaHeatmapCells,
  HeatmapCell,
  UqsaActiveView,
} from "../uqsaSlice";

type PSUQSAPanelProps = {
  mid: string;
  layout: { close: (pane: string) => void };
};

const VIEW_TITLES: Record<Exclude<UqsaActiveView, null>, string> = {
  "means-ci": "Means and Confidence Intervals",
  pearsons: "Pearson's Correlation",
};

// Not columns. The server sends only the output index and the three numbers.
const MEAN_CI_STATISTICS = ["Mean", "Lower CI", "Upper CI"] as const;

// Heatmap subtracts its own axis margins from the box we give it.
// Below this, the plot area collapses.
const MIN_HEATMAP_SIZE = 64;

/**
 * Pixel size of a DOM node.
 *
 * layout.east.size is the bookmarked jquery-layout pane size (same field as
 * the west pane). That includes the title and padding, so it is the wrong
 * number for the SVG. Measuring the content box tracks every resize,
 * including window resizes the user did not make, without storing width and
 * height on the analysis state.
 */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return;
    }
    const update = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width: size.width, height: size.height };
}

type MeansCiRow = {
  output_index: number;
  mean: number | null;
  lower: number | null;
  upper: number | null;
};

type PearsonsPayload = {
  input_indexes: number[];
  output_indexes: number[];
  values: (number | null)[][];
};

function finiteOrNull(raw: unknown): number | null {
  // Number(null) is 0, which would draw a missing value as a real zero.
  if (raw == null) {
    return null;
  }
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
}

function columnIndex(raw: unknown): number | null {
  const index = typeof raw === "number" ? raw : Number(raw);
  return Number.isInteger(index) && index >= 0 ? index : null;
}

/**
 * Turn a means-and-CI response into heatmap cells.
 *
 * The server sends output column indexes, not names. `x` is a statistic
 * label. `y` stays empty until cellsWithVariableLabels fills the alias.
 */
function meansCiToCells(rows: MeansCiRow[]): { cells: HeatmapCell[] } | { error: string } {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "Means/CI response did not include any rows." };
  }

  const cells: HeatmapCell[] = [];
  for (const row of rows) {
    const yIndex = columnIndex(row?.output_index);
    if (yIndex == null) {
      return { error: "Means/CI response included an invalid output index." };
    }
    const stats = [row.mean, row.lower, row.upper];
    MEAN_CI_STATISTICS.forEach((label, statistic) => {
      cells.push({
        x: label,
        y: "",
        value: finiteOrNull(stats[statistic]),
        yIndex,
      });
    });
  }
  return { cells };
}

/**
 * Turn a Pearson response into heatmap cells.
 *
 * The server sends data-table indexes and values[output][input]. Stored `x`
 * and `y` stay empty; clicks dispatch the indexes, and the heatmap text is
 * the variable label applied at render. An invalid index is an error so we
 * do not draw a cell that cannot switch axes.
 */
function pearsonsToCells(payload: PearsonsPayload): { cells: HeatmapCell[] } | { error: string } {
  const inputIndexes = payload?.input_indexes;
  const outputIndexes = payload?.output_indexes;
  const values = payload?.values;
  if (
    !Array.isArray(inputIndexes) ||
    inputIndexes.length === 0 ||
    !Array.isArray(outputIndexes) ||
    outputIndexes.length === 0 ||
    !Array.isArray(values) ||
    values.length !== outputIndexes.length
  ) {
    return { error: "Pearson response did not include indexes and values." };
  }

  const cells: HeatmapCell[] = [];
  for (let i = 0; i < outputIndexes.length; i++) {
    const yIndex = columnIndex(outputIndexes[i]);
    const row = values[i];
    if (yIndex == null || !Array.isArray(row) || row.length !== inputIndexes.length) {
      return { error: "Pearson response included an invalid row." };
    }
    for (let j = 0; j < inputIndexes.length; j++) {
      const xIndex = columnIndex(inputIndexes[j]);
      if (xIndex == null) {
        return { error: "Pearson response included an invalid input index." };
      }
      cells.push({
        x: "",
        y: "",
        value: finiteOrNull(row[j]),
        xIndex,
        yIndex,
      });
    }
  }
  return { cells };
}

/**
 * Replace axis text that refers to a table column with the current variable
 * label (alias, or the raw name when there is no alias).
 *
 * This is display-only and runs at render, so an alias edit updates an open
 * heatmap without refetching. A missing label becomes `Column ${index}`.
 * The heatmap bands themselves are keyed by index, not by this text.
 * Statistic headers have no index and stay as stored. Clicks still use
 * xIndex and yIndex.
 */
function cellsWithVariableLabels(cells: HeatmapCell[], variableLabels: string[]): HeatmapCell[] {
  const labelFor = (index: number) => variableLabels[index] || `Column ${index}`;
  return cells.map((cell) => ({
    ...cell,
    x: cell.xIndex != null ? labelFor(cell.xIndex) : cell.x,
    y: cell.yIndex != null ? labelFor(cell.yIndex) : cell.y,
  }));
}

/**
 * East-pane React island for Uncertainty Quantification / Sensitivity Analysis.
 *
 * Pattern for Shawn:
 * - Controls bar only dispatches setActiveView and opens the east pane.
 * - This panel owns client API calls (in useEffect) and puts results in Redux.
 * - Both means-ci and pearsons render the same Heatmap from heatmapCells.
 * - Heatmap is presentational only — no fetching inside it.
 * - Pearson cells carry xIndex/yIndex. A click dispatches setXIndex/setYIndex;
 *   ui.js watchers update the scatterplot and related controls.
 * - The server sends column indexes. Drawn axis text uses variable aliases
 *   via selectVariableLabels. Clicks dispatch those indexes.
 * - East pane size is layout.east.size, recorded in ui.js when the user
 *   finishes a drag. This panel measures the heatmap box; it does not store it.
 * - Close button calls layout.close("east"); Redux clears via onclose_end in ui.js.
 *
 * Next steps:
 * - Heatmap polish: tooltips, color legend, responsive wrapper from
 *   https://www.react-graph-gallery.com/heatmap
 */
const PSUQSAPanel: React.FC<PSUQSAPanelProps> = ({ mid, layout }) => {
  const dispatch = useDispatch();
  const activeView = useSelector(selectUqsaActiveView);
  const status = useSelector(selectUqsaStatus);
  const error = useSelector(selectUqsaError);
  const heatmapCells = useSelector(selectUqsaHeatmapCells);
  // Same labels as the dropdowns, table, and scatterplot: alias, else raw name.
  const variableLabels = useSelector(selectVariableLabels);
  const labeledCells = useMemo(
    () => (heatmapCells ? cellsWithVariableLabels(heatmapCells, variableLabels) : heatmapCells),
    [heatmapCells, variableLabels],
  );
  const contentBox = useElementSize<HTMLDivElement>();

  // Fetch means & confidence intervals when switching to the means-ci view.
  useEffect(() => {

    // only means-ci and pearsons are implemented
    if (activeView !== "means-ci" && activeView !== "pearsons") {
      return;
    }

    let cancelled = false;
    dispatch(setStatus("loading"));
    dispatch(setError(null));

    // means-ci
    if (activeView == "means-ci") {
      client.post_sensitive_model_command({
        mid,
        type: "parameter-image",
        command: "compute-means-ci",
        parameters: {},
        success: (result: string | object) => {
          if (cancelled) {
            return;
          }
          try {
            const parsed = typeof result === "string" ? JSON.parse(result) : result;

            if (parsed.error) {
              dispatch(setError(String(parsed.error)));
              return;
            }

            const shaped = meansCiToCells(parsed.rows);
            if ("error" in shaped) {
              dispatch(setError(shaped.error));
              return;
            }

            dispatch(setHeatmapResult({ heatmapCells: shaped.cells }));
          } catch (e) {
            dispatch(setError(e instanceof Error ? e.message : "Failed to parse means/CI response."));
          }
        },
        error: (_request: unknown, _status: string, reason_phrase: string) => {
          if (cancelled) {
            return;
          }
          dispatch(setError(reason_phrase || "Failed to compute means and confidence intervals."));
        },
      });
    }

    // pearsons
    if (activeView == "pearsons") {
      client.post_sensitive_model_command({
        mid,
        type: "parameter-image",
        command: "compute-pearsons",
        parameters: {},
        success: (result: string | object) => {
          if (cancelled) {
            return;
          }
          try {
            const parsed = typeof result === "string" ? JSON.parse(result) : result;
            
            if (parsed.error) {
              dispatch(setError(String(parsed.error)));
              return;
            }

            const shaped = pearsonsToCells(parsed);
            if ("error" in shaped) {
              dispatch(setError(shaped.error));
              return;
            }

            dispatch(setHeatmapResult({ heatmapCells: shaped.cells }));
          } catch (e) {
            dispatch(setError(e instanceof Error ? e.message : "Failed to parse Pearson response."));
          }
        },
        error: (_request: unknown, _status: string, reason_phrase: string) => {
          if (cancelled) {
            return;
          }
          dispatch(setError(reason_phrase || "Failed to compute Pearson's correlation."));
        },
      });
    }

    return () => {
      cancelled = true;
    };
  }, [activeView, mid, dispatch]);

  const title = activeView ? VIEW_TITLES[activeView] : null;

  const closeButton = (
    <button
      type="button"
      className="btn-close"
      aria-label="Close"
      onClick={() => layout.close("east")}
    />
  );

  const panelShell = (body: React.ReactNode) => (
    <div className="uqsa-panel p-3 d-flex flex-column">
      <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
        {title ? <h5 className="mb-0">{title}</h5> : <span />}
        {closeButton}
      </div>
      <div className="uqsa-panel-body" ref={contentBox.ref}>
        {body}
      </div>
    </div>
  );

  if (activeView === null) {
    return panelShell(
      <div className="text-muted">Choose a UQ/SA analysis from the controls bar.</div>,
    );
  }

  if (status === "loading") {
    return panelShell(<div className="text-muted">Loading…</div>);
  }

  if (status === "failed") {
    return panelShell(<div className="text-danger">{error ?? "Request failed."}</div>);
  }

  if (!heatmapCells || heatmapCells.length === 0 || !labeledCells) {
    return panelShell(<div className="text-muted">No data yet.</div>);
  }

  const heatmapWidth = contentBox.width;
  const heatmapHeight = contentBox.height;
  if (heatmapWidth < MIN_HEATMAP_SIZE || heatmapHeight < MIN_HEATMAP_SIZE) {
    return panelShell(null);
  }

  // means-ci panel

  // define callback to show histogram for means-ci
  // e is event info, d is heatmap data
  function show_hist(_e: React.MouseEvent<SVGElement>, cell: HeatmapCell) {
    console.log("show histogram");
    console.log(cell);
    console.log(cell.y);
  }

  if (activeView === "means-ci")
  return panelShell(<Heatmap width={heatmapWidth} height={heatmapHeight} data={labeledCells} 
    use_colors={false} use_numbers={true} show_plot={show_hist}/>);

  // A click only switches axes. ui.js watches x_index and y_index and updates
  // the scatterplot, X/Y dropdowns, table icons, bookmarks, and closes the
  // histogram when Y changes. The indexes came from the server, so this
  // handler does not look up column names.
  function show_plot(_e: React.MouseEvent<SVGElement>, cell: HeatmapCell) {
    // Means-and-CI cells have a row index but no x index, so this does not run for them.
    // Pearson cells always have both.
    if (cell.xIndex == null || cell.yIndex == null) {
      return;
    }
    dispatch(setXIndex(cell.xIndex));
    dispatch(setYIndex(cell.yIndex));
  }

  // Pearson's panel
  if (activeView === "pearsons")
    return panelShell(<Heatmap width={heatmapWidth} height={heatmapHeight} data={labeledCells} 
      use_colors={true} use_numbers={true} show_plot={show_plot}/>);

};

export default PSUQSAPanel;
