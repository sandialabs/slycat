// This is the front-end slycat plugin configuartion file. 
// Import plugin registrations below for any plugin you want available on the system.

// Model wizards
import 'plugins/slycat-model-wizards/slycat-model-wizards';

// Project wizards
import 'plugins/slycat-project-wizards/slycat-project-wizards';

// Models
import 'plugins/slycat-parameter-image/slycat-parameter-image';
import 'plugins/slycat-timeseries-model/slycat-timeseries-model';
import 'plugins/slycat-cca/slycat-cca';
import 'plugins/slycat-parameter-image-plus-model/slycat-parameter-image-plus-model';

// Remap wizard, which is probably not working as of August 2018
import 'plugins/slycat-remap-wizard/slycat-remap-wizard';

// For any plugin that needs to load resources, add the appropriate case statements below in loadTemplate and loadModule
export async function loadTemplate(name) {
  // console.log("loadModelTemplate, page.model_type is " + page.model_type);

  let template = document.createElement('template');
  let html = "";

  switch(name) {
    case "parameter-image":
      html = await import(/* webpackChunkName: "ui_parameter_image_template" */ 'plugins/slycat-parameter-image/ui.html');
      break;
    case "timeseries":
      html = await import(/* webpackChunkName: "ui_timeseries_template" */ 'plugins/slycat-timeseries-model/ui.html');
      break;
    case "cca":
      html = await import(/* webpackChunkName: "ui_cca_template" */ 'plugins/slycat-cca/ui.html');
      break;
    case "parameter-image-plus":
      html = await import(/* webpackChunkName: "ui_parameter_image_plus_template" */ 'plugins/slycat-parameter-image-plus-model/ui.html');
      break;
    case "run-command":
      html = await import(/* webpackChunkName: "run_command_template" */ 'plugins/slycat-run-command/ui.html');
      break;
    default:
      console.log("We don't recognize this template type, so not loading a template.");
  }

  if (html.default) {
    html = html.default;
  }
  html = html.trim();
  template.innerHTML = html;
  return template.content;
}

export async function loadModule(name) {
  // console.log("loadModelModule, page.model_type is " + page.model_type);
  let module;

  switch(name) {
    case "parameter-image":
      module = await import(/* webpackChunkName: "ui_parameter_image_module" */ 'plugins/slycat-parameter-image/js/ui.js');
      break;
    case "timeseries":
      module = await import(/* webpackChunkName: "ui_timeseries_module" */ 'plugins/slycat-timeseries-model/js/ui.js');
      break;
    case "cca":
      module = await import(/* webpackChunkName: "ui_cca_module" */ 'plugins/slycat-cca/js/ui.js');
      break;
    case "parameter-image-plus":
      module = await import(/* webpackChunkName: "ui_parameter_image_plus_module" */ 'plugins/slycat-parameter-image-plus-model/js/ui.js');
      break;
    case "run-command":
      module = await import(/* webpackChunkName: "run_command_module" */ 'plugins/slycat-run-command/ui.js');
      break;
    default:
      console.log("We don't recognize this module type, so not loading a module.");
  }

  return module;
}