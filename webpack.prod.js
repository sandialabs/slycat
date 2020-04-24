const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const Visualizer = require('webpack-visualizer-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
// Commenting out ExportNodeModules plugin because it crashes with Babel7
// const ExportNodeModules = require('webpack-node-modules-list');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    // Don't need to add UglifyJSPlugin here because production mode automatically does that
    // new UglifyJSPlugin({
    //   sourceMap: true
    // }),
    // Deletes the web-server/dist folder so that old files don't remain there, only fresh ones from the last run.
    new CleanWebpackPlugin(),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    // Commenting out Visualizer and Analyzer plugins because they're not needed in production
    // new Visualizer({
    //   filename: 'webpack-visualizer-stats.html'
    // }),
    // new BundleAnalyzerPlugin({
    //   analyzerMode: 'static',
    //   reportFilename: 'webpack-bundle-analyzer-report.html',
    //   openAnalyzer: false,
    //   generateStatsFile: true,
    //   statsFilename: 'webpack-bundle-analyzer-stats.json',
    // }),
    // Commenting out ExportNodeModules plugin because it crashes with Babel7
    // new ExportNodeModules(),
  ]
});