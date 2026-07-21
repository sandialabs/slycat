import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import client from "js/slycat-web-client";
import { Heatmap } from "./Heatmap";
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
};

const VIEW_TITLES: Record<Exclude<UqsaActiveView, null>, string> = {
  "means-ci": "Means and Confidence Intervals",
  pearsons: "Pearson's Correlation",
};

/**
 * East-pane React island for Uncertainty Quantification / Sensitivity Analysis.
 *
 * Pattern for Shawn:
 * - Controls bar only dispatches setActiveView and opens the east pane.
 * - This panel owns client API calls (in useEffect) and puts results in Redux.
 * - Both means-ci and pearsons render the same Heatmap from heatmapCells.
 * - Heatmap is presentational only — no fetching inside it.
 *
 * Next steps:
 * - Pearson's: add a useEffect branch like means-ci; reshape the correlation
 *   matrix into gallery cells { x, y, value } and dispatch setHeatmapResult.
 * - Heatmap polish: tooltips, color legend, responsive wrapper from
 *   https://www.react-graph-gallery.com/heatmap
 */
const PSUQSAPanel: React.FC<PSUQSAPanelProps> = ({ mid }) => {
  const dispatch = useDispatch();
  const activeView = useSelector(selectUqsaActiveView);
  const status = useSelector(selectUqsaStatus);
  const error = useSelector(selectUqsaError);
  const heatmapCells = useSelector(selectUqsaHeatmapCells);
  const paneWidth = useSelector(selectUqsaPaneWidth);
  const paneHeight = useSelector(selectUqsaPaneHeight);

  // Fetch means & confidence intervals when switching to the means-ci view.
  useEffect(() => {
    if (activeView !== "means-ci") {
      return;
    }

    let cancelled = false;
    dispatch(setStatus("loading"));
    dispatch(setError(null));

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

          // Reshape server table into gallery cells for Heatmap
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

    return () => {
      cancelled = true;
    };
  }, [activeView, mid, dispatch]);

  if (activeView === null) {
    return (
      <div className="p-3 text-muted">Choose a UQ/SA analysis from the controls bar.</div>
    );
  }

  const title = VIEW_TITLES[activeView];

  if (status === "loading") {
    return (
      <div className="p-3">
        <h5 className="mb-3">{title}</h5>
        <div className="text-muted">Loading…</div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="p-3">
        <h5 className="mb-3">{title}</h5>
        <div className="text-danger">{error ?? "Request failed."}</div>
      </div>
    );
  }

  // Pearson's stub: no fetch yet, so no cells — show guidance until implemented
  if (activeView === "pearsons" && (!heatmapCells || heatmapCells.length === 0)) {
    return (
      <div className="p-3">
        <h5 className="mb-2">{title}</h5>
        <p className="text-muted mb-0">
          Not implemented yet. When ready: fetch the correlation matrix here, reshape into{" "}
          <code>{"{ x, y, value }"}</code> cells, dispatch <code>setHeatmapResult</code>, and this
          panel will render <code>Heatmap</code> the same way as Means/CI.
        </p>
      </div>
    );
  }

  if (!heatmapCells || heatmapCells.length === 0) {
    return (
      <div className="p-3">
        <h5 className="mb-3">{title}</h5>
        <div className="text-muted">No data yet.</div>
      </div>
    );
  }

  const heatmapWidth = Math.max(paneWidth - 24, 120);
  const heatmapHeight = Math.max(paneHeight - 72, 120);

  return (
    <div className="p-3 overflow-auto h-100">
      <h5 className="mb-3">{title}</h5>
      <Heatmap width={heatmapWidth} height={heatmapHeight} data={heatmapCells} />
    </div>
  );
};

export default PSUQSAPanel;
