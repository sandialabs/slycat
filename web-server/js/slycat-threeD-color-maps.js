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
  "Linear Green (Gr4L)",
  "Cold and Hot",
  "Blue - Green - Orange",  // This one seems to be missing in the vtk ColorMaps.json file
  "Rainbow Desaturated",
  "Yellow - Gray - Blue",  // This one seems to be missing in the vtk ColorMaps.json file
  "Rainbow Uniform", // This one seems to be missing in the vtk ColorMaps.json file
  "jet",
];

// Filtering vtk.js colormaps to only include the ones above
let color_maps = {};
vtkColorMaps
  .filter((p) => p.RGBPoints)
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
    color_maps[p.Name] = {
      label: p.Name,
      background: d3.rgb(128, 128, 128),
      null_color: "rgb(75,75,75)",
      opacity: "0.5",
      colors: colors,
    };
  })
  ;

export default {
  color_maps: color_maps,
  ...slycat_color_maps_methods,
}
