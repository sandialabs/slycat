const fs = require('fs');
const _ = require('lodash');

// Read in compilation-stats and pull modules from it
const data = require('./compilation-stats-prod.json');
const modules = data.modules;

// Read in package-lock.json
const packageLock = require('./package-lock.json');

let js_modules_from_stats = {};
let slycat_node_modules = [];

// console.log(`First the modules whose moduleType starts with javascript.`);
for(const module of modules)
{
  const path_array = module.name.split('??')[0].split(`/`);
  path_array.shift(); // Removing leading .
  const last_index = path_array.lastIndexOf('node_modules');

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

slycat_node_modules = _.uniqWith(slycat_node_modules, _.isEqual);
slycat_node_modules = _.sortBy(slycat_node_modules, ['name', 'version'])

fs.writeFileSync('stats-slycat_production_node_modules_debug.json', JSON.stringify(js_modules_from_stats, null, 2));
fs.writeFileSync('slycat_production_node_modules.json', JSON.stringify(slycat_node_modules, null, 2));
