/******/ (function(modules) { // webpackBootstrap
/******/ 	// install a JSONP callback for chunk loading
/******/ 	function webpackJsonpCallback(data) {
/******/ 		var chunkIds = data[0];
/******/ 		var moreModules = data[1];
/******/ 		var executeModules = data[2];
/******/
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
/******/
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
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
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
/******/ 	deferredModules.push(["./web-server/js/slycat-projects-main.js","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_run_command","vendors~slycat_model~slycat_page~slycat_project~slycat_projects","vendors~slycat_model~slycat_project~slycat_projects","vendors~slycat_project~slycat_projects","slycat_model~slycat_page~slycat_project~slycat_projects~ui_run_command","slycat_model~slycat_page~slycat_project~slycat_projects"]);
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
eval("/* WEBPACK VAR INJECTION */(function($) {\n\nvar _slycatWebClient = __webpack_require__(/*! js/slycat-web-client */ \"./web-server/js/slycat-web-client.js\");\n\nvar _slycatWebClient2 = _interopRequireDefault(_slycatWebClient);\n\nvar _reactGa = __webpack_require__(/*! react-ga */ \"./node_modules/react-ga/dist/react-ga.js\");\n\nvar _reactGa2 = _interopRequireDefault(_reactGa);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n retains certain rights in this software. */\n\n$(document).ready(function () {\n\n  _slycatWebClient2.default.get_configuration_ga_tracking_id({\n    success: function success(id) {\n      // Initialize Google Analytics only if we have an ID that isn't empty or whitespace.\n      // When ga-tracking-id is not set in web-server-config.ini, it returns \"\" as the id.\n      if (id.trim() != \"\") {\n        _reactGa2.default.initialize(id);\n      }\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve Google Analytics tracking id.\");\n    }\n  });\n});\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1nYS5qcz8zZmE3Il0sIm5hbWVzIjpbIiQiLCJkb2N1bWVudCIsInJlYWR5IiwiY2xpZW50IiwiZ2V0X2NvbmZpZ3VyYXRpb25fZ2FfdHJhY2tpbmdfaWQiLCJzdWNjZXNzIiwiaWQiLCJ0cmltIiwiUmVhY3RHQSIsImluaXRpYWxpemUiLCJlcnJvciIsInJlcXVlc3QiLCJzdGF0dXMiLCJyZWFzb25fcGhyYXNlIiwiY29uc29sZSIsImxvZyJdLCJtYXBwaW5ncyI6Ijs7QUFJQTs7OztBQUNBOzs7Ozs7QUFMQTs7OztBQU9BQSxFQUFFQyxRQUFGLEVBQVlDLEtBQVosQ0FBa0IsWUFBVzs7QUFFM0JDLDRCQUFPQyxnQ0FBUCxDQUF3QztBQUN0Q0MsYUFBUyxpQkFBU0MsRUFBVCxFQUFhO0FBQ3BCO0FBQ0E7QUFDQSxVQUFHQSxHQUFHQyxJQUFILE1BQWEsRUFBaEIsRUFDQTtBQUNFQywwQkFBUUMsVUFBUixDQUFtQkgsRUFBbkI7QUFDRDtBQUNGLEtBUnFDO0FBU3RDSSxXQUFPLGVBQVNDLE9BQVQsRUFBa0JDLE1BQWxCLEVBQTBCQyxhQUExQixFQUF5QztBQUM5Q0MsY0FBUUMsR0FBUixDQUFZLGtEQUFaO0FBQ0Q7QUFYcUMsR0FBeEM7QUFhRCxDQWZELEUiLCJmaWxlIjoiLi93ZWItc2VydmVyL2pzL3NseWNhdC1nYS5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAoYykgMjAxMywgMjAxOCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMgLiBVbmRlciB0aGUgdGVybXMgb2YgQ29udHJhY3RcbiBERS1OQTAwMDM1MjUgd2l0aCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMsIHRoZSBVLlMuIEdvdmVybm1lbnRcbiByZXRhaW5zIGNlcnRhaW4gcmlnaHRzIGluIHRoaXMgc29mdHdhcmUuICovXG5cbmltcG9ydCBjbGllbnQgZnJvbSAnanMvc2x5Y2F0LXdlYi1jbGllbnQnO1xuaW1wb3J0IFJlYWN0R0EgZnJvbSAncmVhY3QtZ2EnO1xuXG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuICBjbGllbnQuZ2V0X2NvbmZpZ3VyYXRpb25fZ2FfdHJhY2tpbmdfaWQoe1xuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKGlkKSB7XG4gICAgICAvLyBJbml0aWFsaXplIEdvb2dsZSBBbmFseXRpY3Mgb25seSBpZiB3ZSBoYXZlIGFuIElEIHRoYXQgaXNuJ3QgZW1wdHkgb3Igd2hpdGVzcGFjZS5cbiAgICAgIC8vIFdoZW4gZ2EtdHJhY2tpbmctaWQgaXMgbm90IHNldCBpbiB3ZWItc2VydmVyLWNvbmZpZy5pbmksIGl0IHJldHVybnMgXCJcIiBhcyB0aGUgaWQuXG4gICAgICBpZihpZC50cmltKCkgIT0gXCJcIilcbiAgICAgIHtcbiAgICAgICAgUmVhY3RHQS5pbml0aWFsaXplKGlkKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbihyZXF1ZXN0LCBzdGF0dXMsIHJlYXNvbl9waHJhc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiVW5hYmxlIHRvIHJldHJpZXZlIEdvb2dsZSBBbmFseXRpY3MgdHJhY2tpbmcgaWQuXCIpO1xuICAgIH1cbiAgfSk7XG59KTsiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./web-server/js/slycat-ga.js\n");

/***/ }),

/***/ "./web-server/js/slycat-projects-main.js":
/*!***********************************************!*\
  !*** ./web-server/js/slycat-projects-main.js ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($) {\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatServerRoot = __webpack_require__(/*! js/slycat-server-root */ \"./web-server/js/slycat-server-root.js\");\n\nvar _slycatServerRoot2 = _interopRequireDefault(_slycatServerRoot);\n\nvar _slycatWebClient = __webpack_require__(/*! js/slycat-web-client */ \"./web-server/js/slycat-web-client.js\");\n\nvar _slycatWebClient2 = _interopRequireDefault(_slycatWebClient);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _knockoutMapping = __webpack_require__(/*! knockout-mapping */ \"./node_modules/knockout-mapping/dist/knockout.mapping.js\");\n\nvar _knockoutMapping2 = _interopRequireDefault(_knockoutMapping);\n\n__webpack_require__(/*! js/slycat-navbar */ \"./web-server/js/slycat-navbar.js\");\n\nvar _slycatGa = __webpack_require__(/*! js/slycat-ga */ \"./web-server/js/slycat-ga.js\");\n\nvar _slycatGa2 = _interopRequireDefault(_slycatGa);\n\n__webpack_require__(/*! bootstrap */ \"./node_modules/bootstrap/dist/js/npm.js\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n\n  var page = {};\n  page.server_root = _slycatServerRoot2.default;\n  page.projects = _knockoutMapping2.default.fromJS([]);\n  _slycatWebClient2.default.get_projects({\n    success: function success(result) {\n      _knockoutMapping2.default.fromJS(result.projects, page.projects);\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project.\");\n    }\n  });\n  _knockout2.default.applyBindings(page, document.querySelector(\"html\"));\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1wcm9qZWN0cy1tYWluLmpzPzYyOWMiXSwibmFtZXMiOlsiJCIsImRvY3VtZW50IiwicmVhZHkiLCJwYWdlIiwic2VydmVyX3Jvb3QiLCJwcm9qZWN0cyIsIm1hcHBpbmciLCJmcm9tSlMiLCJjbGllbnQiLCJnZXRfcHJvamVjdHMiLCJzdWNjZXNzIiwicmVzdWx0IiwiZXJyb3IiLCJyZXF1ZXN0Iiwic3RhdHVzIiwicmVhc29uX3BocmFzZSIsImNvbnNvbGUiLCJsb2ciLCJrbyIsImFwcGx5QmluZGluZ3MiLCJxdWVyeVNlbGVjdG9yIl0sIm1hcHBpbmdzIjoiOztBQUtBOztBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7QUFDQTs7OztBQUVBO0FBQ0FBLEVBQUVDLFFBQUYsRUFBWUMsS0FBWixDQUFrQixZQUFXOztBQUUzQixNQUFJQyxPQUFPLEVBQVg7QUFDQUEsT0FBS0MsV0FBTCxHQUFtQkEsMEJBQW5CO0FBQ0FELE9BQUtFLFFBQUwsR0FBZ0JDLDBCQUFRQyxNQUFSLENBQWUsRUFBZixDQUFoQjtBQUNBQyw0QkFBT0MsWUFBUCxDQUFvQjtBQUNsQkMsYUFBUyxpQkFBU0MsTUFBVCxFQUFpQjtBQUN4QkwsZ0NBQVFDLE1BQVIsQ0FBZUksT0FBT04sUUFBdEIsRUFBZ0NGLEtBQUtFLFFBQXJDO0FBQ0QsS0FIaUI7QUFJbEJPLFdBQU8sZUFBU0MsT0FBVCxFQUFrQkMsTUFBbEIsRUFBMEJDLGFBQTFCLEVBQXlDO0FBQzlDQyxjQUFRQyxHQUFSLENBQVksNkJBQVo7QUFDRDtBQU5pQixHQUFwQjtBQVFBQyxxQkFBR0MsYUFBSCxDQUFpQmhCLElBQWpCLEVBQXVCRixTQUFTbUIsYUFBVCxDQUF1QixNQUF2QixDQUF2QjtBQUVELENBZkQsRSxDQWpCQTs7OztBQUlBLGdCIiwiZmlsZSI6Ii4vd2ViLXNlcnZlci9qcy9zbHljYXQtcHJvamVjdHMtbWFpbi5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAoYykgMjAxMywgMjAxOCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMgLiBVbmRlciB0aGUgdGVybXMgb2YgQ29udHJhY3RcbiBERS1OQTAwMDM1MjUgd2l0aCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMsIHRoZSBVLlMuIEdvdmVybm1lbnRcbiByZXRhaW5zIGNlcnRhaW4gcmlnaHRzIGluIHRoaXMgc29mdHdhcmUuICovXG5cbi8vIENTUyByZXNvdXJjZXNcbmltcG9ydCBcImNzcy9uYW1lc3BhY2VkLWJvb3RzdHJhcC5sZXNzXCI7XG5pbXBvcnQgXCJjc3Mvc2x5Y2F0LmNzc1wiO1xuXG5pbXBvcnQgc2VydmVyX3Jvb3QgZnJvbSAnanMvc2x5Y2F0LXNlcnZlci1yb290JztcbmltcG9ydCBjbGllbnQgZnJvbSAnanMvc2x5Y2F0LXdlYi1jbGllbnQnO1xuaW1wb3J0IGtvIGZyb20gJ2tub2Nrb3V0JztcbmltcG9ydCBtYXBwaW5nIGZyb20gJ2tub2Nrb3V0LW1hcHBpbmcnO1xuaW1wb3J0IFwianMvc2x5Y2F0LW5hdmJhclwiO1xuaW1wb3J0IGdhIGZyb20gXCJqcy9zbHljYXQtZ2FcIjtcbmltcG9ydCBcImJvb3RzdHJhcFwiO1xuXG4vLyBXYWl0IGZvciBkb2N1bWVudCByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG5cbiAgdmFyIHBhZ2UgPSB7fVxuICBwYWdlLnNlcnZlcl9yb290ID0gc2VydmVyX3Jvb3Q7XG4gIHBhZ2UucHJvamVjdHMgPSBtYXBwaW5nLmZyb21KUyhbXSk7XG4gIGNsaWVudC5nZXRfcHJvamVjdHMoe1xuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgbWFwcGluZy5mcm9tSlMocmVzdWx0LnByb2plY3RzLCBwYWdlLnByb2plY3RzKTtcbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbihyZXF1ZXN0LCBzdGF0dXMsIHJlYXNvbl9waHJhc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiVW5hYmxlIHRvIHJldHJpZXZlIHByb2plY3QuXCIpO1xuICAgIH1cbiAgfSk7XG4gIGtvLmFwcGx5QmluZGluZ3MocGFnZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImh0bWxcIikpO1xuXG59KTsiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./web-server/js/slycat-projects-main.js\n");

/***/ })

/******/ });