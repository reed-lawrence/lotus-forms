const path = require('path');

module.exports = [
  {
    entry: `${path.resolve(__dirname, 'build/out/index.js')}`,
    output: {
      filename: 'lotus_forms.min.js',
      path: path.resolve(__dirname, 'build/dist'),
      library: 'lotus_forms',
    },
    mode: 'production'
  },
  {
    entry: `${path.resolve(__dirname, 'build/out/index.js')}`,
    output: {
      filename: 'lotus_forms.js',
      path: path.resolve(__dirname, 'build/dist'),
      library: 'lotus_forms',
    },
    mode: 'development',
    devtool: 'source-map'
  }
];