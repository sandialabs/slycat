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
/******/ 		"ui_run_command": 0
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
/******/ 	deferredModules.push(["./web-server/plugins/slycat-run-command/ui.js","vendors~slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_ru~29e28113","slycat_page~slycat_project~slycat_projects~ui_cca~ui_parameter_image~ui_parameter_plus~ui_run_comman~247387c4"]);
/******/ 	// run deferred modules when ready
/******/ 	return checkDeferredModules();
/******/ })
/************************************************************************/
/******/ ({

/***/ "./web-server/plugins/slycat-run-command/ui.js":
/*!*****************************************************!*\
  !*** ./web-server/plugins/slycat-run-command/ui.js ***!
  \*****************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("/* WEBPACK VAR INJECTION */(function($) {\n\nvar _slycatServerRoot = __webpack_require__(/*! ../../js/slycat-server-root */ \"./web-server/js/slycat-server-root.js\");\n\nvar _slycatServerRoot2 = _interopRequireDefault(_slycatServerRoot);\n\nvar _urijs = __webpack_require__(/*! urijs */ \"./node_modules/urijs/src/URI.js\");\n\nvar _urijs2 = _interopRequireDefault(_urijs);\n\nvar _slycatWebClientWebpack = __webpack_require__(/*! ../../js/slycat-web-client-webpack */ \"./web-server/js/slycat-web-client-webpack.js\");\n\nvar _slycatWebClientWebpack2 = _interopRequireDefault(_slycatWebClientWebpack);\n\nfunction _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }\n\nvar test_script_json = {\n    \"scripts\": [{\n        \"name\": \"test\",\n        \"parameters\": [{\n            \"name\": \"--number\",\n            \"value\": 2\n        }]\n    }],\n    \"hpc\": {\n        \"is_hpc_job\": false,\n        \"parameters\": {\n            wckey: \"test1\",\n            nnodes: \"1\",\n            partition: \"mypartition\",\n            ntasks_per_node: \"1\",\n            time_hours: \"01\",\n            time_minutes: \"30\",\n            time_seconds: \"30\",\n            working_dir: \"slycat\"\n        }\n    }\n};\n\nvar computer_time_series_script_json = {\n    \"scripts\": [{\n        \"name\": \"compute_timeseries\",\n        \"parameters\": [{\n            \"name\": \"--directory\",\n            \"value\": \"/home/slycat/src/slycat/web-client/500-times-series\"\n        }, {\n            \"name\": \"--cluster-sample-count\",\n            \"value\": 50\n        }, {\n            \"name\": \"--cluster-sample-type\",\n            \"value\": \"uniform-paa\"\n        }, {\n            \"name\": \"--cluster-type\",\n            \"value\": \"average\"\n        }, {\n            \"name\": \"--cluster-metric\",\n            \"value\": \"euclidean\"\n        }, {\n            \"name\": \"--workdir\",\n            \"value\": \"/home/slycat/workdir\"\n        }, {\n            \"name\": \"--hash\",\n            \"value\": \"1a2b3c4d5e6f\"\n        }]\n    }],\n    \"hpc\": {\n        \"is_hpc_job\": false,\n        \"parameters\": {\n            wckey: \"test1\",\n            nnodes: \"1\",\n            partition: \"mypartition\",\n            ntasks_per_node: \"1\",\n            time_hours: \"01\",\n            time_minutes: \"30\",\n            time_seconds: \"30\",\n            working_dir: \"slycat\"\n        }\n    }\n};\nvar timeseries_to_hdf5_script_json = {\n    \"scripts\": [{\n        \"name\": \"timeseries_to_hdf5\",\n        \"parameters\": [{\n            \"name\": \"--output-directory\",\n            \"value\": \"/home/slycat/output\"\n        }, {\n            \"name\": \"--inputs-file\",\n            \"value\": \"/home/slycat/input\"\n        }, {\n            \"name\": \"--inputs-file-delimiter\",\n            \"value\": \",\"\n        }, {\n            \"name\": \"--force\",\n            \"value\": \"\"\n        }]\n    }],\n    \"hpc\": {\n        \"is_hpc_job\": false,\n        \"parameters\": {\n            wckey: \"test1\",\n            nnodes: \"1\",\n            partition: \"mypartition\",\n            ntasks_per_node: \"1\",\n            time_hours: \"01\",\n            time_minutes: \"30\",\n            time_seconds: \"30\",\n            working_dir: \"slycat\"\n        }\n    }\n};\nfunction prettyPrint() {\n    try {\n        var ugly = $('#command').val();\n        var obj = JSON.parse(ugly);\n        document.getElementById('command').value = JSON.stringify(obj, undefined, 4);\n\n        var ugly = $('#response').val();\n        var obj = JSON.parse(ugly);\n        document.getElementById('response').value = JSON.stringify(obj, undefined, 4);\n    } catch (e) {\n        // no opp.\n    }\n}\n\nfunction run_remote_command() {\n    var payload = { \"command\": JSON.parse($('#command').val()) };\n    $.ajax({\n        contentType: \"application/json\",\n        type: \"POST\",\n        url: (0, _urijs2.default)(_slycatServerRoot2.default + \"remotes/\" + $('#hostname').val() + \"/post-remote-command\"),\n        success: function success(result) {\n            document.getElementById('response').value = JSON.stringify(result);\n        },\n        error: function error(request, status, reason_phrase) {\n            console.log(\"status:\" + request.status);\n            if (request.status === 400) {\n                document.getElementById('response').value = \"status: \" + request.status + \"\\n\\nmessage: \" + request.getResponseHeader('X-Slycat-Message');\n            } else {\n                document.getElementById('response').value = \"error response from server:\\n\" + \"error request:\" + JSON.stringify(request, undefined, 4) + \"\\n\\n status: \" + request.status + \"\\n\\n reason: \" + reason_phrase;\n            }\n        },\n        data: JSON.stringify(payload)\n    });\n}\n\nfunction post_session() {\n    _slycatWebClientWebpack2.default.post_remotes({\n        hostname: $('#hostname').val(),\n        username: $('#username').val(),\n        password: $('#password').val(),\n        success: function success(response) {\n            document.getElementById('response').value = \"host session made sid:\" + JSON.stringify(response, undefined, 2);\n        },\n        error: function error(request, status, reason_phrase) {\n            window.alert(\"error request:\" + request.responseJSON + \" status: \" + status + \" reason: \" + reason_phrase);\n            console.log(\"error request:\" + request.responseJSON + \" status: \" + status + \" reason: \" + reason_phrase);\n        }\n    });\n}\n\nfunction get_session() {\n    _slycatWebClientWebpack2.default.get_session_status({\n        hostname: $('#hostname').val(),\n        success: function success(message) {\n            document.getElementById('response').value = \"host session found\";\n        },\n        error: function error(request, status, reason_phrase) {\n            document.getElementById('response').value = \"no session found\";\n            post_session();\n        }\n    });\n}\nfunction set_command(name) {\n    if (name === \"test\") {\n        document.getElementById('command').value = JSON.stringify(test_script_json);\n    } else if (name === \"computer_time_series\") {\n        document.getElementById('command').value = JSON.stringify(computer_time_series_script_json);\n    } else if (name === \"timeseries_to_hdf5\") {\n        document.getElementById('command').value = JSON.stringify(timeseries_to_hdf5_script_json);\n    } else {\n        document.getElementById('command').value = \"command does not match command in list of commands\";\n    }\n}\ndocument.getElementById(\"prettyPrint\").addEventListener(\"click\", prettyPrint, false);\ndocument.getElementById(\"go\").addEventListener(\"click\", run_remote_command, false);\ndocument.getElementById(\"getSession\").addEventListener(\"click\", get_session, false);\ndocument.getElementById(\"test\").addEventListener(\"click\", function () {\n    set_command(\"test\");\n}, false);\ndocument.getElementById(\"computeTimeSeries\").addEventListener(\"click\", function () {\n    set_command(\"computer_time_series\");\n}, false);\ndocument.getElementById(\"timeseriesToHdf5\").addEventListener(\"click\", function () {\n    set_command(\"timeseries_to_hdf5\");\n}, false);\n/* WEBPACK VAR INJECTION */}.call(this, __webpack_require__(/*! jquery */ \"./node_modules/jquery/dist/jquery.js\")))\n\n//# sourceURL=webpack:///./web-server/plugins/slycat-run-command/ui.js?");

/***/ })

/******/ });