define('slycat-stl-model', ['slycat-web-client', 'knockout', 'knockout-mapping', 'URI', 'domReady!'], function(client, ko, mapping, URI) {

  var mid = URI(window.location).segment(-1);
  var aid = 'geometry';

  var container = document.getElementById('slycat-stl');
  var width = container.offsetWidth;
  var height = container.offsetHeight;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, width/height, 0.1, 1000);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  document.getElementById('slycat-stl').appendChild(renderer.domElement);

  var skyboxGeometry = new THREE.BoxGeometry(100, 100, 100);
  var skyboxMaterial = new THREE.MeshBasicMaterial({ color: 0xF2F2F2, side: THREE.BackSide });
  var skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  scene.add(skybox);

  var light = new THREE.PointLight(0xFFFFFF);
  light.position.set(0, 3, 3);
  scene.add(light);

  var cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  var cubeMaterial = new THREE.MeshLambertMaterial({ color: 0x337AB7 });
  var cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  cube.rotation.y = Math.PI * 45 / 180;
  scene.add(cube);

  camera.position.y = 2;
  camera.position.z = 6;
  camera.lookAt(cube.position);


  var clock = new THREE.Clock();
  var animationId = null;

  var renderFixed = function () {
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(renderFixed);
  };

  var renderRotate = function() {
    renderer.render(scene, camera);
    cube.rotation.y -= clock.getDelta();
    animationId = requestAnimationFrame(renderRotate);
  };

  renderFixed();


  $('#slycat-stl-rotate').on('click', function(e) {
    e.stopPropagation();
    e.preventDefault();

    cancelAnimationFrame(animationId);
    renderRotate();
  });

  $('#slycat-stl-fixed').on('click', function(e) {
    e.stopPropagation();
    e.preventDefault();

    cancelAnimationFrame(animationId);
    renderFixed();
  });
});