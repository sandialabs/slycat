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
/******/ 		"slycat_projects": 0
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
/******/ 	__webpack_require__.p = "/";
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
/******/ 	deferredModules.push(["./web-server/js/slycat-projects-main.js","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_run_comm~c3296245","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseri~6d9dd6a9","vendors~slycat_model~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseries","vendors~slycat_project~slycat_projects~ui_parameter_plus","slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_run_command~ui_t~c432f948","slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseries"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ "./web-server/js/slycat-ga.js":
/*!************************************!*\
  !*** ./web-server/js/slycat-ga.js ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($) {\n\nvar _slycatWebClientWebpack = __webpack_require__(/*! js/slycat-web-client-webpack */ \"./web-server/js/slycat-web-client-webpack.js\");\n\nvar _slycatWebClientWebpack2 = _interopRequireDefault(_slycatWebClientWebpack);\n\nvar _reactGa = __webpack_require__(/*! react-ga */ \"./node_modules/react-ga/dist/react-ga.js\");\n\nvar _reactGa2 = _interopRequireDefault(_reactGa);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n retains certain rights in this software. */\n\n$(document).ready(function () {\n\n  _slycatWebClientWebpack2.default.get_configuration_ga_tracking_id({\n    success: function success(id) {\n      // Initialize Google Analytics only if we have an ID that isn't empty or whitespace.\n      // When ga-tracking-id is not set in web-server-config.ini, it returns \"\" as the id.\n      if (id.trim() != \"\") {\n        _reactGa2.default.initialize(id);\n      }\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve Google Analytics tracking id.\");\n    }\n  });\n});\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1nYS5qcz8zZmE3Il0sIm5hbWVzIjpbIiQiLCJkb2N1bWVudCIsInJlYWR5IiwiY2xpZW50IiwiZ2V0X2NvbmZpZ3VyYXRpb25fZ2FfdHJhY2tpbmdfaWQiLCJzdWNjZXNzIiwiaWQiLCJ0cmltIiwiUmVhY3RHQSIsImluaXRpYWxpemUiLCJlcnJvciIsInJlcXVlc3QiLCJzdGF0dXMiLCJyZWFzb25fcGhyYXNlIiwiY29uc29sZSIsImxvZyJdLCJtYXBwaW5ncyI6Ijs7QUFJQTs7OztBQUNBOzs7Ozs7QUFMQTs7OztBQU9BQSxFQUFFQyxRQUFGLEVBQVlDLEtBQVosQ0FBa0IsWUFBVzs7QUFFM0JDLG1DQUFPQyxnQ0FBUCxDQUF3QztBQUN0Q0MsYUFBUyxpQkFBU0MsRUFBVCxFQUFhO0FBQ3BCO0FBQ0E7QUFDQSxVQUFHQSxHQUFHQyxJQUFILE1BQWEsRUFBaEIsRUFDQTtBQUNFQywwQkFBUUMsVUFBUixDQUFtQkgsRUFBbkI7QUFDRDtBQUNGLEtBUnFDO0FBU3RDSSxXQUFPLGVBQVNDLE9BQVQsRUFBa0JDLE1BQWxCLEVBQTBCQyxhQUExQixFQUF5QztBQUM5Q0MsY0FBUUMsR0FBUixDQUFZLGtEQUFaO0FBQ0Q7QUFYcUMsR0FBeEM7QUFhRCxDQWZELEUiLCJmaWxlIjoiLi93ZWItc2VydmVyL2pzL3NseWNhdC1nYS5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAoYykgMjAxMywgMjAxOCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMgLiBVbmRlciB0aGUgdGVybXMgb2YgQ29udHJhY3RcbiBERS1OQTAwMDM1MjUgd2l0aCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMsIHRoZSBVLlMuIEdvdmVybm1lbnRcbiByZXRhaW5zIGNlcnRhaW4gcmlnaHRzIGluIHRoaXMgc29mdHdhcmUuICovXG5cbmltcG9ydCBjbGllbnQgZnJvbSAnanMvc2x5Y2F0LXdlYi1jbGllbnQtd2VicGFjayc7XG5pbXBvcnQgUmVhY3RHQSBmcm9tICdyZWFjdC1nYSc7XG5cbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuXG4gIGNsaWVudC5nZXRfY29uZmlndXJhdGlvbl9nYV90cmFja2luZ19pZCh7XG4gICAgc3VjY2VzczogZnVuY3Rpb24oaWQpIHtcbiAgICAgIC8vIEluaXRpYWxpemUgR29vZ2xlIEFuYWx5dGljcyBvbmx5IGlmIHdlIGhhdmUgYW4gSUQgdGhhdCBpc24ndCBlbXB0eSBvciB3aGl0ZXNwYWNlLlxuICAgICAgLy8gV2hlbiBnYS10cmFja2luZy1pZCBpcyBub3Qgc2V0IGluIHdlYi1zZXJ2ZXItY29uZmlnLmluaSwgaXQgcmV0dXJucyBcIlwiIGFzIHRoZSBpZC5cbiAgICAgIGlmKGlkLnRyaW0oKSAhPSBcIlwiKVxuICAgICAge1xuICAgICAgICBSZWFjdEdBLmluaXRpYWxpemUoaWQpO1xuICAgICAgfVxuICAgIH0sXG4gICAgZXJyb3I6IGZ1bmN0aW9uKHJlcXVlc3QsIHN0YXR1cywgcmVhc29uX3BocmFzZSkge1xuICAgICAgY29uc29sZS5sb2coXCJVbmFibGUgdG8gcmV0cmlldmUgR29vZ2xlIEFuYWx5dGljcyB0cmFja2luZyBpZC5cIik7XG4gICAgfVxuICB9KTtcbn0pOyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./web-server/js/slycat-ga.js\n");

/***/ }),

