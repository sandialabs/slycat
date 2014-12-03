(function()
{
  ko.components.register("slycat-model-controls",
  {
    viewModel: function(params)
    {
      console.log("slycat-model-controls", params);

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
    template: ' \
<div class="form-group"> \
  <label for="slycat-model-name" class="col-sm-2 control-label">Name</label> \
  <div class="col-sm-10"> \
    <input id="slycat-model-name" class="form-control" type="text" placeholder="Name" data-bind="value:name"></input> \
  </div> \
</div> \
<div class="form-group"> \
  <label for="slycat-model-description" class="col-sm-2 control-label">Description</label> \
  <div class="col-sm-10"> \
    <textarea id="slycat-model-description" class="form-control" placeholder="Description" rows="5" data-bind="value:description"></textarea> \
  </div> \
</div> \
<div class="form-group"> \
  <label for="slycat-model-marking" class="col-sm-2 control-label">Marking</label> \
  <div class="col-sm-10"> \
    <select id="slycat-model-marking" class="form-control" data-bind="options:markings,optionsValue:\'type\',optionsText:\'label\',value:marking,valueAllowUnset:true"></select> \
  </div> \
</div> \
'
  });

}());

