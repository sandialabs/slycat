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

    //This method will take a column id and collapse all folder after it while updating the file path input field to be correct.
    function toggle_all_folders_after_column(column_id, slide_boolean){
      visible_column_ids = $(".file-browser:visible").map(function(){return parseInt(this.id);}).sort();
      max = visible_column_ids[visible_column_ids.length-1];
      for(var i = (column_id+1); i <= max; i++){
        $(".file-browser#"+i).remove();
        visible_column_ids = $(".file-browser:visible").map(function(){return parseInt(this.id);}).sort();
        if(slide_boolean){
          column_to_show = visible_column_ids[0] - 1;
          $(".file-browser#"+column_to_show).show();
        }
      }
      new_value = $(".path-entry-input").val().split("/").splice(0,column_id-1).join("/")+"/";
      //Undo the autocomplete hiding of rows.
      $(".file-browser#"+column_id).find("tr").show();
      $(".path-entry-input").val(new_value);
    }

    //Watch what they type into the file path input field and click, or unclick folders based on it.
    $(".path-entry-input").keypress(function(event){
      if(event.which == 47){
        folder_array = $(this).val().split("/");
        latest_folder = folder_array[folder_array.length-1];
        //Click the folder
        input_with_text = true;
        $("tr#"+latest_folder.replace(".","dot")).find(".arrow").click();
      }else if (event.which == 8){
        //Backspace was pressed
        folder_array = $(this).val().split("/");
        latest_folder = folder_array[folder_array.length-1];
        if (latest_folder == ""){
          path_to_add = folder_array[folder_array.length-2];
          column = folder_array.length-1;
          toggle_all_folders_after_column(column, true);
          previous_dir = $(".file-browser#"+column).find(".directory.open");
          previous_dir.removeClass("open");
          //Random character appended so that the backspace will take effect on it. Hacky? Yes. Future fix desired.
          $(this).val($(this).val()+path_to_add+"r");
        }
      }
    });

    //This is where the autocomplete happens.
    $(".path-entry-input").keyup(function(event){
      column_id = $(this).val().split("/").length-1;
      $(".file-browser#"+(column_id+1)).find('tr').hide();
      matches = $(".file-browser#"+(column_id+1)).find('tr:regex(id,^'+$(this).val().replace(".","dot").split("/").splice(column_id,1).join("/")+')').show();
    });

    function toggle_directory(self)
    {
      return function()
      {
        if($(this).hasClass("open")) // Collapse this node ...
        {
          id = parseInt($(this).parent().parent()[0].id);
          id_to_show = $(".file-browser:visible").map(function(){return parseInt(this.id);}).sort()[0]-1;
          toggle_all_folders_after_column(id,true);
          $(this).removeClass("open");
        }
        else // Expand this node ...
        {
          //If the folder we are expanding is the host, we want to prepend a / to the path input box.
          if ($(this).hasClass("host")){
            $(".path-entry-input").val("/")
          }
          var current_position = parseInt($(this).parent().parent().attr("id"));
          var slide = false;
          if (current_position >= 4){
            slide = true;
          }
          //Remove the next column if it exists before adding new one. This covers the same level expansion.
          if($(".file-browser#"+(current_position+1)).length){
            //We set a boolean so we know not to slide on this expansion
            slide = false;
            toggle_all_folders_after_column(current_position, slide);
            //Need to remove the activated icon from the same column folder.
            previous_dir = $(".file-browser#"+current_position).find(".directory.open");
            previous_dir.removeClass("open");
          }
          if($(this).attr("id") != undefined && input_with_text == false){
            folder_name = $(this).attr("id").replace("dot",".");
            old_value = $(".path-entry-input").val().split("/");
            old_value = old_value.splice(0,old_value.length-1).join("/");
            $(".path-entry-input").val(old_value +"/"+ folder_name + "/");
          }
          input_with_text = false;
          //Add text to the file path input when clicked.
          $(this).addClass("open");
          $.ajax(
          {
            context : this,
            type : "POST",
            url : self.options.server_root + "remote/browse",
            contentType : "application/json",
            processData : false,
            data : $.toJSON({
              sid : self.options.session,
              path : $(this).data("path")
            }),
            success : function(result)
            {

              var path = $(this).data("path");
              //This is where the horizontal sliding occurs.
              if (slide == true){
                ids = $(".file-browser:visible").map(function(){return parseInt(this.id);}).sort();
                min = ids[0];
                //We hide the lowest numbered column.
                $(".file-browser#"+min).hide();
              }
              $("<table>").addClass("file-browser").attr("id",current_position+1).appendTo(self.element);
              //No matter what we append to the next table if we are expanding a folder.
              var container = $(".file-browser#"+(current_position+1));
              if(result.names.length == 0){
                var item = $("<tr>").attr("id","empty").appendTo(container);
                var entry = $("<div/>").appendTo(item);
                var label = $("<span class='label'></span>").text("Folder is empty.").appendTo(entry);
              }
              for(var i = 0; i != result.names.length; ++i)
              {
                name = result.names[i];
                size = result.sizes[i];
                type = result.types[i];

                var item = $("<tr>").attr("id",name.replace(".","dot")).appendTo(container);
                var entry = $("<div/>").appendTo(item);
                var arrow = $("<span class='arrow'></span>").appendTo(entry);
                var icon = $("<span class='icon'></span>").appendTo(entry);
                concat_name = name;
                if (name.length > 20){
                  concat_name = name.substring(0,18)+"...";
                }
                var label = $("<span class='label'></span>").text(concat_name).appendTo(entry);

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

    var container1 = $("<table>").addClass("file-browser").attr("id","1").appendTo(self.element.empty());
    var input_with_text = false;
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


