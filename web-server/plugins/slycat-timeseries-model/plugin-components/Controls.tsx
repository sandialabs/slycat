import React, { memo } from "react";
import ControlsGroup from "components/ControlsGroup";
import ControlsDropdownColor from "components/ControlsDropdownColor";
import slycat_color_maps from "js/slycat-color-maps";
import { useAppSelector, useAppDispatch } from "../js/hooks";
import { setColormap } from "../js/services/controlsSlice";
import ControlsButtonDownloadDataTable from "components/ControlsButtonDownloadDataTable";
import { TableMetadataType } from "types/slycat";
import { selectSelectedSimulations, selectHiddenSimulations } from "../js/services/dataSlice";

type Props = {
  modelId: string;
  aid: string;
  model_name: string;
  metadata: TableMetadataType;
};

export const Controls: React.FC<Props> = (props) => {
  const dispatch = useAppDispatch();
  const { modelId, aid, model_name, metadata } = props;

  // Define default button style
  const button_style = "btn-outline-dark";
  const colormap = useAppSelector((state) => state.controls.colormap);

  const handleSetColormap = (colormap: string) => {
    dispatch(setColormap(colormap));
  };

  const selected_simulations = [...useAppSelector(selectSelectedSimulations)];
  const hidden_simulations = [...useAppSelector(selectHiddenSimulations)];

  const indices = new Int32Array(Array.from({ length: metadata?.["row-count"] ?? 0 }).keys());

  return (
    <div id="cluster-pane" className="ui-layout-north bootstrap-styles">
      <div className="d-flex justify-content-center align-items-center mx-2" id="controls">
        <div id="general-controls" className="btn-group"></div>
        {props.metadata && (
          <>
            <ControlsGroup id="general-controls" class="btn-group ml-3">
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
            <ControlsGroup id="color-switcher" class="btn-group ml-3">
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
      <div className="load-status"></div>
    </div>
  );
};

export default Controls;
