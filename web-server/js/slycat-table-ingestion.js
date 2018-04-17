/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

require(["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  ko.components.register("slycat-table-ingestion",
  {
  	viewModel: function(params)
    {
      var component = this;
      component.variables = params.variables;
      component.properties = params.properties;

      component.selected = ko.pureComputed(function(){
        for(var i = 0; i < component.variables().length; i++)
        {
          if( component.variables()[i].selected() )
          {
            return true;
          }
        }
        return false;
      });

      component.select = function(variable, event) {
        if(variable.disabled())
        {
          return;
        }
        else if(event.shiftKey)
        {
          var lastSelectedIndex = -1;
          var currentIndex = component.variables.indexOf(variable);
          for(var i = 0; i < component.variables().length; i++)
          {
            if( component.variables()[i].lastSelected() )
            {
              lastSelectedIndex = i;
              component.variables()[i].lastSelected(false);
              break;
            }
          }
          if(lastSelectedIndex == -1)
          {
            lastSelectedIndex = 0;
          }
          var begin = Math.min(lastSelectedIndex, currentIndex);
          var end = Math.max(lastSelectedIndex, currentIndex);
          for(var i = begin; i <= end; i++)
          {
            if(!component.variables()[i].disabled())
            {
              component.variables()[i].selected(true);
            }
          }
          variable.lastSelected(true);
        }
        else if(event.ctrlKey || event.metaKey)
        {
          for(var i = 0; i < component.variables().length; i++)
          {
            component.variables()[i].lastSelected(false);
          }
          variable.selected( !variable.selected() );
          variable.lastSelected( variable.selected() );

        }
        else
        {
          for(var i = 0; i < component.variables().length; i++)
          {
            component.variables()[i].selected(false);
            component.variables()[i].lastSelected(false);
          }
          variable.selected(true);
          variable.lastSelected(true);
        }
      };
      // For checkbox properties, check or uncheck all
      component.checkAll = function(property, event) {
        var state = false;
        for(var i = 0; i < component.variables().length; i++)
        {
          // Only check selected variables
          if( component.variables()[i].selected() )
          {
            // As soon as we find the first variable with the current property not checked, 
            // we change target state for all checkboxes to true and break out.
            if( ! component.variables()[i][property.name]() )
            {
              state = true;
              break;
            }
          }
        }
        for(var i = 0; i < component.variables().length; i++)
        {
          if( component.variables()[i].selected() )
          {
            component.variables()[i][property.name](state);
          }
        }
      };
      // For radio button properties, select all
      component.selectAll = function(property, value) {
        for(var i = 0; i < component.variables().length; i++)
        {
          if( component.variables()[i].selected() )
          {
            component.variables()[i][property.name](value);
          }
        }
      };
    },
    template: { require: "text!" + server_root + "templates/slycat-table-ingestion.html" }
  });
});