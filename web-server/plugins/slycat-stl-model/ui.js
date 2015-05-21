define('slycat-stl-model', ['slycat-web-client', 'knockout', 'knockout-mapping', 'URI', 'domReady!'], function(client, ko, mapping, URI) {

  var mid = URI(window.location).segment(-1);
  var aid = 'geometry';

  var container = document.getElementById('slycat-stl');
  var width = container.offsetWidth;
  var height = container.offsetHeight;

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);

  var renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  document.getElementById('slycat-stl').appendChild(renderer.domElement);

  var geometry = new THREE.BoxGeometry(1, 1, 1);
  var material = new THREE.MeshBasicMaterial({ color: 0x337AB7 });
  var cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  camera.position.z = 5;


  var render = function () {
    requestAnimationFrame(render);
    renderer.render(scene, camera);
  };

  render();
});