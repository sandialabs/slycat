define("slycat-model-controls", ["slycat-server-root"], function(server_root)
{
  ko.components.register("slycat-model-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.name = ko.observable("New Model");
      component.description = ko.observable("");
      component.marking = ko.observable(null);
      component.markings = ko.mapping.fromJS([]);

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
    },
    template: { require: "text!" + server_root + "templates/slycat-model-controls.html" }
  });

});
