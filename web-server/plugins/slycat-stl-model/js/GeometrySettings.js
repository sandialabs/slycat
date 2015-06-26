var GeometrySettings = (function() {
  'use strict';

  var formatColorStringAs0x = function(cs) {
    return cs.charAt(0) === '#' ? '0x' + cs.slice(1, cs.length) : cs;
  };

  var formatColorStringAsHexStr = function(cs) {
    return cs.charAt(0) === '0' ? '#' + cs.slice(2, cs.length) : cs;
  };

  /**
   * The Geometry Settings helper is a module to allow the user to modify the
   * different settings of a THREE (three.js) object for a STL viewer.
   *
   * The expected format for the input geometry is:
   *
   *   {
   *   }
   *
   * @param {Object} geometry geometry settings
   * @param {Obkect} vm       Knockout.js view model
   */
  function GeometrySettings(geometry, vm) {
    this.geometry = geometry;
    this.vm = vm;
  }

  GeometrySettings.prototype.load = function() {
    var that = this;

    /** Updates the onclick even for the Apply button */
    $('#slycat-3d-modal-btn-apply').off('click').on('click', function() {
      that.geometry.renderer.setClearColor(that.vm.backgroundColor());
      that.geometry.ambientLight.color.setHex(formatColorStringAs0x(that.vm.ambientLightColor()));
      that.geometry.mesh.material.color.setHex(formatColorStringAs0x(that.vm.materialColor()));
      that.geometry.mesh.material.wireframe = that.vm.wireframe();
      that.geometry.mesh.material.transparent = that.vm.transparency();
      that.geometry.mesh.material.opacity = that.vm.opacity();
      that.geometry.lightOne.color.setHex(formatColorStringAs0x(that.vm.lightOneColor()));
      that.geometry.lightOne.position.set(that.vm.lightOneX(), that.vm.lightOneY(), that.vm.lightOneZ());
      that.geometry.lightTwo.color.setHex(formatColorStringAs0x(that.vm.lightTwoColor()));
      that.geometry.lightTwo.position.set(that.vm.lightTwoX(), that.vm.lightTwoY(), that.vm.lightTwoZ());
      that.geometry.controls.zoomSpeed = that.vm.controlsZoomingSpeed();
      that.geometry.controls.rotateSpeed = that.vm.controlsRotationSpeed();
      that.geometry.controls.panSpeed = that.vm.controlsPanningSpeed();
      that.geometry.controls.dynamicDampingFactor = that.vm.controlsDynamicDampingFactor();

      return false;
    });
  };

  return GeometrySettings;
})();
