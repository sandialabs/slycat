/*
Copyright 2013, Sandia Corporation. Under the terms of Contract
DE-AC04-94AL85000 with Sandia Corporation, the U.S. Government retains certain
rights in this software.
*/

define("slycat-model-main", [], function()
{
  var module = {}
  module.start = function()
  {
    page = {};

    // Size the page content to consume available space
    function size_content()
    {
      $(".slycat-content").css("min-height", $(window).height() - $("slycat-navbar > div").height());
    }
    $(window).resize(size_content);
    $(document).on('slycat-navbar-after-render', function(){
      size_content();
    });

    // Enable knockout
    ko.applyBindings(page);
  };

  return module;
});
