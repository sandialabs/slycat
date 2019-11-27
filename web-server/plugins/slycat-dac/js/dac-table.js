/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

import jquery_ui_css from "jquery-ui/themes/base/all.css";

import slick_grid_css from "slickgrid/slick.grid.css";
import slick_default_theme_css from "slickgrid/slick-default-theme.css";
import slick_headerbuttons_css from "slickgrid/plugins/slick.headerbuttons.css";
import slick_slycat_theme_css from "css/slick-slycat-theme.css";
import "../css/slick-dac-theme.css";

import selections from "./dac-manage-selections.js";
import d3 from "d3";
import client from "js/slycat-web-client";
import URI from "urijs";
import "jquery-ui/ui/keycode";
import * as dialog from "js/slycat-dialog";
import "slickgrid/lib/jquery.event.drag-2.3.0";
import "slickgrid/lib/jquery.event.drop-2.3.0";
import "slickgrid/slick.core";
import "slickgrid/slick.grid";
import "slickgrid/plugins/slick.rowselectionmodel";
import "slickgrid/plugins/slick.headerbuttons";
import "slickgrid/plugins/slick.autotooltips";
import "slickgrid/slick.dataview";

// public functions will be returned via the module variable
var module = {};

// model ID
var mid = URI(window.location).segment(-1);

// slick grid and data views
var data_view;
var grid_view;

// slick grid columns and rows
var grid_columns = [];
var grid_rows = [];

// slick grid table column dimensions (split into editable/non-editable)
var num_rows = [];
var num_cols = [];
var num_editable_cols = [];
var editable_col_types = [];

var curr_sel_type = null;

// max number of selections
var max_num_sel = null;

// colors to use for exporting table
var user_sel_colors = null;

// keep track of current and previous rows selected
var prev_row_selected = null;
var curr_row_selected = null;

// slick grid options
var grid_options = {
	enableColumnReorder: false,
	multiSelect: false,
	editable: true,
};

// maximum freetext length for editable columns
var MAX_FREETEXT_LEN = 0;

// hardcoded pixel values for editable columns
var SEL_BORDER_WIDTH = 11;

// populate slick grid's column metadata
function make_column(id_index, name, editor, options)
{
	return {
		id : id_index,
		field : id_index,
		name : name,
		sortable : true,
		toolTip : name,
		editor: editor,
		options: options
	};
}

