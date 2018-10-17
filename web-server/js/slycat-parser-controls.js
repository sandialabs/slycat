/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

import parsers from "js/slycat-parsers";
import ko from "knockout";
import _ from "lodash";
import slycatParserControls from "templates/slycat-parser-controls.html";

ko.components.register("slycat-parser-controls",
{
  viewModel: function(params)
  {
    var component = this;
    component.parser = params.parser || ko.observable(null);
    component.disabled = params.disabled === undefined ? false : params.disabled;

    if(params.category)
    {
      component.parsers = parsers.available.filter(function(parser)
      {
        return _.includes(parser.categories(), params.category);
      });
    }
    else
    {
      component.parsers = parsers.available;
    }

    function assign_default_parser()
    {
      if(component.parser() === null && component.parsers().length)
      {
        component.parser(component.parsers()[0].type());
      }
    }
    component.parsers.subscribe(assign_default_parser);
    assign_default_parser();
  },
  template: slycatParserControls
});