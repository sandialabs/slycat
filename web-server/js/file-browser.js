/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/


function file_browser(parameters)
{
  this.show_all = function()
  {
    parameters.container.find(".hidden").removeClass("hidden");
  }

  this.hide_dotfiles = function()
  {
    parameters.container.find(".dotfile").addClass("hidden");
  }

  this.selection = function()
  {
    return parameters.container.find(".selected").map(function() { return $(this).data("path"); }).get();
  }

  function select_item(parameters, item)
  {
    return function(e)
    {
      if(!(parameters.multiple_selection && e.shiftKey))
        parameters.container.find(".selected").removeClass("selected");
      item.addClass("selected");
      return false;
    }
  }

  function double_click_item(item)
  {
    return function()
    {
      item.trigger("toggle_directory");
      return false;
    }
  }

  function click_arrow(item)
  {
    return function()
    {
      item.trigger("toggle_directory");
      return false;
    }
  }

  function toggle_directory(parameters)
  {
    return function()
    {
      if($(this).children("ul").length) // Collapse this node ...
      {
        $(this).removeClass("open");
        $(this).children("ul").remove();
      }
      else // Expand this node ...
      {
        $(this).addClass("open");

        $.ajax(
        {
          context : this,
          type : "GET",
          url : parameters.url,
          data : {"path" : $(this).data("path")},
          success : function(result)
          {

            var path = $(this).data("path");
            var container = $("<ul>").appendTo($(this));
            for(var i = 0; i != result.names.length; ++i)
            {
              name = result.names[i];
              size = result.sizes[i];
              type = result.types[i];

              var item = $("<li>").appendTo(container);
              var entry = $("<div/>").appendTo(item);
              var arrow = $("<span class='arrow'></span>").appendTo(entry);
              var icon = $("<span class='icon'></span>").appendTo(entry);
              var label = $("<span class='label'></span>").text(name).appendTo(entry);

              item.data("path", path.replace(/\/$/, "") + "/" + name);
              item.bind("toggle_directory", toggle_directory(parameters));

              entry.click(select_item(parameters, item));

              if(type == "d")
              {
                item.addClass("directory");
                arrow.click(click_arrow(item));
                entry.dblclick(double_click_item(item));
              }
              else if(type == "f")
              {
                item.addClass("file");
              }

              if(name.charAt(0) == ".")
                item.addClass("dotfile hidden");
            }
          },
          statusCode :
          {
            403 : function()
            {
              $(this).removeClass("open");
              $(this).addClass("forbidden");
              alert("The folder " + $(this).data("path") + " can't be opened because you don't have permission to see its contents.");
            }
          }
        });
      }

      return false;
    }
  }

  parameters.container.empty();

  var item = $("<li>").appendTo(parameters.container);
  var entry = $("<div/>").appendTo(item);
  var arrow = $("<span class='arrow'></span>").appendTo(entry);
  var icon = $("<span class='icon'></span>").appendTo(entry);
  var label = $("<span class='label'></span>").text(parameters.label).appendTo(entry);

  item.data("path", parameters.path);
  item.bind("toggle_directory", toggle_directory(parameters));
  item.addClass("host");
  item.trigger("toggle_directory");

  arrow.click(click_arrow(item));
}

