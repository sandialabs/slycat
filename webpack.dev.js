const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    // Where files are located on the filesystem
    contentBase: path.join(__dirname, 'web-server/dist'),
    // Where files are served on the URL
    publicPath: '/assets/',
    // compress: true,
    port: 9000,
    https: true,
    index: 'slycat_projects.html',
    proxy: {
      '/api': {
        target: 'https://localhost:443',
        pathRewrite: {'^/api' : ''},
        secure: false,
      }
    }
  }
});