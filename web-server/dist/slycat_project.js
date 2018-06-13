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
/******/ 	__webpack_require__.p = "/dist/";
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
eval("/* WEBPACK VAR INJECTION */(function($) {\n\n__webpack_require__(/*! ../css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! ../css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatServerRoot = __webpack_require__(/*! ./slycat-server-root */ \"./web-server/js/slycat-server-root.js\");\n\nvar _slycatServerRoot2 = _interopRequireDefault(_slycatServerRoot);\n\nvar _slycatWebClientWebpack = __webpack_require__(/*! ./slycat-web-client-webpack */ \"./web-server/js/slycat-web-client-webpack.js\");\n\nvar _slycatWebClientWebpack2 = _interopRequireDefault(_slycatWebClientWebpack);\n\nvar _slycatMarkingsWebpack = __webpack_require__(/*! ./slycat-markings-webpack */ \"./web-server/js/slycat-markings-webpack.js\");\n\nvar _slycatMarkingsWebpack2 = _interopRequireDefault(_slycatMarkingsWebpack);\n\nvar _slycatDialogWebpack = __webpack_require__(/*! ./slycat-dialog-webpack */ \"./web-server/js/slycat-dialog-webpack.js\");\n\nvar _slycatDialogWebpack2 = _interopRequireDefault(_slycatDialogWebpack);\n\nvar _slycatModelNamesWebpack = __webpack_require__(/*! ./slycat-model-names-webpack */ \"./web-server/js/slycat-model-names-webpack.js\");\n\nvar _slycatModelNamesWebpack2 = _interopRequireDefault(_slycatModelNamesWebpack);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _knockoutMapping = __webpack_require__(/*! knockout-mapping */ \"./node_modules/knockout-mapping/dist/knockout.mapping.js\");\n\nvar _knockoutMapping2 = _interopRequireDefault(_knockoutMapping);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\n__webpack_require__(/*! ./slycat-navbar-webpack */ \"./web-server/js/slycat-navbar-webpack.js\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n\n  var page = {};\n  page.server_root = _slycatServerRoot2.default;\n  page.project = _knockoutMapping2.default.fromJS({\n    _id: (0, _urijs2.default)(window.location).segment(-1),\n    name: \"\",\n    description: \"\",\n    created: \"\",\n    creator: \"\",\n    acl: { administrators: [], writers: [], readers: [] }\n  });\n  page.projects = _knockout2.default.observableArray();\n  _slycatWebClientWebpack2.default.get_project({\n    pid: page.project._id(),\n    success: function success(result) {\n      page.projects.push(_knockoutMapping2.default.fromJS(result));\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project.\");\n    }\n  });\n\n  page.title = _knockout2.default.pureComputed(function () {\n    var projects = page.projects();\n    return projects.length ? projects[0].name() + \" - Slycat Project\" : \"\";\n  });\n\n  page.models = _knockoutMapping2.default.fromJS([]);\n  _slycatWebClientWebpack2.default.get_project_models({\n    pid: page.project._id(),\n    success: function success(result) {\n      _knockoutMapping2.default.fromJS(result, page.models);\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project models.\");\n    }\n  });\n\n  page.markings = _slycatMarkingsWebpack2.default.allowed;\n  page.badge = function (marking) {\n    for (var i = 0; i != page.markings().length; ++i) {\n      if (page.markings()[i].type() == marking) return page.markings()[i].badge();\n    }\n  };\n\n  var references = _knockoutMapping2.default.fromJS([]);\n\n  page.templates = references.filter(function (reference) {\n    return reference.bid() && !reference.mid();\n  }).map(function (reference) {\n    return {\n      _id: reference._id,\n      name: reference.name,\n      created: reference.created,\n      creator: reference.creator,\n      model_type: reference[\"model-type\"] ? reference[\"model-type\"]() : \"\"\n    };\n  });\n\n  page.model_names = _slycatModelNamesWebpack2.default;\n\n  page.edit_template = function (reference) {};\n  page.delete_template = function (reference) {\n    _slycatDialogWebpack2.default.dialog({\n      title: \"Delete Template?\",\n      message: \"The template will be deleted immediately and there is no undo.  This will not affect any existing models.\",\n      buttons: [{ className: \"btn-default\", label: \"Cancel\" }, { className: \"btn-danger\", label: \"OK\" }],\n      callback: function callback(button) {\n        if (button.label != \"OK\") return;\n        _slycatWebClientWebpack2.default.delete_reference({\n          rid: reference._id(),\n          success: function success() {\n            page.update_references();\n          },\n          error: _slycatDialogWebpack2.default.ajax_error(\"Couldn't delete template.\")\n        });\n      }\n    });\n  };\n\n  page.update_references = function () {\n    _slycatWebClientWebpack2.default.get_project_references({\n      pid: page.project._id(),\n      success: function success(result) {\n        _knockoutMapping2.default.fromJS(result, references);\n      }\n    });\n  };\n\n  page.update_references();\n\n  _knockout2.default.applyBindings(page, document.querySelector(\"html\"));\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))\n\n//# sourceURL=webpack:///./web-server/js/slycat-project-main.js?");

/***/ })

/******/ });