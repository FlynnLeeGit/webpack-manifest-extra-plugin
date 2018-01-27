const {
  createConfig,
  addPlugin,
  bricks: { entry, output, happyLess }
} = require('webpack-bricks')
const webpack = require('webpack')

const ManifestExtraPlugin = require('../index')

const jsConfig = createConfig([
  entry(),
  output({
    filename: 'static/js/[name].js?[chunkhash]'
  }),
  addPlugin(new ManifestExtraPlugin())
])

const styleConfig = createConfig([
  entry({
    style: './src/style.less'
  }),
  output(),
  happyLess(),
  addPlugin(new ManifestExtraPlugin())
])

const commonChunkConfig = createConfig([
  entry({
    page1: './src/page1',
    page2: './src/page2'
  }),
  output({
    filename: 'static/js/[name].js?[hash]'
  }),
  addPlugin(
    new webpack.optimize.CommonsChunkPlugin('common'),
    new ManifestExtraPlugin()
  )
])

module.exports = [jsConfig, styleConfig, commonChunkConfig]
