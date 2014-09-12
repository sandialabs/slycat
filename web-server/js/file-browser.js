/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

//////////////////////////////////////////////////////////////////////////////////////////////
// Remote file browser widget, for use with the Slycat /remote API.

$.widget("slycat.browser",
{
  options:
  {
    server_root : "",
    session : "",
    root_path : "/",
    root_label : "foo",
    multiple_selection : false,
    directory_selection : false,
    hide_dotfiles : true
  },

  _create: function()
  {
    var self = this;

    function click_arrow(item)
    {
      return function()
      {
        item.trigger("toggle-directory");
        return false;
      }
    }

    function double_click_directory(item)
    {
      return function()
      {
        item.trigger("toggle-directory");
        return false;
      }
    }

    function select_item(self, item)
    {
      return function(e)
      {
        if($(this).parent().is(".directory") && !self.options.directory_selection)
          return false;

        if(!(self.options.multiple_selection && e.shiftKey))
          self.element.find(".selected").removeClass("selected");

        item.addClass("selected");
        return false;
      }
    }

    function toggle_directory(self)
    {
      return function()
      {
        if($(this).hasClass("open")) // Collapse this node ...
        {
          id = parseInt($(this).parent().parent()[0].id) 
          id_to_show = $(".file-browser:visible").map(function(){return parseInt(this.id);}).sort()[0]-1
          $(".file-browser#"+(id+1)).remove();
          $(".file-browser#"+id_to_show).show();
          $(this).removeClass("open");
          //Remove the table with this parent table's id+1
        }
        else // Expand this node ...
        {
          $(this).addClass("open");
          console.log("Expanding: " + $(this));

          $.ajax(
          {
            context : this,
            type : "POST",
            url : self.options.server_root + "remote/browse",
            contentType : "application/json",
            processData : false,
            data : $.toJSON({
              sid : self.options.session,
              path : $(this).data("path"),
            }),
            success : function(result)
            {

              var path = $(this).data("path");
              //var container = $("<ul>").appendTo($("ul#middle");
              //var container = $("<ul>").appendTo($(this));
              var current_position = $(this).parent().parent().attr("id");
              console.log(current_position);
              var slide = false;
              if (parseInt(current_position) >= 4){
                var slide = true;
              }
              if (slide == true){
                ids = $(".file-browser:visible").map(function(){return parseInt(this.id);}).sort()
                min = ids[0];
                max = ids[ids.length-1];
                //We hide the lowest numbered column.
                $(".file-browser#"+min).hide();
                //We show the next numbered column.
                $(".file-browser#"+max).show();
              }
              //No matter what we append to the next table if we are expanding.
              var container = $(".file-browser#"+(parseInt(current_position)+1));
              for(var i = 0; i != result.names.length; ++i)
              {
                name = result.names[i];
                size = result.sizes[i];
                type = result.types[i];

                var item = $("<tr>").appendTo(container);
                var entry = $("<div/>").appendTo(item);
                var arrow = $("<span class='arrow'></span>").appendTo(entry);
                var icon = $("<span class='icon'></span>").appendTo(entry);
                var label = $("<span class='label'></span>").text(name.substring(0,20)+"...").appendTo(entry);

                item.data("path", path.replace(/\/$/, "") + "/" + name);
                item.bind("toggle-directory", toggle_directory(self));

                entry.click(select_item(self, item));

                if(type == "d")
                {
                  item.addClass("directory");
                  arrow.click(click_arrow(item));
                  entry.dblclick(double_click_directory(item));
                }
                else if(type == "f")
                {
                  item.addClass("file");
                }

                if(name.charAt(0) == ".")
                {
                  item.addClass("dotfile");
                  if(self.options.hide_dotfiles)
                    item.addClass("hidden");
                }
              }
            },
            statusCode :
            {
              404 : function()
              {
                alert("The remote session timed-out.");
              },

              400 : function()
              {
                $(this).removeClass("open");
                $(this).addClass("forbidden");
                alert("The folder " + $(this).data("path") + " can't be opened, probably because you don't have permission to see its contents.");
              }
            }
          });
        }

        return false;
      }
    }

    var container1 = $("<table>").addClass("file-browser").attr("id","1").appendTo(self.element.empty())
    //Make this dynamically added you FOOL!!!
    for(var i = 2; i < 20; i++){
      $("<table>").addClass("file-browser").attr("id",i).appendTo(self.element)
    }
    var item = $("<tr>").appendTo(container1);
    var entry = $("<div/>").appendTo(item);
    var arrow = $("<span class='arrow'></span>").appendTo(entry);
    var icon = $("<span class='icon'></span>").appendTo(entry);
    var label = $("<span class='label'></span>").text(self.options.root_label).appendTo(entry);

    arrow.click(click_arrow(item));
    entry.dblclick(double_click_directory(item));
    item.data("path", self.options.root_path);
    item.bind("toggle-directory", toggle_directory(self));
    item.addClass("host");
    item.trigger("toggle-directory");
  },

  _setOption: function(key, value)
  {
    //console.log("slycat.browser._setOption()", key, value);
    this.options[key] = value;

    if(key == "hide_dotfiles")
    {
      this.element.find(".dotfile").toggleClass("hidden", value);
    }
  },

  show_all: function()
  {
    this.element.find(".hidden").removeClass("hidden");
  },

  selection: function()
  {
    return this.element.find(".selected").map(function() { return $(this).data("path"); }).get();
  },
});


