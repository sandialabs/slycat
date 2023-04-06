import React from "react";
// @ts-ignore
import ControlsGroup from "components/ControlsGroup";
import ControlsDropdownColor from "components/ControlsDropdownColor";
import slycat_color_maps from "js/slycat-color-maps";
import { useAppSelector, useAppDispatch } from "../js/hooks";
import { setColormap } from "../js/services/controlsSlice";

type Props = {
  modelId: string;
};

export const Controls: React.FC<Props> = (props) => {
  const dispatch = useAppDispatch();

  const { modelId } = props;

  // Define default button style
  const button_style = "btn-outline-dark";
  const colormap = useAppSelector((state) => state.controls.colormap);

  const handleSetColormap = (colormap: string) => {
    dispatch(setColormap(colormap));
  };

  return (
    <div id="cluster-pane" className="ui-layout-north bootstrap-styles">
      <div className="d-flex justify-content-center align-items-center mx-2" id="controls">
        <div id="general-controls" className="btn-group"></div>
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
      </div>
      <div className="load-status"></div>
    </div>
  );
};

export default Controls;