/***/ "./web-server/js/slycat-projects-main.js":
/*!***********************************************!*\
  !*** ./web-server/js/slycat-projects-main.js ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($) {\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatServerRoot = __webpack_require__(/*! js/slycat-server-root */ \"./web-server/js/slycat-server-root.js\");\n\nvar _slycatServerRoot2 = _interopRequireDefault(_slycatServerRoot);\n\nvar _slycatWebClientWebpack = __webpack_require__(/*! js/slycat-web-client-webpack */ \"./web-server/js/slycat-web-client-webpack.js\");\n\nvar _slycatWebClientWebpack2 = _interopRequireDefault(_slycatWebClientWebpack);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _knockoutMapping = __webpack_require__(/*! knockout-mapping */ \"./node_modules/knockout-mapping/dist/knockout.mapping.js\");\n\nvar _knockoutMapping2 = _interopRequireDefault(_knockoutMapping);\n\n__webpack_require__(/*! js/slycat-navbar-webpack */ \"./web-server/js/slycat-navbar-webpack.js\");\n\nvar _slycatGa = __webpack_require__(/*! js/slycat-ga */ \"./web-server/js/slycat-ga.js\");\n\nvar _slycatGa2 = _interopRequireDefault(_slycatGa);\n\n__webpack_require__(/*! bootstrap */ \"./node_modules/bootstrap/dist/js/npm.js\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n\n  var page = {};\n  page.server_root = _slycatServerRoot2.default;\n  page.projects = _knockoutMapping2.default.fromJS([]);\n  _slycatWebClientWebpack2.default.get_projects({\n    success: function success(result) {\n      _knockoutMapping2.default.fromJS(result.projects, page.projects);\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project.\");\n    }\n  });\n  _knockout2.default.applyBindings(page, document.querySelector(\"html\"));\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1wcm9qZWN0cy1tYWluLmpzPzYyOWMiXSwibmFtZXMiOlsiJCIsImRvY3VtZW50IiwicmVhZHkiLCJwYWdlIiwic2VydmVyX3Jvb3QiLCJwcm9qZWN0cyIsIm1hcHBpbmciLCJmcm9tSlMiLCJjbGllbnQiLCJnZXRfcHJvamVjdHMiLCJzdWNjZXNzIiwicmVzdWx0IiwiZXJyb3IiLCJyZXF1ZXN0Iiwic3RhdHVzIiwicmVhc29uX3BocmFzZSIsImNvbnNvbGUiLCJsb2ciLCJrbyIsImFwcGx5QmluZGluZ3MiLCJxdWVyeVNlbGVjdG9yIl0sIm1hcHBpbmdzIjoiOztBQUtBOztBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBO0FBQ0FBLEVBQUVDLFFBQUYsRUFBWUMsS0FBWixDQUFrQixZQUFXOztBQUUzQixNQUFJQyxPQUFPLEVBQVg7QUFDQUEsT0FBS0MsV0FBTCxHQUFtQkEsMEJBQW5CO0FBQ0FELE9BQUtFLFFBQUwsR0FBZ0JDLDBCQUFRQyxNQUFSLENBQWUsRUFBZixDQUFoQjtBQUNBQyxtQ0FBT0MsWUFBUCxDQUFvQjtBQUNsQkMsYUFBUyxpQkFBU0MsTUFBVCxFQUFpQjtBQUN4QkwsZ0NBQVFDLE1BQVIsQ0FBZUksT0FBT04sUUFBdEIsRUFBZ0NGLEtBQUtFLFFBQXJDO0FBQ0QsS0FIaUI7QUFJbEJPLFdBQU8sZUFBU0MsT0FBVCxFQUFrQkMsTUFBbEIsRUFBMEJDLGFBQTFCLEVBQXlDO0FBQzlDQyxjQUFRQyxHQUFSLENBQVksNkJBQVo7QUFDRDtBQU5pQixHQUFwQjtBQVFBQyxxQkFBR0MsYUFBSCxDQUFpQmhCLElBQWpCLEVBQXVCRixTQUFTbUIsYUFBVCxDQUF1QixNQUF2QixDQUF2QjtBQUVELENBZkQsRSxDQWpCQTs7OztBQUlBLGdCIiwiZmlsZSI6Ii4vd2ViLXNlcnZlci9qcy9zbHljYXQtcHJvamVjdHMtbWFpbi5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAoYykgMjAxMywgMjAxOCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMgLiBVbmRlciB0aGUgdGVybXMgb2YgQ29udHJhY3RcbiBERS1OQTAwMDM1MjUgd2l0aCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMsIHRoZSBVLlMuIEdvdmVybm1lbnRcbiByZXRhaW5zIGNlcnRhaW4gcmlnaHRzIGluIHRoaXMgc29mdHdhcmUuICovXG5cbi8vIENTUyByZXNvdXJjZXNcbmltcG9ydCBcImNzcy9uYW1lc3BhY2VkLWJvb3RzdHJhcC5sZXNzXCI7XG5pbXBvcnQgXCJjc3Mvc2x5Y2F0LmNzc1wiO1xuXG5pbXBvcnQgc2VydmVyX3Jvb3QgZnJvbSAnanMvc2x5Y2F0LXNlcnZlci1yb290JztcbmltcG9ydCBjbGllbnQgZnJvbSAnanMvc2x5Y2F0LXdlYi1jbGllbnQtd2VicGFjayc7XG5pbXBvcnQga28gZnJvbSAna25vY2tvdXQnO1xuaW1wb3J0IG1hcHBpbmcgZnJvbSAna25vY2tvdXQtbWFwcGluZyc7XG5pbXBvcnQgXCJqcy9zbHljYXQtbmF2YmFyLXdlYnBhY2tcIjtcbmltcG9ydCBnYSBmcm9tIFwianMvc2x5Y2F0LWdhXCI7XG5pbXBvcnQgXCJib290c3RyYXBcIjtcblxuLy8gV2FpdCBmb3IgZG9jdW1lbnQgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuXG4gIHZhciBwYWdlID0ge31cbiAgcGFnZS5zZXJ2ZXJfcm9vdCA9IHNlcnZlcl9yb290O1xuICBwYWdlLnByb2plY3RzID0gbWFwcGluZy5mcm9tSlMoW10pO1xuICBjbGllbnQuZ2V0X3Byb2plY3RzKHtcbiAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIG1hcHBpbmcuZnJvbUpTKHJlc3VsdC5wcm9qZWN0cywgcGFnZS5wcm9qZWN0cyk7XG4gICAgfSxcbiAgICBlcnJvcjogZnVuY3Rpb24ocmVxdWVzdCwgc3RhdHVzLCByZWFzb25fcGhyYXNlKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIlVuYWJsZSB0byByZXRyaWV2ZSBwcm9qZWN0LlwiKTtcbiAgICB9XG4gIH0pO1xuICBrby5hcHBseUJpbmRpbmdzKHBhZ2UsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJodG1sXCIpKTtcblxufSk7Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./web-server/js/slycat-projects-main.js\n");

/***/ })

/******/ });