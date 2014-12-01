(function()
{
  var nag = false;

  var newWebkit  = $.browser.webkit  && parseFloat($.browser.version) >= 534.53;
  var newChrome  = $.browser.chrome  && parseFloat($.browser.version) >= 17;
  var newMozilla = $.browser.mozilla && parseFloat($.browser.version) >= 10;

  // Warn IE8- users they need a real browser
  if ($.browser.msie && parseInt($.browser.version,10)<9)
  {
    nag = true;
  }
  // Warn everyone other than WebKit 534.53+ or Chrome 17+ or FF10+ they might need to upgrade
  else if ( !(newWebkit || newChrome || newMozilla) )
  {
    nag = true;
  }

  if(nag)
  {
    alert("Your browser might not provide the features needed by Slycat. We suggest switching to a current version of Firefox, Chrome, or Safari. You can also try Internet Explorer version 9 or above, but support for it is experimental.");
  }
}());

