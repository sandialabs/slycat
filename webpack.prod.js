const webpack = require('webpack');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const Visualizer = require('webpack-visualizer-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const CleanWebpackPlugin = require('clean-webpack-plugin');

module.exports = merge(common, {
  mode: 'production',
  devtool: 'source-map',
  plugins: [
    // Don't need to add UglifyJSPlugin here because production mode automatically does that
    // new UglifyJSPlugin({
    //   sourceMap: true
    // }),
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
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    new Visualizer({
      filename: 'webpack-visualizer-stats.html'
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      reportFilename: 'webpack-bundle-analyzer-report.html',
      openAnalyzer: false,
      generateStatsFile: true,
      statsFilename: 'webpack-bundle-analyzer-stats.json',
    }),
  ]
});