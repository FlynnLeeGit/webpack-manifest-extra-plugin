const fse = require('fs-extra')
const path = require('path')
const merge = require('webpack-merge')

const _ = require('lodash')

/**
 * get file extname 'a.js -> .js'
 * @param {* string }
 */
const getExt = s => path.extname(s)
/**
 * remove query string && get name
 * @param {* string}
 */
const getName = s => s.split('?')[0]

const WebpackManifestExtraPlugin = class {
  constructor(config = {}) {
    this.userConfig = config
  }
  apply(compiler) {
    // 添加 外部依赖
    const webpackPublicPath = compiler.options.output.publicPath
    const webpackOutputPath = compiler.options.output.path

    const defaultConfig = {
      verbose: true,
      publicPath: webpackPublicPath,
      builder: (m, statsJson) => m,
      filename: 'manifest.json'
    }
    this.config = merge(defaultConfig, this.userConfig)
    const manifestPath = path.join(webpackOutputPath, this.config.filename)

    compiler.plugin('done', stats => {
      // if not exit, it will be null
      const old_manifest = fse.readJsonSync(manifestPath, { throws: false })

      const files = stats.toJson().assets.map(asset => {
        // asset.name is like 'static/js/main.js?jsknhd'
        const realpath = asset.name
        // asset.name is like $1['main'] or $2['page1','page2'] or $3[]
        const chunkNames = asset.chunkNames
        let name
        // $1 name will be 'main' + ext
        if (chunkNames.length === 1) {
          name = chunkNames[0] + getExt(getName(realpath))
          // $2 or $3 name will be assetPath but not queryString
        } else {
          name = getName(realpath)
        }

        return {
          name,
          realpath
        }
      })
      // make the manifest hashTable
      const new_manifest = files.reduce((res, f) => {
        res[f.name] = path.join(this.config.publicPath, f.realpath)
        return res
      }, {})

      // merge old && new manifest to a final
      let manifest = old_manifest
        ? Object.assign({}, old_manifest, new_manifest)
        : new_manifest

      manifest = this.config.builder(manifest, stats.toJson())

      if (!_.isEqual(old_manifest, manifest)) {
        fse.outputJsonSync(manifestPath, manifest, { spaces: 2 })
        if (this.config.verbose) {
          console.log(
            `\n\n [WebpackManifestExtraPlugin] ${
              this.config.filename
            } generated \n`
          )
        }
      }
      
    })
  }
}

module.exports = WebpackManifestExtraPlugin
