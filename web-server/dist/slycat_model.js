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
/******/ 		"slycat_model": 0
/******/ 	};
/******/
/******/ 	var deferredModules = [];
/******/
/******/ 	// script path function
/******/ 	function jsonpScriptSrc(chunkId) {
/******/ 		return __webpack_require__.p + "" + ({}[chunkId]||chunkId) + ".js"
/******/ 	}
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
/******/ 	// This file contains only the entry chunk.
/******/ 	// The chunk loading function for additional chunks
/******/ 	__webpack_require__.e = function requireEnsure(chunkId) {
/******/ 		var promises = [];
/******/
/******/
/******/ 		// JSONP chunk loading for javascript
/******/
/******/ 		var installedChunkData = installedChunks[chunkId];
/******/ 		if(installedChunkData !== 0) { // 0 means "already installed".
/******/
/******/ 			// a Promise means "currently loading".
/******/ 			if(installedChunkData) {
/******/ 				promises.push(installedChunkData[2]);
/******/ 			} else {
/******/ 				// setup Promise in chunk cache
/******/ 				var promise = new Promise(function(resolve, reject) {
/******/ 					installedChunkData = installedChunks[chunkId] = [resolve, reject];
/******/ 				});
/******/ 				promises.push(installedChunkData[2] = promise);
/******/
/******/ 				// start chunk loading
/******/ 				var head = document.getElementsByTagName('head')[0];
/******/ 				var script = document.createElement('script');
/******/ 				var onScriptComplete;
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = jsonpScriptSrc(chunkId);
/******/
/******/ 				onScriptComplete = function (event) {
/******/ 					// avoid mem leaks in IE.
/******/ 					script.onerror = script.onload = null;
/******/ 					clearTimeout(timeout);
/******/ 					var chunk = installedChunks[chunkId];
/******/ 					if(chunk !== 0) {
/******/ 						if(chunk) {
/******/ 							var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 							var realSrc = event && event.target && event.target.src;
/******/ 							var error = new Error('Loading chunk ' + chunkId + ' failed.\n(' + errorType + ': ' + realSrc + ')');
/******/ 							error.type = errorType;
/******/ 							error.request = realSrc;
/******/ 							chunk[1](error);
/******/ 						}
/******/ 						installedChunks[chunkId] = undefined;
/******/ 					}
/******/ 				};
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				head.appendChild(script);
/******/ 			}
/******/ 		}
/******/ 		return Promise.all(promises);
/******/ 	};
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
/******/ 	// on error function for async loading
/******/ 	__webpack_require__.oe = function(err) { console.error(err); throw err; };
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
/******/ 	deferredModules.push(["./web-server/js/slycat-model-main.js","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_run_command","vendors~slycat_model~slycat_page~slycat_project~slycat_projects","vendors~slycat_model~slycat_project~slycat_projects","vendors~slycat_model","slycat_model~slycat_page~slycat_project~slycat_projects~ui_run_command","slycat_model~slycat_page~slycat_project~slycat_projects"]);
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

