import React, { useEffect } from "react";
import { useSelector, useDispatch, useStore } from "react-redux";
import client from "js/slycat-web-client";
import { Heatmap } from "./Heatmap";
import { setXIndex, setYIndex } from "../actions";
import { RootState } from "../store";
import {
  setStatus,
  setError,
  setHeatmapResult,
  selectUqsaActiveView,
  selectUqsaStatus,
  selectUqsaError,
  selectUqsaHeatmapCells,
  selectUqsaPaneWidth,
  selectUqsaPaneHeight,
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

/**
 * Turn the Pearson response table into heatmap cells.
 *
 * `x` and `y` stay the text drawn on the heatmap. `xIndex` and `yIndex` are
 * the data-table column indexes those labels refer to, resolved here from raw
 * column names (not variable aliases). Clicks dispatch those indexes, so a
 * later change to the drawn label does not break axis switching. A label that
 * is not a column is an error: we do not render a heatmap whose clicks do nothing.
 */
function pearsonsTableToCells(
  table: (string | number)[][],
  columnNames: string[],
): { cells: HeatmapCell[] } | { error: string } {
  const header = table[0].slice(1).map(String);
  const xIndexes: number[] = [];
  for (const label of header) {
    const xIndex = columnNames.indexOf(label);
    if (xIndex < 0) {
      return { error: `Pearson column "${label}" is not a table column.` };
    }
    xIndexes.push(xIndex);
  }

  const cells: HeatmapCell[] = [];
  for (let i = 1; i < table.length; i++) {
    const row = table[i];
    const yLabel = String(row[0]);
    const yIndex = columnNames.indexOf(yLabel);
    if (yIndex < 0) {
      return { error: `Pearson row "${yLabel}" is not a table column.` };
    }
    for (let j = 0; j < header.length; j++) {
      const raw = row[j + 1];
      const value = typeof raw === "number" ? raw : Number(raw);
      cells.push({
        x: header[j],
        y: yLabel,
        value: Number.isFinite(value) ? value : null,
        xIndex: xIndexes[j],
        yIndex,
      });
    }
  }
  return { cells };
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
 * - Close button calls layout.close("east"); Redux clears via onclose_end in ui.js.
 *
 * Next steps:
 * - Heatmap polish: tooltips, color legend, responsive wrapper from
 *   https://www.react-graph-gallery.com/heatmap
 */
const PSUQSAPanel: React.FC<PSUQSAPanelProps> = ({ mid, layout }) => {
  const dispatch = useDispatch();
  // Read at response time inside the fetch effect. Not a dependency: table
  // metadata is already loaded, and watching it would refetch on unrelated updates.
  const store = useStore<RootState>();
  const activeView = useSelector(selectUqsaActiveView);
  const status = useSelector(selectUqsaStatus);
  const error = useSelector(selectUqsaError);
  const heatmapCells = useSelector(selectUqsaHeatmapCells);
  const paneWidth = useSelector(selectUqsaPaneWidth);
  const paneHeight = useSelector(selectUqsaPaneHeight);

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

            const mean_ci_table: (string | number)[][] = parsed.mean_ci_table;
            if (!Array.isArray(mean_ci_table) || mean_ci_table.length < 2) {
              dispatch(setError("Means/CI response did not include a valid table."));
              return;
            }

            // Reshape server table into Heatmap cells { x, y, value }
            const header = mean_ci_table[0].slice(1).map(String);
            const cells: HeatmapCell[] = [];
            for (let i = 1; i < mean_ci_table.length; i++) {
              const row = mean_ci_table[i];
              const rowLabel = String(row[0]);
              for (let j = 0; j < header.length; j++) {
                const raw = row[j + 1];
                const value = typeof raw === "number" ? raw : Number(raw);
                cells.push({
                  x: header[j],
                  y: rowLabel,
                  value: Number.isFinite(value) ? value : null,
                });
              }
            }

            dispatch(setHeatmapResult({ heatmapCells: cells }));
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

            const pearsons_table: (string | number)[][] = parsed.pearsons_table;
            if (!Array.isArray(pearsons_table) || pearsons_table.length < 2) {
              dispatch(setError("Pearson response did not include a valid table."));
              return;
            }

            // Column names are read when the response arrives so this effect
            // does not refetch when other state changes.
            const columnNames = store.getState().derived.table_metadata["column-names"];
            const shaped = pearsonsTableToCells(pearsons_table, columnNames);
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
  }, [activeView, mid, dispatch, store]);

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
    <div className="p-3 overflow-auto h-100 d-flex flex-column">
      <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
        {title ? <h5 className="mb-0">{title}</h5> : <span />}
        {closeButton}
      </div>
      <div className="flex-grow-1">{body}</div>
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

  if (!heatmapCells || heatmapCells.length === 0) {
    return panelShell(<div className="text-muted">No data yet.</div>);
  }

  const heatmapWidth = Math.max(paneWidth - 24, 120);
  const heatmapHeight = Math.max(paneHeight - 72, 120);

  // means-ci panel

  // define callback to show histogram for means-ci
  // e is event info, d is heatmap data
  function show_hist(_e: React.MouseEvent<SVGElement>, cell: HeatmapCell) {
    console.log("show histogram");
    console.log(cell);
    console.log(cell.y);
  }

  if (activeView === "means-ci")
  return panelShell(<Heatmap width={heatmapWidth} height={heatmapHeight} data={heatmapCells} 
    use_colors={false} use_numbers={true} show_plot={show_hist}/>);

  // A click only switches axes. ui.js watches x_index and y_index and updates
  // the scatterplot, X/Y dropdowns, table icons, bookmarks, and closes the
  // histogram when Y changes. Indexes were stored when the Pearson table was
  // shaped, so this handler does not look up column names.
  function show_plot(_e: React.MouseEvent<SVGElement>, cell: HeatmapCell) {
    // Means-and-CI cells have no indexes. Pearson cells always do.
    if (cell.xIndex == null || cell.yIndex == null) {
      return;
    }
    dispatch(setXIndex(cell.xIndex));
    dispatch(setYIndex(cell.yIndex));
  }

  // Pearson's panel
  if (activeView === "pearsons")
    return panelShell(<Heatmap width={heatmapWidth} height={heatmapHeight} data={heatmapCells} 
      use_colors={true} use_numbers={true} show_plot={show_plot}/>);

};

export default PSUQSAPanel;
