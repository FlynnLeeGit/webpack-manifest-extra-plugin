const $ = require('webpack-bricks')
const webpack = require('webpack')
const ExternalVendorPlugin = require('webpack-external-vendor-plugin')
const ManifestExtraPlugin = require('../index')

const jsTask = $().lay(
  $.entry(),
  $.output({
    filename: 'static/js/[name].js?[chunkhash]'
  }),
  $.font(),
  $.image(),
  $.devtool(),
  $.alias({
    '@': require('path').resolve('src')
  }),
  $.plugins([
    new ManifestExtraPlugin(),
    new ExternalVendorPlugin({
      entry: {
        libs: ['vue/dist/vue.js']
      },
      filename: 'static/js/[name].js?[hash:5]',
      externals: {
        vue: 'Vue'
      }
    })
  ])
)

const styleTask = $().lay(
  $.entry({
    style: './src/style.less'
  }),
  $.devtool(),
  $.output(),
  $.less(),
  $.plugin(new ManifestExtraPlugin())
)

const commonChunkTask = $().lay(
  $.entry({
    page1: './src/page1',
    page2: './src/page2'
  }),
  $.output(),
  $.devtool(),
  $.plugins([
    new webpack.optimize.CommonsChunkPlugin('common'),
    new ManifestExtraPlugin()
  ])
)

module.exports = Promise.all([jsTask, styleTask, commonChunkTask])
