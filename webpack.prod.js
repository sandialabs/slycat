const webpack = require("webpack");
const { merge } = require("webpack-merge");
const common = require("./webpack.common.js");
const { CleanWebpackPlugin } = require("clean-webpack-plugin");

module.exports = merge(common, {
  mode: "production",
  devtool: "source-map",

  optimization: {
    concatenateModules: true,
  },
  // Workaround for production runtime error from:
  // node_modules/xmlbuilder2/node_modules/js-yaml/lib/type.js
  //
  // With webpack production module concatenation enabled, js-yaml's Type constructor
  // can fail at runtime with:
  //   TypeError: Cannot set properties of undefined (setting 'options')
  // Transforming this nested js-yaml copy to CommonJS keeps it out of webpack
  // scope-hoisting while preserving concatenateModules for the rest of the app.
  module: {
    rules: [
      {
        test: /\.js$/,
        include: /[\\/]node_modules[\\/]xmlbuilder2[\\/]node_modules[\\/]js-yaml[\\/]/,
        use: {
          loader: "babel-loader",
          options: {
            babelrc: false,
            configFile: false,
            plugins: ["@babel/plugin-transform-modules-commonjs"],
          },
        },
      },
    ],
  },

  plugins: [
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify("production"),
    }),
  ],
});
