// This script runs the preferences wizard for dial-a-cluster.
// It is heavily modified from the CCA wizard code.
//
// S. Martin
// 6/7/2018

import api_root from "js/slycat-api-root";
import client from "js/slycat-web-client";
import ko from "knockout";
import mapping from "knockout-mapping";
import d3 from "d3";
import dacWizardUI from "../html/dac-preferences-wizard.html";
import bookmark_manager from "js/slycat-bookmark-manager";

function constructor(params)
{

    var component = {};

    // get project and model IDs
    component.project = params.projects()[0];
    component.model = params.models()[0];

    // set up bookmark object
    var bookmarker = bookmark_manager.create(component.project._id(), component.model._id());

    // tabs in wizard ui
    component.tab = ko.observable(0);

    // variable and metadata attributes to display in wizard
    component.var_attributes = mapping.fromJS([]);
    component.meta_attributes = mapping.fromJS([]);

    // variables and metadata to include in model
    var var_include_columns = [];
    var meta_include_columns = [];

    // colorbrewer palettes for selecting colormap (sequential, diverging, and discrete)
    // for continuous variables we use 9 colors, for discrete we use 8
    var cb_seq={YlGn:{9:["#ffffe5","#f7fcb9","#d9f0a3","#addd8e","#78c679","#41ab5d","#238443","#006837","#004529"]},
                YlGnBu:{9:["#ffffd9","#edf8b1","#c7e9b4","#7fcdbb","#41b6c4","#1d91c0","#225ea8","#253494","#081d58"]},
                GnBu:{9:["#f7fcf0","#e0f3db","#ccebc5","#a8ddb5","#7bccc4","#4eb3d3","#2b8cbe","#0868ac","#084081"]},
                BuGn:{9:["#f7fcfd","#e5f5f9","#ccece6","#99d8c9","#66c2a4","#41ae76","#238b45","#006d2c","#00441b"]},
                PuBuGn:{9:["#fff7fb","#ece2f0","#d0d1e6","#a6bddb","#67a9cf","#3690c0","#02818a","#016c59","#014636"]},
                PuBu:{9:["#fff7fb","#ece7f2","#d0d1e6","#a6bddb","#74a9cf","#3690c0","#0570b0","#045a8d","#023858"]},
                BuPu:{9:["#f7fcfd","#e0ecf4","#bfd3e6","#9ebcda","#8c96c6","#8c6bb1","#88419d","#810f7c","#4d004b"]},
                RdPu:{9:["#fff7f3","#fde0dd","#fcc5c0","#fa9fb5","#f768a1","#dd3497","#ae017e","#7a0177","#49006a"]},
                PuRd:{9:["#f7f4f9","#e7e1ef","#d4b9da","#c994c7","#df65b0","#e7298a","#ce1256","#980043","#67001f"]},
                OrRd:{9:["#fff7ec","#fee8c8","#fdd49e","#fdbb84","#fc8d59","#ef6548","#d7301f","#b30000","#7f0000"]},
                YlOrRd:{9:["#ffffcc","#ffeda0","#fed976","#feb24c","#fd8d3c","#fc4e2a","#e31a1c","#bd0026","#800026"]},
                YlOrBr:{9:["#ffffe5","#fff7bc","#fee391","#fec44f","#fe9929","#ec7014","#cc4c02","#993404","#662506"]},
                Purples:{9:["#fcfbfd","#efedf5","#dadaeb","#bcbddc","#9e9ac8","#807dba","#6a51a3","#54278f","#3f007d"]},
                Blues:{9:["#f7fbff","#deebf7","#c6dbef","#9ecae1","#6baed6","#4292c6","#2171b5","#08519c","#08306b"]},
                Greens:{9:["#f7fcf5","#e5f5e0","#c7e9c0","#a1d99b","#74c476","#41ab5d","#238b45","#006d2c","#00441b"]},
                Oranges:{9:["#fff5eb","#fee6ce","#fdd0a2","#fdae6b","#fd8d3c","#f16913","#d94801","#a63603","#7f2704"]},
                Reds:{9:["#fff5f0","#fee0d2","#fcbba1","#fc9272","#fb6a4a","#ef3b2c","#cb181d","#a50f15","#67000d"]},
                Greys:{9:["#ffffff","#f0f0f0","#d9d9d9","#bdbdbd","#969696","#737373","#525252","#252525","#000000"]}};
    var cb_div={PuOr:{9:["#b35806","#e08214","#fdb863","#fee0b6","#f7f7f7","#d8daeb","#b2abd2","#8073ac","#542788"]},
                BrBG:{9:["#8c510a","#bf812d","#dfc27d","#f6e8c3","#f5f5f5","#c7eae5","#80cdc1","#35978f","#01665e"]},
                PRGn:{9:["#762a83","#9970ab","#c2a5cf","#e7d4e8","#f7f7f7","#d9f0d3","#a6dba0","#5aae61","#1b7837"]},
                PiYG:{9:["#c51b7d","#de77ae","#f1b6da","#fde0ef","#f7f7f7","#e6f5d0","#b8e186","#7fbc41","#4d9221"]},
                RdBu:{9:["#b2182b","#d6604d","#f4a582","#fddbc7","#f7f7f7","#d1e5f0","#92c5de","#4393c3","#2166ac"]},
                RdGy:{9:["#b2182b","#d6604d","#f4a582","#fddbc7","#ffffff","#e0e0e0","#bababa","#878787","#4d4d4d"]},
                RdYlBu:{9:["#d73027","#f46d43","#fdae61","#fee090","#ffffbf","#e0f3f8","#abd9e9","#74add1","#4575b4"]},
                Spectral:{9:["#d53e4f","#f46d43","#fdae61","#fee08b","#ffffbf","#e6f598","#abdda4","#66c2a5","#3288bd"]},
                RdYlGn:{9:["#d73027","#f46d43","#fdae61","#fee08b","#ffffbf","#d9ef8b","#a6d96a","#66bd63","#1a9850"]}};
    var cb_disc={Accent:{8:["#7fc97f","#beaed4","#fdc086","#ffff99","#386cb0","#f0027f","#bf5b17","#666666"]},
                Dark2:{8:["#1b9e77","#d95f02","#7570b3","#e7298a","#66a61e","#e6ab02","#a6761d","#666666"]},
                Paired:{8:["#a6cee3","#1f78b4","#b2df8a","#33a02c","#fb9a99","#e31a1c","#fdbf6f","#ff7f00"]},
                Pastel1:{8:["#fbb4ae","#b3cde3","#ccebc5","#decbe4","#fed9a6","#ffffcc","#e5d8bd","#fddaec"]},
                Pastel2:{8:["#b3e2cd","#fdcdac","#cbd5e8","#f4cae4","#e6f5c9","#fff2ae","#f1e2cc","#cccccc"]},
                Set1:{8:["#e41a1c","#377eb8","#4daf4a","#984ea3","#ff7f00","#ffff33","#a65628","#f781bf"]},
                Set2:{8:["#66c2a5","#fc8d62","#8da0cb","#e78ac3","#a6d854","#ffd92f","#e5c494","#b3b3b3"]},
                Set3:{8:["#8dd3c7","#ffffb3","#bebada","#fb8072","#80b1d3","#fdb462","#b3de69","#fccde5"]}};

    // sequential or diverging color scales (defaults to sequential)
    component.dac_scale_type = ko.observable("sequential");

    // which color is selected (one for continuous, one for discrete)
    var cont_selected = null;
    // var disc_selected = null;

    // also keep track of color maps
    var cont_map = null;
    // var disc_map = null;

    // option defaults
    var DEF_MAX_LABEL_LENGTH = 20;
    var DEF_MAX_TIME_POINTS = 500;
    var DEF_MAX_NUM_PLOTS = 33;
    var DEF_MAX_POINTS_ANIMATE = 2500;
    var DEF_SCATTER_PLOT_TYPE = "circle";
    var DEF_CONTROL_BAR_POSITION = "scatter-plot";
    var DEF_MAX_CATS = 50;
    var DEF_MAX_FREETEXT_LEN = 500;

    // UI parameters
    component.dac_max_label_length = ko.observable(DEF_MAX_LABEL_LENGTH);
    component.dac_max_time_points = ko.observable(DEF_MAX_TIME_POINTS);
    component.dac_max_num_plots = ko.observable(DEF_MAX_NUM_PLOTS);
    component.dac_max_points_animate = ko.observable(DEF_MAX_POINTS_ANIMATE);
    component.dac_scatter_plot_type = ko.observable(DEF_SCATTER_PLOT_TYPE);
    component.dac_max_cats = ko.observable(DEF_MAX_CATS);
    component.dac_max_freetext_len = ko.observable(DEF_MAX_FREETEXT_LEN);

    // private versions of UI parameters (converted to integers)
    var dac_max_label_length = null;
    var dac_max_time_points = null;
    var dac_max_num_plots = null;
    var dac_max_points_animate = null;
    var dac_max_cats = null;
    var dac_max_freetext_len = null;

    // need a large dialog for color palettes
    $(".modal-dialog").addClass("modal-lg");

    // if the user selects the cancel button we quit, doing nothing
    component.cancel = function() {
        // revert to normal modal dialog size
       $(".modal-dialog").removeClass("modal-lg");
    };

    // this function is called to select variables to
    // include (after selecting metadata)
    var include_variables = function() {

        // load first column and use to let user select metadata
        client.get_model_arrayset_data({
            mid: component.model._id(),
            aid: "dac-variables-meta",
            hyperchunks: "0/0/...",
            success: function(data) {

                // time series names
                var var_names = data[0];

                // attributes for gui
                var attributes = [];
                var name = null;
                var type = null;
                var constant = null;
                var string = null;
                var tooltip = null;

                // put time series names into gui attributes
                for (var i = 0; i != var_names.length; i++) {

                    name = var_names[i];
                    type = "string";
                    tooltip = "";
                    attributes.push({
                        name: name,
                        type: type,
                        constant: constant,
                        disabled: null,
                        Include: true,
                        hidden: false,
                        selected: false,
                        lastSelected: false,
                        tooltip: tooltip
                    });
                };

                // check to see if user has previously selected columns
                bookmarker.getState(function(bookmark)
                {

                    if ("dac-var-include-columns" in bookmark) {

                        var include_columns = bookmark["dac-var-include-columns"];

                        // change attributes according to previous selections
                        for (var i = 0; i != attributes.length; i++) {

                            // un-mark non-included columns
                            if (include_columns.indexOf(i) == -1) {
                                attributes[i].Include = false;
                            }
                        }

                    }

                    // give access to gui
                    mapping.fromJS(attributes, component.var_attributes);

                });
            }
        });
    }

    // upon starting wizard, populate variables
    include_variables();

    // check that user selected at least one variable
    component.check_variables = function () {

        // record variables columns that user wants to include
        var_include_columns = [];
        for(var i = 0; i != component.var_attributes().length; ++i) {
            if(component.var_attributes()[i].Include())
                var_include_columns.push(i);
        };

        // user must select at least one column
        if (var_include_columns.length > 0) {

            // advance to metadata tab
            $("#dac-inc-var-error").hide();
            component.tab(1);

        } else {
            $("#dac-inc-var-error").show();
        }
    }

    // this function gets called after all data is uploaded,
    // including metadata table
    var include_metadata = function() {

        // load header row and use to let user select metadata
        client.get_model_arrayset_metadata({
            mid: component.model._id(),
            aid: "dac-datapoints-meta",
            arrays: "0",
            statistics: "0/...",
            success: function(metadata) {
                var attributes = [];
                var name = null;
                var type = null;
                var constant = null;
                var string = null;
                var tooltip = null;
                for(var i = 0; i != metadata.arrays[0].attributes.length; ++i)
                {
                    name = metadata.arrays[0].attributes[i].name;
                    type = metadata.arrays[0].attributes[i].type;
                    tooltip = "";
                    attributes.push({
                        name: name,
                        type: type,
                        constant: constant,
                        disabled: null,
                        Include: true,
                        hidden: false,
                        selected: false,
                        lastSelected: false,
                        tooltip: tooltip
                    });
                }

                // check to see if user has previously selected columns
                bookmarker.getState(function(bookmark)
                {

                    if ("dac-meta-include-columns" in bookmark) {

                        var include_columns = bookmark["dac-meta-include-columns"];

                        // change attributes according to previous selections
                        for (var i = 0; i != attributes.length; i++) {

                            // un-mark non-included columns
                            if (include_columns.indexOf(i) == -1) {
                                attributes[i].Include = false;
                            }
                        }

                    }

                    // give access to gui
                    mapping.fromJS(attributes, component.meta_attributes);

                });
            }
        });
    };

    // upon starting wizard, populate metadata
    include_metadata();

    // check metadata results
    component.check_metadata = function () {

        // record metadata columns that user wants to include
        meta_include_columns = [];
        for(var i = 0; i != component.meta_attributes().length; ++i) {
            if(component.meta_attributes()[i].Include())
                meta_include_columns.push(i);
        };

        // user must select at least one column
        if (meta_include_columns.length > 0) {

            // advance to color tab
            $("#dac-inc-meta-error").hide();
            component.tab(2);

        } else {
            $("#dac-inc-meta-error").show();
        }


    }

    // set up swatches in third panel
    var draw_swatches = function () {

        // set up swatches
        d3.select("#dac-sequential-swatches")
            .selectAll(".dac-palette")
                .data(d3.entries(cb_seq))
            .enter().append("span")
                .attr("class", "dac-palette")
                .attr("title", function(d) { return d.key; })
            .on("click", select_cont_palette)
            .selectAll(".dac-swatch")
                .data(function(d) { return d.value[d3.keys(d.value).map(Number).sort(d3.descending)[0]]; })
                .enter().append("span")
            .attr("class", "dac-swatch")
            .style("background-color", function(d) { return d; });

        d3.select("#dac-diverging-swatches")
            .selectAll(".dac-palette")
                .data(d3.entries(cb_div))
            .enter().append("span")
                .attr("class", "dac-palette")
                .attr("title", function(d) { return d.key; })
            .on("click", select_cont_palette)
            .selectAll(".dac-swatch")
                .data(function(d) { return d.value[d3.keys(d.value).map(Number).sort(d3.descending)[0]]; })
                .enter().append("span")
            .attr("class", "dac-swatch")
            .style("background-color", function(d) { return d; });

        d3.select("#dac-discrete-swatches")
            .selectAll(".dac-palette")
                .data(d3.entries(cb_disc))
            .enter().append("span")
                .attr("class", "dac-palette")
                .attr("title", function(d) { return d.key; })
            .on("click", select_cont_palette)
            .selectAll(".dac-swatch")
                .data(function(d) { return d.value[d3.keys(d.value).map(Number).sort(d3.descending)[0]]; })
                .enter().append("span")
            .attr("class", "dac-swatch")
            .style("background-color", function(d) { return d; });

        // load up previous continuous selection, if any
        bookmarker.getState(function(bookmark)
        {

            if ("dac-cont-colormap" in bookmark) {

                var cont_data = bookmark["dac-cont-colormap"];

                // set continuous color map data
                cont_map = cont_data[0];
                cont_selected = cont_data[1];

                // is there a selection?
                if (cont_selected != null) {

                    // is it a diverging selection?
                    if (cont_selected in cb_div) {

                        // yes, switch to diverging color scales
                        component.dac_scale_type("diverging");
                    }

                    // is it a discrete selection? (added for continuous, discrete merge)
                    if (cont_selected in cb_disc) {

                        // yes, switch to discrete color scales
                        component.dac_scale_type("discrete");
                    }

                    // either way, highlight previous selection
                    d3.select("[title=" + cont_selected + "]")
                        .style("background-color", "#444")

                };
            };

        });

    }

    // set continuous color palette selection
    var select_cont_palette = function (d) {

        // if previously selected, then unselect
        if (d.key == cont_selected) {

            // unselect in UI
            d3.select("[title=" + cont_selected + "]")
                .style("background-color", "#fff")

            // unselect in code
            cont_selected = null;
            cont_map = null;

        } else {

            // remove previous sequential/diverging selections
            if (cont_selected != null) {

                // if previous sequential selection then remove
                d3.select("[title=" + cont_selected + "]")
                    .style("background-color", "#fff")

            }

            // now set new selection
            cont_selected = d.key;
            d3.select("[title=" + cont_selected + "]")
                .style("background-color", "#444")

            // keep up with actual color map too
            cont_map = d3.values(d.value).map(JSON.stringify).join("\n");

        }

    }

    /* disconected, only using select_cont_palette
    // set discrete color palette selection
    var select_disc_palette = function (d) {

        // if previously selected, then unselect
        if (d.key == disc_selected) {

            // unselect in UI
            d3.select("[title=" + disc_selected + "]")
                .style("background-color", "#fff")

            // unselect in code
            disc_selected = null;
            disc_map = null;

        } else {

            // remove previous sequential/diverging selections
            if (disc_selected != null) {

                // if previous sequential selection then remove
                d3.select("[title=" + disc_selected + "]")
                    .style("background-color", "#fff")

            }

            // now set new selection
            disc_selected = d.key;
            d3.select("[title=" + disc_selected + "]")
                .style("background-color", "#444")

            // keep up with actual color map too
            disc_map = d3.values(d.value).map(JSON.stringify).join("\n");

        }

    }
    */

    // initialize all swatches, switch betweent them in wizard
    draw_swatches();

    // initialize options with any previous selections
    var init_options = function () {

        // load previous selections
        bookmarker.getState(function(bookmark)
        {

            // set options, if they exist
            if ("dac-MAX-PLOT-NAME" in bookmark) {
                component.dac_max_label_length(bookmark["dac-MAX-PLOT-NAME"]); };

            if ("dac-MAX-TIME-POINTS" in bookmark){
                component.dac_max_time_points(bookmark["dac-MAX-TIME-POINTS"]); };

            if ("dac-MAX-NUM-POINTS" in bookmark) {
                component.dac_max_num_plots(bookmark["dac-MAX-NUM-PLOTS"]); };

            if ("dac-MAX-POINTS-ANIMATE" in bookmark) {
                component.dac_max_points_animate(bookmark["dac-MAX-POINTS-ANIMATE"]); };

            if ("dac-SCATTER-PLOT-TYPE" in bookmark) {
                component.dac_scatter_plot_type(bookmark["dac-SCATTER-PLOT-TYPE"]); };

            if ("dac-MAX-CATS" in bookmark) {
                component.dac_max_cats(bookmark["dac-MAX-CATS"]); };

            if ("dac-MAX-FREETEXT-LEN" in bookmark) {
                component.dac_max_freetext_len(bookmark["dac-MAX-FREETEXT-LEN"]); };

        });

    }

    // set options to display any previous selections
    init_options();

    // show options tab
    component.speedup_preferences = function() {

        // show speed up preferences
        component.tab(3);

    };

    // check user selection options before finishing wizard
    component.check_options = function () {

        // convert to correct types
        dac_max_label_length = Math.round(Number(component.dac_max_label_length()));
        dac_max_time_points = Math.round(Number(component.dac_max_time_points()));
        dac_max_num_plots = Math.round(Number(component.dac_max_num_plots()));
        dac_max_points_animate = Math.round(Number(component.dac_max_points_animate()));
        dac_max_cats = Math.round(Number(component.dac_max_cats()));
        dac_max_freetext_len = Math.round(Number(component.dac_max_freetext_len()));
        
        // check options
        var no_errors = true;

        if (dac_max_label_length < 5) {

            // label length must be at least 5
            $("#dac-label-length").addClass("is-invalid");
            no_errors = false;
        }

        if (component.dac_max_time_points() < 10) {

            // time points must be at least 10
            $("#dac-max-time-points").addClass("is-invalid");
            no_errors = false;
        }

        if (component.dac_max_num_plots() < 10) {

            // time points must be at least 10\
            $("#dac-max-plots").addClass("is-invalid");
            no_errors = false;
        }

        if (component.dac_max_points_animate() < 10) {

            // time points must be at least 10
            $("#dac-max-anim").addClass("is-invalid");
            no_errors = false;

        }

        if (component.dac_max_cats() < 5) {

            // maximum categories must be at least 5
            $("#dac-max-cats").addClass("is-invalid");
            no_errors = false;
        }

        if (component.dac_max_freetext_len() < 10) {

            // maximum freetext length must be at least 10
            $("#dac-max-freetext").addClass("is-invalid");
            no_errors = false;
        }

        if (no_errors == true) {

            // everything is checked, finish model
            component.finish();
        }
    }

    // reset defaults on options pane
    component.reset_defaults = function () {

        component.dac_max_label_length(DEF_MAX_LABEL_LENGTH);
        component.dac_max_time_points(DEF_MAX_TIME_POINTS);
        component.dac_max_num_plots(DEF_MAX_NUM_PLOTS);
        component.dac_max_points_animate(DEF_MAX_POINTS_ANIMATE);
        component.dac_scatter_plot_type(DEF_SCATTER_PLOT_TYPE);
        component.dac_max_cats(DEF_MAX_CATS);
        component.dac_max_freetext_len(DEF_MAX_FREETEXT_LEN);

        // turn off any errors
        $("#dac-label-length").removeClass("is-invalid");
        $("#dac-max-time-points").removeClass("is-invalid");
        $("#dac-max-plots").removeClass("is-invalid");
        $("#dac-max-anim").removeClass("is-invalid");
        $("#dac-max-cats").removeClass("is-invalid");
        $("#dac-max-freetext").removeClass("is-invalid");

    };

    // very last function called to launch model
    component.go_to_model = function() {

        // revert to normal modal dialog size
        // $(".modal-dialog").removeClass("modal-lg");
        location = 'models/' + component.model._id();
    };

    // this script gets called at the end of the 4th tab (after selecting columns to include)
    component.finish = function() {

        // turn off continue button while we load data
        $(".browser-continue").toggleClass("disabled", true);

        // update bookmark state to reflect meta data columns
        bookmarker.updateState({"dac-meta-include-columns": meta_include_columns});

        // update bookmark state to reflect variable columns
        bookmarker.updateState({"dac-var-include-columns": var_include_columns});

        // update bookmark state to reflect continuous colormap
        bookmarker.updateState({"dac-cont-colormap": [cont_map, cont_selected]});

        // update bookmark state to reflect discrete colormap
        // bookmarker.updateState({"dac-disc-colormap": [disc_map, disc_selected]});

        // update remaining options in bookmark state
        bookmarker.updateState({"dac-MAX-PLOT-NAME": dac_max_label_length,
                                "dac-MAX-COLOR-NAME": dac_max_label_length,
                                "dac-MAX-SLIDER-NAME": dac_max_label_length,
                                "dac-MAX-TIME-POINTS": dac_max_time_points,
                                "dac-MAX-NUM-PLOTS": dac_max_num_plots,
                                "dac-MAX-POINTS-ANIMATE": dac_max_points_animate,
                                "dac-SCATTER-PLOT-TYPE": component.dac_scatter_plot_type(),
                                "dac-MAX-CATS": dac_max_cats,
                                "dac-MAX-FREETEXT-LEN": dac_max_freetext_len});

        // re-init MDS coords
        init_MDS_coords();

    };

    // call to re-initialize MDS coords and alpha cluster values
    var init_MDS_coords = function () {

        // call server to compute new coords
        client.get_model_command({
            mid: component.model._id(),
            type: "DAC",
            command: "init_mds_coords",
            success: function () {

                // re-load model
                component.go_to_model();
            },
            error: function () {

                $("#dac-init-MDS-error").show();
                $(".browser-continue").toggleClass("disabled", false);
            }
        });
    }

    // function for operating the back button in the wizard
    component.back = function() {

        var target = component.tab();

        target--;

        component.tab(target);
    };

    return component;
}

export default {
viewModel: constructor,
template: dacWizardUI
};
