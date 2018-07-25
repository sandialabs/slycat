const path = require('path');
const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  mode: 'development',
  devtool: 'eval-source-map',
  devServer: {
    // Only compiles on refresh, not on file change. But does not work, complains of running webpack twice.
    // lazy: true,

    // Where non-webpack generated files are located on the filesystem.
    // contentBase: [path.join(__dirname, 'web-server/plugins/slycat-project-wizards'), path.join(__dirname, 'web-server/plugins/slycat-model-wizards')],
    
    // Public URL of served files. Commended out because we want them available at the root URL.
    publicPath: '/',
    // compress: true,
    port: 9000,
    https: true,
    index: 'slycat_projects.html',
    proxy: {
      '/api': {
        target: 'https://localhost:443',
        pathRewrite: {'^/api' : ''},
        secure: false,
      },
    },
    historyApiFallback: {
      rewrites: [
        // { from: /^\/$/, to: '/views/landing.html' },
        // { from: /^\/subpage/, to: '/views/subpage.html' },
        { from: /^\/projects/, to: '/slycat_project.html' },
        { from: /^\/models/, to: '/slycat_model.html' },
        // { from: /./, to: '/views/404.html' },
      ]
    }
  }
});