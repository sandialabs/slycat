/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

require(["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  ko.components.register("slycat-grid",
  {
    viewModel: function(params)
    {
      var grid = this;
      grid.row_count = ko.observable(1600000);
      grid.column_count = ko.observable(400000);
      grid.cell_width = ko.observable(75);
      grid.cell_height = ko.observable(20);
      grid.viewport_width = ko.observable(500);
      grid.viewport_height = ko.observable(500);
      grid.position = ko.observable([0, 0]).extend({rateLimit: {timeout: 100, method: "notifyWhenChangesStop"}});

      grid.height = ko.pureComputed(function()
      {
        return grid.row_count() * grid.cell_height();
      });
      grid.width = ko.pureComputed(function()
      {
        return grid.column_count() * grid.cell_width();
      });
      grid.visible_cells = ko.pureComputed(function()
      {
        var position = grid.position();
        var cell_width = grid.cell_width();
        var cell_height = grid.cell_height();
        var viewport_width = grid.viewport_width();
        var viewport_height = grid.viewport_height();
        var row_count = grid.row_count();
        var column_count = grid.column_count();

        return {
          column_begin: Math.floor(position[0] / cell_width),
          column_end: Math.min(column_count, Math.ceil((position[0] + viewport_width) / cell_width)),
          row_begin: Math.floor(position[1] / cell_height),
          row_end: Math.min(row_count, Math.ceil((position[1] + viewport_height) / cell_height)),
        }
      });
      grid.cells = ko.pureComputed(function()
      {
        var visible_cells = grid.visible_cells();
        var cell_width = grid.cell_width();
        var cell_height = grid.cell_height();

        var cells = [];
        for(var row = visible_cells.row_begin; row != visible_cells.row_end; ++row)
        {
          for(var column = visible_cells.column_begin; column != visible_cells.column_end; ++column)
          {
            cells.push(
            {
              top: row * cell_height,
              height: cell_height,
              left: column * cell_width,
              width: cell_width,
              content: grid.create_cell(row, column),
            });
          }
        }
        return cells;
      });
      grid.on_scroll = function(grid, event)
      {
        grid.position([$(event.target).scrollLeft(), $(event.target).scrollTop()]);
      }
      grid.create_cell = function(row, column)
      {
        return "<span>" + row + "," + column + "</span>";
      }
    },
    template: { require: "text!" + server_root + "templates/slycat-grid.html" }
  });
});
