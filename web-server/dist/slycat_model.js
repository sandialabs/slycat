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
/******/
/******/ 				script.charset = 'utf-8';
/******/ 				script.timeout = 120;
/******/
/******/ 				if (__webpack_require__.nc) {
/******/ 					script.setAttribute("nonce", __webpack_require__.nc);
/******/ 				}
/******/ 				script.src = jsonpScriptSrc(chunkId);
/******/ 				var timeout = setTimeout(function(){
/******/ 					onScriptComplete({ type: 'timeout', target: script });
/******/ 				}, 120000);
/******/ 				script.onerror = script.onload = onScriptComplete;
/******/ 				function onScriptComplete(event) {
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
eval("/* WEBPACK VAR INJECTION */(function($, module) {\n\nvar _regenerator = __webpack_require__(/*! babel-runtime/regenerator */ \"./node_modules/babel-runtime/regenerator/index.js\");\n\nvar _regenerator2 = _interopRequireDefault(_regenerator);\n\nvar _asyncToGenerator2 = __webpack_require__(/*! babel-runtime/helpers/asyncToGenerator */ \"./node_modules/babel-runtime/helpers/asyncToGenerator.js\");\n\nvar _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatWebClient = __webpack_require__(/*! js/slycat-web-client */ \"./web-server/js/slycat-web-client.js\");\n\nvar _slycatWebClient2 = _interopRequireDefault(_slycatWebClient);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\n__webpack_require__(/*! js/slycat-navbar */ \"./web-server/js/slycat-navbar.js\");\n\nvar _slycatGa = __webpack_require__(/*! js/slycat-ga */ \"./web-server/js/slycat-ga.js\");\n\nvar _slycatGa2 = _interopRequireDefault(_slycatGa);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n  var loadModelTemplate = function () {\n    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {\n      var template, html;\n      return _regenerator2.default.wrap(function _callee$(_context) {\n        while (1) {\n          switch (_context.prev = _context.next) {\n            case 0:\n              // console.log(\"loadModelTemplate, page.model_type is \" + page.model_type);\n\n              template = document.createElement('template');\n              html = \"\";\n\n              if (!(page.model_type == \"parameter-image\")) {\n                _context.next = 8;\n                break;\n              }\n\n              _context.next = 5;\n              return __webpack_require__.e(/*! import() */ 0).then(function() { var module = __webpack_require__(/*! plugins/slycat-parameter-image/ui.html */ \"./web-server/plugins/slycat-parameter-image/ui.html\"); return typeof module === \"object\" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === \"object\" && module, { \"default\": module }); });\n\n            case 5:\n              html = _context.sent;\n              _context.next = 15;\n              break;\n\n            case 8:\n              if (!(page.model_type == \"timeseries\")) {\n                _context.next = 14;\n                break;\n              }\n\n              _context.next = 11;\n              return __webpack_require__.e(/*! import() */ 1).then(function() { var module = __webpack_require__(/*! plugins/slycat-timeseries-model/ui.html */ \"./web-server/plugins/slycat-timeseries-model/ui.html\"); return typeof module === \"object\" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === \"object\" && module, { \"default\": module }); });\n\n            case 11:\n              html = _context.sent;\n              _context.next = 15;\n              break;\n\n            case 14:\n              console.log(\"We don't recognize this model type, so not loading a template.\");\n\n            case 15:\n\n              if (html.default) {\n                html = html.default;\n              }\n              html = html.trim();\n              template.innerHTML = html;\n              return _context.abrupt(\"return\", template.content);\n\n            case 19:\n            case \"end\":\n              return _context.stop();\n          }\n        }\n      }, _callee, this);\n    }));\n\n    return function loadModelTemplate() {\n      return _ref.apply(this, arguments);\n    };\n  }();\n\n  var loadModelModule = function () {\n    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {\n      var template, html;\n      return _regenerator2.default.wrap(function _callee2$(_context2) {\n        while (1) {\n          switch (_context2.prev = _context2.next) {\n            case 0:\n              // console.log(\"loadModelModule, page.model_type is \" + page.model_type);\n\n              template = document.createElement('template');\n              html = \"\";\n\n              if (!(page.model_type == \"parameter-image\")) {\n                _context2.next = 8;\n                break;\n              }\n\n              _context2.next = 5;\n              return __webpack_require__.e(/*! import() */ 2).then(function() { var module = __webpack_require__(/*! dist/ui_parameter_image */ \"./web-server/dist/ui_parameter_image.js\"); return typeof module === \"object\" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === \"object\" && module, { \"default\": module }); });\n\n            case 5:\n              module = _context2.sent;\n              _context2.next = 15;\n              break;\n\n            case 8:\n              if (!(page.model_type == \"timeseries\")) {\n                _context2.next = 14;\n                break;\n              }\n\n              _context2.next = 11;\n              return __webpack_require__.e(/*! import() */ 3).then(function() { var module = __webpack_require__(/*! dist/ui_timeseries */ \"./web-server/dist/ui_timeseries.js\"); return typeof module === \"object\" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === \"object\" && module, { \"default\": module }); });\n\n            case 11:\n              module = _context2.sent;\n              _context2.next = 15;\n              break;\n\n            case 14:\n              console.log(\"We don't recognize this model type, so not loading a module.\");\n\n            case 15:\n              return _context2.abrupt(\"return\", module);\n\n            case 16:\n            case \"end\":\n              return _context2.stop();\n          }\n        }\n      }, _callee2, this);\n    }));\n\n    return function loadModelModule() {\n      return _ref2.apply(this, arguments);\n    };\n  }();\n\n  // Enable knockout\n  var mid = (0, _urijs2.default)(window.location).segment(-1);\n  var page = {};\n  page.model_id = mid;\n  page.title = _knockout2.default.observable();\n  _slycatWebClient2.default.get_model({\n    mid: mid,\n    success: function success(result) {\n      // console.log(\"success of client.get_model in slycat-model-main.js\");\n      page.model_name = result.name;\n      window.model_name = page.model_name;\n      page.title(page.model_name + \" - Slycat Model\");\n      page.project_id = result.project;\n      page.model_type = result[\"model-type\"];\n      _knockout2.default.applyBindings(page, document.querySelector(\"slycat-navbar\"));\n      loadModelTemplate().then(function (component) {\n        // console.log(\"inside loadModelTemplate().then()\");\n        document.querySelector(\".slycat-content\").appendChild(component);\n        _knockout2.default.applyBindings(page, document.querySelector(\"head\"));\n        loadModelModule().then(function (component) {\n          // console.log(\"inside loadModelModule().then()\");\n          // ko.applyBindings(page, document.querySelector(\".slycat-content\"));\n        });\n      });\n    },\n    error: function error() {\n      console.log(\"Error retrieving model.\");\n    }\n  });\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\"), __webpack_require__(/*! ./../../node_modules/webpack/buildin/module.js */ \"./node_modules/webpack/buildin/module.js\")(module)))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1tb2RlbC1tYWluLmpzPzQ5YTYiXSwibmFtZXMiOlsiJCIsImRvY3VtZW50IiwicmVhZHkiLCJ0ZW1wbGF0ZSIsImNyZWF0ZUVsZW1lbnQiLCJodG1sIiwicGFnZSIsIm1vZGVsX3R5cGUiLCJjb25zb2xlIiwibG9nIiwiZGVmYXVsdCIsInRyaW0iLCJpbm5lckhUTUwiLCJjb250ZW50IiwibG9hZE1vZGVsVGVtcGxhdGUiLCJtb2R1bGUiLCJsb2FkTW9kZWxNb2R1bGUiLCJtaWQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlZ21lbnQiLCJtb2RlbF9pZCIsInRpdGxlIiwia28iLCJvYnNlcnZhYmxlIiwiY2xpZW50IiwiZ2V0X21vZGVsIiwic3VjY2VzcyIsInJlc3VsdCIsIm1vZGVsX25hbWUiLCJuYW1lIiwicHJvamVjdF9pZCIsInByb2plY3QiLCJhcHBseUJpbmRpbmdzIiwicXVlcnlTZWxlY3RvciIsInRoZW4iLCJhcHBlbmRDaGlsZCIsImNvbXBvbmVudCIsImVycm9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBS0E7O0FBQ0E7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVBO0FBQ0FBLEVBQUVDLFFBQUYsRUFBWUMsS0FBWixDQUFrQixZQUFXO0FBQUE7QUFBQSx3RkFvQzNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNFOztBQUVJQyxzQkFITixHQUdpQkYsU0FBU0csYUFBVCxDQUF1QixVQUF2QixDQUhqQjtBQUlNQyxrQkFKTixHQUlhLEVBSmI7O0FBQUEsb0JBTU1DLEtBQUtDLFVBQUwsSUFBbUIsaUJBTnpCO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQUEscUJBT2lCLDJYQVBqQjs7QUFBQTtBQU9JRixrQkFQSjtBQUFBO0FBQUE7O0FBQUE7QUFBQSxvQkFTV0MsS0FBS0MsVUFBTCxJQUFtQixZQVQ5QjtBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUFBLHFCQVVpQiw2WEFWakI7O0FBQUE7QUFVSUYsa0JBVko7QUFBQTtBQUFBOztBQUFBO0FBYUlHLHNCQUFRQyxHQUFSLENBQVksZ0VBQVo7O0FBYko7O0FBZ0JFLGtCQUFJSixLQUFLSyxPQUFULEVBQWtCO0FBQ2hCTCx1QkFBT0EsS0FBS0ssT0FBWjtBQUNEO0FBQ0RMLHFCQUFPQSxLQUFLTSxJQUFMLEVBQVA7QUFDQVIsdUJBQVNTLFNBQVQsR0FBcUJQLElBQXJCO0FBcEJGLCtDQXFCU0YsU0FBU1UsT0FyQmxCOztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEtBcEMyQjs7QUFBQSxvQkFvQ1pDLGlCQXBDWTtBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUFBLHlGQTREM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQ0U7O0FBRUlYLHNCQUhOLEdBR2lCRixTQUFTRyxhQUFULENBQXVCLFVBQXZCLENBSGpCO0FBSU1DLGtCQUpOLEdBSWEsRUFKYjs7QUFBQSxvQkFNTUMsS0FBS0MsVUFBTCxJQUFtQixpQkFOekI7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFBQSxxQkFPbUIsZ1dBUG5COztBQUFBO0FBT0lRLG9CQVBKO0FBQUE7QUFBQTs7QUFBQTtBQUFBLG9CQVVXVCxLQUFLQyxVQUFMLElBQW1CLFlBVjlCO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQUEscUJBV21CLHNWQVhuQjs7QUFBQTtBQVdJUSxvQkFYSjtBQUFBO0FBQUE7O0FBQUE7QUFlSVAsc0JBQVFDLEdBQVIsQ0FBWSw4REFBWjs7QUFmSjtBQUFBLGdEQWtCU00sTUFsQlQ7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsS0E1RDJCOztBQUFBLG9CQTREWkMsZUE1RFk7QUFBQTtBQUFBO0FBQUE7O0FBRTNCO0FBQ0EsTUFBSUMsTUFBTSxxQkFBSUMsT0FBT0MsUUFBWCxFQUFxQkMsT0FBckIsQ0FBNkIsQ0FBQyxDQUE5QixDQUFWO0FBQ0EsTUFBSWQsT0FBTyxFQUFYO0FBQ0FBLE9BQUtlLFFBQUwsR0FBZ0JKLEdBQWhCO0FBQ0FYLE9BQUtnQixLQUFMLEdBQWFDLG1CQUFHQyxVQUFILEVBQWI7QUFDQUMsNEJBQU9DLFNBQVAsQ0FDQTtBQUNFVCxTQUFLQSxHQURQO0FBRUVVLGFBQVMsaUJBQVNDLE1BQVQsRUFDVDtBQUNFO0FBQ0F0QixXQUFLdUIsVUFBTCxHQUFrQkQsT0FBT0UsSUFBekI7QUFDQVosYUFBT1csVUFBUCxHQUFvQnZCLEtBQUt1QixVQUF6QjtBQUNBdkIsV0FBS2dCLEtBQUwsQ0FBV2hCLEtBQUt1QixVQUFMLEdBQWtCLGlCQUE3QjtBQUNBdkIsV0FBS3lCLFVBQUwsR0FBa0JILE9BQU9JLE9BQXpCO0FBQ0ExQixXQUFLQyxVQUFMLEdBQWtCcUIsT0FBTyxZQUFQLENBQWxCO0FBQ0FMLHlCQUFHVSxhQUFILENBQWlCM0IsSUFBakIsRUFBdUJMLFNBQVNpQyxhQUFULENBQXVCLGVBQXZCLENBQXZCO0FBQ0FwQiwwQkFBb0JxQixJQUFwQixDQUF5QixxQkFBYTtBQUNwQztBQUNBbEMsaUJBQVNpQyxhQUFULENBQXVCLGlCQUF2QixFQUEwQ0UsV0FBMUMsQ0FBc0RDLFNBQXREO0FBQ0FkLDJCQUFHVSxhQUFILENBQWlCM0IsSUFBakIsRUFBdUJMLFNBQVNpQyxhQUFULENBQXVCLE1BQXZCLENBQXZCO0FBQ0FsQiwwQkFBa0JtQixJQUFsQixDQUF1QixxQkFBYTtBQUNsQztBQUNBO0FBQ0QsU0FIRDtBQUlELE9BUkQ7QUFVRCxLQXJCSDtBQXNCRUcsV0FBTyxpQkFDUDtBQUNFOUIsY0FBUUMsR0FBUixDQUFZLHlCQUFaO0FBQ0Q7QUF6QkgsR0FEQTtBQTBFRCxDQWpGRCxFLENBZkE7Ozs7QUFJQSxnQiIsImZpbGUiOiIuL3dlYi1zZXJ2ZXIvanMvc2x5Y2F0LW1vZGVsLW1haW4uanMuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBDb3B5cmlnaHQgKGMpIDIwMTMsIDIwMTggTmF0aW9uYWwgVGVjaG5vbG9neSBhbmQgRW5naW5lZXJpbmcgU29sdXRpb25zIG9mIFNhbmRpYSwgTExDIC4gVW5kZXIgdGhlIHRlcm1zIG9mIENvbnRyYWN0XG4gREUtTkEwMDAzNTI1IHdpdGggTmF0aW9uYWwgVGVjaG5vbG9neSBhbmQgRW5naW5lZXJpbmcgU29sdXRpb25zIG9mIFNhbmRpYSwgTExDLCB0aGUgVS5TLiBHb3Zlcm5tZW50XG4gcmV0YWlucyBjZXJ0YWluIHJpZ2h0cyBpbiB0aGlzIHNvZnR3YXJlLiAqL1xuXG4vLyBDU1MgcmVzb3VyY2VzXG5pbXBvcnQgXCJjc3MvbmFtZXNwYWNlZC1ib290c3RyYXAubGVzc1wiO1xuaW1wb3J0IFwiY3NzL3NseWNhdC5jc3NcIjtcblxuaW1wb3J0IGNsaWVudCBmcm9tIFwianMvc2x5Y2F0LXdlYi1jbGllbnRcIjtcbmltcG9ydCBrbyBmcm9tIFwia25vY2tvdXRcIjtcbmltcG9ydCBVUkkgZnJvbSBcInVyaWpzXCI7XG5pbXBvcnQgXCJqcy9zbHljYXQtbmF2YmFyXCI7XG5pbXBvcnQgZ2EgZnJvbSBcImpzL3NseWNhdC1nYVwiO1xuXG4vLyBXYWl0IGZvciBkb2N1bWVudCByZWFkeVxuJChkb2N1bWVudCkucmVhZHkoZnVuY3Rpb24oKSB7XG5cbiAgLy8gRW5hYmxlIGtub2Nrb3V0XG4gIHZhciBtaWQgPSBVUkkod2luZG93LmxvY2F0aW9uKS5zZWdtZW50KC0xKTtcbiAgdmFyIHBhZ2UgPSB7fTtcbiAgcGFnZS5tb2RlbF9pZCA9IG1pZDtcbiAgcGFnZS50aXRsZSA9IGtvLm9ic2VydmFibGUoKTtcbiAgY2xpZW50LmdldF9tb2RlbChcbiAge1xuICAgIG1pZDogbWlkLFxuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3VsdClcbiAgICB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhcInN1Y2Nlc3Mgb2YgY2xpZW50LmdldF9tb2RlbCBpbiBzbHljYXQtbW9kZWwtbWFpbi5qc1wiKTtcbiAgICAgIHBhZ2UubW9kZWxfbmFtZSA9IHJlc3VsdC5uYW1lO1xuICAgICAgd2luZG93Lm1vZGVsX25hbWUgPSBwYWdlLm1vZGVsX25hbWU7XG4gICAgICBwYWdlLnRpdGxlKHBhZ2UubW9kZWxfbmFtZSArIFwiIC0gU2x5Y2F0IE1vZGVsXCIpO1xuICAgICAgcGFnZS5wcm9qZWN0X2lkID0gcmVzdWx0LnByb2plY3Q7XG4gICAgICBwYWdlLm1vZGVsX3R5cGUgPSByZXN1bHRbXCJtb2RlbC10eXBlXCJdO1xuICAgICAga28uYXBwbHlCaW5kaW5ncyhwYWdlLCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwic2x5Y2F0LW5hdmJhclwiKSk7XG4gICAgICBsb2FkTW9kZWxUZW1wbGF0ZSgpLnRoZW4oY29tcG9uZW50ID0+IHtcbiAgICAgICAgLy8gY29uc29sZS5sb2coXCJpbnNpZGUgbG9hZE1vZGVsVGVtcGxhdGUoKS50aGVuKClcIik7XG4gICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuc2x5Y2F0LWNvbnRlbnRcIikuYXBwZW5kQ2hpbGQoY29tcG9uZW50KTtcbiAgICAgICAga28uYXBwbHlCaW5kaW5ncyhwYWdlLCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaGVhZFwiKSk7XG4gICAgICAgIGxvYWRNb2RlbE1vZHVsZSgpLnRoZW4oY29tcG9uZW50ID0+IHtcbiAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImluc2lkZSBsb2FkTW9kZWxNb2R1bGUoKS50aGVuKClcIik7XG4gICAgICAgICAgLy8ga28uYXBwbHlCaW5kaW5ncyhwYWdlLCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnNseWNhdC1jb250ZW50XCIpKTtcbiAgICAgICAgfSk7XG4gICAgICB9KTtcblxuICAgIH0sXG4gICAgZXJyb3I6IGZ1bmN0aW9uKClcbiAgICB7XG4gICAgICBjb25zb2xlLmxvZyhcIkVycm9yIHJldHJpZXZpbmcgbW9kZWwuXCIpO1xuICAgIH1cbiAgfSk7XG5cbiAgYXN5bmMgZnVuY3Rpb24gbG9hZE1vZGVsVGVtcGxhdGUoKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsb2FkTW9kZWxUZW1wbGF0ZSwgcGFnZS5tb2RlbF90eXBlIGlzIFwiICsgcGFnZS5tb2RlbF90eXBlKTtcblxuICAgIHZhciB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgdmFyIGh0bWwgPSBcIlwiO1xuXG4gICAgaWYgKHBhZ2UubW9kZWxfdHlwZSA9PSBcInBhcmFtZXRlci1pbWFnZVwiKSB7XG4gICAgICBodG1sID0gYXdhaXQgaW1wb3J0KCdwbHVnaW5zL3NseWNhdC1wYXJhbWV0ZXItaW1hZ2UvdWkuaHRtbCcpO1xuICAgIH1cbiAgICBlbHNlIGlmIChwYWdlLm1vZGVsX3R5cGUgPT0gXCJ0aW1lc2VyaWVzXCIpIHtcbiAgICAgIGh0bWwgPSBhd2FpdCBpbXBvcnQoJ3BsdWdpbnMvc2x5Y2F0LXRpbWVzZXJpZXMtbW9kZWwvdWkuaHRtbCcpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKFwiV2UgZG9uJ3QgcmVjb2duaXplIHRoaXMgbW9kZWwgdHlwZSwgc28gbm90IGxvYWRpbmcgYSB0ZW1wbGF0ZS5cIik7XG4gICAgfVxuXG4gICAgaWYgKGh0bWwuZGVmYXVsdCkge1xuICAgICAgaHRtbCA9IGh0bWwuZGVmYXVsdDtcbiAgICB9XG4gICAgaHRtbCA9IGh0bWwudHJpbSgpO1xuICAgIHRlbXBsYXRlLmlubmVySFRNTCA9IGh0bWw7XG4gICAgcmV0dXJuIHRlbXBsYXRlLmNvbnRlbnQ7XG4gIH1cblxuICBhc3luYyBmdW5jdGlvbiBsb2FkTW9kZWxNb2R1bGUoKSB7XG4gICAgLy8gY29uc29sZS5sb2coXCJsb2FkTW9kZWxNb2R1bGUsIHBhZ2UubW9kZWxfdHlwZSBpcyBcIiArIHBhZ2UubW9kZWxfdHlwZSk7XG5cbiAgICB2YXIgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIHZhciBodG1sID0gXCJcIjtcblxuICAgIGlmIChwYWdlLm1vZGVsX3R5cGUgPT0gXCJwYXJhbWV0ZXItaW1hZ2VcIikge1xuICAgICAgbW9kdWxlID0gYXdhaXQgaW1wb3J0KCdkaXN0L3VpX3BhcmFtZXRlcl9pbWFnZScpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJsb2FkaW5nIHVpX3BhcmFtZXRlcl9pbWFnZS5qc1wiKTtcbiAgICB9XG4gICAgZWxzZSBpZiAocGFnZS5tb2RlbF90eXBlID09IFwidGltZXNlcmllc1wiKSB7XG4gICAgICBtb2R1bGUgPSBhd2FpdCBpbXBvcnQoJ2Rpc3QvdWlfdGltZXNlcmllcycpO1xuICAgICAgLy8gY29uc29sZS5sb2coXCJsb2FkaW5nIHVpX3BhcmFtZXRlcl9pbWFnZS5qc1wiKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcIldlIGRvbid0IHJlY29nbml6ZSB0aGlzIG1vZGVsIHR5cGUsIHNvIG5vdCBsb2FkaW5nIGEgbW9kdWxlLlwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbW9kdWxlO1xuICB9XG5cbn0pOyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./web-server/js/slycat-model-main.js\n");

/***/ })

/******/ });