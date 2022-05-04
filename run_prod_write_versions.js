const fs = require('fs');
const webpack = require('webpack');
// Read in webpack prod config file
const webpack_prod_config = require('./webpack.prod.js');
// Read in package-lock.json
const packageLock = require('./package-lock.json');
const _ = require('lodash');

// console.debug(webpack_prod_config);

// Run webpack using the prod config file
webpack(webpack_prod_config, (err, stats) => { // [Stats Object](#stats-object)
  if (err || stats.hasErrors()) {
    // [Handle errors here](#error-handling)
  }

  // Convert stats to Json using config that drops most data except module info we are interest in.
  // And grab the modules attribute from it.
  const modules = stats.toJson({
    // Don't use assets chunks, entrypoints, chunkGroups, or children. So hiding them.
    assets: false,
    chunks: false,
    entrypoints: false,
    chunkGroups: false,
    children: false,

    // this is the big one, adds info about modules
    modules: true,
    modulesSpace: 9999,

    // adds more details about modules
    nestedModules: true,
    nestedModulesSpace: 9999,

    // shows orpan modules, which seem to be used. need to look into this more.
    orphanModules: true,

    // hide warnings for prod build
    warningsCount: false,
    warnings: false,

    // adds hash of the compilation
    hash: true,

    // adds tons more info about reason for each module included. defaults to false.
    reasons: false,
  }).modules;

  let js_modules_from_stats = {};
  let slycat_node_modules = [];

  // console.log(`First the modules whose moduleType starts with javascript.`);
  for(const module of modules)
  {
    // Split the module name into path elements
    const path_array = module.name.split('??')[0].split(`/`);
    // Removing leading .
    path_array.shift();
    // Find the last instance of 'node_modules' in the path array
    const last_index = path_array.lastIndexOf('node_modules');

    // Only deal with javascript modules from node_modules
    if(module.moduleType.startsWith('javascript') && last_index > -1)
    {
      // console.log(`moduleType: %o, name %o`, module.moduleType, module.name);

      // For modules that being with @, need to look one level deeper
      const starts_with_at_symbol = path_array[last_index+1].startsWith('@');
      const path_array_sliced = path_array.slice(0, starts_with_at_symbol? last_index + 3 : last_index + 2);

      const node_modules_path = path_array_sliced.join('/');
      const module_name = path_array_sliced.slice(1).join('/');
      const version_from_package_lock = packageLock.packages[node_modules_path] ? packageLock.packages[node_modules_path].version : 'ERROR: MODULE VERSION NOT FOUND IN package-lock.json';
      
      js_modules_from_stats[module.name] = {
        'path_array' : path_array,
        'last_index' : last_index,
        'starts_with_at_symbol' : starts_with_at_symbol,
        'path_array_sliced' : path_array_sliced,
        'node_modules_path' : node_modules_path,
        'module_name' : module_name,
        'version_from_package_lock' : version_from_package_lock,
      };

      slycat_node_modules.push({
        name: module_name, 
        version: version_from_package_lock,
      });
    }
  }

  // Remove duplicate modules, but only if their versions are different. _.isEqual compares entire objects.
  slycat_node_modules = _.uniqWith(slycat_node_modules, _.isEqual);
  // Sort my name then version
  slycat_node_modules = _.sortBy(slycat_node_modules, ['name', 'version'])

  // Write out a debug file
  // fs.writeFileSync('stats_no_file-slycat_production_node_modules_debug.json', JSON.stringify(js_modules_from_stats, null, 2));

  // Write out file listing all node_module modules used in production Slycat build and their versions
  fs.writeFileSync('docs/javascript_dependencies_in_node_modules.txt', JSON.stringify(slycat_node_modules, null, 2));
});