// load grid data and set up colors for selections
module.setup = function (metadata, data, include_columns, editable_columns, model_origin,
                         max_freetext_len, MAX_NUM_SEL, USER_SEL_COLORS,
                         init_sort_order, init_sort_col)
{
	// set up callback for data download button
	var download_button = document.querySelector("#dac-download-table-button");
	download_button.addEventListener("click", download_button_callback);

	// set maximum length of freetext for editable columns
	MAX_FREETEXT_LEN = max_freetext_len;

    // set maximum number of selections
    // (note this cannot exceed 8 for the table, as of 11/25/2019)
    max_num_sel = MAX_NUM_SEL;

    // user colors for outputing table
    user_sel_colors = USER_SEL_COLORS;

	// get number of rows and total available columns in data table
	num_rows = data[0]["data"][0].length;
	var avail_cols = data[0]["data"].length;

	// set number of columns to use
	num_cols = include_columns.length;
	var num_origin_cols = 0;
	if (model_origin.length > 0) { num_origin_cols = 1 };
	num_editable_cols = editable_columns["attributes"].length;

	// set up slick grid column names (with non-mutable columns)
	for (var i = 0; i != num_cols; i++) {

		// set up as non-editable column
		grid_columns.push(make_column(i,
			metadata[0]["column-names"][include_columns[i]], null, null));
	}

	// set up model origin, if available (also non-mutable)
	for (var i = 0; i != num_origin_cols; i++) {
	    grid_columns.push(make_column(num_cols,
	        "From Model", null, null));
	}

	// set up editable column names
	for (var i = 0; i != num_editable_cols; i++) {
	    editable_col_types.push(editable_columns["attributes"][i].type);
		if (editable_col_types[i] == "freetext") {

			// set up freetext editor
			grid_columns.push(make_column(num_cols + num_origin_cols + i,
				editable_columns["attributes"][i].name, TextEditor, null));

		} else {

			// set up categorical editor
			grid_columns.push(make_column(num_cols + num_origin_cols + i,
				editable_columns["attributes"][i].name, SelectCellEditor,
				editable_columns["categories"][i]));
		}
	}

	// produce new data table with correct columns
	var table_data = [];
	for (var i = 0; i != num_cols; i++) {
		table_data.push(data[0]["data"][include_columns[i]])
	}

	// populate model origin data
	for (var i = 0; i != num_origin_cols; i++) {
	    table_data.push(model_origin);
	}

	// populate editable column data
	for (var i = 0; i != num_editable_cols; i++) {
		table_data.push(editable_columns["data"][i]);
	}

	// adjust number of columns to reflect origin column
	// (from now on treat origin column the same as any non-mutable data)
	num_cols = num_cols + num_origin_cols

	// produce a vector of sequential id for table rows and a zero vector
	var row_id = [];
	var zero_vec = [];
	for (var i = 0; i != num_rows; i++) {
		row_id.push(i);
		zero_vec.push(0);
	}

	// add two columns to data, unique id and selection mode
	table_data.push(row_id);
	table_data.push(zero_vec);
	grid_rows = d3.transpose(table_data);

	// set up slick grid
	data_view = new Slick.Data.DataView();
	grid_view = new Slick.Grid("#dac-datapoints-table", data_view,
								grid_columns, grid_options);

	// keep track of shift or meta key
	grid_view.onClick.subscribe(one_row_selected);

	// set table data (second to last column is ids)
	data_view.setItems(grid_rows, num_cols + num_editable_cols);

	// set up row selection
	grid_view.setSelectionModel (new Slick.RowSelectionModel());
	//grid_view.onSelectedRowsChanged.subscribe(multiple_rows_selected);

	// helpers for grid to respond to data_view changes
	data_view.onRowCountChanged.subscribe(change_rows);
	data_view.onRowsChanged.subscribe(change_cols);

	// update meta data function to accommodate multiple selection classes
	data_view.getItemMetadata = color_rows(data_view.getItemMetadata);

	// add sorting
	grid_view.onSort.subscribe(col_sort);

	// fit table into container
	module.resize();

	// show selections, if any
	module.select_rows()

    // check for bookmarked sort order
    if (init_sort_order != null) {

        // check if sort col is valid
        if (init_sort_col < (num_cols + num_editable_cols)) {

            // sort by bookmarked column
            grid_view.setSortColumn(init_sort_col, init_sort_order);

            var comparer = function (a,b) {
	        	return (a[init_sort_col] > b[init_sort_col]) ? 1 : -1;
	        }

	        data_view.sort(comparer, init_sort_order);
        }
    }

	// jump to current selection (focus then selection 1)
	if (selections.focus() != null) {
	    module.jump_to([selections.focus()]);
	} else {
	    module.jump_to(selections.sel(1));
	};

}

// download data table button
var download_button_callback = function ()
{
	// concatenate all selections
	var sel = selections.sel();

	// check if there anything is selected
	if (sel.length == 0) {

		// nothing selected: download entire table
		write_data_table([], "DAC_Untitled_Data_Table.csv");

	 } else {

		// something selected, see what user wants to export
		openCSVSaveChoiceDialog(sel);
	 }
 }

// write data table (modified from parameter space model code)
function write_data_table (rows_to_output, defaultFilename)
{
	// convert data table to csv for writing
	var csvData = convert_to_csv (rows_to_output);

	// set up download link
	var D = document;
	var a = D.createElement("a");
	var strMimeType = "text/plain";

	//build download link:
	a.href = "data:" + strMimeType + ";charset=utf-8," + encodeURIComponent(csvData);

	// opens download dialog (this code is crap)
	if ('download' in a) {
		a.setAttribute("download", defaultFilename);
		a.innerHTML = "downloading...";
		D.body.appendChild(a);
		setTimeout(function() {
			var e = D.createEvent("MouseEvent");
			e.initMouseEvent("click", true, false, window,
				0, 0, 0, 0, 0, false, false, false, false, 0, null);
			a.dispatchEvent(e);
			D.body.removeChild(a);
		}, 66);
	return true;
	} else {
		console.log("Could not detect firefox/chrome.");
	}
 };