/***/ "./web-server/js/slycat-model-main.js":
/*!********************************************!*\
  !*** ./web-server/js/slycat-model-main.js ***!
  \********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($, module) {\n\nvar _regenerator = __webpack_require__(/*! babel-runtime/regenerator */ \"./node_modules/babel-runtime/regenerator/index.js\");\n\nvar _regenerator2 = _interopRequireDefault(_regenerator);\n\nvar _asyncToGenerator2 = __webpack_require__(/*! babel-runtime/helpers/asyncToGenerator */ \"./node_modules/babel-runtime/helpers/asyncToGenerator.js\");\n\nvar _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatWebClient = __webpack_require__(/*! js/slycat-web-client */ \"./web-server/js/slycat-web-client.js\");\n\nvar _slycatWebClient2 = _interopRequireDefault(_slycatWebClient);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\n__webpack_require__(/*! js/slycat-navbar */ \"./web-server/js/slycat-navbar.js\");\n\nvar _slycatGa = __webpack_require__(/*! js/slycat-ga */ \"./web-server/js/slycat-ga.js\");\n\nvar _slycatGa2 = _interopRequireDefault(_slycatGa);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n  var loadModelTemplate = function () {\n    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {\n      var template, html;\n      return _regenerator2.default.wrap(function _callee$(_context) {\n        while (1) {\n          switch (_context.prev = _context.next) {\n            case 0:\n              // console.log(\"loadModelTemplate, page.model_type is \" + page.model_type);\n\n              template = document.createElement('template');\n              html = \"\";\n\n              if (!(page.model_type == \"parameter-image\")) {\n                _context.next = 8;\n                break;\n              }\n\n              _context.next = 5;\n              return __webpack_require__.e(/*! import() */ 0).then(__webpack_require__.t.bind(null, /*! plugins/slycat-parameter-image/ui.html */ \"./web-server/plugins/slycat-parameter-image/ui.html\", 7));\n\n            case 5:\n              html = _context.sent;\n              _context.next = 27;\n              break;\n\n            case 8:\n              if (!(page.model_type == \"timeseries\")) {\n                _context.next = 14;\n                break;\n              }\n\n              _context.next = 11;\n              return __webpack_require__.e(/*! import() */ 1).then(__webpack_require__.t.bind(null, /*! plugins/slycat-timeseries-model/ui.html */ \"./web-server/plugins/slycat-timeseries-model/ui.html\", 7));\n\n            case 11:\n              html = _context.sent;\n              _context.next = 27;\n              break;\n\n            case 14:\n              if (!(page.model_type == \"cca\")) {\n                _context.next = 20;\n                break;\n              }\n\n              _context.next = 17;\n              return __webpack_require__.e(/*! import() */ 2).then(__webpack_require__.t.bind(null, /*! plugins/slycat-cca/ui.html */ \"./web-server/plugins/slycat-cca/ui.html\", 7));\n\n            case 17:\n              html = _context.sent;\n              _context.next = 27;\n              break;\n\n            case 20:\n              if (!(page.model_type == \"parameter-image-plus\")) {\n                _context.next = 26;\n                break;\n              }\n\n              _context.next = 23;\n              return __webpack_require__.e(/*! import() */ 3).then(__webpack_require__.t.bind(null, /*! plugins/slycat-parameter-image-plus-model/ui.html */ \"./web-server/plugins/slycat-parameter-image-plus-model/ui.html\", 7));\n\n            case 23:\n              html = _context.sent;\n              _context.next = 27;\n              break;\n\n            case 26:\n              console.log(\"We don't recognize this model type, so not loading a template.\");\n\n            case 27:\n\n              if (html.default) {\n                html = html.default;\n              }\n              html = html.trim();\n              template.innerHTML = html;\n              return _context.abrupt(\"return\", template.content);\n\n            case 31:\n            case \"end\":\n              return _context.stop();\n          }\n        }\n      }, _callee, this);\n    }));\n\n    return function loadModelTemplate() {\n      return _ref.apply(this, arguments);\n    };\n  }();\n\n  var loadModelModule = function () {\n    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {\n      return _regenerator2.default.wrap(function _callee2$(_context2) {\n        while (1) {\n          switch (_context2.prev = _context2.next) {\n            case 0:\n              if (!(page.model_type == \"parameter-image\")) {\n                _context2.next = 6;\n                break;\n              }\n\n              _context2.next = 3;\n              return Promise.all(/*! import() */[__webpack_require__.e(4), __webpack_require__.e(5)]).then(__webpack_require__.t.bind(null, /*! dist/ui_parameter_image */ \"./web-server/dist/ui_parameter_image.js\", 7));\n\n            case 3:\n              module = _context2.sent;\n              _context2.next = 25;\n              break;\n\n            case 6:\n              if (!(page.model_type == \"timeseries\")) {\n                _context2.next = 12;\n                break;\n              }\n\n              _context2.next = 9;\n              return Promise.all(/*! import() */[__webpack_require__.e(4), __webpack_require__.e(6)]).then(__webpack_require__.t.bind(null, /*! dist/ui_timeseries */ \"./web-server/dist/ui_timeseries.js\", 7));\n\n            case 9:\n              module = _context2.sent;\n              _context2.next = 25;\n              break;\n\n            case 12:\n              if (!(page.model_type == \"cca\")) {\n                _context2.next = 18;\n                break;\n              }\n\n              _context2.next = 15;\n              return Promise.all(/*! import() */[__webpack_require__.e(4), __webpack_require__.e(7)]).then(__webpack_require__.t.bind(null, /*! dist/ui_cca */ \"./web-server/dist/ui_cca.js\", 7));\n\n            case 15:\n              module = _context2.sent;\n              _context2.next = 25;\n              break;\n\n            case 18:\n              if (!(page.model_type == \"parameter-image-plus\")) {\n                _context2.next = 24;\n                break;\n              }\n\n              _context2.next = 21;\n              return Promise.all(/*! import() */[__webpack_require__.e(4), __webpack_require__.e(8)]).then(__webpack_require__.t.bind(null, /*! dist/ui_parameter_plus */ \"./web-server/dist/ui_parameter_plus.js\", 7));\n\n            case 21:\n              module = _context2.sent;\n              _context2.next = 25;\n              break;\n\n            case 24:\n              console.log(\"We don't recognize this model type, so not loading a module.\");\n\n            case 25:\n              return _context2.abrupt(\"return\", module);\n\n            case 26:\n            case \"end\":\n              return _context2.stop();\n          }\n        }\n      }, _callee2, this);\n    }));\n\n    return function loadModelModule() {\n      return _ref2.apply(this, arguments);\n    };\n  }();\n\n  // Enable knockout\n  var mid = (0, _urijs2.default)(window.location).segment(-1);\n  var page = {};\n  page.model_id = mid;\n  page.title = _knockout2.default.observable();\n  _slycatWebClient2.default.get_model({\n    mid: mid,\n    success: function success(result) {\n      // console.log(\"success of client.get_model in slycat-model-main.js\");\n      page.model_name = result.name;\n      window.model_name = page.model_name;\n      page.title(page.model_name + \" - Slycat Model\");\n      page.project_id = result.project;\n      page.model_type = result[\"model-type\"];\n      _knockout2.default.applyBindings(page, document.querySelector(\"slycat-navbar\"));\n      loadModelTemplate().then(function (component) {\n        // console.log(\"inside loadModelTemplate().then()\");\n        document.querySelector(\".slycat-content\").appendChild(component);\n        _knockout2.default.applyBindings(page, document.querySelector(\"head\"));\n        loadModelModule().then(function (component) {\n          // console.log(\"inside loadModelModule().then()\");\n          // ko.applyBindings(page, document.querySelector(\".slycat-content\"));\n        });\n      });\n    },\n    error: function error() {\n      console.log(\"Error retrieving model.\");\n    }\n  });\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\"), __webpack_require__(/*! ./../../node_modules/webpack/buildin/module.js */ \"./node_modules/webpack/buildin/module.js\")(module)))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1tb2RlbC1tYWluLmpzPzQ5YTYiXSwibmFtZXMiOlsiJCIsImRvY3VtZW50IiwicmVhZHkiLCJ0ZW1wbGF0ZSIsImNyZWF0ZUVsZW1lbnQiLCJodG1sIiwicGFnZSIsIm1vZGVsX3R5cGUiLCJjb25zb2xlIiwibG9nIiwiZGVmYXVsdCIsInRyaW0iLCJpbm5lckhUTUwiLCJjb250ZW50IiwibG9hZE1vZGVsVGVtcGxhdGUiLCJtb2R1bGUiLCJsb2FkTW9kZWxNb2R1bGUiLCJtaWQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlZ21lbnQiLCJtb2RlbF9pZCIsInRpdGxlIiwia28iLCJvYnNlcnZhYmxlIiwiY2xpZW50IiwiZ2V0X21vZGVsIiwic3VjY2VzcyIsInJlc3VsdCIsIm1vZGVsX25hbWUiLCJuYW1lIiwicHJvamVjdF9pZCIsInByb2plY3QiLCJhcHBseUJpbmRpbmdzIiwicXVlcnlTZWxlY3RvciIsInRoZW4iLCJhcHBlbmRDaGlsZCIsImNvbXBvbmVudCIsImVycm9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBS0E7O0FBQ0E7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVBO0FBQ0FBLEVBQUVDLFFBQUYsRUFBWUMsS0FBWixDQUFrQixZQUFXO0FBQUE7QUFBQSx3RkFvQzNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNFOztBQUVJQyxzQkFITixHQUdpQkYsU0FBU0csYUFBVCxDQUF1QixVQUF2QixDQUhqQjtBQUlNQyxrQkFKTixHQUlhLEVBSmI7O0FBQUEsb0JBTU1DLEtBQUtDLFVBQUwsSUFBbUIsaUJBTnpCO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQUEscUJBT2lCLHVMQVBqQjs7QUFBQTtBQU9JRixrQkFQSjtBQUFBO0FBQUE7O0FBQUE7QUFBQSxvQkFTV0MsS0FBS0MsVUFBTCxJQUFtQixZQVQ5QjtBQUFBO0FBQUE7QUFBQTs7QUFB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QUFqQixFQUF1QkwsU0FBU2lDLGFBQVQsQ0FBdUIsTUFBdkIsQ0FBdkI7QUFDQWxCLDBCQUFrQm1CLElBQWxCLENBQXVCLHFCQUFhO0FBQ2xDO0FBQ0E7QUFDRCxTQUhEO0FBSUQsT0FSRDtBQVVELEtBckJIO0FBc0JFRyxXQUFPLGlCQUNQO0FBQ0U5QixjQUFRQyxHQUFSLENBQVkseUJBQVo7QUFDRDtBQXpCSCxHQURBO0FBcUZELENBNUZELEUsQ0FmQTs7OztBQUlBLGdCIiwiZmlsZSI6Ii4vd2ViLXNlcnZlci9qcy9zbHljYXQtbW9kZWwtbWFpbi5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAoYykgMjAxMywgMjAxOCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMgLiBVbmRlciB0aGUgdGVybXMgb2YgQ29udHJhY3RcbiBERS1OQTAwMDM1MjUgd2l0aCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMsIHRoZSBVLlMuIEdvdmVybm1lbnRcbiByZXRhaW5zIGNlcnRhaW4gcmlnaHRzIGluIHRoaXMgc29mdHdhcmUuICovXG5cbi8vIENTUyByZXNvdXJjZXNcbmltcG9ydCBcImNzcy9uYW1lc3BhY2VkLWJvb3RzdHJhcC5sZXNzXCI7XG5pbXBvcnQgXCJjc3Mvc2x5Y2F0LmNzc1wiO1xuXG5pbXBvcnQgY2xpZW50IGZyb20gXCJqcy9zbHljYXQtd2ViLWNsaWVudFwiO1xuaW1wb3J0IGtvIGZyb20gXCJrbm9ja291dFwiO1xuaW1wb3J0IFVSSSBmcm9tIFwidXJpanNcIjtcbmltcG9ydCBcImpzL3NseWNhdC1uYXZiYXJcIjtcbmltcG9ydCBnYSBmcm9tIFwianMvc2x5Y2F0LWdhXCI7XG5cbi8vIFdhaXQgZm9yIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuICAvLyBFbmFibGUga25vY2tvdXRcbiAgdmFyIG1pZCA9IFVSSSh3aW5kb3cubG9jYXRpb24pLnNlZ21lbnQoLTEpO1xuICB2YXIgcGFnZSA9IHt9O1xuICBwYWdlLm1vZGVsX2lkID0gbWlkO1xuICBwYWdlLnRpdGxlID0ga28ub2JzZXJ2YWJsZSgpO1xuICBjbGllbnQuZ2V0X21vZGVsKFxuICB7XG4gICAgbWlkOiBtaWQsXG4gICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KVxuICAgIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwic3VjY2VzcyBvZiBjbGllbnQuZ2V0X21vZGVsIGluIHNseWNhdC1tb2RlbC1tYWluLmpzXCIpO1xuICAgICAgcGFnZS5tb2RlbF9uYW1lID0gcmVzdWx0Lm5hbWU7XG4gICAgICB3aW5kb3cubW9kZWxfbmFtZSA9IHBhZ2UubW9kZWxfbmFtZTtcbiAgICAgIHBhZ2UudGl0bGUocGFnZS5tb2RlbF9uYW1lICsgXCIgLSBTbHljYXQgTW9kZWxcIik7XG4gICAgICBwYWdlLnByb2plY3RfaWQgPSByZXN1bHQucHJvamVjdDtcbiAgICAgIHBhZ2UubW9kZWxfdHlwZSA9IHJlc3VsdFtcIm1vZGVsLXR5cGVcIl07XG4gICAgICBrby5hcHBseUJpbmRpbmdzKHBhZ2UsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJzbHljYXQtbmF2YmFyXCIpKTtcbiAgICAgIGxvYWRNb2RlbFRlbXBsYXRlKCkudGhlbihjb21wb25lbnQgPT4ge1xuICAgICAgICAvLyBjb25zb2xlLmxvZyhcImluc2lkZSBsb2FkTW9kZWxUZW1wbGF0ZSgpLnRoZW4oKVwiKTtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5zbHljYXQtY29udGVudFwiKS5hcHBlbmRDaGlsZChjb21wb25lbnQpO1xuICAgICAgICBrby5hcHBseUJpbmRpbmdzKHBhZ2UsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJoZWFkXCIpKTtcbiAgICAgICAgbG9hZE1vZGVsTW9kdWxlKCkudGhlbihjb21wb25lbnQgPT4ge1xuICAgICAgICAgIC8vIGNvbnNvbGUubG9nKFwiaW5zaWRlIGxvYWRNb2RlbE1vZHVsZSgpLnRoZW4oKVwiKTtcbiAgICAgICAgICAvLyBrby5hcHBseUJpbmRpbmdzKHBhZ2UsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuc2x5Y2F0LWNvbnRlbnRcIikpO1xuICAgICAgICB9KTtcbiAgICAgIH0pO1xuXG4gICAgfSxcbiAgICBlcnJvcjogZnVuY3Rpb24oKVxuICAgIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiRXJyb3IgcmV0cmlldmluZyBtb2RlbC5cIik7XG4gICAgfVxuICB9KTtcblxuICBhc3luYyBmdW5jdGlvbiBsb2FkTW9kZWxUZW1wbGF0ZSgpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImxvYWRNb2RlbFRlbXBsYXRlLCBwYWdlLm1vZGVsX3R5cGUgaXMgXCIgKyBwYWdlLm1vZGVsX3R5cGUpO1xuXG4gICAgdmFyIHRlbXBsYXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgndGVtcGxhdGUnKTtcbiAgICB2YXIgaHRtbCA9IFwiXCI7XG5cbiAgICBpZiAocGFnZS5tb2RlbF90eXBlID09IFwicGFyYW1ldGVyLWltYWdlXCIpIHtcbiAgICAgIGh0bWwgPSBhd2FpdCBpbXBvcnQoJ3BsdWdpbnMvc2x5Y2F0LXBhcmFtZXRlci1pbWFnZS91aS5odG1sJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHBhZ2UubW9kZWxfdHlwZSA9PSBcInRpbWVzZXJpZXNcIikge1xuICAgICAgaHRtbCA9IGF3YWl0IGltcG9ydCgncGx1Z2lucy9zbHljYXQtdGltZXNlcmllcy1tb2RlbC91aS5odG1sJyk7XG4gICAgfVxuICAgIGVsc2UgaWYgKHBhZ2UubW9kZWxfdHlwZSA9PSBcImNjYVwiKSB7XG4gICAgICBodG1sID0gYXdhaXQgaW1wb3J0KCdwbHVnaW5zL3NseWNhdC1jY2EvdWkuaHRtbCcpO1xuICAgIH1cbiAgICBlbHNlIGlmIChwYWdlLm1vZGVsX3R5cGUgPT0gXCJwYXJhbWV0ZXItaW1hZ2UtcGx1c1wiKSB7XG4gICAgICBodG1sID0gYXdhaXQgaW1wb3J0KCdwbHVnaW5zL3NseWNhdC1wYXJhbWV0ZXItaW1hZ2UtcGx1cy1tb2RlbC91aS5odG1sJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJXZSBkb24ndCByZWNvZ25pemUgdGhpcyBtb2RlbCB0eXBlLCBzbyBub3QgbG9hZGluZyBhIHRlbXBsYXRlLlwiKTtcbiAgICB9XG5cbiAgICBpZiAoaHRtbC5kZWZhdWx0KSB7XG4gICAgICBodG1sID0gaHRtbC5kZWZhdWx0O1xuICAgIH1cbiAgICBodG1sID0gaHRtbC50cmltKCk7XG4gICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICByZXR1cm4gdGVtcGxhdGUuY29udGVudDtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2RlbE1vZHVsZSgpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImxvYWRNb2RlbE1vZHVsZSwgcGFnZS5tb2RlbF90eXBlIGlzIFwiICsgcGFnZS5tb2RlbF90eXBlKTtcblxuICAgIGlmIChwYWdlLm1vZGVsX3R5cGUgPT0gXCJwYXJhbWV0ZXItaW1hZ2VcIikge1xuICAgICAgbW9kdWxlID0gYXdhaXQgaW1wb3J0KCdkaXN0L3VpX3BhcmFtZXRlcl9pbWFnZScpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJsb2FkaW5nIHVpX3BhcmFtZXRlcl9pbWFnZS5qc1wiKTtcbiAgICB9XG4gICAgZWxzZSBpZiAocGFnZS5tb2RlbF90eXBlID09IFwidGltZXNlcmllc1wiKSB7XG4gICAgICBtb2R1bGUgPSBhd2FpdCBpbXBvcnQoJ2Rpc3QvdWlfdGltZXNlcmllcycpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJsb2FkaW5nIHVpX3BhcmFtZXRlcl9pbWFnZS5qc1wiKTtcbiAgICB9XG4gICAgZWxzZSBpZiAocGFnZS5tb2RlbF90eXBlID09IFwiY2NhXCIpIHtcbiAgICAgIG1vZHVsZSA9IGF3YWl0IGltcG9ydCgnZGlzdC91aV9jY2EnKTtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwibG9hZGluZyB1aV9jY2EuanNcIik7XG4gICAgfVxuICAgIGVsc2UgaWYgKHBhZ2UubW9kZWxfdHlwZSA9PSBcInBhcmFtZXRlci1pbWFnZS1wbHVzXCIpIHtcbiAgICAgIG1vZHVsZSA9IGF3YWl0IGltcG9ydCgnZGlzdC91aV9wYXJhbWV0ZXJfcGx1cycpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJsb2FkaW5nIHVpX3BhcmFtZXRlcl9wbHVzLmpzXCIpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiV2UgZG9uJ3QgcmVjb2duaXplIHRoaXMgbW9kZWwgdHlwZSwgc28gbm90IGxvYWRpbmcgYSBtb2R1bGUuXCIpO1xuICAgIH1cblxuICAgIHJldHVybiBtb2R1bGU7XG4gIH1cblxufSk7Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./web-server/js/slycat-model-main.js\n");

/***/ })

/******/ });