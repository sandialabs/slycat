import React from "react";
import ControlsDropdownColor from "components/ControlsDropdownColor";
import slycat_color_maps from "js/slycat-color-maps";
import { useAppDispatch, useAppSelector } from "../js/hooks";
import { selectColormap, setColormap } from "../js/services/controlsSlice";

const VSColorSwitcher: React.FC = () => {
  const dispatch = useAppDispatch();
  const colormap = useAppSelector(selectColormap);

  const handleSetColormap = (nextColormap: string) => {
    dispatch(setColormap(nextColormap));
  };

  return (
    <ControlsDropdownColor
      button_style="btn-slycat-controls"
      colormaps={slycat_color_maps}
      colormap={colormap}
      key_id="colors-dropdown"
      id="colors-dropdown"
      label="Color"
      title="Change color scheme"
      state_label="color"
      trigger="colormap-changed"
      single={true}
      setColormap={handleSetColormap}
    />
  );
};

export default VSColorSwitcher;
