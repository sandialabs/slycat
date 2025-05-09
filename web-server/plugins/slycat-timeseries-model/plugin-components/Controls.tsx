import React from "react";
import ControlsGroup from "components/ControlsGroup";
import ControlsDropdownColor from "components/ControlsDropdownColor";
import slycat_color_maps from "js/slycat-color-maps";
import { useAppSelector, useAppDispatch } from "../js/hooks";
import { setColormap, selectColormap } from "../js/services/controlsSlice";
import ControlsButtonDownloadDataTable from "components/ControlsButtonDownloadDataTable";
import { TableMetadataType } from "types/slycat";
import {
  selectSelectedSimulations,
  selectHiddenSimulations,
  selectCurrentVIndex,
  setCurrentVIndex,
} from "../js/services/dataSlice";
import ControlsDropdown from "components/ControlsDropdown";

type Props = {
  modelId: string;
  aid: string;
  model_name: string;
  metadata: TableMetadataType;
};

export const Controls: React.FC<Props> = (props) => {
  const { modelId, aid, model_name, metadata } = props;

  // All hooks at the top, before any conditional logic
  const dispatch = useAppDispatch();
  const colormap = useAppSelector(selectColormap);
  const selected_simulations = [...useAppSelector(selectSelectedSimulations)];
  const hidden_simulations = [...useAppSelector(selectHiddenSimulations)];
  const currentVIndex = useAppSelector(selectCurrentVIndex);

  // Define default button style
  const button_style = "btn-outline-dark";

  const handleSetColormap = (colormap: string) => {
    dispatch(setColormap(colormap));
  };

  const handleSetCurrentVIndex = (key: number | string) => {
    dispatch(setCurrentVIndex(Number(key)));
  };

  const column_count = metadata?.["column-count"] ?? 0;
  const row_count = metadata?.["row-count"] ?? 0;
  const get_column_name = (index: number) => metadata?.["column-names"][index] ?? "";

  const indices = new Int32Array(Array.from({ length: row_count }).keys());

  // Create array of column indices, moving index column to first position
  const color_variables = Array.from({ length: column_count }, (_, i) => i).slice(0, -1);
  color_variables.unshift(column_count - 1);

  const color_variable_dropdown_items = [];
  for (let color_variable of color_variables) {
    color_variable_dropdown_items.push({
      key: color_variable,
      name: get_column_name(color_variable),
    });
  }

  return (
    <div id="cluster-pane" className="ui-layout-north bootstrap-styles">
      <div className="d-flex justify-content-center align-items-center mx-2" id="controls">
        <div id="general-controls" className="btn-group"></div>
        {metadata && (
          <>
            <ControlsGroup id="general-controls" class="btn-group ms-3">
              <ControlsDropdown
                button_style={button_style}
                key="color-dropdown"
                id="color-dropdown"
                label="Line Color"
                title="Change Line Color"
                items={color_variable_dropdown_items}
                state_label="v_index"
                selected={currentVIndex}
                set_selected={handleSetCurrentVIndex}
              />
              <ControlsButtonDownloadDataTable
                selection={selected_simulations}
                hidden_simulations={hidden_simulations}
                aid={aid}
                mid={modelId}
                model_name={model_name}
                metadata={metadata}
                indices={indices}
                button_style={button_style}
              />
            </ControlsGroup>
            <ControlsGroup id="color-switcher" class="btn-group ms-3">
              <ControlsDropdownColor
                button_style={button_style}
                colormaps={slycat_color_maps}
                colormap={colormap}
                key_id="color-switcher"
                id="color-switcher"
                label="Color"
                title="Change color scheme"
                state_label="color"
                trigger="colormap-changed"
                single={true}
                setColormap={handleSetColormap}
              />
            </ControlsGroup>
          </>
        )}
      </div>
    </div>
  );
};

export default Controls;
