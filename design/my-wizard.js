define(["text!my-wizard.html"], function(html)
{
  function constructor(params)
  {
    var model = {};
    model.tab = ko.observable(0);
    model.name = ko.observable("New Model");
    model.description = ko.observable("");
    model.cancel = function()
    {
      console.log("cancel");
    }
    model.create = function()
    {
      console.log("create", model.name(), model.description());
      model.tab(1);
    }
    model.load = function()
    {
      console.log("load");
      model.tab(2);
    }
    model.finish = function()
    {
      console.log("finish");
      model.tab(3);
    }
    return model;
  }

  return { viewModel: constructor, template: html };
});
