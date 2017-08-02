function random()
{
  var colorStr = "";
  var y = document.getElementById("canId__VTKcolors0000");
  var rand1, rand2, rand3;
  for(i = 0; i < colorArr.length; i++)
  {
    rand1 = Math.random();
    rand2 = Math.random();
    rand3 = Math.random();
    fColorArr[i] = " " + rand1 + " " + rand2 + " " + rand3;
  }
  console.log(rand1 + "    " + rand2 + "    " + rand3);
  for(i = 0; i < fColorArr.length; i++)
  {
    colorStr += fColorArr[i] + ",";
  }
  y.setAttribute("color", colorStr);
}

function myFunction(btnId, x3dID)
{
  var element = document.getElementById(x3dID);
  var btn1 = document.getElementById(btnId);
  if(element.getAttribute("render") == "false")
  {
      element.setAttribute("render", "true");
      btn1.style.opacity = "1.0";
     // console.log(dom.runtime.)
  }
  else
  {
      element.setAttribute("render", "false"); 
      btn1.style.opacity = "0.3";
  }
}
function myFunction2(event)
{
  var y = document.getElementById("canId__VTKcolors0000");
  var y2 = y.getAttribute("color");
  colorArr = y2.split(',');
  var colorStr = "";
  var i;

  for(i = 0; i < colorArr.length; i++)
  {
    fColorArr[i] = colorArr[i];
  }
  for(i = 0; i < 30000; i++)
  {
    fColorArr[i] = "1 1 1";
  }
  for(i = 0; i < fColorArr.length; i++)
  {
    colorStr += fColorArr[i] + ",";
  }
  y.setAttribute("color", colorStr);
  y = document.getElementById("canId__VTKcoordinates0000");
  y2 = y.getAttribute("point");
  coordinateArr = y2.split(',');

  console.log(colorArr);
  console.log(coordinateArr);
}
function myFunction3()
{
  var i = 0;
  for(i = 0; i < coordinateArr.length; i++)
  {
    fCoordinateArr[i] = coordinateArr[i];
  }
  for(i = 0; i < colorArr.length; i++)
  {
    if(fColorArr[i] == "1 1 1")
    {
      fCoordinateArr[i] = "0 0 0";
    }
  }
  var coordinateStr = "";
  for(i = 0; i < fCoordinateArr.length; i++)
  {
    coordinateStr += fCoordinateArr[i] + ",";
  }
  var y = document.getElementById("canId__VTKcoordinates0000");
  y.setAttribute("point", coordinateStr);
}

function reset()
{
  var colorStr = "";
  var coordinateStr = "";
  var i = 0;
  for(i = 0; i < colorArr.length; i++)
  {
    colorStr += colorArr[i] + ",";
  }
  for(i = 0; i < coordinateArr.length; i++)
  {
    coordinateStr += coordinateArr[i] + ",";
  }
  var y = document.getElementById("canId__VTKcoordinates0000");
  y.setAttribute("point", coordinateStr);
  y = document.getElementById("canId__VTKcolors0000");
  y.setAttribute("color", colorStr);
}

 var resize = false;
function placeDiv() {
var d = document.getElementById('resizeDiv');
d.style.position = "absolute";
d.style.left = dom.getAttribute("width");
d.style.top = dom.getAttribute('height');
}
placeDiv();
var mousedownID = -1;  //Global ID of mouse down interval
function mousedown(event) {
  if(mousedownID==-1)  //Prevent multimple loops!
     mousedownID = setInterval(function(){whilemousedown(event, this);}, 100 /*execute every 100ms*/);


}
function mouseup(event) {
   if(mousedownID!=-1) {  //Only stop if exists
     clearInterval(mousedownID);
     mousedownID=-1;
     resize = false;
   }

}
function whilemousedown(event) {
   /*here put your code*/
   console.log("gg");
   tempX = event.clientX + document.body.scrollLeft;
   resize = true;
   //dom.setAttribute("width", event.clientX);
   //dom.setAttribute("height", event.clientY);
   //placeDiv();
}
function resizeDom(event)
{
  if(resize == true)
   {
     console.log(event.clientX + document.body.scrollLeft + "mousex");
     console.log(event.clientY + document.body.scrollTop + "mousey");
     console.log(dom.getAttribute("width"));
      dom.setAttribute("width", event.clientX);
      dom.setAttribute("height", event.clientY);

      placeDiv();
   }
}

          document.onmousemove = resizeDom;
bttb = document.getElementById("gg");
          //Assign events
          bttb.addEventListener("mousedown", mousedown);
          bttb.addEventListener("mouseup", mouseup);
          //Also clear the interval when user leaves the window with mouse
          bttb.addEventListener("mouseout", mouseup);
          var colorArr = [];
          var coordinateArr = [];
          var fColorArr = [];
          var fCoordinateArr = [];




 //console.log(document.getElementById("right").getAttribute("position"));
            //w2 = w;
            //w2._projMatrix = w._projMatrix;
            w2["_vf"].isActive = "false";
            w["_vf"].isActive = "false";
            //w._xmlNode.position = "0 0 0";
            var keys = Object.keys(w2);
            var i = 0;
            for(i = 0; i < keys.length; i++)
            {
              w2[keys[i]] = w[keys[i]];
              /*console.log("W1#############");
              console.log(w[keys[i]]);
              console.log("W2#############");
              console.log(w2[keys[i]]);*/
            }
            //console.log("w");
            //console.log(w);
            //console.log("w2");
            //console.log(dom2.runtime.viewpoint());
            console.log(document.getElementById("front").getAttribute("position"))
            //console.log(Object.keys(w2));
           // console.log(dom.style.getAttribute("_zFar"));




var w = dom.runtime.getCameraToWorldCoordinatesMatrix();
var w2 = dom2.runtime.getCameraToWorldCoordinatesMatrix();
var ww = dom.runtime.getWorldToCameraCoordinatesMatrix();
var ww2 = dom2.runtime.getWorldToCameraCoordinatesMatrix();
var keys = Object.keys(w2);
var keys2 = Object.keys(ww2);
var i = 0;
for(i = 0; i < keys2.length; i++)
{
  Object.assign(w2, w);
  Object.assign(ww2, ww);
  console.log(keys2[i]);
  console.log("W1#############");
  console.log(ww[keys2[i]]);
  console.log("W2#############");
  console.log(ww2[keys2[i]]);
  if(ww[keys2[i]] == ww2[keys2[i]])
  {
    console.log("True");
  }
  else
  {
    console.log("False");
  }
}