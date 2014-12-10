define("slycat-model-controls", ["slycat-server-root"], function(server_root)
{
  ko.components.register("slycat-model-controls",
  {
    viewModel: function(params)
    {
      var component = this;
      component.name = params.name
      component.description = params.description
      component.marking = params.marking
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
    },
    template: { require: "text!" + server_root + "templates/slycat-model-controls.html" }
  });

});
