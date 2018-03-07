// Webpack is not currently being used, but I'm leaving this in for the future
const path = require('path');

module.exports = {
  entry: './web-server/plugins/slycat-parameter-image/js/parameter-controls.js',
  output: {
    filename: 'parameter-conrols.webpack.js',
    path: path.resolve(__dirname, 'dist')
  },
  // This module enables Babel
  module: {
		rules: [
			{ test: /\.js$/, 
				exclude: /node_modules/, 
				loader: "babel-loader"
			}
		]
	}
};