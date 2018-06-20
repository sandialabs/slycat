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
/******/ 	deferredModules.push(["./web-server/js/slycat-project-main.js","vendors~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_ru~29e28113","vendors~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_ti~7afcd8b9","slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_run_comman~247387c4","slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_timeseries"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ "./web-server/js/slycat-project-main.js":
/*!**********************************************!*\
  !*** ./web-server/js/slycat-project-main.js ***!
  \**********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($) {\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatServerRoot = __webpack_require__(/*! js/slycat-server-root */ \"./web-server/js/slycat-server-root.js\");\n\nvar _slycatServerRoot2 = _interopRequireDefault(_slycatServerRoot);\n\nvar _slycatWebClientWebpack = __webpack_require__(/*! js/slycat-web-client-webpack */ \"./web-server/js/slycat-web-client-webpack.js\");\n\nvar _slycatWebClientWebpack2 = _interopRequireDefault(_slycatWebClientWebpack);\n\nvar _slycatMarkingsWebpack = __webpack_require__(/*! js/slycat-markings-webpack */ \"./web-server/js/slycat-markings-webpack.js\");\n\nvar _slycatMarkingsWebpack2 = _interopRequireDefault(_slycatMarkingsWebpack);\n\nvar _slycatDialogWebpack = __webpack_require__(/*! js/slycat-dialog-webpack */ \"./web-server/js/slycat-dialog-webpack.js\");\n\nvar _slycatDialogWebpack2 = _interopRequireDefault(_slycatDialogWebpack);\n\nvar _slycatModelNamesWebpack = __webpack_require__(/*! js/slycat-model-names-webpack */ \"./web-server/js/slycat-model-names-webpack.js\");\n\nvar _slycatModelNamesWebpack2 = _interopRequireDefault(_slycatModelNamesWebpack);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _knockoutMapping = __webpack_require__(/*! knockout-mapping */ \"./node_modules/knockout-mapping/dist/knockout.mapping.js\");\n\nvar _knockoutMapping2 = _interopRequireDefault(_knockoutMapping);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\n__webpack_require__(/*! js/slycat-navbar-webpack */ \"./web-server/js/slycat-navbar-webpack.js\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n\n  var page = {};\n  page.server_root = _slycatServerRoot2.default;\n  page.project = _knockoutMapping2.default.fromJS({\n    _id: (0, _urijs2.default)(window.location).segment(-1),\n    name: \"\",\n    description: \"\",\n    created: \"\",\n    creator: \"\",\n    acl: { administrators: [], writers: [], readers: [] }\n  });\n  page.projects = _knockout2.default.observableArray();\n  _slycatWebClientWebpack2.default.get_project({\n    pid: page.project._id(),\n    success: function success(result) {\n      page.projects.push(_knockoutMapping2.default.fromJS(result));\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project.\");\n    }\n  });\n\n  page.title = _knockout2.default.pureComputed(function () {\n    var projects = page.projects();\n    return projects.length ? projects[0].name() + \" - Slycat Project\" : \"\";\n  });\n\n  page.models = _knockoutMapping2.default.fromJS([]);\n  _slycatWebClientWebpack2.default.get_project_models({\n    pid: page.project._id(),\n    success: function success(result) {\n      _knockoutMapping2.default.fromJS(result, page.models);\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project models.\");\n    }\n  });\n\n  page.markings = _slycatMarkingsWebpack2.default.allowed;\n  page.badge = function (marking) {\n    for (var i = 0; i != page.markings().length; ++i) {\n      if (page.markings()[i].type() == marking) return page.markings()[i].badge();\n    }\n  };\n\n  var references = _knockoutMapping2.default.fromJS([]);\n\n  page.templates = references.filter(function (reference) {\n    return reference.bid() && !reference.mid();\n  }).map(function (reference) {\n    return {\n      _id: reference._id,\n      name: reference.name,\n      created: reference.created,\n      creator: reference.creator,\n      model_type: reference[\"model-type\"] ? reference[\"model-type\"]() : \"\"\n    };\n  });\n\n  page.model_names = _slycatModelNamesWebpack2.default;\n\n  page.edit_template = function (reference) {};\n  page.delete_template = function (reference) {\n    _slycatDialogWebpack2.default.dialog({\n      title: \"Delete Template?\",\n      message: \"The template will be deleted immediately and there is no undo.  This will not affect any existing models.\",\n      buttons: [{ className: \"btn-default\", label: \"Cancel\" }, { className: \"btn-danger\", label: \"OK\" }],\n      callback: function callback(button) {\n        if (button.label != \"OK\") return;\n        _slycatWebClientWebpack2.default.delete_reference({\n          rid: reference._id(),\n          success: function success() {\n            page.update_references();\n          },\n          error: _slycatDialogWebpack2.default.ajax_error(\"Couldn't delete template.\")\n        });\n      }\n    });\n  };\n\n  page.update_references = function () {\n    _slycatWebClientWebpack2.default.get_project_references({\n      pid: page.project._id(),\n      success: function success(result) {\n        _knockoutMapping2.default.fromJS(result, references);\n      }\n    });\n  };\n\n  page.update_references();\n\n  _knockout2.default.applyBindings(page, document.querySelector(\"html\"));\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1wcm9qZWN0LW1haW4uanM/ZDJiOSJdLCJuYW1lcyI6WyIkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInBhZ2UiLCJzZXJ2ZXJfcm9vdCIsInByb2plY3QiLCJtYXBwaW5nIiwiZnJvbUpTIiwiX2lkIiwid2luZG93IiwibG9jYXRpb24iLCJzZWdtZW50IiwibmFtZSIsImRlc2NyaXB0aW9uIiwiY3JlYXRlZCIsImNyZWF0b3IiLCJhY2wiLCJhZG1pbmlzdHJhdG9ycyIsIndyaXRlcnMiLCJyZWFkZXJzIiwicHJvamVjdHMiLCJrbyIsIm9ic2VydmFibGVBcnJheSIsImNsaWVudCIsImdldF9wcm9qZWN0IiwicGlkIiwic3VjY2VzcyIsInJlc3VsdCIsInB1c2giLCJlcnJvciIsInJlcXVlc3QiLCJzdGF0dXMiLCJyZWFzb25fcGhyYXNlIiwiY29uc29sZSIsImxvZyIsInRpdGxlIiwicHVyZUNvbXB1dGVkIiwibGVuZ3RoIiwibW9kZWxzIiwiZ2V0X3Byb2plY3RfbW9kZWxzIiwibWFya2luZ3MiLCJhbGxvd2VkIiwiYmFkZ2UiLCJtYXJraW5nIiwiaSIsInR5cGUiLCJyZWZlcmVuY2VzIiwidGVtcGxhdGVzIiwiZmlsdGVyIiwicmVmZXJlbmNlIiwiYmlkIiwibWlkIiwibWFwIiwibW9kZWxfdHlwZSIsIm1vZGVsX25hbWVzIiwiZWRpdF90ZW1wbGF0ZSIsImRlbGV0ZV90ZW1wbGF0ZSIsImRpYWxvZyIsIm1lc3NhZ2UiLCJidXR0b25zIiwiY2xhc3NOYW1lIiwibGFiZWwiLCJjYWxsYmFjayIsImJ1dHRvbiIsImRlbGV0ZV9yZWZlcmVuY2UiLCJyaWQiLCJ1cGRhdGVfcmVmZXJlbmNlcyIsImFqYXhfZXJyb3IiLCJnZXRfcHJvamVjdF9yZWZlcmVuY2VzIiwiYXBwbHlCaW5kaW5ncyIsInF1ZXJ5U2VsZWN0b3IiXSwibWFwcGluZ3MiOiI7O0FBS0E7O0FBQ0E7O0FBRUE7Ozs7QUFDQTs7OztBQUNB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Z0QsYUFBSCxDQUFpQmxFLElBQWpCLEVBQXVCRixTQUFTcUUsYUFBVCxDQUF1QixNQUF2QixDQUF2QjtBQUVELENBL0dELEUsQ0FuQkE7Ozs7QUFJQSxnQiIsImZpbGUiOiIuL3dlYi1zZXJ2ZXIvanMvc2x5Y2F0LXByb2plY3QtbWFpbi5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAoYykgMjAxMywgMjAxOCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMgLiBVbmRlciB0aGUgdGVybXMgb2YgQ29udHJhY3RcbiBERS1OQTAwMDM1MjUgd2l0aCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMsIHRoZSBVLlMuIEdvdmVybm1lbnRcbiByZXRhaW5zIGNlcnRhaW4gcmlnaHRzIGluIHRoaXMgc29mdHdhcmUuICovXG5cbi8vIENTUyByZXNvdXJjZXNcbmltcG9ydCBcImNzcy9uYW1lc3BhY2VkLWJvb3RzdHJhcC5sZXNzXCI7XG5pbXBvcnQgXCJjc3Mvc2x5Y2F0LmNzc1wiO1xuXG5pbXBvcnQgc2VydmVyX3Jvb3QgZnJvbSAnanMvc2x5Y2F0LXNlcnZlci1yb290JztcbmltcG9ydCBjbGllbnQgZnJvbSAnanMvc2x5Y2F0LXdlYi1jbGllbnQtd2VicGFjayc7XG5pbXBvcnQgbWFya2luZ3MgZnJvbSAnanMvc2x5Y2F0LW1hcmtpbmdzLXdlYnBhY2snO1xuaW1wb3J0IGRpYWxvZyBmcm9tICdqcy9zbHljYXQtZGlhbG9nLXdlYnBhY2snO1xuaW1wb3J0IG1vZGVsX25hbWVzIGZyb20gJ2pzL3NseWNhdC1tb2RlbC1uYW1lcy13ZWJwYWNrJztcbmltcG9ydCBrbyBmcm9tICdrbm9ja291dCc7XG5pbXBvcnQgbWFwcGluZyBmcm9tICdrbm9ja291dC1tYXBwaW5nJztcbmltcG9ydCBVUkkgZnJvbSAndXJpanMnO1xuaW1wb3J0IFwianMvc2x5Y2F0LW5hdmJhci13ZWJwYWNrXCI7XG5cbi8vIFdhaXQgZm9yIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuICB2YXIgcGFnZSA9IHt9O1xuICBwYWdlLnNlcnZlcl9yb290ID0gc2VydmVyX3Jvb3Q7XG4gIHBhZ2UucHJvamVjdCA9IG1hcHBpbmcuZnJvbUpTKHtcbiAgICBfaWQ6IFVSSSh3aW5kb3cubG9jYXRpb24pLnNlZ21lbnQoLTEpLCBcbiAgICBuYW1lOiBcIlwiLCBcbiAgICBkZXNjcmlwdGlvbjogXCJcIixcbiAgICBjcmVhdGVkOiBcIlwiLFxuICAgIGNyZWF0b3I6IFwiXCIsXG4gICAgYWNsOnthZG1pbmlzdHJhdG9yczpbXSx3cml0ZXJzOltdLHJlYWRlcnM6W119XG4gIH0pO1xuICBwYWdlLnByb2plY3RzID0ga28ub2JzZXJ2YWJsZUFycmF5KCk7XG4gIGNsaWVudC5nZXRfcHJvamVjdCh7XG4gICAgcGlkOiBwYWdlLnByb2plY3QuX2lkKCksXG4gICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICBwYWdlLnByb2plY3RzLnB1c2gobWFwcGluZy5mcm9tSlMocmVzdWx0KSk7XG4gICAgfSxcbiAgICBlcnJvcjogZnVuY3Rpb24ocmVxdWVzdCwgc3RhdHVzLCByZWFzb25fcGhyYXNlKSB7XG4gICAgICBjb25zb2xlLmxvZyhcIlVuYWJsZSB0byByZXRyaWV2ZSBwcm9qZWN0LlwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBhZ2UudGl0bGUgPSBrby5wdXJlQ29tcHV0ZWQoZnVuY3Rpb24oKVxuICB7XG4gICAgdmFyIHByb2plY3RzID0gcGFnZS5wcm9qZWN0cygpO1xuICAgIHJldHVybiBwcm9qZWN0cy5sZW5ndGggPyBwcm9qZWN0c1swXS5uYW1lKCkgKyBcIiAtIFNseWNhdCBQcm9qZWN0XCIgOiBcIlwiO1xuICB9KTtcblxuICBwYWdlLm1vZGVscyA9IG1hcHBpbmcuZnJvbUpTKFtdKTtcbiAgY2xpZW50LmdldF9wcm9qZWN0X21vZGVscyh7XG4gICAgcGlkOiBwYWdlLnByb2plY3QuX2lkKCksXG4gICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KSB7XG4gICAgICBtYXBwaW5nLmZyb21KUyhyZXN1bHQsIHBhZ2UubW9kZWxzKTtcbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbihyZXF1ZXN0LCBzdGF0dXMsIHJlYXNvbl9waHJhc2UpIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiVW5hYmxlIHRvIHJldHJpZXZlIHByb2plY3QgbW9kZWxzLlwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIHBhZ2UubWFya2luZ3MgPSBtYXJraW5ncy5hbGxvd2VkO1xuICBwYWdlLmJhZGdlID0gZnVuY3Rpb24obWFya2luZylcbiAge1xuICAgIGZvcih2YXIgaSA9IDA7IGkgIT0gcGFnZS5tYXJraW5ncygpLmxlbmd0aDsgKytpKVxuICAgIHtcbiAgICAgIGlmKHBhZ2UubWFya2luZ3MoKVtpXS50eXBlKCkgPT0gbWFya2luZylcbiAgICAgICAgcmV0dXJuIHBhZ2UubWFya2luZ3MoKVtpXS5iYWRnZSgpO1xuICAgIH1cbiAgfVxuXG4gIHZhciByZWZlcmVuY2VzID0gbWFwcGluZy5mcm9tSlMoW10pO1xuXG4gIHBhZ2UudGVtcGxhdGVzID0gcmVmZXJlbmNlcy5maWx0ZXIoZnVuY3Rpb24ocmVmZXJlbmNlKVxuICB7XG4gICAgcmV0dXJuIHJlZmVyZW5jZS5iaWQoKSAmJiAhcmVmZXJlbmNlLm1pZCgpO1xuICB9KS5tYXAoZnVuY3Rpb24ocmVmZXJlbmNlKVxuICB7XG4gICAgcmV0dXJuIHtcbiAgICAgIF9pZDogcmVmZXJlbmNlLl9pZCxcbiAgICAgIG5hbWU6IHJlZmVyZW5jZS5uYW1lLFxuICAgICAgY3JlYXRlZDogcmVmZXJlbmNlLmNyZWF0ZWQsXG4gICAgICBjcmVhdG9yOiByZWZlcmVuY2UuY3JlYXRvcixcbiAgICAgIG1vZGVsX3R5cGU6IHJlZmVyZW5jZVtcIm1vZGVsLXR5cGVcIl0gPyByZWZlcmVuY2VbXCJtb2RlbC10eXBlXCJdKCkgOiBcIlwiLFxuICAgIH07XG4gIH0pO1xuICBcbiAgcGFnZS5tb2RlbF9uYW1lcyA9IG1vZGVsX25hbWVzO1xuICBcbiAgcGFnZS5lZGl0X3RlbXBsYXRlID0gZnVuY3Rpb24ocmVmZXJlbmNlKVxuICB7XG4gIH1cbiAgcGFnZS5kZWxldGVfdGVtcGxhdGUgPSBmdW5jdGlvbihyZWZlcmVuY2UpXG4gIHtcbiAgICBkaWFsb2cuZGlhbG9nKFxuICAgIHtcbiAgICAgIHRpdGxlOiBcIkRlbGV0ZSBUZW1wbGF0ZT9cIixcbiAgICAgIG1lc3NhZ2U6IFwiVGhlIHRlbXBsYXRlIHdpbGwgYmUgZGVsZXRlZCBpbW1lZGlhdGVseSBhbmQgdGhlcmUgaXMgbm8gdW5kby4gIFRoaXMgd2lsbCBub3QgYWZmZWN0IGFueSBleGlzdGluZyBtb2RlbHMuXCIsXG4gICAgICBidXR0b25zOiBbe2NsYXNzTmFtZTogXCJidG4tZGVmYXVsdFwiLCBsYWJlbDpcIkNhbmNlbFwifSwge2NsYXNzTmFtZTogXCJidG4tZGFuZ2VyXCIsbGFiZWw6XCJPS1wifV0sXG4gICAgICBjYWxsYmFjazogZnVuY3Rpb24oYnV0dG9uKVxuICAgICAge1xuICAgICAgICBpZihidXR0b24ubGFiZWwgIT0gXCJPS1wiKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgY2xpZW50LmRlbGV0ZV9yZWZlcmVuY2UoXG4gICAgICAgIHtcbiAgICAgICAgICByaWQ6IHJlZmVyZW5jZS5faWQoKSxcbiAgICAgICAgICBzdWNjZXNzOiBmdW5jdGlvbigpXG4gICAgICAgICAge1xuICAgICAgICAgICAgcGFnZS51cGRhdGVfcmVmZXJlbmNlcygpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZXJyb3I6IGRpYWxvZy5hamF4X2Vycm9yKFwiQ291bGRuJ3QgZGVsZXRlIHRlbXBsYXRlLlwiKSxcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgcGFnZS51cGRhdGVfcmVmZXJlbmNlcyA9IGZ1bmN0aW9uKClcbiAge1xuICAgIGNsaWVudC5nZXRfcHJvamVjdF9yZWZlcmVuY2VzKFxuICAgIHtcbiAgICAgIHBpZDogcGFnZS5wcm9qZWN0Ll9pZCgpLFxuICAgICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KVxuICAgICAge1xuICAgICAgICBtYXBwaW5nLmZyb21KUyhyZXN1bHQsIHJlZmVyZW5jZXMpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG5cbiAgcGFnZS51cGRhdGVfcmVmZXJlbmNlcygpO1xuXG4gIGtvLmFwcGx5QmluZGluZ3MocGFnZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImh0bWxcIikpO1xuXG59KTtcbiJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./web-server/js/slycat-project-main.js\n");

/***/ })

/******/ });