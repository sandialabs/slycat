const fs = require('fs');
const webpack = require('webpack');
const webpack_prod_config = require('./webpack.prod.js');

console.debug(webpack_prod_config);

webpack(webpack_prod_config, (err, stats) => { // [Stats Object](#stats-object)
  if (err || stats.hasErrors()) {
    // [Handle errors here](#error-handling)
  }
  // Done processing
  console.debug(stats);
});

// Read in compilation-stats
const data = require('./compilation-stats-prod.json');
const modules = data.modules;

// Read in package-lock.json
const packageLock = require('./package-lock.json');

let js_modules_from_stats = {};
let slycat_node_modules = {};

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
    const version_from_package_lock = packageLock.packages[node_modules_path] ? packageLock.packages[node_modules_path].version : 'NOTFOUND';
    
    js_modules_from_stats[module.name] = {
      'path_array' : path_array,
      'last_index' : last_index,
      'starts_with_at_symbol' : starts_with_at_symbol,
      'path_array_sliced' : path_array_sliced,
      'node_modules_path' : node_modules_path,
      'module_name' : module_name,
      'version_from_package_lock' : version_from_package_lock,
    };

    slycat_node_modules[module_name] = version_from_package_lock;
  }
}

fs.writeFileSync('stats-slycat_production_node_modules_debug.json', JSON.stringify(js_modules_from_stats, null, 2));
fs.writeFileSync('slycat_production_node_modules.json', JSON.stringify(slycat_node_modules, null, 2));

// Modules that are non javascript
// console.log(`Then the modules whose moduleType does not start with javascript.`);
// for(const module of modules)
// {
//   if(!module.moduleType.startsWith('javascript'))
//   {
//     console.log(`moduleType: %o, name %o`, module.moduleType, module.name);
//   }
// }



// package-lock.json packages
// const packages = packageLock.packages;
// let packagesWrite = {};
// let node_modules_twice = {};

// console.log(`Display all properties of top level packages object in package-lock.json.`);
// for(const package in packages)
// {
//   // if(module.moduleType.startsWith('javascript'))
//   // {
//     console.log(`package: %o`, package);
//     // Remove first instance of 'node_modules/'
//     // packagesWrite[package.replace(/^(node_modules\/)/, "")] = packages[package].version;
//     packagesWrite[package] = packages[package].version;

//     // Find packages with node_modules twice in their paths
//     if( [...package.matchAll(/node_modules/g)].length > 1 )
//     {
//       node_modules_twice[package] = packages[package].version;
//     }
//   // }
// }

// let packagesData = JSON.stringify(packagesWrite);
// fs.writeFileSync('stats-packages.json', packagesData);

// fs.writeFileSync('stats-packages-node-twice.json', JSON.stringify(node_modules_twice));



// package-lock.json dependencies
// const dependencies = packageLock.dependencies;
// let dependenciesWrite = {};

// console.log(`Display all properties of top level dependencies object in package-lock.json.`);
// for(const dependency in dependencies)
// {
//   // if(module.moduleType.startsWith('javascript'))
//   // {
//     console.log(`dependency: %o`, dependency);
//     dependenciesWrite[dependency] = dependencies[dependency].version;
//   // }
// }

// let dependenciesData = JSON.stringify(dependenciesWrite);
// fs.writeFileSync('stats-dependencies.json', dependenciesData);