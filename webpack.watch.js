const path = require('path');
const { merge } = require('webpack-merge');
const common = require('./webpack.common.js');
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  plugins: [
  	// Deletes the web-server/dist folder so that old files don't remain there, only fresh ones from the last run.
    new CleanWebpackPlugin(
      [
        'web-server/dist',
      ],
      {
        // Setting this to true breaks ability to reload page when one of its dependency js files changes
        watch: false,
      }
    ),
  ],
});