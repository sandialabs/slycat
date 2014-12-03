define("slycat-model-results", ["slycat-server-root"], function(server_root)
{
  ko.components.register("slycat-model-results",
  {
    viewModel: function(params)
    {
      console.log("slycat-model-results", params);

      var component = this;
      component.server_root = server_root;
      component.mid = ko.observable(ko.utils.unwrapObservable(params.mid));

/*
      $.ajax(
      {
        type : "GET",
        url : server_root + "configuration/markings",
        success : function(markings)
        {
          ko.mapping.fromJS(markings, component.markings);
          component.marking(markings[0].type);
        }
      });

      if(params.data)
        params.data(component);
*/
    },
    template: { require: "text!" + server_root + "templates/slycat-model-results.html" }
  });

});
