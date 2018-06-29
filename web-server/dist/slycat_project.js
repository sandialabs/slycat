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
/******/ 		"slycat_project": 0
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
/******/ 	deferredModules.push(["./web-server/js/slycat-project-main.js","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_run_command","vendors~slycat_model~slycat_page~slycat_project~slycat_projects","vendors~slycat_model~slycat_project~slycat_projects","vendors~slycat_project~slycat_projects","slycat_model~slycat_page~slycat_project~slycat_projects~ui_run_command","slycat_model~slycat_page~slycat_project~slycat_projects"]);
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

/***/ "./web-server/js/slycat-project-main.js":
/*!**********************************************!*\
  !*** ./web-server/js/slycat-project-main.js ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($) {\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatServerRoot = __webpack_require__(/*! js/slycat-server-root */ \"./web-server/js/slycat-server-root.js\");\n\nvar _slycatServerRoot2 = _interopRequireDefault(_slycatServerRoot);\n\nvar _slycatWebClient = __webpack_require__(/*! js/slycat-web-client */ \"./web-server/js/slycat-web-client.js\");\n\nvar _slycatWebClient2 = _interopRequireDefault(_slycatWebClient);\n\nvar _slycatMarkings = __webpack_require__(/*! js/slycat-markings */ \"./web-server/js/slycat-markings.js\");\n\nvar _slycatMarkings2 = _interopRequireDefault(_slycatMarkings);\n\nvar _slycatDialog = __webpack_require__(/*! js/slycat-dialog */ \"./web-server/js/slycat-dialog.js\");\n\nvar _slycatDialog2 = _interopRequireDefault(_slycatDialog);\n\nvar _slycatModelNames = __webpack_require__(/*! js/slycat-model-names */ \"./web-server/js/slycat-model-names.js\");\n\nvar _slycatModelNames2 = _interopRequireDefault(_slycatModelNames);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _knockoutMapping = __webpack_require__(/*! knockout-mapping */ \"./node_modules/knockout-mapping/dist/knockout.mapping.js\");\n\nvar _knockoutMapping2 = _interopRequireDefault(_knockoutMapping);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\n__webpack_require__(/*! js/slycat-navbar */ \"./web-server/js/slycat-navbar.js\");\n\nvar _slycatGa = __webpack_require__(/*! js/slycat-ga */ \"./web-server/js/slycat-ga.js\");\n\nvar _slycatGa2 = _interopRequireDefault(_slycatGa);\n\n__webpack_require__(/*! bootstrap */ \"./node_modules/bootstrap/dist/js/npm.js\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n\n  var page = {};\n  page.server_root = _slycatServerRoot2.default;\n  page.project_id = (0, _urijs2.default)(window.location).segment(-1);\n  page.project = _knockoutMapping2.default.fromJS({\n    _id: page.project_id,\n    name: \"\",\n    description: \"\",\n    created: \"\",\n    creator: \"\",\n    acl: { administrators: [], writers: [], readers: [] }\n  });\n  page.projects = _knockout2.default.observableArray();\n  _slycatWebClient2.default.get_project({\n    pid: page.project._id(),\n    success: function success(result) {\n      page.projects.push(_knockoutMapping2.default.fromJS(result));\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project.\");\n    }\n  });\n\n  page.title = _knockout2.default.pureComputed(function () {\n    var projects = page.projects();\n    return projects.length ? projects[0].name() + \" - Slycat Project\" : \"\";\n  });\n\n  page.models = _knockoutMapping2.default.fromJS([]);\n  _slycatWebClient2.default.get_project_models({\n    pid: page.project._id(),\n    success: function success(result) {\n      _knockoutMapping2.default.fromJS(result, page.models);\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project models.\");\n    }\n  });\n\n  page.markings = _slycatMarkings2.default.allowed;\n  page.badge = function (marking) {\n    for (var i = 0; i != page.markings().length; ++i) {\n      if (page.markings()[i].type() == marking) return page.markings()[i].badge();\n    }\n  };\n\n  var references = _knockoutMapping2.default.fromJS([]);\n\n  page.templates = references.filter(function (reference) {\n    return reference.bid() && !reference.mid();\n  }).map(function (reference) {\n    return {\n      _id: reference._id,\n      name: reference.name,\n      created: reference.created,\n      creator: reference.creator,\n      model_type: reference[\"model-type\"] ? reference[\"model-type\"]() : \"\"\n    };\n  });\n\n  page.model_names = _slycatModelNames2.default;\n\n  page.edit_template = function (reference) {};\n  page.delete_template = function (reference) {\n    _slycatDialog2.default.dialog({\n      title: \"Delete Template?\",\n      message: \"The template will be deleted immediately and there is no undo.  This will not affect any existing models.\",\n      buttons: [{ className: \"btn-default\", label: \"Cancel\" }, { className: \"btn-danger\", label: \"OK\" }],\n      callback: function callback(button) {\n        if (button.label != \"OK\") return;\n        _slycatWebClient2.default.delete_reference({\n          rid: reference._id(),\n          success: function success() {\n            page.update_references();\n          },\n          error: _slycatDialog2.default.ajax_error(\"Couldn't delete template.\")\n        });\n      }\n    });\n  };\n\n  page.update_references = function () {\n    _slycatWebClient2.default.get_project_references({\n      pid: page.project._id(),\n      success: function success(result) {\n        _knockoutMapping2.default.fromJS(result, references);\n      }\n    });\n  };\n\n  page.update_references();\n\n  _knockout2.default.applyBindings(page, document.querySelector(\"html\"));\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1wcm9qZWN0LW1haW4uanM/ZDJiOSJdLCJuYW1lcyI6WyIkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInBhZ2UiLCJzZXJ2ZXJfcm9vdCIsInByb2plY3RfaWQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlZ21lbnQiLCJwcm9qZWN0IiwibWFwcGluZyIsImZyb21KUyIsIl9pZCIsIm5hbWUiLCJkZXNjcmlwdGlvbiIsImNyZWF0ZWQiLCJjcmVhdG9yIiwiYWNsIiwiYWRtaW5pc3RyYXRvcnMiLCJ3cml0ZXJzIiwicmVhZGVycyIsInByb2plY3RzIiwia28iLCJvYnNlcnZhYmxlQXJyYXkiLCJjbGllbnQiLCJnZXRfcHJvamVjdCIsInBpZCIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJwdXNoIiwiZXJyb3IiLCJyZXF1ZXN0Iiwic3RhdHVzIiwicmVhc29uX3BocmFzZSIsImNvbnNvbGUiLCJsb2ciLCJ0aXRsZSIsInB1cmVDb21wdXRlZCIsImxlbmd0aCIsIm1vZGVscyIsImdldF9wcm9qZWN0X21vZGVscyIsIm1hcmtpbmdzIiwiYWxsb3dlZCIsImJhZGdlIiwibWFya2luZyIsImkiLCJ0eXBlIiwicmVmZXJlbmNlcyIsInRlbXBsYXRlcyIsImZpbHRlciIsInJlZmVyZW5jZSIsImJpZCIsIm1pZCIsIm1hcCIsIm1vZGVsX3R5cGUiLCJtb2RlbF9uYW1lcyIsImVkaXRfdGVtcGxhdGUiLCJkZWxldGVfdGVtcGxhdGUiLCJkaWFsb2ciLCJtZXNzYWdlIiwiYnV0dG9ucyIsImNsYXNzTmFtZSIsImxhYmVsIiwiY2FsbGJhY2siLCJidXR0b24iLCJkZWxldGVfcmVmZXJlbmNlIiwicmlkIiwidXBkYXRlX3JlZmVyZW5jZXMiLCJhamF4X2Vycm9yIiwiZ2V0X3Byb2plY3RfcmVmZXJlbmNlcyIsImFwcGx5QmluZGluZ3MiLCJxdWVyeVNlbGVjdG9yIl0sIm1hcHBpbmdzIjoiOztBQUtBOztBQUNBOztBQUVBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7OztBQUNBOzs7O0FBRUE7QUFDQUEsRUFBRUMsUUFBRixFQUFZQyxLQUFaLENBQWtCLFlBQVc7O0FBRTNCLE1BQUlDLE9BQU8sRUFBWDtBQUNBQSxPQUFLQyxXQUFMLEdBQW1CQSwwQkFBbkI7QUFDQUQsT0FBS0UsVUFBTCxHQUFrQixxQkFBSUMsT0FBT0MsUUFBWCxFQUFxQkMsT0FBckIsQ0FBNkIsQ0FBQyxDQUE5QixDQUFsQjtBQUNBTCxPQUFLTSxPQUFMLEdBQWVDLDBCQUFRQyxNQUFSLENBQWU7QUFDNUJDLFNBQUtULEtBQUtFLFVBRGtCO0FBRTVCUSxVQUFNLEVBRnNCO0FBRzVCQyxpQkFBYSxFQUhlO0FBSTVCQyxhQUFTLEVBSm1CO0FBSzVCQyxhQUFTLEVBTG1CO0FBTTVCQyxTQUFJLEVBQUNDLGdCQUFlLEVBQWhCLEVBQW1CQyxTQUFRLEVBQTNCLEVBQThCQyxTQUFRLEVBQXRDO0FBTndCLEdBQWYsQ0FBZjtBQVFBakIsT0FBS2tCLFFBQUwsR0FBZ0JDLG1CQUFHQyxlQUFILEVBQWhCO0FBQ0FDLDRCQUFPQyxXQUFQLENBQW1CO0FBQ2pCQyxTQUFLdkIsS0FBS00sT0FBTCxDQUFhRyxHQUFiLEVBRFk7QUFFakJlLGFBQVMsaUJBQVNDLE1BQVQsRUFBaUI7QUFDeEJ6QixXQUFLa0IsUUFBTCxDQUFjUSxJQUFkLENBQW1CbkIsMEJBQVFDLE1BQVIsQ0FBZWlCLE1BQWYsQ0FBbkI7QUFDRCxLQUpnQjtBQUtqQkUsV0FBTyxlQUFTQyxPQUFULEVBQWtCQyxNQUFsQixFQUEwQkMsYUFBMUIsRUFBeUM7QUFDOUNDLGNBQVFDLEdBQVIsQ0FBWSw2QkFBWjtBQUNEO0FBUGdCLEdBQW5COztBQVVBaEMsT0FBS2lDLEtBQUwsR0FBYWQsbUJBQUdlLFlBQUgsQ0FBZ0IsWUFDN0I7QUFDRSxRQUFJaEIsV0FBV2xCLEtBQUtrQixRQUFMLEVBQWY7QUFDQSxXQUFPQSxTQUFTaUIsTUFBVCxHQUFrQmpCLFNBQVMsQ0FBVCxFQUFZUixJQUFaLEtBQXFCLG1CQUF2QyxHQUE2RCxFQUFwRTtBQUNELEdBSlksQ0FBYjs7QUFNQVYsT0FBS29DLE1BQUwsR0FBYzdCLDBCQUFRQyxNQUFSLENBQWUsRUFBZixDQUFkO0FBQ0FhLDRCQUFPZ0Isa0JBQVAsQ0FBMEI7QUFDeEJkLFNBQUt2QixLQUFLTSxPQUFMLENBQWFHLEdBQWIsRUFEbUI7QUFFeEJlLGFBQVMsaUJBQVNDLE1BQVQsRUFBaUI7QUFDeEJsQixnQ0FBUUMsTUFBUixDQUFlaUIsTUFBZixFQUF1QnpCLEtBQUtvQyxNQUE1QjtBQUNELEtBSnVCO0FBS3hCVCxXQUFPLGVBQVNDLE9BQVQsRUFBa0JDLE1BQWxCLEVBQTBCQyxhQUExQixFQUF5QztBQUM5Q0MsY0FBUUMsR0FBUixDQUFZLG9DQUFaO0FBQ0Q7QUFQdUIsR0FBMUI7O0FBVUFoQyxPQUFLc0MsUUFBTCxHQUFnQkEseUJBQVNDLE9BQXpCO0FBQ0F2QyxPQUFLd0MsS0FBTCxHQUFhLFVBQVNDLE9BQVQsRUFDYjtBQUNFLFNBQUksSUFBSUMsSUFBSSxDQUFaLEVBQWVBLEtBQUsxQyxLQUFLc0MsUUFBTCxHQUFnQkgsTUFBcEMsRUFBNEMsRUFBRU8sQ0FBOUMsRUFDQTtBQUNFLFVBQUcxQyxLQUFLc0MsUUFBTCxHQUFnQkksQ0FBaEIsRUFBbUJDLElBQW5CLE1BQTZCRixPQUFoQyxFQUNFLE9BQU96QyxLQUFLc0MsUUFBTCxHQUFnQkksQ0FBaEIsRUFBbUJGLEtBQW5CLEVBQVA7QUFDSDtBQUNGLEdBUEQ7O0FBU0EsTUFBSUksYUFBYXJDLDBCQUFRQyxNQUFSLENBQWUsRUFBZixDQUFqQjs7QUFFQVIsT0FBSzZDLFNBQUwsR0FBaUJELFdBQVdFLE1BQVgsQ0FBa0IsVUFBU0MsU0FBVCxFQUNuQztBQUNFLFdBQU9BLFVBQVVDLEdBQVYsTUFBbUIsQ0FBQ0QsVUFBVUUsR0FBVixFQUEzQjtBQUNELEdBSGdCLEVBR2RDLEdBSGMsQ0FHVixVQUFTSCxTQUFULEVBQ1A7QUFDRSxXQUFPO0FBQ0x0QyxXQUFLc0MsVUFBVXRDLEdBRFY7QUFFTEMsWUFBTXFDLFVBQVVyQyxJQUZYO0FBR0xFLGVBQVNtQyxVQUFVbkMsT0FIZDtBQUlMQyxlQUFTa0MsVUFBVWxDLE9BSmQ7QUFLTHNDLGtCQUFZSixVQUFVLFlBQVYsSUFBMEJBLFVBQVUsWUFBVixHQUExQixHQUFzRDtBQUw3RCxLQUFQO0FBT0QsR0FaZ0IsQ0FBakI7O0FBY0EvQyxPQUFLb0QsV0FBTCxHQUFtQkEsMEJBQW5COztBQUVBcEQsT0FBS3FELGFBQUwsR0FBcUIsVUFBU04sU0FBVCxFQUNyQixDQUNDLENBRkQ7QUFHQS9DLE9BQUtzRCxlQUFMLEdBQXVCLFVBQVNQLFNBQVQsRUFDdkI7QUFDRVEsMkJBQU9BLE1BQVAsQ0FDQTtBQUNFdEIsYUFBTyxrQkFEVDtBQUVFdUIsZUFBUywyR0FGWDtBQUdFQyxlQUFTLENBQUMsRUFBQ0MsV0FBVyxhQUFaLEVBQTJCQyxPQUFNLFFBQWpDLEVBQUQsRUFBNkMsRUFBQ0QsV0FBVyxZQUFaLEVBQXlCQyxPQUFNLElBQS9CLEVBQTdDLENBSFg7QUFJRUMsZ0JBQVUsa0JBQVNDLE1BQVQsRUFDVjtBQUNFLFlBQUdBLE9BQU9GLEtBQVAsSUFBZ0IsSUFBbkIsRUFDRTtBQUNGdEMsa0NBQU95QyxnQkFBUCxDQUNBO0FBQ0VDLGVBQUtoQixVQUFVdEMsR0FBVixFQURQO0FBRUVlLG1CQUFTLG1CQUNUO0FBQ0V4QixpQkFBS2dFLGlCQUFMO0FBQ0QsV0FMSDtBQU1FckMsaUJBQU80Qix1QkFBT1UsVUFBUCxDQUFrQiwyQkFBbEI7QUFOVCxTQURBO0FBU0Q7QUFqQkgsS0FEQTtBQW9CRCxHQXRCRDs7QUF3QkFqRSxPQUFLZ0UsaUJBQUwsR0FBeUIsWUFDekI7QUFDRTNDLDhCQUFPNkMsc0JBQVAsQ0FDQTtBQUNFM0MsV0FBS3ZCLEtBQUtNLE9BQUwsQ0FBYUcsR0FBYixFQURQO0FBRUVlLGVBQVMsaUJBQVNDLE1BQVQsRUFDVDtBQUNFbEIsa0NBQVFDLE1BQVIsQ0FBZWlCLE1BQWYsRUFBdUJtQixVQUF2QjtBQUNEO0FBTEgsS0FEQTtBQVFELEdBVkQ7O0FBWUE1QyxPQUFLZ0UsaUJBQUw7O0FBRUE3QyxxQkFBR2dELGFBQUgsQ0FBaUJuRSxJQUFqQixFQUF1QkYsU0FBU3NFLGFBQVQsQ0FBdUIsTUFBdkIsQ0FBdkI7QUFFRCxDQWhIRCxFLENBckJBOzs7O0FBSUEsZ0IiLCJmaWxlIjoiLi93ZWItc2VydmVyL2pzL3NseWNhdC1wcm9qZWN0LW1haW4uanMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBDb3B5cmlnaHQgKGMpIDIwMTMsIDIwMTggTmF0aW9uYWwgVGVjaG5vbG9neSBhbmQgRW5naW5lZXJpbmcgU29sdXRpb25zIG9mIFNhbmRpYSwgTExDIC4gVW5kZXIgdGhlIHRlcm1zIG9mIENvbnRyYWN0XG4gREUtTkEwMDAzNTI1IHdpdGggTmF0aW9uYWwgVGVjaG5vbG9neSBhbmQgRW5naW5lZXJpbmcgU29sdXRpb25zIG9mIFNhbmRpYSwgTExDLCB0aGUgVS5TLiBHb3Zlcm5tZW50XG4gcmV0YWlucyBjZXJ0YWluIHJpZ2h0cyBpbiB0aGlzIHNvZnR3YXJlLiAqL1xuXG4vLyBDU1MgcmVzb3VyY2VzXG5pbXBvcnQgXCJjc3MvbmFtZXNwYWNlZC1ib290c3RyYXAubGVzc1wiO1xuaW1wb3J0IFwiY3NzL3NseWNhdC5jc3NcIjtcblxuaW1wb3J0IHNlcnZlcl9yb290IGZyb20gJ2pzL3NseWNhdC1zZXJ2ZXItcm9vdCc7XG5pbXBvcnQgY2xpZW50IGZyb20gJ2pzL3NseWNhdC13ZWItY2xpZW50JztcbmltcG9ydCBtYXJraW5ncyBmcm9tICdqcy9zbHljYXQtbWFya2luZ3MnO1xuaW1wb3J0IGRpYWxvZyBmcm9tICdqcy9zbHljYXQtZGlhbG9nJztcbmltcG9ydCBtb2RlbF9uYW1lcyBmcm9tICdqcy9zbHljYXQtbW9kZWwtbmFtZXMnO1xuaW1wb3J0IGtvIGZyb20gJ2tub2Nrb3V0JztcbmltcG9ydCBtYXBwaW5nIGZyb20gJ2tub2Nrb3V0LW1hcHBpbmcnO1xuaW1wb3J0IFVSSSBmcm9tICd1cmlqcyc7XG5pbXBvcnQgXCJqcy9zbHljYXQtbmF2YmFyXCI7XG5pbXBvcnQgZ2EgZnJvbSBcImpzL3NseWNhdC1nYVwiO1xuaW1wb3J0IFwiYm9vdHN0cmFwXCI7XG5cbi8vIFdhaXQgZm9yIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuICB2YXIgcGFnZSA9IHt9O1xuICBwYWdlLnNlcnZlcl9yb290ID0gc2VydmVyX3Jvb3Q7XG4gIHBhZ2UucHJvamVjdF9pZCA9IFVSSSh3aW5kb3cubG9jYXRpb24pLnNlZ21lbnQoLTEpO1xuICBwYWdlLnByb2plY3QgPSBtYXBwaW5nLmZyb21KUyh7XG4gICAgX2lkOiBwYWdlLnByb2plY3RfaWQsIFxuICAgIG5hbWU6IFwiXCIsIFxuICAgIGRlc2NyaXB0aW9uOiBcIlwiLFxuICAgIGNyZWF0ZWQ6IFwiXCIsXG4gICAgY3JlYXRvcjogXCJcIixcbiAgICBhY2w6e2FkbWluaXN0cmF0b3JzOltdLHdyaXRlcnM6W10scmVhZGVyczpbXX1cbiAgfSk7XG4gIHBhZ2UucHJvamVjdHMgPSBrby5vYnNlcnZhYmxlQXJyYXkoKTtcbiAgY2xpZW50LmdldF9wcm9qZWN0KHtcbiAgICBwaWQ6IHBhZ2UucHJvamVjdC5faWQoKSxcbiAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIHBhZ2UucHJvamVjdHMucHVzaChtYXBwaW5nLmZyb21KUyhyZXN1bHQpKTtcbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbihyZXF1ZXN0LCBzdGF0dXMsIHJlYXNvbl9waHJhc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiVW5hYmxlIHRvIHJldHJpZXZlIHByb2plY3QuXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGFnZS50aXRsZSA9IGtvLnB1cmVDb21wdXRlZChmdW5jdGlvbigpXG4gIHtcbiAgICB2YXIgcHJvamVjdHMgPSBwYWdlLnByb2plY3RzKCk7XG4gICAgcmV0dXJuIHByb2plY3RzLmxlbmd0aCA/IHByb2plY3RzWzBdLm5hbWUoKSArIFwiIC0gU2x5Y2F0IFByb2plY3RcIiA6IFwiXCI7XG4gIH0pO1xuXG4gIHBhZ2UubW9kZWxzID0gbWFwcGluZy5mcm9tSlMoW10pO1xuICBjbGllbnQuZ2V0X3Byb2plY3RfbW9kZWxzKHtcbiAgICBwaWQ6IHBhZ2UucHJvamVjdC5faWQoKSxcbiAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpIHtcbiAgICAgIG1hcHBpbmcuZnJvbUpTKHJlc3VsdCwgcGFnZS5tb2RlbHMpO1xuICAgIH0sXG4gICAgZXJyb3I6IGZ1bmN0aW9uKHJlcXVlc3QsIHN0YXR1cywgcmVhc29uX3BocmFzZSkge1xuICAgICAgY29uc29sZS5sb2coXCJVbmFibGUgdG8gcmV0cmlldmUgcHJvamVjdCBtb2RlbHMuXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgcGFnZS5tYXJraW5ncyA9IG1hcmtpbmdzLmFsbG93ZWQ7XG4gIHBhZ2UuYmFkZ2UgPSBmdW5jdGlvbihtYXJraW5nKVxuICB7XG4gICAgZm9yKHZhciBpID0gMDsgaSAhPSBwYWdlLm1hcmtpbmdzKCkubGVuZ3RoOyArK2kpXG4gICAge1xuICAgICAgaWYocGFnZS5tYXJraW5ncygpW2ldLnR5cGUoKSA9PSBtYXJraW5nKVxuICAgICAgICByZXR1cm4gcGFnZS5tYXJraW5ncygpW2ldLmJhZGdlKCk7XG4gICAgfVxuICB9XG5cbiAgdmFyIHJlZmVyZW5jZXMgPSBtYXBwaW5nLmZyb21KUyhbXSk7XG5cbiAgcGFnZS50ZW1wbGF0ZXMgPSByZWZlcmVuY2VzLmZpbHRlcihmdW5jdGlvbihyZWZlcmVuY2UpXG4gIHtcbiAgICByZXR1cm4gcmVmZXJlbmNlLmJpZCgpICYmICFyZWZlcmVuY2UubWlkKCk7XG4gIH0pLm1hcChmdW5jdGlvbihyZWZlcmVuY2UpXG4gIHtcbiAgICByZXR1cm4ge1xuICAgICAgX2lkOiByZWZlcmVuY2UuX2lkLFxuICAgICAgbmFtZTogcmVmZXJlbmNlLm5hbWUsXG4gICAgICBjcmVhdGVkOiByZWZlcmVuY2UuY3JlYXRlZCxcbiAgICAgIGNyZWF0b3I6IHJlZmVyZW5jZS5jcmVhdG9yLFxuICAgICAgbW9kZWxfdHlwZTogcmVmZXJlbmNlW1wibW9kZWwtdHlwZVwiXSA/IHJlZmVyZW5jZVtcIm1vZGVsLXR5cGVcIl0oKSA6IFwiXCIsXG4gICAgfTtcbiAgfSk7XG4gIFxuICBwYWdlLm1vZGVsX25hbWVzID0gbW9kZWxfbmFtZXM7XG4gIFxuICBwYWdlLmVkaXRfdGVtcGxhdGUgPSBmdW5jdGlvbihyZWZlcmVuY2UpXG4gIHtcbiAgfVxuICBwYWdlLmRlbGV0ZV90ZW1wbGF0ZSA9IGZ1bmN0aW9uKHJlZmVyZW5jZSlcbiAge1xuICAgIGRpYWxvZy5kaWFsb2coXG4gICAge1xuICAgICAgdGl0bGU6IFwiRGVsZXRlIFRlbXBsYXRlP1wiLFxuICAgICAgbWVzc2FnZTogXCJUaGUgdGVtcGxhdGUgd2lsbCBiZSBkZWxldGVkIGltbWVkaWF0ZWx5IGFuZCB0aGVyZSBpcyBubyB1bmRvLiAgVGhpcyB3aWxsIG5vdCBhZmZlY3QgYW55IGV4aXN0aW5nIG1vZGVscy5cIixcbiAgICAgIGJ1dHRvbnM6IFt7Y2xhc3NOYW1lOiBcImJ0bi1kZWZhdWx0XCIsIGxhYmVsOlwiQ2FuY2VsXCJ9LCB7Y2xhc3NOYW1lOiBcImJ0bi1kYW5nZXJcIixsYWJlbDpcIk9LXCJ9XSxcbiAgICAgIGNhbGxiYWNrOiBmdW5jdGlvbihidXR0b24pXG4gICAgICB7XG4gICAgICAgIGlmKGJ1dHRvbi5sYWJlbCAhPSBcIk9LXCIpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBjbGllbnQuZGVsZXRlX3JlZmVyZW5jZShcbiAgICAgICAge1xuICAgICAgICAgIHJpZDogcmVmZXJlbmNlLl9pZCgpLFxuICAgICAgICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKClcbiAgICAgICAgICB7XG4gICAgICAgICAgICBwYWdlLnVwZGF0ZV9yZWZlcmVuY2VzKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBlcnJvcjogZGlhbG9nLmFqYXhfZXJyb3IoXCJDb3VsZG4ndCBkZWxldGUgdGVtcGxhdGUuXCIpLFxuICAgICAgICB9KTtcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICBwYWdlLnVwZGF0ZV9yZWZlcmVuY2VzID0gZnVuY3Rpb24oKVxuICB7XG4gICAgY2xpZW50LmdldF9wcm9qZWN0X3JlZmVyZW5jZXMoXG4gICAge1xuICAgICAgcGlkOiBwYWdlLnByb2plY3QuX2lkKCksXG4gICAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpXG4gICAgICB7XG4gICAgICAgIG1hcHBpbmcuZnJvbUpTKHJlc3VsdCwgcmVmZXJlbmNlcyk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwYWdlLnVwZGF0ZV9yZWZlcmVuY2VzKCk7XG5cbiAga28uYXBwbHlCaW5kaW5ncyhwYWdlLCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaHRtbFwiKSk7XG5cbn0pO1xuIl0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./web-server/js/slycat-project-main.js\n");

/***/ })

/******/ });