// generate csv text from data table
function convert_to_csv (user_selection)
{
	// if nothing selected, then output entire table
	var rows_to_output = [];
	if (user_selection.length == 0) {

		// get indices of every row in the table
		for (var i = 0; i < num_rows; i++) {
			rows_to_output.push(i);
		}
	} 
	else {
		rows_to_output = user_selection;
	}
    
	// look for extra commas and warn user
	var extra_commas_found = false;

	// output data in data_view (sorted as desired by user) order
	var csv_output = "";

	// output headers
	for (var i = 0; i < (num_cols + num_editable_cols); i++) {
		var header_name = grid_columns[i].name;

		// check for commas in column header
		if (header_name.indexOf(",") != -1) {
			extra_commas_found = true;
		}

		// strip any commas and add to csv header
		csv_output += header_name.replace(/,/g,"") + ",";
	}

	// add selection color to header, end line
	csv_output += 'User Selection\n'

	// remove last comma, end line
	//csv_output = csv_output.slice(0,-1) + "\n";

	// output data
	for (var i = 0; i < num_rows; i++) {

		// get slick grid table data
		var item = grid_view.getDataItem(i);

		// get selection index
		var sel_i = item[item.length-2];

		// check if data is in the selection
		if (rows_to_output.indexOf(sel_i) != -1) {

			// sanitize row (remove commas)
			var csv_row = [];
			for (var j = 0; j < (num_cols + num_editable_cols); j ++) {

				// check for commas for later warning
				if (String(item[j]).indexOf(",") != -1) {
					extra_commas_found = true;
				}

				// strip commas
				csv_row.push(String(item[j]).replace(/,/g, ""));
			}

            // convert focus selection to selection-#
            var row_sel = selection_type(item);
            if (row_sel == 'focus-selection') {
                var focus_sel = selections.focus();
                for (var j = 0; j < max_num_sel; j++) {
                    if (selections.in_sel_x(focus_sel, j+1) != -1) {
                        row_sel = 'selection-' + (j+1);
                        break;
                    }
                }
            }

            // convert selection-# to user output color
            var row_color = "";
            if (row_sel.search("selection-") != -1) {
                row_color = user_sel_colors[parseInt(row_sel.charAt(row_sel.length-1))-1];
            }

            csv_row.push(row_color);

			// add row to csv output
			csv_output += csv_row + "\n";
		}
	}

	// produce warning if extra commas were detected
	if (extra_commas_found) {
		 dialog.ajax_error("Warning.  Commas were detected in the table data " +
		    "text and will be removed in the .csv output file.")
			("","","");
	}
	return csv_output;
}

// opens a dialog to ask user if they want to save selection or whole table
// (modified from videoswarm code)
function openCSVSaveChoiceDialog(sel)
{
	// sel contains the entire selection (both red and blue)
	// (always non-empty when called)
	// message to user
	var txt = "You have " + sel.length + " row(s) selected.  What would you like to do?";

	// buttons for dialog
	var buttons_save = [
		{className: "btn-light", label:"Cancel"},
		{className: "btn-primary", label:"Save Entire Table", icon_class:"fa fa-table"},
		{className: "btn-primary", label:"Save Selected", icon_class:"fa fa-check"}
	];

	// launch dialog
	dialog.dialog(
	{
		title: "Export Table Data",
		message: txt,
		buttons: buttons_save,
		callback: function(button)
		{
		    if (typeof button !== 'undefined') {

                if(button.label == "Save Entire Table")
                    write_data_table([], "DAC_Untitled_Data_Table.csv");

                else if(button.label == "Save Selected")
                    write_data_table( selections.sel(),
                        "DAC_Untitled_Data_Table_Selection.csv");
            }
		},
	});
}

