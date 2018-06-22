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
/******/ 	deferredModules.push(["./web-server/js/slycat-model-main-webpack.js","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_paramet~a96b520b","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_paramet~946a3084","slycat_model~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~~0dd3e680"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/knockout/build/output sync recursive":
/*!*************************************************!*\
  !*** ./node_modules/knockout/build/output sync ***!
  \*************************************************/
/*! no static exports found */
/***/ (function(module, exports) {

eval("function webpackEmptyContext(req) {\n\tvar e = new Error('Cannot find module \"' + req + '\".');\n\te.code = 'MODULE_NOT_FOUND';\n\tthrow e;\n}\nwebpackEmptyContext.keys = function() { return []; };\nwebpackEmptyContext.resolve = webpackEmptyContext;\nmodule.exports = webpackEmptyContext;\nwebpackEmptyContext.id = \"./node_modules/knockout/build/output sync recursive\";//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi9ub2RlX21vZHVsZXMva25vY2tvdXQvYnVpbGQvb3V0cHV0IHN5bmM/ZjRhNiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsdUNBQXVDLFdBQVc7QUFDbEQ7QUFDQTtBQUNBIiwiZmlsZSI6Ii4vbm9kZV9tb2R1bGVzL2tub2Nrb3V0L2J1aWxkL291dHB1dCBzeW5jIHJlY3Vyc2l2ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbImZ1bmN0aW9uIHdlYnBhY2tFbXB0eUNvbnRleHQocmVxKSB7XG5cdHZhciBlID0gbmV3IEVycm9yKCdDYW5ub3QgZmluZCBtb2R1bGUgXCInICsgcmVxICsgJ1wiLicpO1xuXHRlLmNvZGUgPSAnTU9EVUxFX05PVF9GT1VORCc7XG5cdHRocm93IGU7XG59XG53ZWJwYWNrRW1wdHlDb250ZXh0LmtleXMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIFtdOyB9O1xud2VicGFja0VtcHR5Q29udGV4dC5yZXNvbHZlID0gd2VicGFja0VtcHR5Q29udGV4dDtcbm1vZHVsZS5leHBvcnRzID0gd2VicGFja0VtcHR5Q29udGV4dDtcbndlYnBhY2tFbXB0eUNvbnRleHQuaWQgPSBcIi4vbm9kZV9tb2R1bGVzL2tub2Nrb3V0L2J1aWxkL291dHB1dCBzeW5jIHJlY3Vyc2l2ZVwiOyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./node_modules/knockout/build/output sync recursive\n");

/***/ }),

/***/ "./web-server/js/slycat-model-main-webpack.js":
/*!****************************************************!*\
  !*** ./web-server/js/slycat-model-main-webpack.js ***!
  \****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\nexports.start = start;\n\nvar _slycatWebClientWebpack = __webpack_require__(/*! ./slycat-web-client-webpack */ \"./web-server/js/slycat-web-client-webpack.js\");\n\nvar _slycatWebClientWebpack2 = _interopRequireDefault(_slycatWebClientWebpack);\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nfunction start() {\n  // Enable knockout\n  var mid = (0, _urijs2.default)(window.location).segment(-1);\n  var page = {};\n  page.title = _knockout2.default.observable();\n  _slycatWebClientWebpack2.default.get_model({\n    mid: mid,\n    success: function success(result) {\n      page.title(result.name + \" - Slycat Model\");\n    },\n    error: function error() {\n      console.log(\"Error retrieving model.\");\n    }\n  });\n  _knockout2.default.applyBindings(page, document.querySelector(\"head\"));\n  _knockout2.default.applyBindings(page, document.querySelector(\"slycat-navbar\"));\n} /* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n   DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n   retains certain rights in this software. */\n\n;//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1tb2RlbC1tYWluLXdlYnBhY2suanM/ZWQ4ZiJdLCJuYW1lcyI6WyJzdGFydCIsIm1pZCIsIndpbmRvdyIsImxvY2F0aW9uIiwic2VnbWVudCIsInBhZ2UiLCJ0aXRsZSIsImtvIiwib2JzZXJ2YWJsZSIsImNsaWVudCIsImdldF9tb2RlbCIsInN1Y2Nlc3MiLCJyZXN1bHQiLCJuYW1lIiwiZXJyb3IiLCJjb25zb2xlIiwibG9nIiwiYXBwbHlCaW5kaW5ncyIsImRvY3VtZW50IiwicXVlcnlTZWxlY3RvciJdLCJtYXBwaW5ncyI6Ijs7Ozs7UUFRZ0JBLEssR0FBQUEsSzs7QUFKaEI7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7QUFFTyxTQUFTQSxLQUFULEdBQ1A7QUFDRTtBQUNBLE1BQUlDLE1BQU0scUJBQUlDLE9BQU9DLFFBQVgsRUFBcUJDLE9BQXJCLENBQTZCLENBQUMsQ0FBOUIsQ0FBVjtBQUNBLE1BQUlDLE9BQU8sRUFBWDtBQUNBQSxPQUFLQyxLQUFMLEdBQWFDLG1CQUFHQyxVQUFILEVBQWI7QUFDQUMsbUNBQU9DLFNBQVAsQ0FDQTtBQUNFVCxTQUFLQSxHQURQO0FBRUVVLGFBQVMsaUJBQVNDLE1BQVQsRUFDVDtBQUNFUCxXQUFLQyxLQUFMLENBQVdNLE9BQU9DLElBQVAsR0FBYyxpQkFBekI7QUFDRCxLQUxIO0FBTUVDLFdBQU8saUJBQ1A7QUFDRUMsY0FBUUMsR0FBUixDQUFZLHlCQUFaO0FBQ0Q7QUFUSCxHQURBO0FBWUFULHFCQUFHVSxhQUFILENBQWlCWixJQUFqQixFQUF1QmEsU0FBU0MsYUFBVCxDQUF1QixNQUF2QixDQUF2QjtBQUNBWixxQkFBR1UsYUFBSCxDQUFpQlosSUFBakIsRUFBdUJhLFNBQVNDLGFBQVQsQ0FBdUIsZUFBdkIsQ0FBdkI7QUFDRCxDLENBNUJEOzs7O0FBNEJDIiwiZmlsZSI6Ii4vd2ViLXNlcnZlci9qcy9zbHljYXQtbW9kZWwtbWFpbi13ZWJwYWNrLmpzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogQ29weXJpZ2h0IChjKSAyMDEzLCAyMDE4IE5hdGlvbmFsIFRlY2hub2xvZ3kgYW5kIEVuZ2luZWVyaW5nIFNvbHV0aW9ucyBvZiBTYW5kaWEsIExMQyAuIFVuZGVyIHRoZSB0ZXJtcyBvZiBDb250cmFjdFxuIERFLU5BMDAwMzUyNSB3aXRoIE5hdGlvbmFsIFRlY2hub2xvZ3kgYW5kIEVuZ2luZWVyaW5nIFNvbHV0aW9ucyBvZiBTYW5kaWEsIExMQywgdGhlIFUuUy4gR292ZXJubWVudFxuIHJldGFpbnMgY2VydGFpbiByaWdodHMgaW4gdGhpcyBzb2Z0d2FyZS4gKi9cblxuaW1wb3J0IGNsaWVudCBmcm9tIFwiLi9zbHljYXQtd2ViLWNsaWVudC13ZWJwYWNrXCI7XG5pbXBvcnQga28gZnJvbSBcImtub2Nrb3V0XCI7XG5pbXBvcnQgVVJJIGZyb20gXCJ1cmlqc1wiO1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnQoKVxue1xuICAvLyBFbmFibGUga25vY2tvdXRcbiAgdmFyIG1pZCA9IFVSSSh3aW5kb3cubG9jYXRpb24pLnNlZ21lbnQoLTEpO1xuICB2YXIgcGFnZSA9IHt9O1xuICBwYWdlLnRpdGxlID0ga28ub2JzZXJ2YWJsZSgpO1xuICBjbGllbnQuZ2V0X21vZGVsKFxuICB7XG4gICAgbWlkOiBtaWQsXG4gICAgc3VjY2VzczogZnVuY3Rpb24ocmVzdWx0KVxuICAgIHtcbiAgICAgIHBhZ2UudGl0bGUocmVzdWx0Lm5hbWUgKyBcIiAtIFNseWNhdCBNb2RlbFwiKTtcbiAgICB9LFxuICAgIGVycm9yOiBmdW5jdGlvbigpXG4gICAge1xuICAgICAgY29uc29sZS5sb2coXCJFcnJvciByZXRyaWV2aW5nIG1vZGVsLlwiKTtcbiAgICB9XG4gIH0pO1xuICBrby5hcHBseUJpbmRpbmdzKHBhZ2UsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJoZWFkXCIpKTtcbiAga28uYXBwbHlCaW5kaW5ncyhwYWdlLCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwic2x5Y2F0LW5hdmJhclwiKSk7XG59OyJdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///./web-server/js/slycat-model-main-webpack.js\n");

/***/ })

/******/ });