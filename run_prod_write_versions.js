const fs = require("fs");
const webpack = require("webpack");
// Read in webpack prod config file
const webpack_prod_config = require("./webpack.prod.js");
// Read in package-lock.json
const packageLock = require("./package-lock.json");
const _ = require("lodash");

// console.debug(webpack_prod_config);

// Run webpack using the prod config file
webpack(webpack_prod_config, (err, stats) => {
  // [Stats Object](#stats-object)
  // Handling errors and warnings
  // err is fatal webpack error, stats.hasErrors() tells us if there were compilation errors.

  // If we had a fatal webpack error, log it to the console and exit.
  if (err) {
    console.error(err.stack || err);
    if (err.details) {
      console.error(err.details);
    }
    console.error(
      "STOP. There were fatal webpack errors, see above. This build did not succeed, do not deploy it."
    );
    return;
  }

  // Display stats on console in color
  console.log(
    stats.toString({
      colors: true, // Shows colors in the console
    })
  );

  // Display messages at end of console if there were warnings or errors.
  if (stats.hasWarnings()) {
    console.log("WATCH OUT. There were warnings, see above.");
  }
  // stats.hasErrors() tells us if there were compilation errors.
  if (stats.hasErrors()) {
    console.error(
      "STOP. There were compliation errors, see above. This build did not succeed, do not deploy it."
    );
    // Exit if there were compilation errors, without updating JS modules docs.
    return;
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

  let node_modules_from_stats = {};
  let slycat_node_modules = [];

  let slycat_modules_from_stats = {};
  let slycat_modules = [];

  // console.log(`First the modules whose moduleType starts with javascript.`);
  for (const module of modules) {
    // Split the module name into path elements
    const path_array = module.name.split("??")[0].split(`/`);
    // Removing leading .
    path_array.shift();
    // Find the last instance of 'node_modules' in the path array
    const last_index = path_array.lastIndexOf("node_modules");

    // Only deal with javascript modules from node_modules
    if (module.moduleType.startsWith("javascript") && last_index > -1) {
      // console.log(`moduleType: %o, name %o`, module.moduleType, module.name);

      // For modules that being with @, need to look one level deeper
      const starts_with_at_symbol = path_array[last_index + 1].startsWith("@");
      const path_array_sliced = path_array.slice(
        0,
        starts_with_at_symbol ? last_index + 3 : last_index + 2
      );

      const node_modules_path = path_array_sliced.join("/");
      const module_name = path_array_sliced.slice(1).join("/");
      const version_from_package_lock = packageLock.packages[node_modules_path]
        ? packageLock.packages[node_modules_path].version
        : "ERROR: MODULE NOT FOUND IN package-lock.json";
      const resolved_from_package_lock = packageLock.packages[node_modules_path]
        ? packageLock.packages[node_modules_path].resolved
        : "ERROR: MODULE NOT FOUND IN package-lock.json";

      node_modules_from_stats[module.name] = {
        path_array: path_array,
        last_index: last_index,
        starts_with_at_symbol: starts_with_at_symbol,
        path_array_sliced: path_array_sliced,
        node_modules_path: node_modules_path,
        module_name: module_name,
        version_from_package_lock: version_from_package_lock,
        resolved_from_package_lock: resolved_from_package_lock,
      };

      slycat_node_modules.push({
        name: module_name,
        version: version_from_package_lock,
        url: resolved_from_package_lock,
      });
    }

    // Deal with javascript modules not in node_modules
    if (module.moduleType.startsWith("javascript") && last_index == -1) {
      // console.log(`moduleType: %o, name %o`, module.moduleType, module.name);

      // For modules that being with @, need to look one level deeper
      // const starts_with_at_symbol = path_array[last_index+1].startsWith('@');
      const path_array_sliced = path_array.slice(0, last_index + 2);

      const node_modules_path = path_array_sliced.join("/");
      const module_name = path_array_sliced.slice(1).join("/");

      slycat_modules_from_stats[module.name] = {
        path_array: path_array,
        // 'last_index' : last_index,
        // 'starts_with_at_symbol' : starts_with_at_symbol,
        path_array_sliced: path_array_sliced,
        node_modules_path: node_modules_path,
        module_name: module_name,
      };

      slycat_modules.push({
        name: module.name,
      });
    }
  }

  // Remove duplicate modules, but only if their versions are different. _.isEqual compares entire objects.
  slycat_node_modules = _.uniqWith(slycat_node_modules, _.isEqual);
  // Sort my name then version
  slycat_node_modules = _.sortBy(slycat_node_modules, ["name", "version"]);

  // Find max widths of each value in slycat_node_modules so we can turn them into columns
  let col_widths = {};
  slycat_node_modules.forEach((element) => {
    for (const [key, value] of Object.entries(element)) {
      col_widths[key] = Math.max(col_widths[key] ? col_widths[key] : 0, String(value).length);
    }
  });

  // Convert slycat_node_moodules object to string of columns
  const col_separator = 6;
  const slycat_node_modules_columns = slycat_node_modules.reduce((accumulator, module) => {
    let line = ``;
    for (const [key, value] of Object.entries(module)) {
      line += String(value).padEnd(col_widths[key] + col_separator);
    }
    line += `\n`;
    return accumulator.concat(line);
  }, "");

  // Remove duplicate modules, but only if their versions are different. _.isEqual compares entire objects.
  slycat_modules = _.uniqWith(slycat_modules, _.isEqual);
  // Sort my name then version
  slycat_modules = _.sortBy(slycat_modules, ["name"]);

  // Write out a debug file
  // fs.writeFileSync('stats_no_file-slycat_production_node_modules_debug.json', JSON.stringify(node_modules_from_stats, null, 2));

  const JS_NODE_FILENAME = "docs/javascript_dependencies_in_node_modules.json";
  const JS_NODE_COLUMNS_FILENAME = "docs/javascript_dependencies_in_node_modules_columns.txt";
  const JS_WEBSERVER_FILENAME = "docs/javascript_dependencies_in_web_server.json";

  // Write out file listing all node_module modules used in production Slycat build and their versions
  fs.writeFileSync(JS_NODE_FILENAME, JSON.stringify(slycat_node_modules, null, 2));
  fs.writeFileSync(JS_NODE_COLUMNS_FILENAME, slycat_node_modules_columns);
  fs.writeFileSync(JS_WEBSERVER_FILENAME, JSON.stringify(slycat_modules, null, 2));

  console.log(
    `CONGRATULATIONS. It seems that the build was successful. The following files were written out:`
  );
  console.log(JS_NODE_FILENAME);
  console.log(JS_NODE_COLUMNS_FILENAME);
  console.log(JS_WEBSERVER_FILENAME);
});
