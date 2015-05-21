define('slycat-stl-model', ['slycat-web-client', 'knockout', 'knockout-mapping', 'URI', 'domReady!'], function(client, ko, mapping, URI) {

  /** TODO this needs to be a knockout component/module... */

  var mid = URI(window.location).segment(-1);
  var aid = 'geometry';

  var container = document.getElementById('slycat-stl');
  var width = container.offsetWidth;
  var height = container.offsetHeight;

  var camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);
  camera.position.y = 2;
  camera.position.z = 6;


  var mouse = new THREE.Vector2();
  var controls = new THREE.TrackballControls(camera);
  controls.rotateSpeed = 2;
  controls.zoomSpeed = 1.5;
  controls.panSpeed = 1;
  controls.noZoom = false;
  controls.noPan = false;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;


  var scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xF2F2F2));

  var lightOne = new THREE.PointLight(0xFFFFFF);
  lightOne.position.set(0, 3, 3);
  scene.add(lightOne);

  var lightTwo = new THREE.PointLight(0xFFFFFF);
  lightTwo.position.set(0, -3, -3);
  scene.add(lightTwo);

  var cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  var cubeMaterial = new THREE.MeshLambertMaterial({ color: 0x337AB7 });
  var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.rotation.y = Math.PI * 45 / 180;
  scene.add(cube);

  camera.lookAt(cube.position);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  /** Sets the background color for the scene */
  renderer.setClearColor(0xF2F2F2);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  document.getElementById('slycat-stl').appendChild(renderer.domElement);

  var onMouseMove = function(e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  renderer.domElement.addEventListener('mousemove', onMouseMove);


  var animationId = null;

  var renderFixed = function () {
    controls.update();
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(renderFixed);
  };

  var renderRotate = function() {
    controls.update();
    renderer.render(scene, camera);
    cube.rotation.y -= 0.01;
    animationId = requestAnimationFrame(renderRotate);
  };

  renderFixed();


  $('#slycat-stl-rotate').on('click', function(e) {
    e.stopPropagation();
    e.preventDefault();

    cancelAnimationFrame(animationId);

    if ($(this).text() === 'Rotate') {
      renderRotate();
      $(this).text('Fixed');
    } else {
      renderFixed();
      $(this).text('Rotate');
    }
  });
});