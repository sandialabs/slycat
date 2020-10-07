// This function contains code for managing three selections 
// in dial-a-cluster.  It contains code that is common in between
// dac-scatter-plot and dac-table for managing the selections.
// It also helps keep the selections synchronized between the two
// ui panes.  (Changed from two to three selections 11/22/2019.)
//
// S. Martin
// 4/8/2015

// public functions will be returned via the module variable
var module = {};

// current selections and type 
// (-1 = subset, 0 = zoom, 1 = first selection, 2 = 2nd selection, ...)
var curr_sel_type = null;

// selections, set to three (but could accomodate more)
var selection = [];
var max_num_sel = null;

// subset mask
var subset_mask = [];

// filter mask/button
var filter_mask = [];
var filter_button = null;

// focus selection (index into data, or null if nothing in focus)
var focus = null;

// shift or meta key pressed
var shift_key_pressed = false;

// set up maximum number of selections
module.setup = function(MAX_NUM_SEL)
{
    max_num_sel = MAX_NUM_SEL;
    for (var i = 0; i < max_num_sel; i++) {
        selection.push([]);
    }
}

// get selection type
module.sel_type = function ()
{
	return curr_sel_type;
}

// set selection type
module.set_sel_type = function(new_sel_type)
{
	curr_sel_type = new_sel_type;

    // selection type has been changed
    var selTypeEvent = new CustomEvent("DACSelTypeChanged",
                                         {detail: curr_sel_type});
    document.body.dispatchEvent(selTypeEvent);
}

// init selection array i >= 1
module.set_sel = function(sel, i)
{
    selection[i-1] = sel;
}

// get selection array i >= 1
// returns full selection if nothing passed
module.sel = function(i=0)
{
    // full selection
    if (i==0) {

        var full_sel = [];
        for (var j = 0; j < max_num_sel; j++) {
            full_sel = full_sel.concat(selection[j]);
        }

        return full_sel;

    // partial selection
    } else {
        return selection[i-1];
    }

}

// set filter mask
module.update_filter = function(mask, button)
{
    filter_mask = mask;
    filter_button = button;
}

// get selection accounting for filters
module.filtered_sel = function(i=0)
{
    // get full selection
    var curr_sel = module.sel(i);

    // check if filter button is on
    if (filter_button) {

        // reduce selection according to filters
        curr_sel = curr_sel.filter (j => filter_mask[j] == 1)
    }

    return curr_sel;
}

// return filter button status
module.filter_button_status = function()
{
    return filter_button;
}

// set subset mask, return new selection
// and a flag if it is changed
module.update_subset = function(mask)
{
	// set new subset mask
	subset_mask = mask;

    // check for changes in selections due to subsetting
    var sel_changed = false;

    // remove non-subset items from each selection, if required
    for (var j = 0; j < max_num_sel; j++) {

        // remove non-subset items from selection 1, if required
        var new_sel = [];
        for (var i = 0; i < selection[j].length; i++) {
            if (subset_mask[selection[j][i]] == 1) {
                new_sel.push(selection[j][i]);
            } else {
                sel_changed = true;
            }
        }
        selection[j] = new_sel;

    }

	// remove focus selection, if necessary
	if (focus != null) {
		if (subset_mask[focus] == 0) {
			focus = null;
		}
	}

	// return non-empty selection, if present
	for (var j = 0; j < max_num_sel; j++) {
	    if (selection[j].length > 0) {
	        return [selection[j], sel_changed];
	    }
	}

    // otherwise return subset indices
    var subset_inds = [];
    for (var i = 0; i < subset_mask.length; i++) {
        if (subset_mask[i] == 1) {
            subset_inds.push(i);
        }
    }
    return [subset_inds, sel_changed];

}

// get subset mask
module.get_subset = function()
{
	return subset_mask;
}

// get size of subset
module.subset_size = function()
{
	var num_subset = 0;
	for (var i = 0; i < mds_subset.length; i++) {
		num_subset = num_subset + mds_subset[i];
	}

	return num_subset;
}

// check if an index is in the subset mask
module.in_subset = function(i)
{
	return subset_mask[i];
}

// set focus selection
module.set_focus = function(i)
{
	focus = i;
}

// get focus selection
module.focus = function()
{
	return focus;
}

// is index i in selection x >= 1
// return index or -1 if absent
module.in_sel_x = function (i, x)
{
    return selection[x-1].indexOf(i);
}

// filtered version of in_sel_x
module.in_filtered_sel_x = function (i,x)
{
    var filtered_sel = module.filtered_sel(x);

    return filtered_sel.indexOf(i)
}

// is index i in any selection?
// return true or false
module.in_sel = function(i)
{

    // check in each selection
    for (var j = 0; j < max_num_sel; j++) {
        if (selection[j].indexOf(i) != -1) {
            return true;
        }
    }

    // otherwise it wasn't found
    return false;

}

// return length of selection i >= 1
module.len_sel = function(i)
{
    return selection[i-1].length;
}

// return length of filtered selection, i >= 1
module.len_filtered_sel = function(i)
{
    var filtered_sel = module.filtered_sel(i);

    return filtered_sel.length;
}

