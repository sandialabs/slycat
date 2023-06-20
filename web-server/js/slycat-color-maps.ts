/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC. 
Under the terms of Contract  DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government  
retains certain rights in this software. */

import d3 from "d3";
import slycat_color_maps_methods from "js/slycat-color-maps-methods";

interface ColorMapsInterface {
  [key: string]: {
    label: string;
    background: string;
    null_color: string;
    outofdomain_color: string;
    scatterplot_grid_color: string;
    opacity: string;
    colors: d3.RGBColor[];
  };
}

const WHITE = "rgb(255 255 255)";
const GRAY1 = "rgb(204, 204, 204)";
const GRAY2 = "rgb(128 128 128)";
const GRAY3 = "rgb(102 102 102)";
const GRAY4 = "rgb(75 75 75)";
const BLACK = "rgb(0 0 0)";

export default {
  color_maps: {
    night: {
      label: "Night",
      background: GRAY2,
      null_color: GRAY4,
      outofdomain_color: BLACK,
      scatterplot_grid_color: GRAY3,
      opacity: "0.5",
      colors: [
        d3.rgb(59, 76, 192),
        d3.rgb(68, 90, 204),
        d3.rgb(77, 104, 215),
        d3.rgb(87, 117, 225),
        d3.rgb(98, 130, 234),
        d3.rgb(108, 142, 241),
        d3.rgb(119, 154, 247),
        d3.rgb(130, 165, 251),
        d3.rgb(141, 176, 254),
        d3.rgb(152, 185, 255),
        d3.rgb(163, 194, 255),
        d3.rgb(174, 201, 253),
        d3.rgb(184, 208, 249),
        d3.rgb(194, 213, 244),
        d3.rgb(204, 217, 238),
        d3.rgb(213, 219, 230),
        d3.rgb(221, 221, 221),
        d3.rgb(229, 216, 209),
        d3.rgb(236, 211, 197),
        d3.rgb(241, 204, 185),
        d3.rgb(245, 196, 173),
        d3.rgb(247, 187, 160),
        d3.rgb(247, 177, 148),
        d3.rgb(247, 166, 135),
        d3.rgb(244, 154, 123),
        d3.rgb(241, 141, 111),
        d3.rgb(236, 127, 99),
        d3.rgb(229, 112, 88),
        d3.rgb(222, 96, 77),
        d3.rgb(213, 80, 66),
        d3.rgb(203, 62, 56),
        d3.rgb(192, 40, 47),
        d3.rgb(180, 4, 38),
      ],
    },
    day: {
      label: "Day",
      background: WHITE,
      null_color: GRAY2,
      outofdomain_color: BLACK,
      scatterplot_grid_color: GRAY1,
      opacity: "0.7",
      colors: [
        d3.rgb(100, 108, 234),
        d3.rgb(115, 118, 240),
        d3.rgb(128, 128, 244),
        d3.rgb(140, 138, 248),
        d3.rgb(151, 147, 250),
        d3.rgb(161, 155, 251),
        d3.rgb(169, 163, 251),
        d3.rgb(177, 170, 250),
        d3.rgb(184, 177, 248),
        d3.rgb(189, 182, 245),
        d3.rgb(193, 187, 241),
        d3.rgb(197, 191, 236),
        d3.rgb(199, 194, 230),
        d3.rgb(200, 196, 224),
        d3.rgb(201, 198, 216),
        d3.rgb(200, 199, 208),
        d3.rgb(198, 198, 198),
        d3.rgb(210, 197, 195),
        d3.rgb(220, 194, 192),
        d3.rgb(229, 191, 187),
        d3.rgb(236, 186, 181),
        d3.rgb(243, 181, 175),
        d3.rgb(248, 175, 168),
        d3.rgb(251, 168, 160),
        d3.rgb(254, 159, 152),
        d3.rgb(255, 150, 143),
        d3.rgb(255, 140, 133),
        d3.rgb(253, 129, 123),
        d3.rgb(250, 117, 112),
        d3.rgb(246, 105, 101),
        d3.rgb(240, 91, 90),
        d3.rgb(233, 75, 78),
        d3.rgb(225, 57, 66),
      ],
    },
    rainbow: {
      label: "Rainbow Night",
      background: GRAY2,
      null_color: GRAY4,
      outofdomain_color: BLACK,
      scatterplot_grid_color: GRAY3,
      opacity: "0.6",
      colors: [d3.rgb(0, 0, 255), d3.rgb(0, 255, 255), d3.rgb(255, 255, 0), d3.rgb(255, 0, 0)],
    },
    rainbow_day: {
      label: "Rainbow Day",
      background: WHITE,
      null_color: GRAY2,
      outofdomain_color: BLACK,
      scatterplot_grid_color: GRAY1,
      opacity: "0.7",
      colors: [d3.rgb(0, 0, 255), d3.rgb(0, 255, 255), d3.rgb(255, 255, 0), d3.rgb(255, 0, 0)],
    },
    grayscale_night: {
      label: "Grayscale Night",
      background: GRAY2,
      // ToDo: fix this, null and outofdomain colors need to be different than normal colors
      null_color: GRAY4,
      outofdomain_color: BLACK,
      scatterplot_grid_color: GRAY3,
      opacity: "0.6",
      colors: [d3.rgb(255, 255, 255), d3.rgb(0, 0, 0)],
    },
    grayscale_day: {
      label: "Grayscale Day",
      background: d3.rgb(255, 255, 255),
      // ToDo: fix this, null and outofdomain colors need to be different than normal colors
      null_color: "gray",
      outofdomain_color: "black",
      scatterplot_grid_color: "rgb(80% 80% 80%)",
      opacity: "0.6",
      colors: [d3.rgb(255, 255, 255), d3.rgb(0, 0, 0)],
    },
  } as ColorMapsInterface,
  ...slycat_color_maps_methods,
};
