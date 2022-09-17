const path = require('path');

module.exports = {
  entry: `${path.resolve(__dirname, 'build/out/index.js')}`,
  output: {
    filename: 'lotus.min.js',
    path: path.resolve(__dirname, 'build/dist'),
    library: 'lotus',
  },
  mode: 'development'
};