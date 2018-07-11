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
/******/ 	deferredModules.push(["./web-server/js/slycat-projects-main.js","vendors~slycat_model~slycat_page~slycat_project~slycat_projects~ui_run_command",8,"vendors~slycat_model~slycat_page~slycat_project~slycat_projects","vendors~slycat_model~slycat_project~slycat_projects","vendors~slycat_project~slycat_projects","vendors~slycat_projects","slycat_model~slycat_page~slycat_project~slycat_projects~ui_run_command","slycat_model~slycat_page~slycat_project~slycat_projects"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ "./web-server/components/ProjectsList.js":
/*!***********************************************!*\
  !*** ./web-server/components/ProjectsList.js ***!
  \***********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\nObject.defineProperty(exports, \"__esModule\", {\n  value: true\n});\n\nvar _getPrototypeOf = __webpack_require__(/*! babel-runtime/core-js/object/get-prototype-of */ \"./node_modules/babel-runtime/core-js/object/get-prototype-of.js\");\n\nvar _getPrototypeOf2 = _interopRequireDefault(_getPrototypeOf);\n\nvar _classCallCheck2 = __webpack_require__(/*! babel-runtime/helpers/classCallCheck */ \"./node_modules/babel-runtime/helpers/classCallCheck.js\");\n\nvar _classCallCheck3 = _interopRequireDefault(_classCallCheck2);\n\nvar _createClass2 = __webpack_require__(/*! babel-runtime/helpers/createClass */ \"./node_modules/babel-runtime/helpers/createClass.js\");\n\nvar _createClass3 = _interopRequireDefault(_createClass2);\n\nvar _possibleConstructorReturn2 = __webpack_require__(/*! babel-runtime/helpers/possibleConstructorReturn */ \"./node_modules/babel-runtime/helpers/possibleConstructorReturn.js\");\n\nvar _possibleConstructorReturn3 = _interopRequireDefault(_possibleConstructorReturn2);\n\nvar _inherits2 = __webpack_require__(/*! babel-runtime/helpers/inherits */ \"./node_modules/babel-runtime/helpers/inherits.js\");\n\nvar _inherits3 = _interopRequireDefault(_inherits2);\n\nvar _react = __webpack_require__(/*! react */ \"./node_modules/react/index.js\");\n\nvar _react2 = _interopRequireDefault(_react);\n\nvar _slycatWebClient = __webpack_require__(/*! js/slycat-web-client */ \"./web-server/js/slycat-web-client.js\");\n\nvar _slycatWebClient2 = _interopRequireDefault(_slycatWebClient);\n\nvar _slycatServerRoot = __webpack_require__(/*! js/slycat-server-root */ \"./web-server/js/slycat-server-root.js\");\n\nvar _slycatServerRoot2 = _interopRequireDefault(_slycatServerRoot);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar ProjectsList = function (_React$Component) {\n  (0, _inherits3.default)(ProjectsList, _React$Component);\n\n  function ProjectsList() {\n    (0, _classCallCheck3.default)(this, ProjectsList);\n    return (0, _possibleConstructorReturn3.default)(this, (ProjectsList.__proto__ || (0, _getPrototypeOf2.default)(ProjectsList)).apply(this, arguments));\n  }\n\n  (0, _createClass3.default)(ProjectsList, [{\n    key: 'render',\n    value: function render() {\n      var projects = this.props.projects.map(function (project) {\n        return _react2.default.createElement(Project, {\n          name: project.name,\n          key: project._id,\n          id: project._id,\n          description: project.description,\n          created: project.created,\n          creator: project.creator\n        });\n      });\n\n      if (projects.length > 1) {\n        return _react2.default.createElement(\n          'div',\n          { className: 'container' },\n          _react2.default.createElement(\n            'div',\n            { className: 'panel panel-default' },\n            _react2.default.createElement(\n              'div',\n              { className: 'list-group' },\n              _react2.default.createElement(\n                _react2.default.Fragment,\n                null,\n                projects\n              )\n            )\n          )\n        );\n      } else {\n        return null;\n      }\n    }\n  }]);\n  return ProjectsList;\n}(_react2.default.Component);\n\nvar Project = function (_React$Component2) {\n  (0, _inherits3.default)(Project, _React$Component2);\n\n  function Project() {\n    (0, _classCallCheck3.default)(this, Project);\n    return (0, _possibleConstructorReturn3.default)(this, (Project.__proto__ || (0, _getPrototypeOf2.default)(Project)).apply(this, arguments));\n  }\n\n  (0, _createClass3.default)(Project, [{\n    key: 'render',\n    value: function render() {\n      return _react2.default.createElement(\n        'a',\n        { className: 'list-group-item', href: _slycatServerRoot2.default + 'projects/' + this.props.id },\n        _react2.default.createElement(\n          'span',\n          { className: 'label label-default' },\n          'project'\n        ),\n        ' ',\n        _react2.default.createElement(\n          'strong',\n          null,\n          this.props.name\n        ),\n        _react2.default.createElement(\n          'p',\n          null,\n          _react2.default.createElement(\n            'small',\n            null,\n            _react2.default.createElement(\n              'span',\n              null,\n              this.props.description\n            ),\n            _react2.default.createElement(\n              'em',\n              null,\n              'Created ',\n              _react2.default.createElement(\n                'span',\n                null,\n                this.props.created\n              ),\n              ' by ',\n              _react2.default.createElement(\n                'span',\n                null,\n                this.props.creator\n              )\n            )\n          )\n        )\n      );\n    }\n  }]);\n  return Project;\n}(_react2.default.Component);\n\nexports.default = ProjectsList;//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2NvbXBvbmVudHMvUHJvamVjdHNMaXN0LmpzP2M3NzIiXSwibmFtZXMiOlsiUHJvamVjdHNMaXN0IiwicHJvamVjdHMiLCJwcm9wcyIsIm1hcCIsInByb2plY3QiLCJuYW1lIiwiX2lkIiwiZGVzY3JpcHRpb24iLCJjcmVhdGVkIiwiY3JlYXRvciIsImxlbmd0aCIsIlJlYWN0IiwiQ29tcG9uZW50IiwiUHJvamVjdCIsInNlcnZlcl9yb290IiwiaWQiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7Ozs7QUFDQTs7OztBQUNBOzs7Ozs7SUFFTUEsWTs7Ozs7Ozs7Ozs2QkFDSztBQUNQLFVBQU1DLFdBQVcsS0FBS0MsS0FBTCxDQUFXRCxRQUFYLENBQW9CRSxHQUFwQixDQUF3QixVQUFDQyxPQUFELEVBQ3pDO0FBQ0UsZUFDVSw4QkFBQyxPQUFEO0FBQ0UsZ0JBQU1BLFFBQVFDLElBRGhCO0FBRUUsZUFBS0QsUUFBUUUsR0FGZjtBQUdFLGNBQUlGLFFBQVFFLEdBSGQ7QUFJRSx1QkFBYUYsUUFBUUcsV0FKdkI7QUFLRSxtQkFBU0gsUUFBUUksT0FMbkI7QUFNRSxtQkFBU0osUUFBUUs7QUFObkIsVUFEVjtBQVVELE9BWmdCLENBQWpCOztBQWNBLFVBQUdSLFNBQVNTLE1BQVQsR0FBa0IsQ0FBckIsRUFDQTtBQUNFLGVBQ0U7QUFBQTtBQUFBLFlBQUssV0FBVSxXQUFmO0FBQ0U7QUFBQTtBQUFBLGNBQUssV0FBVSxxQkFBZjtBQUNFO0FBQUE7QUFBQSxnQkFBSyxXQUFVLFlBQWY7QUFDRTtBQUFDLCtCQUFELENBQU8sUUFBUDtBQUFBO0FBQ0dUO0FBREg7QUFERjtBQURGO0FBREYsU0FERjtBQVdELE9BYkQsTUFlQTtBQUNFLGVBQU8sSUFBUDtBQUNEO0FBQ0Y7OztFQWxDd0JVLGdCQUFNQyxTOztJQXFDM0JDLE87Ozs7Ozs7Ozs7NkJBQ0s7QUFDUCxhQUNFO0FBQUE7QUFBQSxVQUFHLFdBQVUsaUJBQWIsRUFBK0IsTUFBTUMsNkJBQWMsV0FBZCxHQUE0QixLQUFLWixLQUFMLENBQVdhLEVBQTVFO0FBQ0U7QUFBQTtBQUFBLFlBQU0sV0FBVSxxQkFBaEI7QUFBQTtBQUFBLFNBREY7QUFBQTtBQUN1RDtBQUFBO0FBQUE7QUFBUyxlQUFLYixLQUFMLENBQVdHO0FBQXBCLFNBRHZEO0FBRUU7QUFBQTtBQUFBO0FBQ0U7QUFBQTtBQUFBO0FBQ0U7QUFBQTtBQUFBO0FBQU8sbUJBQUtILEtBQUwsQ0FBV0s7QUFBbEIsYUFERjtBQUVFO0FBQUE7QUFBQTtBQUFBO0FBQ1E7QUFBQTtBQUFBO0FBQU8scUJBQUtMLEtBQUwsQ0FBV007QUFBbEIsZUFEUjtBQUFBO0FBQzZDO0FBQUE7QUFBQTtBQUFPLHFCQUFLTixLQUFMLENBQVdPO0FBQWxCO0FBRDdDO0FBRkY7QUFERjtBQUZGLE9BREY7QUFhRDs7O0VBZm1CRSxnQkFBTUMsUzs7a0JBa0JiWixZIiwiZmlsZSI6Ii4vd2ViLXNlcnZlci9jb21wb25lbnRzL1Byb2plY3RzTGlzdC5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSZWFjdCBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCBjbGllbnQgZnJvbSAnanMvc2x5Y2F0LXdlYi1jbGllbnQnO1xuaW1wb3J0IHNlcnZlcl9yb290IGZyb20gJ2pzL3NseWNhdC1zZXJ2ZXItcm9vdCc7XG5cbmNsYXNzIFByb2plY3RzTGlzdCBleHRlbmRzIFJlYWN0LkNvbXBvbmVudCB7XG4gIHJlbmRlcigpIHtcbiAgICBjb25zdCBwcm9qZWN0cyA9IHRoaXMucHJvcHMucHJvamVjdHMubWFwKChwcm9qZWN0KSA9PlxuICAgIHtcbiAgICAgIHJldHVybiAgKFxuICAgICAgICAgICAgICAgIDxQcm9qZWN0IFxuICAgICAgICAgICAgICAgICAgbmFtZT17cHJvamVjdC5uYW1lfSBcbiAgICAgICAgICAgICAgICAgIGtleT17cHJvamVjdC5faWR9XG4gICAgICAgICAgICAgICAgICBpZD17cHJvamVjdC5faWR9IFxuICAgICAgICAgICAgICAgICAgZGVzY3JpcHRpb249e3Byb2plY3QuZGVzY3JpcHRpb259IFxuICAgICAgICAgICAgICAgICAgY3JlYXRlZD17cHJvamVjdC5jcmVhdGVkfVxuICAgICAgICAgICAgICAgICAgY3JlYXRvcj17cHJvamVjdC5jcmVhdG9yfSBcbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICApO1xuICAgIH0pO1xuXG4gICAgaWYocHJvamVjdHMubGVuZ3RoID4gMSlcbiAgICB7XG4gICAgICByZXR1cm4gKFxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImNvbnRhaW5lclwiPlxuICAgICAgICAgIDxkaXYgY2xhc3NOYW1lPVwicGFuZWwgcGFuZWwtZGVmYXVsdFwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzc05hbWU9XCJsaXN0LWdyb3VwXCI+XG4gICAgICAgICAgICAgIDxSZWFjdC5GcmFnbWVudD5cbiAgICAgICAgICAgICAgICB7cHJvamVjdHN9XG4gICAgICAgICAgICAgIDwvUmVhY3QuRnJhZ21lbnQ+XG4gICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICApO1xuICAgIH1cbiAgICBlbHNlXG4gICAge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICB9XG59XG5cbmNsYXNzIFByb2plY3QgZXh0ZW5kcyBSZWFjdC5Db21wb25lbnQge1xuICByZW5kZXIoKSB7XG4gICAgcmV0dXJuIChcbiAgICAgIDxhIGNsYXNzTmFtZT1cImxpc3QtZ3JvdXAtaXRlbVwiIGhyZWY9e3NlcnZlcl9yb290ICsgJ3Byb2plY3RzLycgKyB0aGlzLnByb3BzLmlkfT5cbiAgICAgICAgPHNwYW4gY2xhc3NOYW1lPVwibGFiZWwgbGFiZWwtZGVmYXVsdFwiPnByb2plY3Q8L3NwYW4+IDxzdHJvbmc+e3RoaXMucHJvcHMubmFtZX08L3N0cm9uZz5cbiAgICAgICAgPHA+XG4gICAgICAgICAgPHNtYWxsPlxuICAgICAgICAgICAgPHNwYW4+e3RoaXMucHJvcHMuZGVzY3JpcHRpb259PC9zcGFuPlxuICAgICAgICAgICAgPGVtPlxuICAgICAgICAgICAgQ3JlYXRlZCA8c3Bhbj57dGhpcy5wcm9wcy5jcmVhdGVkfTwvc3Bhbj4gYnkgPHNwYW4+e3RoaXMucHJvcHMuY3JlYXRvcn08L3NwYW4+XG4gICAgICAgICAgICA8L2VtPlxuICAgICAgICAgIDwvc21hbGw+XG4gICAgICAgIDwvcD5cbiAgICAgIDwvYT5cbiAgICApO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IFByb2plY3RzTGlzdDsiXSwic291cmNlUm9vdCI6IiJ9\n//# sourceURL=webpack-internal:///./web-server/components/ProjectsList.js\n");

/***/ }),

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
eval("/* WEBPACK VAR INJECTION */(function($) {\n\n__webpack_require__(/*! css/namespaced-bootstrap.less */ \"./web-server/css/namespaced-bootstrap.less\");\n\n__webpack_require__(/*! css/slycat.css */ \"./web-server/css/slycat.css\");\n\nvar _react = __webpack_require__(/*! react */ \"./node_modules/react/index.js\");\n\nvar _react2 = _interopRequireDefault(_react);\n\nvar _reactDom = __webpack_require__(/*! react-dom */ \"./node_modules/react-dom/index.js\");\n\nvar _reactDom2 = _interopRequireDefault(_reactDom);\n\nvar _ProjectsList = __webpack_require__(/*! components/ProjectsList */ \"./web-server/components/ProjectsList.js\");\n\nvar _ProjectsList2 = _interopRequireDefault(_ProjectsList);\n\nvar _slycatWebClient = __webpack_require__(/*! js/slycat-web-client */ \"./web-server/js/slycat-web-client.js\");\n\nvar _slycatWebClient2 = _interopRequireDefault(_slycatWebClient);\n\nvar _slycatGa = __webpack_require__(/*! js/slycat-ga */ \"./web-server/js/slycat-ga.js\");\n\nvar _slycatGa2 = _interopRequireDefault(_slycatGa);\n\n__webpack_require__(/*! bootstrap */ \"./node_modules/bootstrap/dist/js/npm.js\");\n\nvar _knockout = __webpack_require__(/*! knockout */ \"./node_modules/knockout/build/output/knockout-latest.debug.js\");\n\nvar _knockout2 = _interopRequireDefault(_knockout);\n\n__webpack_require__(/*! js/slycat-navbar */ \"./web-server/js/slycat-navbar.js\");\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\n// Wait for document ready\n\n\n// These next 2 lines are required render the navbar using knockout. Remove them once we convert it to react.\n/* Copyright (c) 2013, 2018 National Technology and Engineering Solutions of Sandia, LLC . Under the terms of Contract\n DE-NA0003525 with National Technology and Engineering Solutions of Sandia, LLC, the U.S. Government\n retains certain rights in this software. */\n\n// CSS resources\n$(document).ready(function () {\n\n  _slycatWebClient2.default.get_projects({\n    success: function success(result) {\n      var projects_list = _react2.default.createElement(_ProjectsList2.default, { projects: result.projects });\n      _reactDom2.default.render(projects_list, document.getElementById('slycat-projects'));\n    },\n    error: function error(request, status, reason_phrase) {\n      console.log(\"Unable to retrieve project.\");\n    }\n  });\n\n  // These next 2 lines render the navbar using knockout. Remove them once we convert it to react.\n  var page = {};\n  _knockout2.default.applyBindings(page, document.querySelector(\"html\"));\n});\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vLi93ZWItc2VydmVyL2pzL3NseWNhdC1wcm9qZWN0cy1tYWluLmpzPzYyOWMiXSwibmFtZXMiOlsiJCIsImRvY3VtZW50IiwicmVhZHkiLCJjbGllbnQiLCJnZXRfcHJvamVjdHMiLCJzdWNjZXNzIiwicmVzdWx0IiwicHJvamVjdHNfbGlzdCIsInByb2plY3RzIiwiUmVhY3RET00iLCJyZW5kZXIiLCJnZXRFbGVtZW50QnlJZCIsImVycm9yIiwicmVxdWVzdCIsInN0YXR1cyIsInJlYXNvbl9waHJhc2UiLCJjb25zb2xlIiwibG9nIiwicGFnZSIsImtvIiwiYXBwbHlCaW5kaW5ncyIsInF1ZXJ5U2VsZWN0b3IiXSwibWFwcGluZ3MiOiI7O0FBS0E7O0FBQ0E7O0FBRUE7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFDQTs7OztBQUNBOztBQUdBOzs7O0FBQ0E7Ozs7QUFFQTs7O0FBSkE7QUFmQTs7OztBQUlBO0FBZ0JBQSxFQUFFQyxRQUFGLEVBQVlDLEtBQVosQ0FBa0IsWUFBVzs7QUFFM0JDLDRCQUFPQyxZQUFQLENBQW9CO0FBQ2xCQyxhQUFTLGlCQUFTQyxNQUFULEVBQWlCO0FBQ3hCLFVBQU1DLGdCQUFnQiw4QkFBQyxzQkFBRCxJQUFjLFVBQVVELE9BQU9FLFFBQS9CLEdBQXRCO0FBQ0FDLHlCQUFTQyxNQUFULENBQ0VILGFBREYsRUFFRU4sU0FBU1UsY0FBVCxDQUF3QixpQkFBeEIsQ0FGRjtBQUlELEtBUGlCO0FBUWxCQyxXQUFPLGVBQVNDLE9BQVQsRUFBa0JDLE1BQWxCLEVBQTBCQyxhQUExQixFQUF5QztBQUM5Q0MsY0FBUUMsR0FBUixDQUFZLDZCQUFaO0FBQ0Q7QUFWaUIsR0FBcEI7O0FBYUE7QUFDQSxNQUFJQyxPQUFPLEVBQVg7QUFDQUMscUJBQUdDLGFBQUgsQ0FBaUJGLElBQWpCLEVBQXVCakIsU0FBU29CLGFBQVQsQ0FBdUIsTUFBdkIsQ0FBdkI7QUFFRCxDQW5CRCxFIiwiZmlsZSI6Ii4vd2ViLXNlcnZlci9qcy9zbHljYXQtcHJvamVjdHMtbWFpbi5qcy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIENvcHlyaWdodCAoYykgMjAxMywgMjAxOCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMgLiBVbmRlciB0aGUgdGVybXMgb2YgQ29udHJhY3RcbiBERS1OQTAwMDM1MjUgd2l0aCBOYXRpb25hbCBUZWNobm9sb2d5IGFuZCBFbmdpbmVlcmluZyBTb2x1dGlvbnMgb2YgU2FuZGlhLCBMTEMsIHRoZSBVLlMuIEdvdmVybm1lbnRcbiByZXRhaW5zIGNlcnRhaW4gcmlnaHRzIGluIHRoaXMgc29mdHdhcmUuICovXG5cbi8vIENTUyByZXNvdXJjZXNcbmltcG9ydCBcImNzcy9uYW1lc3BhY2VkLWJvb3RzdHJhcC5sZXNzXCI7XG5pbXBvcnQgXCJjc3Mvc2x5Y2F0LmNzc1wiO1xuXG5pbXBvcnQgUmVhY3QgZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgUmVhY3RET00gZnJvbSBcInJlYWN0LWRvbVwiO1xuaW1wb3J0IFByb2plY3RzTGlzdCBmcm9tICdjb21wb25lbnRzL1Byb2plY3RzTGlzdCc7XG5pbXBvcnQgY2xpZW50IGZyb20gJ2pzL3NseWNhdC13ZWItY2xpZW50JztcbmltcG9ydCBnYSBmcm9tIFwianMvc2x5Y2F0LWdhXCI7XG5pbXBvcnQgXCJib290c3RyYXBcIjtcblxuLy8gVGhlc2UgbmV4dCAyIGxpbmVzIGFyZSByZXF1aXJlZCByZW5kZXIgdGhlIG5hdmJhciB1c2luZyBrbm9ja291dC4gUmVtb3ZlIHRoZW0gb25jZSB3ZSBjb252ZXJ0IGl0IHRvIHJlYWN0LlxuaW1wb3J0IGtvIGZyb20gJ2tub2Nrb3V0JztcbmltcG9ydCBcImpzL3NseWNhdC1uYXZiYXJcIjtcblxuLy8gV2FpdCBmb3IgZG9jdW1lbnQgcmVhZHlcbiQoZG9jdW1lbnQpLnJlYWR5KGZ1bmN0aW9uKCkge1xuXG4gIGNsaWVudC5nZXRfcHJvamVjdHMoe1xuICAgIHN1Y2Nlc3M6IGZ1bmN0aW9uKHJlc3VsdCkge1xuICAgICAgY29uc3QgcHJvamVjdHNfbGlzdCA9IDxQcm9qZWN0c0xpc3QgcHJvamVjdHM9e3Jlc3VsdC5wcm9qZWN0c30gLz5cbiAgICAgIFJlYWN0RE9NLnJlbmRlcihcbiAgICAgICAgcHJvamVjdHNfbGlzdCxcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3NseWNhdC1wcm9qZWN0cycpXG4gICAgICApO1xuICAgIH0sXG4gICAgZXJyb3I6IGZ1bmN0aW9uKHJlcXVlc3QsIHN0YXR1cywgcmVhc29uX3BocmFzZSkge1xuICAgICAgY29uc29sZS5sb2coXCJVbmFibGUgdG8gcmV0cmlldmUgcHJvamVjdC5cIik7XG4gICAgfVxuICB9KTtcblxuICAvLyBUaGVzZSBuZXh0IDIgbGluZXMgcmVuZGVyIHRoZSBuYXZiYXIgdXNpbmcga25vY2tvdXQuIFJlbW92ZSB0aGVtIG9uY2Ugd2UgY29udmVydCBpdCB0byByZWFjdC5cbiAgdmFyIHBhZ2UgPSB7fVxuICBrby5hcHBseUJpbmRpbmdzKHBhZ2UsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJodG1sXCIpKTtcblxufSk7Il0sInNvdXJjZVJvb3QiOiIifQ==\n//# sourceURL=webpack-internal:///./web-server/js/slycat-projects-main.js\n");

/***/ })

/******/ });