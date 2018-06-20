/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
/******/ 		// add "moreModules" to the modules object,
/******/ 		// then flag all "chunkIds" as loaded and fire callback
/******/ 		var moduleId, chunkId, i = 0, resolves = [];
/******/ 		for(;i < chunkIds.length; i++) {
/******/ 			chunkId = chunkIds[i];
/******/ 			if(installedChunks[chunkId]) {
/******/ 				resolves.push(installedChunks[chunkId][0]);
/******/ 			}
/******/ 			installedChunks[chunkId] = 0;
/******/ 		}
/******/ 		for(moduleId in moreModules) {
/******/ 			if(Object.prototype.hasOwnProperty.call(moreModules, moduleId)) {
/******/ 				modules[moduleId] = moreModules[moduleId];
/******/ 			}
/******/ 		}
/******/ 		if(parentJsonpFunction) parentJsonpFunction(data);
/******/ 		while(resolves.length) {
/******/ 			resolves.shift()();
/******/ 		}
/******/
/******/ 		// add entry modules from loaded chunk to deferred list
/******/ 		deferredModules.push.apply(deferredModules, executeModules || []);
/******/
/******/ 		// run deferred modules when all chunks ready
/******/ 		return checkDeferredModules();
/******/ 	};
/******/ 	function checkDeferredModules() {
/******/ 		var result;
/******/ 		for(var i = 0; i < deferredModules.length; i++) {
/******/ 			var deferredModule = deferredModules[i];
/******/ 			var fulfilled = true;
/******/ 			for(var j = 1; j < deferredModule.length; j++) {
/******/ 				var depId = deferredModule[j];
/******/ 				if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 			}
/******/ 			if(fulfilled) {
/******/ 				deferredModules.splice(i--, 1);
/******/ 				result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 			}
/******/ 		}
/******/ 		return result;
/******/ 	}
/******/
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// object to store loaded and loading chunks
/******/ 	// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 	// Promise = chunk loading, 0 = chunk loaded
/******/ 	var installedChunks = {
/******/ 		"slycat_page": 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	var jsonpArray = window["webpackJsonp"] = window["webpackJsonp"] || [];
/******/ 	var oldJsonpFunction = jsonpArray.push.bind(jsonpArray);
/******/ 	jsonpArray.push = webpackJsonpCallback;
/******/ 	jsonpArray = jsonpArray.slice();
/******/ 	for(var i = 0; i < jsonpArray.length; i++) webpackJsonpCallback(jsonpArray[i]);
/******/ 	var parentJsonpFunction = oldJsonpFunction;
/******/
/******/
/******/ 	// add entry module to deferred list
/******/ 	deferredModules.push(["./web-server/js/slycat-page-main.js","vendors~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_ru~29e28113","vendors~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_ti~7afcd8b9","slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_run_comman~247387c4","slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_timeseries"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ "./web-server/js/slycat-page-main.js":
/*!*******************************************!*\
  !*** ./web-server/js/slycat-page-main.js ***!
  \*******************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($) {\n\n__webpack_require__(/*! ../css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! ../css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatServerRoot = __webpack_require__(/*! ./slycat-server-root */ \"./web-server/js/slycat-server-root.js\");\n\nvar _slycatServerRoot2 = _interopRequireDefault(_slycatServerRoot);\n\nvar _slycatWebClientWebpack = __webpack_require__(/*! ./slycat-web-client-webpack */ \"./web-server/js/slycat-web-client-webpack.js\");\n\nvar _slycatWebClientWebpack2 = _interopRequireDefault(_slycatWebClientWebpack);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _knockoutMapping = __webpack_require__(/*! knockout-mapping */ \"./node_modules/knockout-mapping/dist/knockout.mapping.js\");\n\nvar _knockoutMapping2 = _interopRequireDefault(_knockoutMapping);\n\n__webpack_require__(/*! ./slycat-navbar-webpack */ \"./web-server/js/slycat-navbar-webpack.js\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n\n  var page = {};\n  page.server_root = _slycatServerRoot2.default;\n  page.projects = _knockoutMapping2.default.fromJS([]);\n  _slycatWebClientWebpack2.default.get_projects({\n    success: function success(result) {\n      _knockoutMapping2.default.fromJS(result.projects, page.projects);\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project.\");\n    }\n  });\n  _knockout2.default.applyBindings(page, document.querySelector(\"html\"));\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1wYWdlLW1haW4uanM/MDY4NiJdLCJuYW1lcyI6WyIkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInBhZ2UiLCJzZXJ2ZXJfcm9vdCIsInByb2plY3RzIiwibWFwcGluZyIsImZyb21KUyIsImNsaWVudCIsImdldF9wcm9qZWN0cyIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJlcnJvciIsInJlcXVlc3QiLCJzdGF0dXMiLCJyZWFzb25fcGhyYXNlIiwiY29uc29sZSIsImxvZyIsImtvIiwiYXBwbHlCaW5kaW5ncyIsInF1ZXJ5U2VsZWN0b3IiXSwibWFwcGluZ3MiOiI7O0FBS0E7O0FBQ0E7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBO0FBQ0FBLEVBQUVDLFFBQUYsRUFBWUMsS0FBWixDQUFrQixZQUFXOztBQUUzQixNQUFJQyxPQUFPLEVBQVg7QUFDQUEsT0FBS0MsV0FBTCxHQUFtQkEsMEJBQW5CO0FBQ0FELE9BQUtFLFFBQUwsR0FBZ0JDLDBCQUFRQyxNQUFSLENBQWUsRUFBZixDQUFoQjtBQUNBQyxtQ0FBT0MsWUFBUCxDQUFvQjtBQUNsQkMsYUFBUyxpQkFBU0MsTUFBVCxFQUFpQjtBQUN4QkwsZ0NBQVFDLE1BQVIsQ0FBZUksT0FBT04sUUFBdEIsRUFBZ0NGLEtBQUtFLFFBQXJDO0FBQ0QsS0FIaUI7QUFJbEJPLFdBQU8sZUFBU0MsT0FBVCxFQUFrQkMsTUFBbEIsRUFBMEJDLGFBQTFCLEVBQXlDO0FBQzlDQyxjQUFRQyxHQUFSLENBQVksNkJBQVo7QUFDRDtBQU5pQixHQUFwQjtBQVFBQyxxQkFBR0MsYUFBSCxDQUFpQmhCLElBQWpCLEVBQXVCRixTQUFTbUIsYUFBVCxDQUF1QixNQUF2QixDQUF2QjtBQUVELENBZkQsRSxDQWZBOzs7O0FBSUEsZ0IiLCJmaWxlIjoiLi93ZWItc2VydmVyL2pzL3NseWNhdC1wYWdlLW1haW4uanMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBDb3B5cmlnaHQgKGMpIDIwMTMsIDIwMTggTmF0aW9uYWwgVGVjaG5vbG9neSBhbmQgRW5naW5lZXJpbmcgU29sdXRpb25zIG9mIFNhbmRpYSwgTExDIC4gVW5kZXIgdGhlIHRlcm1zIG9mIENvbnRyYWN0XG4gREUtTkEwMDAzNTI1IHdpdGggTmF0aW9uYWwgVGVjaG5vbG9neSBhbmQgRW5naW5lZXJpbmcgU29sdXRpb25zIG9mIFNhbmRpYSwgTExDLCB0aGUgVS5TLiBHb3Zlcm5tZW50XG4gcmV0YWlucyBjZXJ0YWluIHJpZ2h0cyBpbiB0aGlzIHNvZnR3YXJlLiAqL1xuXG4vLyBDU1MgcmVzb3VyY2VzXG5pbXBvcnQgXCIuLi9jc3MvbmFtZXNwYWNlZC1ib290c3RyYXAubGVzc1wiO1xuaW1wb3J0IFwiLi4vY3NzL3NseWNhdC5jc3NcIjtcblxuaW1wb3J0IHNlcnZlcl9yb290IGZyb20gJy4vc2x5Y2F0LXNlcnZlci1yb290JztcbmltcG9ydCBjbGllbnQgZnJvbSAnLi9zbHljYXQtd2ViLWNsaWVudC13ZWJwYWNrJztcbmltcG9ydCBrbyBmcm9tICdrbm9ja291dCc7XG5pbXBvcnQgbWFwcGluZyBmcm9tICdrbm9ja291dC1tYXBwaW5nJztcbmltcG9ydCBcIi4vc2x5Y2F0LW5hdmJhci13ZWJwYWNrXCI7XG5cbi8vIFdhaXQgZm9yIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuICB2YXIgcGFnZSA9IHt9XG4gIHBhZ2Uuc2VydmVyX3Jvb3QgPSBzZXJ2ZXJfcm9vdDtcbiAgcGFnZS5wcm9qZWN0cyA9IG1hcHBpbmcuZnJvbUpTKFtdKTtcbiAgY2xpZW50LmdldF9wcm9qZWN0cyh7XG4gICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICBtYXBwaW5nLmZyb21KUyhyZXN1bHQucHJvamVjdHMsIHBhZ2UucHJvamVjdHMpO1xuICAgIH0sXG4gICAgZXJyb3I6IGZ1bmN0aW9uKHJlcXVlc3QsIHN0YXR1cywgcmVhc29uX3BocmFzZSkge1xuICAgICAgY29uc29sZS5sb2coXCJVbmFibGUgdG8gcmV0cmlldmUgcHJvamVjdC5cIik7XG4gICAgfVxuICB9KTtcbiAga28uYXBwbHlCaW5kaW5ncyhwYWdlLCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaHRtbFwiKSk7XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./web-server/js/slycat-page-main.js\n");

/***/ })

/******/ });