// single row selection
function one_row_selected(e, args) {

	// pass along shift/meta key information
	selections.key_flip(e.shiftKey, e.ctrlKey);

	// convert row clicked to data table row
	var data_clicked = convert_row_ids([args.row])[0];

	// check if row is in the subset (and not an editable column)
	if (selections.in_subset(data_clicked) &&
            args.cell < num_cols) {

        // keep track of current selection
        curr_row_selected = args.row;

        // highlight clicked row
        highlight_curr_row();

        // check for range selection
        var range_sel = [];
        if (prev_row_selected != null) {
            if (selections.shift_key() == true) {

                // get range of data
                var range_sel_inds = [];
                for (var i = Math.min(args.row, prev_row_selected);
                         i <= Math.max(args.row, prev_row_selected); i++) {

                    range_sel_inds.push(i);
                }

                // convert to data ids
                range_sel = convert_row_ids(range_sel_inds);
            }
        }

		// make sure we are in a selection mode
		if (selections.sel_type() > 0) {

            // check for range selection
            if (range_sel.length > 1) {

                // user selected a range in the table
                selections.update_sel_range(range_sel);

            } else {

                // check if row is already selected
                // update selection and/or focus
                selections.update_sel_focus(data_clicked);
            }

		// in zoom or subset mode, we can still do focus/de-focus
		} else {

			selections.change_focus(data_clicked);

		}

		// update previous selection
	    prev_row_selected = curr_row_selected;

	}

}

// hihglight the current row by drawing a box around it
function highlight_curr_row()
{

	// temporarily turn off table rendering
	data_view.beginUpdate();

    // get current row
	var curr_data_row = convert_row_ids([curr_row_selected])[0];
    var item = data_view.getItemById(curr_data_row);
    var num_cols = item.length;

    // update current row (set to draw box around it -- see select_rows())
    item[num_cols-1] = item[num_cols-1] + 10;

    // put row back in table
    data_view.updateItem(curr_data_row, item);

    // update previous row
    if (prev_row_selected != null) {

        // get previous row
        var prev_data_row = convert_row_ids([prev_row_selected])[0];
        item = data_view.getItemById(prev_data_row);

        // remove box around previous row
        item[num_cols-1] = item[num_cols-1] - 10;

        // put row back in table
        data_view.updateItem(prev_data_row, item);
    }

	// turn on table rendering
	data_view.endUpdate();

}

// slick grid row selected on click (for multiple rows)
function multiple_rows_selected (e, args)
{

	// get rows selected
	var rows = grid_view.getSelectedRows();

	// convert to table ids
	var row_ids = convert_row_ids(rows);

	// add selections (unless in zoom mode)
	if (selections.sel_type() > 0) {
		selections.zero_sel();
		selections.update_sel(row_ids[0]);
	}

	// fire selection change event
	var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
										 active_sel: []} });
	document.body.dispatchEvent(selectionEvent);

}

// converts selected row id to table row id (in case table is sorted)
function convert_row_ids(rows)
{

	// change grid ids to data ids
	var row_ids = [];
	for (var i = 0; i < rows.length; i++) {
		var item = data_view.getItem(rows[i]);
		row_ids.push(item[item.length-2]);
	}

	return row_ids;

}

// slick grid change in rows
function change_rows (e, args)
{
	grid_view.updateRowCount();
	grid_view.render();
}

// slick grid change in columns
function change_cols (e, args)
{
	grid_view.invalidateRows(args.rows);
	grid_view.render();
}

// override slick grid meta data method to color rows according to selection
function color_rows(old_metadata) {

	return function(row) {
		var item = this.getItem(row);
		var meta = old_metadata(row) || {};

		if (item) {

			// make sure the "cssClasses" property exists
			meta.cssClasses = meta.cssClasses || '';

            // get selection css class
            meta.cssClasses = selection_type (item);

			// set css class for currently clicked item
			if (Math.floor(item[item.length-1] / 10) == 1) {
			    meta.cssClasses += ' clicked';
			}

		}

		return meta;
	}
}

// get selection string for coloring
function selection_type (item)
{
    // selection string to return
    var sel_string = "";

    // get the selection type
    var sel_css_type = item[item.length-1] % 10;

    // set css according to selection type
    for (var i = 1; i <= max_num_sel; i++) {
        if (sel_css_type == i) {
            sel_string = 'selection-' + i.toString();
        }
    }

    // set css class according to focus and subset
    if (sel_css_type > max_num_sel) {

        if (sel_css_type == (max_num_sel+1)) {
            sel_string = 'focus-selection';
        } else if (sel_css_type == (max_num_sel+2)) {
            sel_string = 'not-in-subset';
        } else {
            sel_string = 'no-selection';
        }

    }

    return sel_string;
}

