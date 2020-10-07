/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  
retains certain rights in this software. */

import d3 from "d3";
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps.json';
import slycat_color_maps_methods from 'js/slycat-color-maps-methods';

let subset = [
  "Cool to Warm",
  "Cool to Warm (Extended)",
  "Black-Body Radiation",
  "X Ray",
  "Inferno (matplotlib)",
  "Black, Blue and White",
  "Blue Orange (divergent)", // This one seems to be missing in the vtk ColorMaps.json file
  "Viridis (matplotlib)",
  "Gray and Red", // This one seems to be missing in the vtk ColorMaps.json file
  "Linear Green (Gr4L)", // This one causes warning from vtk.js for some reason cause it's CIELAB color space.
  "Cold and Hot",
  "Blue - Green - Orange", // This one seems to be missing in the vtk ColorMaps.json file
  "Rainbow Desaturated",
  "Yellow - Gray - Blue", // This one seems to be missing in the vtk ColorMaps.json file
  "Rainbow Uniform", // This one seems to be missing in the vtk ColorMaps.json file
  "jet",
];

// Filtering vtk.js colormaps to only include the ones above
let slycat_color_maps = {};
let vtk_color_maps = {};

vtkColorMaps
  .filter((p) => p.RGBPoints)
  // Not sure why vtk code filters out CIELAB color spaces
  // but I'm leaving them in since the maps still work
  // just with vtk error written to console from here:
  // https://github.com/Kitware/vtk-js/blob/0aba7c6378941767a9f0ac75414a130958832e18/Sources/Rendering/Core/ColorTransferFunction/index.js#L1147
  // .filter((p) => p.ColorSpace !== 'CIELAB')
  .filter((p) => subset.includes(p.Name))
  .forEach((p) => {
    let colors = [];
    let rgbpoints = p.RGBPoints.slice();
    while(rgbpoints.length > 0)
    {
      let x = rgbpoints.splice(0,1)[0];
      let r = rgbpoints.splice(0,1)[0] * 255;
      let g = rgbpoints.splice(0,1)[0] * 255;
      let b = rgbpoints.splice(0,1)[0] * 255;
      colors.push(d3.rgb(r, g, b));
    }
    slycat_color_maps[p.Name] = {
      label: p.Name,
      null_color: "rgb(75,75,75)",
      opacity: "0.5",
      colors: colors,
    };
    vtk_color_maps[p.Name] = p;
  })
  ;

export default {
  color_maps: slycat_color_maps,
  vtk_color_maps: vtk_color_maps,
  ...slycat_color_maps_methods,
}
