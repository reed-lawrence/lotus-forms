const {
  resolve
} = require('path');

console.log(__dirname);

module.exports = [
  // {
  //   entry: `${resolve(__dirname, 'out/src/index.js')}`,
  //   output: {
  //     filename: 'lotus_forms.min.js',
  //     path: resolve(__dirname, 'dist'),
  //     library: 'lotus_forms',
  //   },
  //   mode: 'production',
  //   resolve: {
  //     fallback: {
  //       "crypto": false
  //     }
  //   }
  // },
  // {
  //   entry: `${resolve(__dirname, 'out/src/index.js')}`,
  //   output: {
  //     filename: 'lotus_forms.js',
  //     path: resolve(__dirname, 'dist'),
  //     library: 'lotus_forms',
  //   },
  //   mode: 'development',
  //   devtool: 'source-map',
  //   resolve: {
  //     fallback: {
  //       "crypto": false
  //     }
  //   }
  // },
  {
    entry: `${resolve(__dirname, 'out/demo/boostrap-5/demo-1.js')}`,
    output: {
      filename: 'demo-1.js',
      path: resolve(__dirname, 'dist'),
    },
    mode: 'development',
    devtool: 'source-map',
    resolve: {
      fallback: {
        "crypto": false
      }
    }
  }
];