// slick grid column sort
function col_sort (e, args)
{

	var comparer = function (a,b) {
		return (a[args.sortCol.field] > b[args.sortCol.field]) ? 1 : -1;
	}

	data_view.sort(comparer, args.sortAsc);

    // table order sort event
    var tableOrderEvent = new CustomEvent("DACTableOrderChanged", { detail: {
										  sort_col: args.sortCol.field,
										  sort_order: args.sortAsc} });
	document.body.dispatchEvent(tableOrderEvent);

}

// slick grid custom cell editor for text
// modified from slick grid text editor
function TextEditor(args) {

	var $input;
	var defaultValue;
	var scope = this;

	this.init = function () {

		$input = $("<INPUT type=text class='editor-text' maxlength='" +
					String(MAX_FREETEXT_LEN) + "'/>");

		$input.appendTo(args.container);

        $input.bind("keydown.nav", function (e) {

            if (e.keyCode === $.ui.keyCode.LEFT ||
                e.keyCode === $.ui.keyCode.RIGHT) {
                e.stopImmediatePropagation();
            }

            if (e.keyCode === $.ui.keyCode.ENTER) {
                update_freetext_cell($input);
            }
        });

        // save results if user clicks off text box
        $input.focusout(function () {
            update_freetext_cell($input);
        });

		$input.focus();

		$input.select();
	};

	this.destroy = function () {
		$input.remove();
	};

	this.focus = function () {
		$input.focus();
	};

	this.getValue = function () {
		return $input.val();
	};

	this.setValue = function (val) {
		$input.val(val);
	};

	this.loadValue = function (item) {
		defaultValue = item[args.column.field] || "";
		$input.val(defaultValue);
		$input[0].defaultValue = defaultValue;
		$input.select();
	};

	this.serializeValue = function () {
		return $input.val();
	};

	this.applyValue = function (item, state) {
		item[args.column.field] = state;
	};

	this.isValueChanged = function () {
		return (!($input.val() == "" && defaultValue == null)) && ($input.val() != defaultValue);
	};

	this.validate = function () {

		if (args.column.validator) {
			var validationResults = args.column.validator($input.val());
			if (!validationResults.valid) {
				return validationResults;
			}
		}

		return {
			valid: true,
			msg: null
		};
	};

	this.init();
}

// updates free text cell
function update_freetext_cell ($input) {

    // get cell position
    var cell_pos = grid_view.getActiveCell();
    var row_id = cell_pos["row"];
    var col_id = cell_pos["cell"] - num_cols;

    // get new value
    var cell_val = $input.val();

    // update value by in table and database
    update_editable_col (row_id, col_id, cell_val);

    // reset active cell so no problems with focus
    grid_view.resetActiveCell();

}

// slick grid custom cell editor for categorical values
// modified from slick grid yes-no-select editor
function SelectCellEditor(args) {
	var $select;
	var defaultValue;
	var scope = this;
		this.init = function() {
		var opt_values = ["yes","no"];
		if(args.column.options){
			opt_values = args.column.options;
		}

		var option_str = "";
		for(let i in opt_values ){
			option_str += "<option>"+opt_values[i]+"</option>";
		}

		$select = $('<select>'+ option_str +"</select>");
		$select.width(args.column.width - SEL_BORDER_WIDTH);
		$select.appendTo(args.container);

		// remove select on change and update database
		$select.on("change", function (value) {

			// get cell position
			var cell_pos = grid_view.getActiveCell();
			var row_id = cell_pos["row"];
			var col_id = cell_pos["cell"] - num_cols;

			// get new value
			var cell_val = $select.val();

			// update value by in table and database
			update_editable_col (row_id, col_id, cell_val);

			// reset active cell so no problems with focus
			grid_view.resetActiveCell();
			});
			$select.focus();
		$select.select();
	};
		this.destroy = function() {
		$select.remove();
	};
		this.focus = function() {
		$select.focus();
	};
		this.loadValue = function(item) {
		defaultValue = item[args.column.field];
		$select.val(defaultValue);
	};
		this.serializeValue = function() {
		if(args.column.options){
			return $select.val();
		}else{
			return ($select.val() == "yes");
		}
	};
		this.applyValue = function(item,state) {
		item[args.column.field] = state;
	};
		this.isValueChanged = function() {
		return ($select.val() != defaultValue);
	};
		this.validate = function() {
		return {
			valid: true,
			msg: null
		};
	};
		this.init();
}

