/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

require(["slycat-server-root", "knockout", "knockout-mapping"], function(server_root, ko, mapping)
{
  ko.components.register("slycat-table-ingestion",
  {
  	viewModel: function(params)
    {
      var component = this;
      component.variables = params.variables;
      component.properties = params.properties;

      component.select = function(variable, event) {
        if(event.shiftKey)
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
            component.variables()[i].selected(true);
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
    },
    template: { require: "text!" + server_root + "templates/slycat-table-ingestion.html" }
  });
});