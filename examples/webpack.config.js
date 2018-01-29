const {
  createConfig,
  addPlugin,
  bricks: { entry, output, less, font, image, alias }
} = require('webpack-bricks')
const webpack = require('webpack')

const ExternalVendorPlugin = require('webpack-external-vendor-plugin')

const ManifestExtraPlugin = require('../index')
const ManifestPlugin = require('webpack-manifest-plugin')

const jsConfig = createConfig([
  entry(),
  output({
    filename: 'static/js/[name].js?[chunkhash]'
  }),
  font(),
  image(),
  alias({
    '@': require('path').resolve('src')
  }),
  addPlugin(
    new ManifestExtraPlugin(),
    new ManifestPlugin({
      fileName: 'manifest-plugin.json'
    }),
    new ExternalVendorPlugin({
      entry: {
        libs: ['vue/dist/vue.js']
      },
      filename: 'static/js/[name].js?[hash:5]',
      externals: {
        vue: 'Vue'
      }
    })
  )
])

// const styleConfig = createConfig([
//   entry({
//     style: './src/style.less'
//   }),
//   output(),
//   less(),
//   addPlugin(new ManifestExtraPlugin())
// ])

// const commonChunkConfig = createConfig([
//   entry({
//     page1: './src/page1',
//     page2: './src/page2'
//   }),
//   output(),
//   addPlugin(
//     new webpack.optimize.CommonsChunkPlugin('common'),
//     new ManifestExtraPlugin()
//   )
// ])

module.exports = [
  jsConfig
  // styleConfig,
  // commonChunkConfig
]
