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
/******/ 	deferredModules.push(["./web-server/js/slycat-model-main-webpack.js","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_run_comm~c3296245","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseri~6d9dd6a9","vendors~slycat_model~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseries","vendors~slycat_model~ui_cca~ui_parameter_plus~ui_timeseries","slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_run_command~ui_t~c432f948","slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_plus~ui_timeseries"]);
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

/***/ "./web-server/js/slycat-model-main-webpack.js":
/*!****************************************************!*\
  !*** ./web-server/js/slycat-model-main-webpack.js ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($, module) {\n\nvar _regenerator = __webpack_require__(/*! babel-runtime/regenerator */ \"./node_modules/babel-runtime/regenerator/index.js\");\n\nvar _regenerator2 = _interopRequireDefault(_regenerator);\n\nvar _asyncToGenerator2 = __webpack_require__(/*! babel-runtime/helpers/asyncToGenerator */ \"./node_modules/babel-runtime/helpers/asyncToGenerator.js\");\n\nvar _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _slycatWebClientWebpack = __webpack_require__(/*! ./slycat-web-client-webpack */ \"./web-server/js/slycat-web-client-webpack.js\");\n\nvar _slycatWebClientWebpack2 = _interopRequireDefault(_slycatWebClientWebpack);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\n__webpack_require__(/*! js/slycat-navbar-webpack */ \"./web-server/js/slycat-navbar-webpack.js\");\n\nvar _slycatGa = __webpack_require__(/*! js/slycat-ga */ \"./web-server/js/slycat-ga.js\");\n\nvar _slycatGa2 = _interopRequireDefault(_slycatGa);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n$(document).ready(function () {\n  var loadModelTemplate = function () {\n    var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee() {\n      var template, html;\n      return _regenerator2.default.wrap(function _callee$(_context) {\n        while (1) {\n          switch (_context.prev = _context.next) {\n            case 0:\n              // console.log(\"loadModelTemplate, page.model_type is \" + page.model_type);\n\n              template = document.createElement('template');\n              html = \"\";\n\n              if (!(page.model_type == \"parameter-image\")) {\n                _context.next = 8;\n                break;\n              }\n\n              _context.next = 5;\n              return __webpack_require__.e(/*! import() */ 0).then(function() { var module = __webpack_require__(/*! plugins/slycat-parameter-image/ui.html */ \"./web-server/plugins/slycat-parameter-image/ui.html\"); return typeof module === \"object\" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === \"object\" && module, { \"default\": module }); });\n\n            case 5:\n              html = _context.sent;\n              _context.next = 9;\n              break;\n\n            case 8:\n              console.log(\"We don't recognize this model type, so not loading anything.\");\n\n            case 9:\n\n              if (html.default) {\n                html = html.default;\n              }\n              html = html.trim();\n              template.innerHTML = html;\n              return _context.abrupt(\"return\", template.content);\n\n            case 13:\n            case \"end\":\n              return _context.stop();\n          }\n        }\n      }, _callee, this);\n    }));\n\n    return function loadModelTemplate() {\n      return _ref.apply(this, arguments);\n    };\n  }();\n\n  var loadModelModule = function () {\n    var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2() {\n      var template, html;\n      return _regenerator2.default.wrap(function _callee2$(_context2) {\n        while (1) {\n          switch (_context2.prev = _context2.next) {\n            case 0:\n              // console.log(\"loadModelModule, page.model_type is \" + page.model_type);\n\n              template = document.createElement('template');\n              html = \"\";\n\n              if (!(page.model_type == \"parameter-image\")) {\n                _context2.next = 8;\n                break;\n              }\n\n              _context2.next = 5;\n              return __webpack_require__.e(/*! import() */ 1).then(function() { var module = __webpack_require__(/*! dist/ui_parameter_image */ \"./web-server/dist/ui_parameter_image.js\"); return typeof module === \"object\" && module && module.__esModule ? module : Object.assign({/* fake namespace object */}, typeof module === \"object\" && module, { \"default\": module }); });\n\n            case 5:\n              module = _context2.sent;\n              _context2.next = 9;\n              break;\n\n            case 8:\n              console.log(\"We don't recognize this model type, so not loading anything.\");\n\n            case 9:\n              return _context2.abrupt(\"return\", module);\n\n            case 10:\n            case \"end\":\n              return _context2.stop();\n          }\n        }\n      }, _callee2, this);\n    }));\n\n    return function loadModelModule() {\n      return _ref2.apply(this, arguments);\n    };\n  }();\n\n  // Enable knockout\n  var mid = (0, _urijs2.default)(window.location).segment(-1);\n  var page = {};\n  page.model_id = mid;\n  page.title = _knockout2.default.observable();\n  _slycatWebClientWebpack2.default.get_model({\n    mid: mid,\n    success: function success(result) {\n      // console.log(\"success of client.get_model in slycat-model-main-webpack.js\");\n      page.model_name = result.name;\n      window.model_name = page.model_name;\n      page.title(page.model_name + \" - Slycat Model\");\n      page.project_id = result.project;\n      page.model_type = result[\"model-type\"];\n      _knockout2.default.applyBindings(page, document.querySelector(\"slycat-navbar\"));\n      loadModelTemplate().then(function (component) {\n        // console.log(\"inside loadModelTemplate().then()\");\n        document.querySelector(\".slycat-content\").appendChild(component);\n        _knockout2.default.applyBindings(page, document.querySelector(\"head\"));\n        loadModelModule().then(function (component) {\n          // console.log(\"inside loadModelModule().then()\");\n          // ko.applyBindings(page, document.querySelector(\".slycat-content\"));\n        });\n      });\n    },\n    error: function error() {\n      console.log(\"Error retrieving model.\");\n    }\n  });\n}); /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n     DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n     retains certain rights in this software. */\n\n// CSS resources\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\"), __webpack_require__(/*! ./../../node_modules/webpack/buildin/module.js */ \"./node_modules/webpack/buildin/module.js\")(module)))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1tb2RlbC1tYWluLXdlYnBhY2suanM/ZWQ4ZiJdLCJuYW1lcyI6WyIkIiwiZG9jdW1lbnQiLCJyZWFkeSIsInRlbXBsYXRlIiwiY3JlYXRlRWxlbWVudCIsImh0bWwiLCJwYWdlIiwibW9kZWxfdHlwZSIsImNvbnNvbGUiLCJsb2ciLCJkZWZhdWx0IiwidHJpbSIsImlubmVySFRNTCIsImNvbnRlbnQiLCJsb2FkTW9kZWxUZW1wbGF0ZSIsIm1vZHVsZSIsImxvYWRNb2RlbE1vZHVsZSIsIm1pZCIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VnbWVudCIsIm1vZGVsX2lkIiwidGl0bGUiLCJrbyIsIm9ic2VydmFibGUiLCJjbGllbnQiLCJnZXRfbW9kZWwiLCJzdWNjZXNzIiwicmVzdWx0IiwibW9kZWxfbmFtZSIsIm5hbWUiLCJwcm9qZWN0X2lkIiwicHJvamVjdCIsImFwcGx5QmluZGluZ3MiLCJxdWVyeVNlbGVjdG9yIiwidGhlbiIsImFwcGVuZENoaWxkIiwiY29tcG9uZW50IiwiZXJyb3IiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7QUFLQTs7QUFDQTs7QUFFQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7QUFDQTs7Ozs7O0FBRUE7QUFDQUEsRUFBRUMsUUFBRixFQUFZQyxLQUFaLENBQWtCLFlBQVc7QUFBQTtBQUFBLHdGQW9DM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQ0U7O0FBRUlDLHNCQUhOLEdBR2lCRixTQUFTRyxhQUFULENBQXVCLFVBQXZCLENBSGpCO0FBSU1DLGtCQUpOLEdBSWEsRUFKYjs7QUFBQSxvQkFNTUMsS0FBS0MsVUFBTCxJQUFtQixpQkFOekI7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFBQSxxQkFPaUIsMlhBUGpCOztBQUFBO0FBT0lGLGtCQVBKO0FBQUE7QUFBQTs7QUFBQTtBQVVJRyxzQkFBUUMsR0FBUixDQUFZLDhEQUFaOztBQVZKOztBQWFFLGtCQUFJSixLQUFLSyxPQUFULEVBQWtCO0FBQ2hCTCx1QkFBT0EsS0FBS0ssT0FBWjtBQUNEO0FBQ0RMLHFCQUFPQSxLQUFLTSxJQUFMLEVBQVA7QUFDQVIsdUJBQVNTLFNBQVQsR0FBcUJQLElBQXJCO0FBakJGLCtDQWtCU0YsU0FBU1UsT0FsQmxCOztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLEtBcEMyQjs7QUFBQSxvQkFvQ1pDLGlCQXBDWTtBQUFBO0FBQUE7QUFBQTs7QUFBQTtBQUFBLHlGQXlEM0I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQ0U7O0FBRUlYLHNCQUhOLEdBR2lCRixTQUFTRyxhQUFULENBQXVCLFVBQXZCLENBSGpCO0FBSU1DLGtCQUpOLEdBSWEsRUFKYjs7QUFBQSxvQkFNTUMsS0FBS0MsVUFBTCxJQUFtQixpQkFOekI7QUFBQTtBQUFBO0FBQUE7O0FBQUE7QUFBQSxxQkFPbUIsZ1dBUG5COztBQUFBO0FBT0lRLG9CQVBKO0FBQUE7QUFBQTs7QUFBQTtBQVVJUCxzQkFBUUMsR0FBUixDQUFZLDhEQUFaOztBQVZKO0FBQUEsZ0RBYVNNLE1BYlQ7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsS0F6RDJCOztBQUFBLG9CQXlEWkMsZUF6RFk7QUFBQTtBQUFBO0FBQUE7O0FBRTNCO0FBQ0EsTUFBSUMsTUFBTSxxQkFBSUMsT0FBT0MsUUFBWCxFQUFxQkMsT0FBckIsQ0FBNkIsQ0FBQyxDQUE5QixDQUFWO0FBQ0EsTUFBSWQsT0FBTyxFQUFYO0FBQ0FBLE9BQUtlLFFBQUwsR0FBZ0JKLEdBQWhCO0FBQ0FYLE9BQUtnQixLQUFMLEdBQWFDLG1CQUFHQyxVQUFILEVBQWI7QUFDQUMsbUNBQU9DLFNBQVAsQ0FDQTtBQUNFVCxTQUFLQSxHQURQO0FBRUVVLGFBQVMsaUJBQVNDLE1BQVQsRUFDVDtBQUNFO0FBQ0F0QixXQUFLdUIsVUFBTCxHQUFrQkQsT0FBT0UsSUFBekI7QUFDQVosYUFBT1csVUFBUCxHQUFvQnZCLEtBQUt1QixVQUF6QjtBQUNBdkIsV0FBS2dCLEtBQUwsQ0FBV2hCLEtBQUt1QixVQUFMLEdBQWtCLGlCQUE3QjtBQUNBdkIsV0FBS3lCLFVBQUwsR0FBa0JILE9BQU9JLE9BQXpCO0FBQ0ExQixXQUFLQyxVQUFMLEdBQWtCcUIsT0FBTyxZQUFQLENBQWxCO0FBQ0FMLHlCQUFHVSxhQUFILENBQWlCM0IsSUFBakIsRUFBdUJMLFNBQVNpQyxhQUFULENBQXVCLGVBQXZCLENBQXZCO0FBQ0FwQiwwQkFBb0JxQixJQUFwQixDQUF5QixxQkFBYTtBQUNwQztBQUNBbEMsaUJBQVNpQyxhQUFULENBQXVCLGlCQUF2QixFQUEwQ0UsV0FBMUMsQ0FBc0RDLFNBQXREO0FBQ0FkLDJCQUFHVSxhQUFILENBQWlCM0IsSUFBakIsRUFBdUJMLFNBQVNpQyxhQUFULENBQXVCLE1BQXZCLENBQXZCO0FBQ0FsQiwwQkFBa0JtQixJQUFsQixDQUF1QixxQkFBYTtBQUNsQztBQUNBO0FBQ0QsU0FIRDtBQUlELE9BUkQ7QUFVRCxLQXJCSDtBQXNCRUcsV0FBTyxpQkFDUDtBQUNFOUIsY0FBUUMsR0FBUixDQUFZLHlCQUFaO0FBQ0Q7QUF6QkgsR0FEQTtBQWtFRCxDQXpFRCxFLENBZkE7Ozs7QUFJQSxnQiIsImZpbGUiOiIuL3dlYi1zZXJ2ZXIvanMvc2x5Y2F0LW1vZGVsLW1haW4td2VicGFjay5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAoYykgMjAxMywgMjAxOCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMgLiBVbmRlciB0aGUgdGVybXMgb2YgQ29udHJhY3RcbiBERS1OQTAwMDM1MjUgd2l0aCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMsIHRoZSBVLlMuIEdvdmVybm1lbnRcbiByZXRhaW5zIGNlcnRhaW4gcmlnaHRzIGluIHRoaXMgc29mdHdhcmUuICovXG5cbi8vIENTUyByZXNvdXJjZXNcbmltcG9ydCBcImNzcy9uYW1lc3BhY2VkLWJvb3RzdHJhcC5sZXNzXCI7XG5pbXBvcnQgXCJjc3Mvc2x5Y2F0LmNzc1wiO1xuXG5pbXBvcnQgY2xpZW50IGZyb20gXCIuL3NseWNhdC13ZWItY2xpZW50LXdlYnBhY2tcIjtcbmltcG9ydCBrbyBmcm9tIFwia25vY2tvdXRcIjtcbmltcG9ydCBVUkkgZnJvbSBcInVyaWpzXCI7XG5pbXBvcnQgXCJqcy9zbHljYXQtbmF2YmFyLXdlYnBhY2tcIjtcbmltcG9ydCBnYSBmcm9tIFwianMvc2x5Y2F0LWdhXCI7XG5cbi8vIFdhaXQgZm9yIGRvY3VtZW50IHJlYWR5XG4kKGRvY3VtZW50KS5yZWFkeShmdW5jdGlvbigpIHtcblxuICAvLyBFbmFibGUga25vY2tvdXRcbiAgdmFyIG1pZCA9IFVSSSh3aW5kb3cubG9jYXRpb24pLnNlZ21lbnQoLTEpO1xuICB2YXIgcGFnZSA9IHt9O1xuICBwYWdlLm1vZGVsX2lkID0gbWlkO1xuICBwYWdlLnRpdGxlID0ga28ub2JzZXJ2YWJsZSgpO1xuICBjbGllbnQuZ2V0X21vZGVsKFxuICB7XG4gICAgbWlkOiBtaWQsXG4gICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KVxuICAgIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKFwic3VjY2VzcyBvZiBjbGllbnQuZ2V0X21vZGVsIGluIHNseWNhdC1tb2RlbC1tYWluLXdlYnBhY2suanNcIik7XG4gICAgICBwYWdlLm1vZGVsX25hbWUgPSByZXN1bHQubmFtZTtcbiAgICAgIHdpbmRvdy5tb2RlbF9uYW1lID0gcGFnZS5tb2RlbF9uYW1lO1xuICAgICAgcGFnZS50aXRsZShwYWdlLm1vZGVsX25hbWUgKyBcIiAtIFNseWNhdCBNb2RlbFwiKTtcbiAgICAgIHBhZ2UucHJvamVjdF9pZCA9IHJlc3VsdC5wcm9qZWN0O1xuICAgICAgcGFnZS5tb2RlbF90eXBlID0gcmVzdWx0W1wibW9kZWwtdHlwZVwiXTtcbiAgICAgIGtvLmFwcGx5QmluZGluZ3MocGFnZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcInNseWNhdC1uYXZiYXJcIikpO1xuICAgICAgbG9hZE1vZGVsVGVtcGxhdGUoKS50aGVuKGNvbXBvbmVudCA9PiB7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKFwiaW5zaWRlIGxvYWRNb2RlbFRlbXBsYXRlKCkudGhlbigpXCIpO1xuICAgICAgICBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnNseWNhdC1jb250ZW50XCIpLmFwcGVuZENoaWxkKGNvbXBvbmVudCk7XG4gICAgICAgIGtvLmFwcGx5QmluZGluZ3MocGFnZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImhlYWRcIikpO1xuICAgICAgICBsb2FkTW9kZWxNb2R1bGUoKS50aGVuKGNvbXBvbmVudCA9PiB7XG4gICAgICAgICAgLy8gY29uc29sZS5sb2coXCJpbnNpZGUgbG9hZE1vZGVsTW9kdWxlKCkudGhlbigpXCIpO1xuICAgICAgICAgIC8vIGtvLmFwcGx5QmluZGluZ3MocGFnZSwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5zbHljYXQtY29udGVudFwiKSk7XG4gICAgICAgIH0pO1xuICAgICAgfSk7XG5cbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbigpXG4gICAge1xuICAgICAgY29uc29sZS5sb2coXCJFcnJvciByZXRyaWV2aW5nIG1vZGVsLlwiKTtcbiAgICB9XG4gIH0pO1xuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2RlbFRlbXBsYXRlKCkge1xuICAgIC8vIGNvbnNvbGUubG9nKFwibG9hZE1vZGVsVGVtcGxhdGUsIHBhZ2UubW9kZWxfdHlwZSBpcyBcIiArIHBhZ2UubW9kZWxfdHlwZSk7XG5cbiAgICB2YXIgdGVtcGxhdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCd0ZW1wbGF0ZScpO1xuICAgIHZhciBodG1sID0gXCJcIjtcblxuICAgIGlmIChwYWdlLm1vZGVsX3R5cGUgPT0gXCJwYXJhbWV0ZXItaW1hZ2VcIikge1xuICAgICAgaHRtbCA9IGF3YWl0IGltcG9ydCgncGx1Z2lucy9zbHljYXQtcGFyYW1ldGVyLWltYWdlL3VpLmh0bWwnKTtcbiAgICB9XG4gICAgZWxzZSB7XG4gICAgICBjb25zb2xlLmxvZyhcIldlIGRvbid0IHJlY29nbml6ZSB0aGlzIG1vZGVsIHR5cGUsIHNvIG5vdCBsb2FkaW5nIGFueXRoaW5nLlwiKTtcbiAgICB9XG5cbiAgICBpZiAoaHRtbC5kZWZhdWx0KSB7XG4gICAgICBodG1sID0gaHRtbC5kZWZhdWx0O1xuICAgIH1cbiAgICBodG1sID0gaHRtbC50cmltKCk7XG4gICAgdGVtcGxhdGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICByZXR1cm4gdGVtcGxhdGUuY29udGVudDtcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIGxvYWRNb2RlbE1vZHVsZSgpIHtcbiAgICAvLyBjb25zb2xlLmxvZyhcImxvYWRNb2RlbE1vZHVsZSwgcGFnZS5tb2RlbF90eXBlIGlzIFwiICsgcGFnZS5tb2RlbF90eXBlKTtcblxuICAgIHZhciB0ZW1wbGF0ZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3RlbXBsYXRlJyk7XG4gICAgdmFyIGh0bWwgPSBcIlwiO1xuXG4gICAgaWYgKHBhZ2UubW9kZWxfdHlwZSA9PSBcInBhcmFtZXRlci1pbWFnZVwiKSB7XG4gICAgICBtb2R1bGUgPSBhd2FpdCBpbXBvcnQoJ2Rpc3QvdWlfcGFyYW1ldGVyX2ltYWdlJyk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgY29uc29sZS5sb2coXCJXZSBkb24ndCByZWNvZ25pemUgdGhpcyBtb2RlbCB0eXBlLCBzbyBub3QgbG9hZGluZyBhbnl0aGluZy5cIik7XG4gICAgfVxuXG4gICAgcmV0dXJuIG1vZHVsZTtcbiAgfVxuXG59KTsiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./web-server/js/slycat-model-main-webpack.js\n");

/***/ })

/******/ });