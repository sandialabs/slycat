const path = require('path');
const webpack = require('webpack');

module.exports = {
	// mode: 'production',
	mode: 'development',
  entry: {
    ui_parameter_image: './web-server/plugins/slycat-parameter-image/js/ui.js',
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
  		jQuery: 'jquery'
    })
  ],
  // This module enables Babel
  module: {
		rules: [
			{ test: /\.js$/, 
				exclude: /node_modules/, 
				loader: "babel-loader",
			}
		]
	},
};