// update click grid cell and editable data in slycat
function update_editable_col(row, col, val)
{
	// get slick grid table data
	var item = grid_view.getDataItem(row);

	// adjust row to actual row in stored data
	var data_row = item[item.length-2];

	// temporarily turn off table rendering
	data_view.beginUpdate();

	// update table on server
	client.get_model_command({
		mid: mid,
		type: "DAC",
		command: "manage_editable_cols",
		parameters: ['update', -1, -1, -1, col, data_row, val],
		success: function(result) {

				if (result["error"] === "reader") {
					dialog.ajax_error("Access denied.  You must be a project writer or administrator to change the table data.")
					("","","");
				} else {

				// update table on screen
				item[num_cols + col] = val;

				// put row back in table
				data_view.updateItem(data_row, item);
				
			    }

			// finish update
			data_view.endUpdate();

			},
		error: function ()
		{
			dialog.ajax_error('Server error updating editable column.')
					("","","");
			data_view.endUpdate();
		}
	});

	// if categorical column then alert scatter plot for update of colors
	if (editable_col_types[col] == "categorical") {

	    // editable column change (to update scatter plot, if needed)
	    var editableColEvent = new CustomEvent("DACEditableColChanged", { detail: num_cols + col });
	    document.body.dispatchEvent(editableColEvent);

	}

}

// resize slick grid if container resizes
module.resize = function()
{
	// get size of container
	var width = $("#dac-datapoints-pane").width();
	var height = $("#dac-datapoints-pane").height();

	// set table size to size of container
	$("#dac-datapoints-table").width(width);
	$("#dac-datapoints-table").height(height);

	// re-draw table
	grid_view.resizeCanvas();

	// re-render header
	grid_view.setColumns(grid_view.getColumns())
}

// gets called to set selection type
module.set_sel_type = function(new_sel_type)
{
	curr_sel_type = new_sel_type;
}

// highlight rows for selections
module.select_rows = function ()
{

	// update selection indices
	var new_focus = selections.focus();
	var subset_mask = selections.get_subset();

	// generate vector of data view with new selections
	var sel_vec = [];
	var num_rows = data_view.getLength();
	for (var i = 0; i != num_rows; i++) {
		sel_vec.push(0);
	}

    // mark all selections
    for (var j = 0; j < max_num_sel; j++) {

        // get selections
        var new_sel = selections.sel(j+1);

        // mark selection j
        for (var i = 0; i != new_sel.length; i++) {
            sel_vec[new_sel[i]] = j+1;
        }
    }

	// mark focus, if present
	if (new_focus != null) {
		sel_vec[new_focus] = max_num_sel+1;
	}

	// mark if not in subset
	for (var i = 0; i < subset_mask.length; i++) {
		if (!subset_mask[i]) {
			sel_vec[i] = max_num_sel+2;
		}
	}

	// show current selected row
	var data_row_selected = null;
	if (curr_row_selected != null) {
	    data_row_selected = convert_row_ids([curr_row_selected])[0];
	}
	sel_vec[data_row_selected] = sel_vec[data_row_selected] + 10;

	// temporarily turn off table rendering
	data_view.beginUpdate();

	// update last column of table with new selections
	// also get first selected row in grid view (not data view)
	for (var i = 0; i != num_rows; i++)
	{
		// get a row
		var item = data_view.getItemById(i);
		var num_cols = item.length;

		// update selection info
		item[num_cols-1] = sel_vec[i];

		// put row back in table
		data_view.updateItem(i, item);
	}

	// turn table re-draw back on
	data_view.endUpdate();

}

// jumps to the first row in the provide selection
module.jump_to = function (selection)
{

	// if selection is empty, nothing is done
	if (selection.length > 0)
	{
		var num_rows = data_view.getLength();
		var first_sel = num_rows - 1;
		for (var i = 0; i != num_rows; i++)
		{
			if (selection.indexOf(i) > -1) {
				first_sel = Math.min(first_sel, data_view.getRowById(i));
			}
		}

		// now scroll to first selected row
		grid_view.scrollRowIntoView(first_sel);
	}

}

export default module;
