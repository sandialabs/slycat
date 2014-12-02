define(["text!my-wizard.html"], function(html)
{
  function constructor(params)
  {
    var model = {};
    model.stuff = ko.observableArray([{name:"apples"}, {name:"oranges"}, {name:"cats"}]);
    return model;
  }

  return { viewModel: constructor, template: html };
});
