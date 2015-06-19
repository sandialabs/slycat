var GeometrySettings = (function() {
  'use strict';

  var formatColorStringAs0x = function(cs) {
    return cs.startsWith('#') ? '0x' + cs.slice(1, cs.length) : cs;
  };

  var formatColorStringAsHexStr = function(cs) {
    return cs.startsWith('0') ? '#' + cs.slice(2, cs.length) : cs;
  };

  /**
   * The Geometry Settings helper is a module to allow the user to modify the
   * different settings of a THREE (three.js) object for a STL viewer.
   * Currently, the supported setting are:
   *
   *   - ambient light color
   *   - background color
   *   - meterial color
   *   - light 1 color
   *   - light 2 color
   *
   * The expected format for the input geometry is:
   *
   *   {
   *     renderer: THREE.WebGLRenderer,
   *     backgroundColor: background color,
   *     ambientLight: THREE.AmbientLight object,
   *     ambientLightColor: ambient light color,
   *     mesh: THREE.Mesh object is the STL/3D model,
   *     materialColor: mesh color,
   *     lightOne: THREE.PointLight object,
   *     lightOneColor: light 1 color,
   *     lightTwo: THREE.PointLight object,
   *     lightTwoColor: light 2 color
   *   }
   *
   * @param {Object} geometry geometry settings
   */
  function GeometrySettings(geometry) {
    this.geometry = geometry;
  }

  GeometrySettings.prototype.load = function() {
    var that = this;
    var $bc = $('#slycat-3d-modal-background-color');
    var $alc = $('#slycat-3d-modal-ambient-light-color');
    var $mc = $('#slycat-3d-modal-material-color');
    var $l1c = $('#slycat-3d-modal-light-one-color');
    var $l2c = $('#slycat-3d-modal-light-two-color');

    $bc.val(formatColorStringAs0x(this.geometry.backgroundColor));
    $alc.val(formatColorStringAs0x(this.geometry.ambientLightColor));
    $mc.val(formatColorStringAs0x(this.geometry.materialColor));
    $l1c.val(formatColorStringAs0x(this.geometry.lightOneColor));
    $l2c.val(formatColorStringAs0x(this.geometry.lightTwoColor));

    /** Updates the onclick even for the Apply button */
    $('#slycat-3d-modal-btn-apply').off('click').on('click', function() {
      that.setBackgroundColor($bc.val());
      that.geometry.renderer.setClearColor(formatColorStringAsHexStr($bc.val()));
      that.setAmbientLightColor($alc.val());
      that.geometry.ambientLight.color.setHex($alc.val());
      that.setMaterialColor($mc.val());
      that.geometry.mesh.material.color.setHex($mc.val());
      that.setLightOneColor($l1c.val());
      that.geometry.lightOne.color.setHex($l1c.val());
      that.setLightTwoColor($l2c.val());
      that.geometry.lightTwo.color.setHex($l2c.val());

      return false;
    });
  };

  GeometrySettings.prototype.setBackgroundColor = function(hex) { this.geometry.backgroundColor = hex; };
  GeometrySettings.prototype.getBackgroundColor = function() { return this.geometry.backgroundColor; };

  GeometrySettings.prototype.setAmbientLightColor = function(hex) { this.geometry.ambientLightColor = hex; };
  GeometrySettings.prototype.getAmbientLightColor = function() { return this.geometry.ambientLightColor; };

  GeometrySettings.prototype.setMaterialColor = function(hex) { this.geometry.materialColor = hex; };
  GeometrySettings.prototype.getMaterialColor = function() { return this.geometry.materialColor; };

  GeometrySettings.prototype.setLightOneColor = function(hex) { this.geometry.lightOneColor = hex; };
  GeometrySettings.prototype.getLightOneColor = function() { return this.geometry.lightOneColor; };

  GeometrySettings.prototype.setLightTwoColor = function(hex) { this.geometry.lightTwoColor = hex; };
  GeometrySettings.prototype.getLightTwoColor = function() { return this.geometry.lightTwoColor; };

  return GeometrySettings;
})();