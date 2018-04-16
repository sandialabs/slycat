/* Copyright © 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract
 DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government
 retains certain rights in this software. */

define("slycat-nag", ["slycat-dialog"], function(dialog)
{
  var nag = false;

  function FlexBoxSupport(){
    var c = " ", f = "flex", fw = "-webkit-"+f, e = document.createElement('b');
    try { 
      e.style.display = fw; 
      e.style.display = f; 
      return (e.style.display == f || e.style.display == fw); 
    } catch(e) { 
      return false; 
    }
  }

  // We use json everywhere.
  if(!(window.JSON && window.JSON.parse && window.JSON.toString))
    nag = true;

  // We need websockets for our live project and model feeds.
  if(!window.WebSocket)
    nag = true;

  // We need localStorage for many of our standarized controls and bookmarks.
  if(!window.localStorage)
    nag = true;

  // We need SVG for many visualizations
  if(!document.implementation.hasFeature("http://www.w3.org/TR/SVG11/feature#BasicStructure", "1.1"))
    nag = true;

  // We need WebGL for some models
  if(!window.WebGLRenderingContext)
    nag = true;

  // We need Canvas for some models
  if(!window.HTMLCanvasElement)
    nag = true;

  // We need CSS3 flexbox
  if(!FlexBoxSupport())
    nag = true;

  // We don't work with IE
  if(window.navigator.userAgent.indexOf("MSIE ") > 0)
    nag = true;

  if(nag)
  {
    dialog.dialog(
    {
      title: "Compatibility Alert",
      message: "Your browser is missing features required by Slycat. We suggest switching to a current version of Firefox, Chrome, or Safari.",
    });
  }
});
