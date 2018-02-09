// This function contains code for managing the two selections 
// in dial-a-cluster.  It contains code that is common in between
// dac-scatter-plot and dac-table for managing the two selections.
// It also helps keep the selections synchronized between the two
// ui panes.
//
// S. Martin
// 4/8/2015

define ("dac-manage-selections", [], function() {
	
	// public functions will be returned via the module variable
	var module = {};
	
	// current selections and type (0 = zoom, 1 = selection_1, 2 = selection_2)
	var curr_sel_type = null;	
	var selection_1 = [];
	var selection_2 = [];

	// focus selection (index into data, or null if nothing in focus)
	var focus = null;

	// shift or meta key pressed
	var shift_key_pressed = false;

	// get selection type
	module.sel_type = function ()
	{
		return curr_sel_type;
	}
	
	// set selection type
	module.set_sel_type = function(new_sel_type)
	{
		curr_sel_type = new_sel_type;
	}
	
	// get actual selection (#1)
	module.sel_1 = function()
	{
		return selection_1;
	}
	
	// get selection #2
	module.sel_2 = function()
	{
		return selection_2;
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

	// is index i in selection 1?
	// return index or -1 if absent
	module.in_sel_1 = function(i)
	{
		return selection_1.indexOf(i);
	}
	
	// is index i in selection 2?
	// return index or -1 if absent
	module.in_sel_2 = function(i)
	{
		return selection_2.indexOf(i);
	}

	// is index i in any selection?
	// return true or false
	module.in_sel = function(i)
	{
	    if ((selection_1.indexOf(i) == -1) &&
	        (selection_2.indexOf(i) == -1)) {

	        return false;
	    } else {

	        return true;
	    }
	}

	// return length selection 1
	module.len_sel_1 = function()
	{
		return selection_1.length;
	}
	
	// return length selection 2
	module.len_sel_2 = function()
	{
		return selection_2.length;
	}
	
	// toggle shift key flag
	module.key_flip = function(shiftKey, metaKey) {
		shift_key_pressed = shiftKey || metaKey;
	}
	
	// zero out current selection (unless shift key is down)
	module.zero_sel = function()
	{
		if (shift_key_pressed == false) {
			if (curr_sel_type == 1) {
				selection_1 = [];
			} else {
				selection_2 = [];
			}
		}
	}

	// updates selection variables
	module.update_sel = function(i)
	{
		if (curr_sel_type == 1) {
					
			// add to selection, if not already in selection
			var sel_1_ind = selection_1.indexOf(i);
			if (sel_1_ind == -1) {
				selection_1.push(i);
			}
										
			// remove from other selection, if necessary
			var sel_2_ind = selection_2.indexOf(i);
			if (sel_2_ind != -1) {
				selection_2.splice(sel_2_ind, 1);
			}
						
		} else {
					
			var sel_2_ind = selection_2.indexOf(i);
			if (sel_2_ind == -1) {
				selection_2.push(i);
			}
										
			var sel_1_ind = selection_1.indexOf(i);
			if (sel_1_ind != -1) {
				selection_1.splice(sel_1_ind, 1);
			}					
		}
	}

    // update selection accounting for focus
    module.update_sel_focus = function(i)
    {

        // if there are no selections at all (of either type), we add to selection
        if (((curr_sel_type == 1) &&
             (selection_1.length == 0)) ||
            ((curr_sel_type == 2) &&
             (selection_2.length == 0))) {

            // add to selection
            module.update_sel(i);

            // selection has been changed
            var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
					                             active_sel: [i]} });
            document.body.dispatchEvent(selectionEvent);


        } else {

            // otherwise, we test for shift/meta key before adding to selection
            if (shift_key_pressed) {

                // update selection
                module.update_sel(i);

                // fire selection change event
		        var selectionEvent = new CustomEvent("DACSelectionsChanged", { detail: {
					                                 active_sel: [i]} });
                document.body.dispatchEvent(selectionEvent);

            } else {

                // in the last case we test for a focus event
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

	// put selections in random order
	module.shuffle = function ()
	{
        selection_1 = shuffle(selection_1);
        selection_2 = shuffle(selection_2);
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
		
	return module;
	
});