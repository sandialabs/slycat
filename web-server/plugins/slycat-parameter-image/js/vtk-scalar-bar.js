import vtkScalarBarActor from "vtk.js/Sources/Rendering/Core/ScalarBarActor";
import watch from "redux-watch";

/**
 * Create an in-viewer VTK scalar bar for a VTP geometry viewer.
 *
 * Visibility is show_threeD_legends && hasScalars (from updateFromColorBy).
 * Text style follows Redux fontSize / fontFamily.
 *
 * @returns {{
 *   actor: object,
 *   syncLookupTable: (lut: object) => void,
 *   updateFromColorBy: (opts: {
 *     colorByArrayName: string,
 *     componentString: string | undefined,
 *     scalarVisibility: boolean,
 *   }) => void,
 *   dispose: () => void,
 * }}
 */
export function createVtkScalarBar({ lookupTable, renderWindow, store, renderer }) {
  const actor = vtkScalarBarActor.newInstance({
    automated: true,
    orientation: "vertical",
    drawNanAnnotation: false,
    drawBelowRangeSwatch: false,
    drawAboveRangeSwatch: false,
  });
  actor.setScalarsToColors(lookupTable);
  actor.setVisibility(false);

  let hasScalars = false;
  let disposed = false;
  const unsubscribers = [];

  function updateVisibility() {
    if (disposed) {
      return;
    }
    const show = store.getState().show_threeD_legends && hasScalars;
    actor.setVisibility(show);
    renderWindow.render();
  }

  function applyTextStyle() {
    if (disposed) {
      return;
    }
    const { fontSize, fontFamily } = store.getState();
    const shared = {
      fontColor: "black",
      fontFamily: fontFamily || "Arial",
      fontSize: fontSize,
    };
    actor.setAxisTextStyle({ ...shared, fontStyle: "bold" });
    actor.setTickTextStyle({ ...shared, fontStyle: "normal" });
    renderWindow.render();
  }

  applyTextStyle();
  unsubscribers.push(store.subscribe(watch(store.getState, "fontSize")(applyTextStyle)));
  unsubscribers.push(store.subscribe(watch(store.getState, "fontFamily")(applyTextStyle)));
  unsubscribers.push(
    store.subscribe(watch(store.getState, "show_threeD_legends")(updateVisibility)),
  );

  function syncLookupTable(lut) {
    if (disposed) {
      return;
    }
    actor.setScalarsToColors(lut);
  }

  function updateFromColorBy({ colorByArrayName, componentString, scalarVisibility }) {
    if (disposed) {
      return;
    }
    hasScalars = Boolean(scalarVisibility);
    if (hasScalars) {
      const axisLabel = `${colorByArrayName}${
        componentString ? ` [${parseInt(componentString, 10) + 1}]` : ""
      }`;
      actor.setAxisLabel(axisLabel);
    }
    updateVisibility();
  }

  function dispose() {
    if (disposed) {
      return;
    }
    disposed = true;
    for (const unsubscribe of unsubscribers) {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    }
    unsubscribers.length = 0;
    if (renderer && actor) {
      renderer.removeActor(actor);
    }
    if (actor && typeof actor.delete === "function") {
      actor.delete();
    }
  }

  return {
    actor,
    syncLookupTable,
    updateFromColorBy,
    dispose,
  };
}
