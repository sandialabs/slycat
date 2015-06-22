define('slycat-3d-viewer', ['slycat-server-root', 'knockout', 'URI'], function(server_root, ko, URI) {

  /**
   * A Knockout component to render STL files in slycat, using the Three.js
   * library.
   *
   * Dependencies:
   *   three.min.js
   *   TackballControls.js
   *   STLLoader.js
   *
   * @param {String} mid Model ID. This is an optional parameter.
   * @param {String} aid Artifact ID.
   * @param {String} cid Container ID. This is the CSS ID of the container for the STL viewer.
   */
  ko.components.register('slycat-3d-viewer', {
    viewModel: function(params) {

      if (!isWebGL()) {
        return displayNoWebGLSupport($('.slycat-3d-viewer'));
      }

      /**
       * section defines set of observables and default values for the 3D
       * viewer settings.
       */
      var vm = this;
      vm.ambientLightColor = ko.observable('#F2F2F2');
      vm.backgroundColor = ko.observable('#F2F2F2');

      vm.lightOneColor = ko.observable('#FFFFFF');
      vm.lightOneX = ko.observable(0);
      vm.lightOneY = ko.observable(0);
      vm.lightOneZ = ko.observable(0);

      vm.lightTwoColor = ko.observable('#FFFFFF');
      vm.lightTwoX = ko.observable(0);
      vm.lightTwoY = ko.observable(0);
      vm.lightTwoZ = ko.observable(0);

      vm.materialColor = ko.observable('#337AB7');
      vm.wireframe = ko.observable(false);
      vm.transparency = ko.observable(false);
      vm.opacity = ko.observable(1);

      vm.controlsRotationSpeed = ko.observable(2);
      vm.controlsZoomingSpeed = ko.observable(1.5);
      vm.controlsPanningSpeed = ko.observable(1);
      vm.controlsDynamicDampingFactor = ko.observable(0.3);
      /** */

      var mid = params.mid || URI(window.location).segment(-1);
      var aid = params.aid;
      var cid = params.cid;

      var vid = generateViewerId(cid);
      adjustViewerHeight(vid);

      var viewer = document.getElementById(vid);
      var width = viewer.offsetWidth;
      var height = viewer.offsetHeight;

      var settings = null;
      var renderer = null;
      var camera = null;
      var mouse = null;
      var controls = null;
      var scene = null;
      var ambient = null;
      var mesh = null;
      var material = null;
      var animation = { id: null };
      var lightOne = null;
      var lightTwo = null;

      new THREE.STLLoader().load(mid + '/files/' + aid, function(geometry) {

        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
        var gbs = geometry.boundingSphere;
        var gbb = geometry.boundingBox;

        /**
         * THREE.PerspectiveCamera(
         *     field of view,
         *     aspect ratio,
         *     near clippling pane,
         *     far clipping pane )
         */
        camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 1000);
        camera.position.x = gbb.max.x;
        camera.position.y = gbb.max.y;
        camera.position.z = gbb.max.z + (gbs.radius*4);

        mouse = new THREE.Vector2();
        controls = new THREE.TrackballControls(camera, viewer);
        controls.rotateSpeed = vm.controlsRotationSpeed();
        controls.zoomSpeed = vm.controlsZoomingSpeed();
        controls.panSpeed = vm.controlsPanningSpeed();
        controls.noZoom = false;
        controls.noPan = false;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = vm.controlsDynamicDampingFactor();


        scene = new THREE.Scene();
        ambient = new THREE.AmbientLight(vm.ambientLightColor());
        scene.add(ambient);

        /** light 1 is to the right and front of the object */
        lightOne = new THREE.PointLight(vm.lightOneColor());
        vm.lightOneX(gbb.max.x + (gbs.radius*6));
        vm.lightOneY(gbb.max.y + (gbs.radius*6));
        vm.lightOneZ(gbb.max.z + (gbs.radius*6));
        lightOne.position.set(vm.lightOneX(), vm.lightOneY(), vm.lightOneZ());
        scene.add(lightOne);

        /** light 2 is to the left and back of the object */
        lightTwo = new THREE.PointLight(vm.lightTwoColor());
        vm.lightTwoX(gbb.max.x - (gbs.radius*6));
        vm.lightTwoY(gbb.max.y - (gbs.radius*6));
        vm.lightTwoZ(gbb.max.z - (gbs.radius*6));
        lightTwo.position.set(vm.lightTwoX(), vm.lightTwoY(), vm.lightTwoZ());
        scene.add(lightTwo);

        material = new THREE.MeshLambertMaterial({ color: vm.materialColor() });

        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(gbs.center.x, gbs.center.y, gbs.center.z);

        scene.add(mesh);
        camera.lookAt(mesh.position);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        /** Sets the background color for the scene */
        renderer.setClearColor(vm.backgroundColor());
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(width, height);
        document.getElementById(vid).appendChild(renderer.domElement);

        renderer.domElement.addEventListener('mousemove', function(e) { onMouseMove(mouse, e); });

        /** renders the STL file... */
        renderFixed(animation, renderer, scene, camera, controls);

        /** initializes the settings popup */
        settings = new GeometrySettings({
          renderer: renderer,
          ambientLight: ambient,
          mesh: mesh,
          lightOne: lightOne,
          lightTwo: lightTwo,
          controls: controls
        }, vm);
      });


      $('#' + cid + ' .slycat-3d-btn-reset').on('click', function() {
        onReset(controls, mesh);
        return false;
      });

      $('#' + cid + ' .slycat-3d-btn-rotate').on('click', function() {
        onRotation.bind(this)(animation, renderer, scene, camera, mesh, controls);
        return false;
      });

      $('#slycat-3d-modal').on('shown.bs.modal', function() {
        settings.load();
      });


      $(window).on('resize', function() {
        camera.aspect = viewer.offsetWidth / viewer.offsetHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(viewer.offsetWidth, viewer.offsetHeight);
      });
    },

    template: { require: 'text!' + server_root + 'templates/slycat-3d-viewer.html' }
  });


  /**
   * Function executed on mouse events for the renderer.
   * @param  {} e event
   */
  var onMouseMove = function(mouse, e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  /**
   * Generates and assigns a unique ID to the STL viewer based off its
   * container, mainly to prevent issues if viewing multiple models on the same
   * page.
   *
   * @param  {String} cid container ID
   * @return {String}     new viewer ID
   */
  var generateViewerId = function(cid) {
    var vid = 'slycat-3d-viewer-' + cid;
    $('#' + cid + ' .slycat-3d-viewer').attr('id', vid);

    return vid;
  };

  /**
   * This function is a hack because there are some issues with the heights and
   * the WebGL canvas not being rendered correctly.
   *
   * @param  {String} vid viewer ID
   */
  var adjustViewerHeight = function(vid) {
    var $stlDiv = $('#' + vid);
    var $stlParent = $stlDiv.parent();
    $stlDiv.css('height', $stlParent.height() - 48);
  };

  /**
   * Renders the geometry in a fixed position.
   * @param  {Object} animation animation object with an 'id' attribute
   * @param  {Object} renderer  reference to the rendered
   * @param  {Object} scene     reference to the scene
   * @param  {Object} camera    reference to the camera
   * @param  {Object} controls  reference to the controls
   */
  var renderFixed = function (animation, renderer, scene, camera, controls) {
    var rf = function() {
      controls.update();
      renderer.render(scene, camera);
      animation.id = requestAnimationFrame(rf);
    };

    rf();
  };

  /**
   * Renders the geometry on a rotation animation around the y axis
   * @param  {Object} animation animation object with an 'id' attribute
   * @param  {Object} renderer  reference to the rendered
   * @param  {Object} scene     reference to the scene
   * @param  {Object} camera    reference to the camera
   * @param  {Object} mesh      reference to the mesh (i.e. geometry)
   * @param  {Object} controls  reference to the controls
   */
  var renderRotate = function(animation, renderer, scene, camera, mesh, controls) {
    var rr = function() {
      controls.update();
      renderer.render(scene, camera);

      if (mesh)
        mesh.rotation.y -= 0.01;

      animation.id = requestAnimationFrame(rr);
    };

    rr();
  };

  /**
   * Function executed on click on the Rotate/Fixed button.
   * @param  {Object} animation animation object with an 'id' attribute
   * @param  {Object} renderer  reference to the rendered
   * @param  {Object} scene     reference to the scene
   * @param  {Object} camera    reference to the camera
   * @param  {Object} mesh      reference to the mesh (i.e. geometry)
   * @param  {Object} controls  reference to the controls
   */
  var onRotation = function(animation, renderer, scene, camera, mesh, controls) {
    cancelAnimationFrame(animation.id);

    if ($(this).text() === 'Rotate') {
      renderRotate(animation, renderer, scene, camera, mesh, controls);
      $(this).text('Fixed');
    } else {
      renderFixed(animation, renderer, scene, camera, controls);
      $(this).text('Rotate');
    }
  };

  /**
   * Function executed on click on the Reset button.
   * @param  {Object} controls refernce to the controls
   * @param  {Object} mesh     refernce to the mesh
   */
  var onReset = function(controls, mesh) {
    controls.reset();
    mesh.rotation.y = 0;
  };

  /**
   * Returns whether or not the instance is supporting WebGL.
   * @return {Boolean}
   */
  var isWebGL = function() {
    var canvas = !! window.CanvasRenderingContext2D;

    return (

      function() {
        try {
          var c = document.createElement('canvas');
          return !! (window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
        } catch (e) {
          return false;
        }
      }

    )();
  };

  /**
   * Appends an error message to the user for the lack of WebGL support.
   * @param  {jQuery} $div Container <div /> for the message
   * @return {}            undefined
   */
  var displayNoWebGLSupport = function($div) {
    var $msg = $('<div />')
      .css('width', 400)
      .css('margin', '5em auto 0px')
      .css('padding', '1.5em')
      .css('background', 'white')
      .css('text-align', 'center')
      .text('Your browser and/or graphics card does not seem to support WebGL.');

    $div.append($msg);

    return void 0;
  };

});
