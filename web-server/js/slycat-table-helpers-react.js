/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
   DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
   retains certain rights in this software. */

export function _set_selected_rows_no_trigger(self)
{
  self.data.get_indices("sorted", self.props.row_selection, function(sorted_rows)
  {
    self.trigger_row_selection = false;
    self.grid.setSelectedRows(sorted_rows);
    // Resetting trigger_row_selection here too for cases where setSelectedRows doesn't trigger 
    // grid.onSelectedRowsChanged, like at startup with no rows selected because current rows is blank
    // and sorted_rows is blank, so there is no change in selected rows.
    self.trigger_row_selection = true;
    self.grid.resetActiveCell();
    if(sorted_rows.length)
    {
      self.grid.scrollRowToTop(Math.min.apply(Math, sorted_rows));
    }
  });
}