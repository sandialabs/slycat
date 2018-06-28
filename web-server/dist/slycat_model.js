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
/******/ 	deferredModules.push(["./web-server/js/slycat-model-main.js","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_run_comm~c3296245","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseri~6d9dd6a9","vendors~slycat_model~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseries","vendors~slycat_model~ui_cca~ui_parameter_plus~ui_timeseries","slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_run_command~ui_t~c432f948","slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseries"]);
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
eval("/* WEBPACK VAR INJECTION */(function($, module) {\n\nvar _regenerator = __webpack_require__(/*! babel-runtime/regenerator */ \"./node_modules/babel-runtime/regenerator/index.js\");\n\nvar _regenerator2 = _interopRequireDefault(_regenerator);\n\nvar _asyncToGenerator2 = __webpack_require__(/*! babel-runtime/helpers/asyncToGenerator */ \"./node_modules/babel-runtime/helpers/asyncToGenerator.js\");\n\nvar _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatWebClient = __webpack_require__(/*! js/slycat-web-client */ \"./web-server/js/slycat-web-client.js\");\n\nvar _slycatWebClient2 = _interopRequireDefault(_slycatWebClient);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\n__webpack_require__(/*! js/slycat-navbar */ \"./web-server/js/slycat-navbar.js\");\n\nvar _slycatGa = __webpack_require__(/*! js/slycat-ga */ \"./web-server/js/slycat-ga.js\");\n\nvar _slycatGa2 = _interopRequireDefault(_slycatGa);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n  var loadModelTemplate = function () {\n    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {\n      var template, html;\n      return _regenerator2.default.wrap(function _callee$(_context) {\n        while (1) {\n          switch (_context.prev = _context.next) {\n            case 0:\n              // console.log(\"loadModelTemplate, page.model_type is \" + page.model_type);\n\n              template = document.createElement('template');\n              html = \"\";\n\n              if (!(page.model_type == \"parameter-image\")) {\n                _context.next = 8;\n                break;\n              }\n\n              _context.next = 5;\n              return __webpack_require__.e(/*! import() */ 0).then(function() { var module = __webpack_require__(/*! plugins/slycat-parameter-image/ui.html */ \"./web-server/plugins/slycat-parameter-image/ui.html\"); return typeof module === \"object\" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === \"object\" && module, { \"default\": module }); });\n\n            case 5:\n              html = _context.sent;\n              _context.next = 9;\n              break;\n\n            case 8:\n              console.log(\"We don't recognize this model type, so not loading anything.\");\n\n            case 9:\n\n              if (html.default) {\n                html = html.default;\n              }\n              html = html.trim();\n              template.innerHTML = html;\n              return _context.abrupt(\"return\", template.content);\n\n            case 13:\n            case \"end\":\n              return _context.stop();\n          }\n        }\n      }, _callee, this);\n    }));\n\n    return function loadModelTemplate() {\n      return _ref.apply(this, arguments);\n    };\n  }();\n\n  var loadModelModule = function () {\n    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {\n      var template, html;\n      return _regenerator2.default.wrap(function _callee2$(_context2) {\n        while (1) {\n          switch (_context2.prev = _context2.next) {\n            case 0:\n              // console.log(\"loadModelModule, page.model_type is \" + page.model_type);\n\n              template = document.createElement('template');\n              html = \"\";\n\n              if (!(page.model_type == \"parameter-image\")) {\n                _context2.next = 8;\n                break;\n              }\n\n              _context2.next = 5;\n              return __webpack_require__.e(/*! import() */ 1).then(function() { var module = __webpack_require__(/*! dist/ui_parameter_image */ \"./web-server/dist/ui_parameter_image.js\"); return typeof module === \"object\" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === \"object\" && module, { \"default\": module }); });\n\n            case 5:\n              module = _context2.sent;\n              _context2.next = 9;\n              break;\n\n            case 8:\n              console.log(\"We don't recognize this model type, so not loading anything.\");\n\n            case 9:\n              return _context2.abrupt(\"return\", module);\n\n            case 10:\n            case \"end\":\n              return _context2.stop();\n          }\n        }\n      }, _callee2, this);\n    }));\n\n    return function loadModelModule() {\n      return _ref2.apply(this, arguments);\n    };\n  }();\n\n  // Enable knockout\n  var mid = (0, _urijs2.default)(window.location).segment(-1);\n  var page = {};\n  page.model_id = mid;\n  page.title = _knockout2.default.observable();\n  _slycatWebClient2.default.get_model({\n    mid: mid,\n    success: function success(result) {\n      // console.log(\"success of client.get_model in slycat-model-main.js\");\n      page.model_name = result.name;\n      window.model_name = page.model_name;\n      page.title(page.model_name + \" - Slycat Model\");\n      page.project_id = result.project;\n      page.model_type = result[\"model-type\"];\n      _knockout2.default.applyBindings(page, document.querySelector(\"slycat-navbar\"));\n      loadModelTemplate().then(function (component) {\n        // console.log(\"inside loadModelTemplate().then()\");\n        document.querySelector(\".slycat-content\").appendChild(component);\n        _knockout2.default.applyBindings(page, document.querySelector(\"head\"));\n        loadModelModule().then(function (component) {\n          // console.log(\"inside loadModelModule().then()\");\n          // ko.applyBindings(page, document.querySelector(\".slycat-content\"));\n        });\n      });\n    },\n    error: function error() {\n      console.log(\"Error retrieving model.\");\n    }\n  });\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\"), __webpack_require__(/*! ./../../node_modules/webpack/buildin/module.js */ \"./node_modules/webpack/buildin/module.js\")(module)))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1tb2RlbC1tYWluLmpzPzQ5YTYiXSwibmFtZXMiOlsiJCIsImRvY3VtZW50IiwicmVhZHkiLCJ0ZW1wbGF0ZSIsImNyZWF0ZUVsZW1lbnQiLCJodG1sIiwicGFnZSIsIm1vZGVsX3R5cGUiLCJjb25zb2xlIiwibG9nIiwiZGVmYXVsdCIsInRyaW0iLCJpbm5lckhUTUwiLCJjb250ZW50IiwibG9hZE1vZGVsVGVtcGxhdGUiLCJtb2R1bGUiLCJsb2FkTW9kZWxNb2R1bGUiLCJtaWQiLCJ3aW5kb3ciLCJsb2NhdGlvbiIsInNlZ21lbnQiLCJtb2RlbF9pZCIsInRpdGxlIiwia28iLCJvYnNlcnZhYmxlIiwiY2xpZW50IiwiZ2V0X21vZGVsIiwic3VjY2VzcyIsInJlc3VsdCIsIm1vZGVsX25hbWUiLCJuYW1lIiwicHJvamVjdF9pZCIsInByb2plY3QiLCJhcHBseUJpbmRpbmdzIiwicXVlcnlTZWxlY3RvciIsInRoZW4iLCJhcHBlbmRDaGlsZCIsImNvbXBvbmVudCIsImVycm9yIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBS0E7O0FBQ0E7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7O0FBQ0E7Ozs7OztBQUVBO0FBQ0FBLEVBQUVDLFFBQUYsRUFBWUMsS0FBWixDQUFrQixZQUFXO0FBQUE7QUFBQSx3RkFvQzNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNFOztBQUVJQyxzQkFITixHQUdpQkYsU0FBU0csYUFBVCxDQUF1QixVQUF2QixDQUhqQjtBQUlNQyxrQkFKTixHQUlhLEVBSmI7O0FBQUEsb0JBTU1DLEtBQUtDLFVBQUwsSUFBbUIsaUJBTnpCO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQUEscUJBT2lCLDJYQVBqQjs7QUFBQTtBQU9JRixrQkFQSjtBQUFBO0FBQUE7O0FBQUE7QUFVSUcsc0JBQVFDLEdBQVIsQ0FBWSw4REFBWjs7QUFWSjs7QUFhRSxrQkFBSUosS0FBS0ssT0FBVCxFQUFrQjtBQUNoQkwsdUJBQU9BLEtBQUtLLE9BQVo7QUFDRDtBQUNETCxxQkFBT0EsS0FBS00sSUFBTCxFQUFQO0FBQ0FSLHVCQUFTUyxTQUFULEdBQXFCUCxJQUFyQjtBQWpCRiwrQ0FrQlNGLFNBQVNVLE9BbEJsQjs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxLQXBDMkI7O0FBQUEsb0JBb0NaQyxpQkFwQ1k7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFBQSx5RkF5RDNCO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUNFOztBQUVJWCxzQkFITixHQUdpQkYsU0FBU0csYUFBVCxDQUF1QixVQUF2QixDQUhqQjtBQUlNQyxrQkFKTixHQUlhLEVBSmI7O0FBQUEsb0JBTU1DLEtBQUtDLFVBQUwsSUFBbUIsaUJBTnpCO0FBQUE7QUFBQTtBQUFBOztBQUFBO0FBQUEscUJBT21CLGdXQVBuQjs7QUFBQTtBQU9JUSxvQkFQSjtBQUFBO0FBQUE7O0FBQUE7QUFVSVAsc0JBQVFDLEdBQVIsQ0FBWSw4REFBWjs7QUFWSjtBQUFBLGdEQWFTTSxNQWJUOztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEtBekQyQjs7QUFBQSxvQkF5RFpDLGVBekRZO0FBQUE7QUFBQTtBQUFBOztBQUUzQjtBQUNBLE1BQUlDLE1BQU0scUJBQUlDLE9BQU9DLFFBQVgsRUFBcUJDLE9BQXJCLENBQTZCLENBQUMsQ0FBOUIsQ0FBVjtBQUNBLE1BQUlkLE9BQU8sRUFBWDtBQUNBQSxPQUFLZSxRQUFMLEdBQWdCSixHQUFoQjtBQUNBWCxPQUFLZ0IsS0FBTCxHQUFhQyxtQkFBR0MsVUFBSCxFQUFiO0FBQ0FDLDRCQUFPQyxTQUFQLENBQ0E7QUFDRVQsU0FBS0EsR0FEUDtBQUVFVSxhQUFTLGlCQUFTQyxNQUFULEVBQ1Q7QUFDRTtBQUNBdEIsV0FBS3VCLFVBQUwsR0FBa0JELE9BQU9FLElBQXpCO0FBQ0FaLGFBQU9XLFVBQVAsR0FBb0J2QixLQUFLdUIsVUFBekI7QUFDQXZCLFdBQUtnQixLQUFMLENBQVdoQixLQUFLdUIsVUFBTCxHQUFrQixpQkFBN0I7QUFDQXZCLFdBQUt5QixVQUFMLEdBQWtCSCxPQUFPSSxPQUF6QjtBQUNBMUIsV0FBS0MsVUFBTCxHQUFrQnFCLE9BQU8sWUFBUCxDQUFsQjtBQUNBTCx5QkFBR1UsYUFBSCxDQUFpQjNCLElBQWpCLEVBQXVCTCxTQUFTaUMsYUFBVCxDQUF1QixlQUF2QixDQUF2QjtBQUNBcEIsMEJBQW9CcUIsSUFBcEIsQ0FBeUIscUJBQWE7QUFDcEM7QUFDQWxDLGlCQUFTaUMsYUFBVCxDQUF1QixpQkFBdkIsRUFBMENFLFdBQTFDLENBQXNEQyxTQUF0RDtBQUNBZCwyQkFBR1UsYUFBSCxDQUFpQjNCLElBQWpCLEVBQXVCTCxTQUFTaUMsYUFBVCxDQUF1QixNQUF2QixDQUF2QjtBQUNBbEIsMEJBQWtCbUIsSUFBbEIsQ0FBdUIscUJBQWE7QUFDbEM7QUFDQTtBQUNELFNBSEQ7QUFJRCxPQVJEO0FBVUQsS0FyQkg7QUFzQkVHLFdBQU8saUJBQ1A7QUFDRTlCLGNBQVFDLEdBQVIsQ0FBWSx5QkFBWjtBQUNEO0FBekJILEdBREE7QUFrRUQsQ0F6RUQsRSxDQWZBOzs7O0FBSUEsZ0IiLCJmaWxlIjoiLi93ZWItc2VydmVyL2pzL3NseWNhdC1tb2RlbC1tYWluLmpzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogQ29weXJpZ2h0IChjKSAyMDEzLCAyMDE4IE5hdGlvbmFsIFRlY2hub2xvZ3kgYW5kIEVuZ2luZWVyaW5nIFNvbHV0aW9ucyBvZiBTYW5kaWEsIExMQyAuIFVuZGVyIHRoZSB0ZXJtcyBvZiBDb250cmFjdFxuIERFLU5BMDAwMzUyNSB3aXRoIE5hdGlvbmFsIFRlY2hub2xvZ3kgYW5kIEVuZ2luZWVyaW5nIFNvbHV0aW9ucyBvZiBTYW5kaWEsIExMQywgdGhlIFUuUy4gR292ZXJubWVudFxuIHJldGFpbnMgY2VydGFpbiByaWdodHMgaW4gdGhpcyBzb2Z0d2FyZS4gKi9cblxuLy8gQ1NTIHJlc291cmNlc1xuaW1wb3J0IFwiY3NzL25hbWVzcGFjZWQtYm9vdHN0cmFwLmxlc3NcIjtcbmltcG9ydCBcImNzcy9zbHljYXQuY3NzXCI7XG5cbmltcG9ydCBjbGllbnQgZnJvbSBcImpzL3NseWNhdC13ZWItY2xpZW50XCI7XG5pbXBvcnQga28gZnJvbSBcImtub2Nrb3V0XCI7XG5pbXBvcnQgVVJJIGZyb20gXCJ1cmlqc1wiO1xuaW1wb3J0IFwianMvc2x5Y2F0LW5hdmJhclwiO1xuaW1wb3J0IGdhIGZyb20gXCJqcy9zbHljYXQtZ2FcIjtcblxuLy8gV2FpdCBmb3IgZG9jdW1lbnQgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuXG4gIC8vIEVuYWJsZSBrbm9ja291dFxuICB2YXIgbWlkID0gVVJJKHdpbmRvdy5sb2NhdGlvbikuc2VnbWVudCgtMSk7XG4gIHZhciBwYWdlID0ge307XG4gIHBhZ2UubW9kZWxfaWQgPSBtaWQ7XG4gIHBhZ2UudGl0bGUgPSBrby5vYnNlcnZhYmxlKCk7XG4gIGNsaWVudC5nZXRfbW9kZWwoXG4gIHtcbiAgICBtaWQ6IG1pZCxcbiAgICBzdWNjZXNzOiBmdW5jdGlvbihyZXN1bHQpXG4gICAge1xuICAgICAgLy8gY29uc29sZS5sb2coXCJzdWNjZXNzIG9mIGNsaWVudC5nZXRfbW9kZWwgaW4gc2x5Y2F0LW1vZGVsLW1haW4uanNcIik7XG4gICAgICBwYWdlLm1vZGVsX25hbWUgPSByZXN1bHQubmFtZTtcbiAgICAgIHdpbmRvdy5tb2RlbF9uYW1lID0gcGFnZS5tb2RlbF9uYW1lO1xuICAgICAgcGFnZS50aXRsZShwYWdlLm1vZGVsX25hbWUgKyBcIiAtIFNseWNhdCBNb2RlbFwiKTtcbiAgICAgIHBhZ2UucHJvamVjdF9pZCA9IHJlc3VsdC5wcm9qZWN0O1xuICAgICAgcGFnZS5tb2RlbF90eXBlID0gcmVzdWx0W1wibW9kZWwtdHlwZVwiXTtcbiAgICAgIGtvLmFwcGx5QmluZGluZ3MocGFnZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcInNseWNhdC1uYXZiYXJcIikpO1xuICAgICAgbG9hZE1vZGVsVGVtcGxhdGUoKS50aGVuKGNvbXBvbmVudCA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiaW5zaWRlIGxvYWRNb2RlbFRlbXBsYXRlKCkudGhlbigpXCIpO1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnNseWNhdC1jb250ZW50XCIpLmFwcGVuZENoaWxkKGNvbXBvbmVudCk7XG4gICAgICAgIGtvLmFwcGx5QmluZGluZ3MocGFnZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImhlYWRcIikpO1xuICAgICAgICBsb2FkTW9kZWxNb2R1bGUoKS50aGVuKGNvbXBvbmVudCA9PiB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coXCJpbnNpZGUgbG9hZE1vZGVsTW9kdWxlKCkudGhlbigpXCIpO1xuICAgICAgICAgIC8vIGtvLmFwcGx5QmluZGluZ3MocGFnZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5zbHljYXQtY29udGVudFwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbigpXG4gICAge1xuICAgICAgY29uc29sZS5sb2coXCJFcnJvciByZXRyaWV2aW5nIG1vZGVsLlwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2RlbFRlbXBsYXRlKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibG9hZE1vZGVsVGVtcGxhdGUsIHBhZ2UubW9kZWxfdHlwZSBpcyBcIiArIHBhZ2UubW9kZWxfdHlwZSk7XG5cbiAgICB2YXIgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIHZhciBodG1sID0gXCJcIjtcblxuICAgIGlmIChwYWdlLm1vZGVsX3R5cGUgPT0gXCJwYXJhbWV0ZXItaW1hZ2VcIikge1xuICAgICAgaHRtbCA9IGF3YWl0IGltcG9ydCgncGx1Z2lucy9zbHljYXQtcGFyYW1ldGVyLWltYWdlL3VpLmh0bWwnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcIldlIGRvbid0IHJlY29nbml6ZSB0aGlzIG1vZGVsIHR5cGUsIHNvIG5vdCBsb2FkaW5nIGFueXRoaW5nLlwiKTtcbiAgICB9XG5cbiAgICBpZiAoaHRtbC5kZWZhdWx0KSB7XG4gICAgICBodG1sID0gaHRtbC5kZWZhdWx0O1xuICAgIH1cbiAgICBodG1sID0gaHRtbC50cmltKCk7XG4gICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICByZXR1cm4gdGVtcGxhdGUuY29udGVudDtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2RlbE1vZHVsZSgpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImxvYWRNb2RlbE1vZHVsZSwgcGFnZS5tb2RlbF90eXBlIGlzIFwiICsgcGFnZS5tb2RlbF90eXBlKTtcblxuICAgIHZhciB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgdmFyIGh0bWwgPSBcIlwiO1xuXG4gICAgaWYgKHBhZ2UubW9kZWxfdHlwZSA9PSBcInBhcmFtZXRlci1pbWFnZVwiKSB7XG4gICAgICBtb2R1bGUgPSBhd2FpdCBpbXBvcnQoJ2Rpc3QvdWlfcGFyYW1ldGVyX2ltYWdlJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJXZSBkb24ndCByZWNvZ25pemUgdGhpcyBtb2RlbCB0eXBlLCBzbyBub3QgbG9hZGluZyBhbnl0aGluZy5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1vZHVsZTtcbiAgfVxuXG59KTsiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./web-server/js/slycat-model-main.js\n");

/***/ })

/******/ });