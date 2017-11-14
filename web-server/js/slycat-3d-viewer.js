define('slycat-3d-viewer', ['slycat-server-root', 'knockout', 'knockout-mapping','URI'], function(server_root, ko, mapping, URI) {
  var static_index = 0;
  // number of pixels that needs to be added to the viewer for the canvas to fill it...
  var arbitrary_viewer_pixels = 11;

  /**
   * A Knockout component to render STL files in slycat, using the Three.js
   * library.
   *
   * Dependencies:
   *   three.min.js
   *   TackballControls.js
   *   STLLoader.js
   *   stats.min.js
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
      vm.settings_modal_id = ko.observable('slycat-3d-modal-' + static_index);
      vm.settings_scene_href = ko.observable('#stl-settings-scene-' + static_index);
      vm.settings_scene_id = ko.observable('stl-settings-scene-' + static_index);
      vm.settings_geometry_href = ko.observable('#stl-settings-geometry-' + static_index);
      vm.settings_geometry_id = ko.observable('stl-settings-geometry-' + static_index);
      vm.settings_lights_href = ko.observable('#stl-settings-lights-' + static_index);
      vm.settings_lights_id = ko.observable('stl-settings-lights-' + static_index);
      vm.settings_controls_href = ko.observable('#stl-settings-controls-' + static_index);
      vm.settings_controls_id = ko.observable('stl-settings-controls-' + static_index++);

      vm.settings = ko.observable(false);

      vm.ambientLightColor = ko.observable('#F2F2F2');
      vm.backgroundColor = ko.observable(params.backgroundColor || '#F2F2F2');

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
      var uri = params.uri;
      var loadUri = uri ? uri : mid + '/files/' + aid;
      var isModel = params.aid ? true : false;

      var container = params.container;
      var $container = $(container);

      var viewer = container.children[1];
      adjustViewerHeight(viewer);

      var width = viewer.offsetWidth;
      var height = viewer.offsetHeight + arbitrary_viewer_pixels;

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

      var fps = new Stats();
      var ms = new Stats();

      new THREE.STLLoader().load(loadUri, function(geometry) {
        var l = document.getElementsByClassName('loading-image')[0];
        if (l) l.parentNode.removeChild(l);

        initStats(container, viewer, renderer, camera, geometry, fps, ms, isModel);

        geometry.center();
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
        camera = new THREE.PerspectiveCamera(75, width/height, 0.1, 10000);
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
        viewer.appendChild(renderer.domElement);

        renderer.domElement.addEventListener('mousemove', function(e) { onMouseMove(mouse, e); });

        /** renders the STL file... */
        renderFixed(animation, renderer, scene, camera, controls, fps, ms);
      });

      var parent_class = 'slycat-content';
      var $c = $('.' + parent_class);

      vm.show_settings = ko.observable(false).extend({ notify: 'always' });
      vm.show_settings.subscribe(function(value) {
        var $m = $('#' + vm.settings_modal_id());
        var $p = $m.parent();
        /**  checks if it has been moved already... */
        var moved = $p.hasClass(parent_class);

        if (value && !moved) {
          /** moves the settings modal higher up in the DOM... */
          $m.detach();
          $('#model-pane')
            .addClass('bootstrap-styles')
            .prepend($m);
        }

        $m.modal(value ? 'show' : 'hide');
      });

      vm.run_settings = function(item) {
        vm.settings(false);
        vm.settings(true);
        vm.show_settings(true);
      };

      vm.apply_settings = function() {
        renderer.setClearColor(vm.backgroundColor());
        ambient.color.setHex(formatColorStringAs0x(vm.ambientLightColor()));
        mesh.material.color.setHex(formatColorStringAs0x(vm.materialColor()));
        mesh.material.wireframe = vm.wireframe();
        mesh.material.transparent = vm.transparency();
        mesh.material.opacity = vm.opacity();
        lightOne.color.setHex(formatColorStringAs0x(vm.lightOneColor()));
        lightOne.position.set(vm.lightOneX(), vm.lightOneY(), vm.lightOneZ());
        lightTwo.color.setHex(formatColorStringAs0x(vm.lightTwoColor()));
        lightTwo.position.set(vm.lightTwoX(), vm.lightTwoY(), vm.lightTwoZ());
        controls.zoomSpeed = vm.controlsZoomingSpeed();
        controls.rotateSpeed = vm.controlsRotationSpeed();
        controls.panSpeed = vm.controlsPanningSpeed();
        controls.dynamicDampingFactor = vm.controlsDynamicDampingFactor();
      };


      $('.slycat-3d-btn-reset', $container).on('click', function() {
        onReset(controls, mesh);
        return false;
      });

      $('.slycat-3d-btn-rotate', $container).on('click', function() {
        onRotation.bind(this)(animation, container, renderer, scene, camera, mesh, controls, fps, ms);
        return false;
      });

      $('#slycat-3d-stats-check', $container).on('change', function() {
        toggleStats(container, viewer, renderer, camera, fps, ms, $(this).is(':checked'), isModel);
      });


      $(window).on('resize', function() { resizeViewer(container, viewer, renderer, camera, isModel); });
    },

    template: { require: 'text!' + server_root + 'templates/slycat-3d-viewer.html' }
  });


  var formatColorStringAs0x = function(cs) {
    return cs.charAt(0) === '#' ? '0x' + cs.slice(1, cs.length) : cs;
  };

  var formatColorStringAsHexStr = function(cs) {
    return cs.charAt(0) === '0' ? '#' + cs.slice(2, cs.length) : cs;
  };

  /**
   * The function resizes the viewer (WebGL/canvas) according to the parent
   * container, its header and the stats displays. The function should be
   * called upon during resize events.
   *
   * @param {Object} container
   * @param {Object} viewer
   * @param {Object} renderer
   * @param {Object} camera
   * @param {Boolean} isModel
   */
  var resizeViewer = function(container, viewer, renderer, camera, isModel) {
    var headerHeight = 0;
    var statsHeight = 0;
    var borders = 0;
    var w;
    var h;

    if (isModel) {
      $v = $(viewer);
      $v.height($v.height() + arbitrary_viewer_pixels);

      w = $v.outerWidth();
      h = $v.outerHeight();
    } else {
      headerHeight = $(container.firstChild).outerHeight();
      statsHeight = $('#stats', $(container)).is(':visible') ? $('#stats', $(container)).height() : 0;
      borders = 2;
      w = parseInt(container.parentNode.style.width, 10);
      h = parseInt(container.parentNode.style.height, 10);
    }

    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }

    if (renderer)
      renderer.setSize(w - borders, h - headerHeight - statsHeight - 22);
  };

  /**
   * Function executed on mouse events for the renderer.
   * @param {Object} mouse
   * @param  {} e event
   */
  var onMouseMove = function(mouse, e) {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  /**
   * This function is a hack because there are some issues with the heights and
   * the WebGL canvas not being rendered correctly.
   *
   * @param  {String} viewer
   */
  var adjustViewerHeight = function(viewer) {
    var $stlDiv = $(viewer);
    var $stlContent = $($stlDiv.parent()).parent();

    $stlDiv.css('height', $stlContent.height() - 48);
  };

  /**
   * Renders the geometry in a fixed position.
   * @param  {Object} animation animation object with an 'id' attribute
   * @param  {Object} renderer  reference to the rendered
   * @param  {Object} scene     reference to the scene
   * @param  {Object} camera    reference to the camera
   * @param  {Object} controls  reference to the controls
   * @param  {Object} fps
   * @param  {Object} ms
   */
  var renderFixed = function (animation, renderer, scene, camera, controls, fps, ms) {
    var rf = function() {
      controls.update();
      renderer.render(scene, camera);
      animation.id = requestAnimationFrame(rf);

      fps.update();
      ms.update();
    };

    rf();
  };

  /**
   * Renders the geometry on a rotation animation around the y axis
   * @param  {Object} animation animation object with an 'id' attribute
   * @param  {Object} container
   * @param  {Object} renderer  reference to the rendered
   * @param  {Object} scene     reference to the scene
   * @param  {Object} camera    reference to the camera
   * @param  {Object} mesh      reference to the mesh (i.e. geometry)
   * @param  {Object} controls  reference to the controls
   * @param  {Object} fps
   * @param  {Object} ms
   */
  var renderRotate = function(animation, container, renderer, scene, camera, mesh, controls, fps, ms) {
    var rr = function() {
      controls.update();
      renderer.render(scene, camera);

      var x = $('#slycat-3d-x-check', $(container)).is(':checked');
      var y = $('#slycat-3d-y-check', $(container)).is(':checked');
      var z = $('#slycat-3d-z-check', $(container)).is(':checked');

      if (mesh && x) mesh.rotation.x -= 0.01;
      if (mesh && y) mesh.rotation.y -= 0.01;
      if (mesh && z) mesh.rotation.z -= 0.01;

      animation.id = requestAnimationFrame(rr);

      fps.update();
      ms.update();
    };

    rr();
  };

  /**
   * Function executed on click on the Rotate/Fixed button.
   * @param  {Object} animation animation object with an 'id' attribute
   * @param  {Object} container
   * @param  {Object} renderer  reference to the rendered
   * @param  {Object} scene     reference to the scene
   * @param  {Object} camera    reference to the camera
   * @param  {Object} mesh      reference to the mesh (i.e. geometry)
   * @param  {Object} controls  reference to the controls
   */
  var onRotation = function(animation, container, renderer, scene, camera, mesh, controls, fps, ms) {
    cancelAnimationFrame(animation.id);

    if ($(this).text() === 'Rotate') {
      renderRotate(animation, container, renderer, scene, camera, mesh, controls, fps, ms);
      $(this).text('Fixed');
    } else {
      renderFixed(animation, renderer, scene, camera, controls, fps, ms);
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
    mesh.rotation.x = 0;
    mesh.rotation.y = 0;
    mesh.rotation.z = 0;
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

  /**
   * Initializes the statistics displays.
   * @param {Object} container
   * @param {Object} viewer
   * @param {Object} renderer
   * @param {Object} camera
   * @param {Object} geometry THREE.Geometry or THREE.BufferGeometry object
   * @param {Object} fps
   * @param {Object} ms
   * @param {Boolean} isModel
   */
  var initStats = function(container, viewer, renderer, camera, geometry, fps, ms, isModel) {
    fps.setMode(0);
    ms.setMode(1);

    fps.domElement.style.position = 'relative';
    fps.domElement.style.top = '0px';
    fps.domElement.style.display = 'inline-block';
    fps.domElement.style.marginRight = '5px';
    fps.domElement.style.float = 'right';

    ms.domElement.style.position = 'relative';
    ms.domElement.style.top = '0px';
    ms.domElement.style.display = 'inline-block';
    ms.domElement.style.marginRight = '5px';
    ms.domElement.style.float = 'right';

    var nf = 0;
    if (geometry.type === 'BufferGeometry')
      nf = geometry.attributes.normal.array.length / (3 * 3);
    else if (geometry.type === 'Geometry')
      nf = geometry.faces.length;

    $('#slycat-3d-face3-number', $(container)).text(nf);

    toggleStats(container, viewer, renderer, camera, fps, ms, false, isModel);

    viewer.appendChild(ms.domElement);
    viewer.appendChild(fps.domElement);
  };

  /**
   * Toggles the display state for the statistics displays.
   * @param {Object} container
   * @param {Object} viewer
   * @param {Object} renderer
   * @param {Object} camera
   * @param {Object} fps
   * @param {Object} ms
   * @param {Boolean} toggle
   * @param {Boolean} isModel
   */
  var toggleStats = function(container, viewer, renderer, camera, fps, ms, toggle, isModel) {
    var d = toggle ? 'block' : 'none';
    var id = toggle ? 'inline-block' : 'none';

    fps.domElement.style.display = d;
    ms.domElement.style.display = d;

    $('.slycat-3d-stats', $(container)).css('display', id);

    resizeViewer(container, viewer, renderer, camera, isModel);
  };

});