// toggle shift key flag
module.key_flip = function(shiftKey) {
	shift_key_pressed = shiftKey;
}

// get state of shift key
module.shift_key = function ()
{
	return shift_key_pressed;
}

// zero out current selection (unless shift key is down)
module.zero_sel = function()
{
	if (shift_key_pressed == false) {
	    if (curr_sel_type > 0) {
	        selection[curr_sel_type-1] = [];
	    }
	}
}

// updates selection variables
// 1. if not present, add to selection
// 2. if present, but in other selection, add to current selection
// 3. if present, and in same selection, remove
module.update_sel = function(i)
{

    if (curr_sel_type > 0) {

        var curr_sel_ind = curr_sel_type-1;

		// check if present in current selection
		var sel_i_ind = selection[curr_sel_ind].indexOf(i);
		if (sel_i_ind == -1) {

		    // not present, add
			selection[curr_sel_ind].push(i);

		} else {

		    // present, remove
		    selection[curr_sel_ind].splice(sel_i_ind, 1);
		}

		// remove from other selections, if necessary
		for (var j = 0; j < max_num_sel; j++) {
		    if (j != curr_sel_ind) {
		        var sel_j_ind = selection[j].indexOf(i);
                if (sel_j_ind != -1) {
                    selection[j].splice(sel_j_ind, 1);
                }
		    }
		}

	}

}

// remove i from any selection
module.remove_sel = function(i)
{

    if (curr_sel_type > 0) {

        // remove from any selections
		for (var j = 0; j < max_num_sel; j++) {
            var sel_j_ind = selection[j].indexOf(i);
            if (sel_j_ind != -1) {
                selection[j].splice(sel_j_ind, 1);
            }
		}
    }

}

// update selection range (all at once), but
// do not remove from current selection if present
module.update_sel_range = function(sel)
{

    // update range according to current selection type
    for (var i = 0; i < sel.length; i++) {

        if (curr_sel_type > 0) {

            var curr_sel_ind = curr_sel_type-1;

            // check if present in current selection
            var sel_i_ind = selection[curr_sel_ind].indexOf(sel[i]);
            if (sel_i_ind == -1) {

                // not present, add
                selection[curr_sel_ind].push(sel[i]);

            }

            // remove from other selections, if necessary
            for (var j = 0; j < max_num_sel; j++) {
                if (j != curr_sel_ind) {
                    var sel_j_ind = selection[j].indexOf(sel[i]);
                    if (sel_j_ind != -1) {
                        selection[j].splice(sel_j_ind, 1);
                    }
                }
            }

        }
    }

    // update selection event
    var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
                                         active_sel: sel} });
    document.body.dispatchEvent(selectionEvent);

}

// update selection accounting for focus
module.update_sel_focus = function(i)
{

    if (curr_sel_type > 0) {

        var curr_sel_ind = curr_sel_type - 1;

         // if there are no selections at all (of either type), we add to selection
        if (selection[curr_sel_ind].length == 0) {

            // add to selection
            module.update_sel(i);

            // selection has been changed
            var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
                                                 active_sel: [i]} });
            document.body.dispatchEvent(selectionEvent);

        } else {

            // otherwise, we test for shift/meta key before adding to selection
            if (shift_key_pressed) {

                // check for focus event
                if (focus == i) {

                    // focus chagned
                    module.change_focus(i);

                } else {

                    // selection changed
                    module.update_sel(i);

                    // fire selection change event
                    var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
                                                         active_sel: [i]} });
                    document.body.dispatchEvent(selectionEvent);
                }

            } else {

                // in the last case we test for a focus event
                module.change_focus(i);
            }
        }

    }
}

// update focus if selection is done changing
module.update_focus = function()
{
	// if focus is not in selection, set to null
	if (!module.in_sel(focus)) {
		focus = null;
	}
}

// focus or de-focus an individual
module.change_focus = function(i) {

	// check if individual is in selection
	if (module.in_sel(i)) {

		// focus or de-focus?
		if (focus == i) {

			// de-focus through all panes
			var selectionEvent = new CustomEvent("DACActiveSelectionChanged", { detail: {
									 active_sel: null,
									 active: true} });
			document.body.dispatchEvent(selectionEvent);

		} else {

			// fire active selection (focus) event on current point
			var selectionEvent = new CustomEvent("DACActiveSelectionChanged", { detail: {
									 active_sel: i,
									 active: true} });
			document.body.dispatchEvent(selectionEvent);
		}

	}
}

// put selections in random order
module.shuffle = function ()
{

    // shuffle each selection
    for (var j = 0; j < max_num_sel; j++) {
        selection[j] = shuffle(selection[j]);
    }

}

// Fisher-Yates shuffle from bost.ocks.org
function shuffle(array) {
var m = array.length, t, i;

	// While there remain elements to shuffle…
	while (m) {

		// Pick a remaining element…
		i = Math.floor(Math.random() * m--);

		// And swap it with the current element.
		t = array[m];
		array[m] = array[i];
		array[i] = t;
	}

	return array;
}

export default module;