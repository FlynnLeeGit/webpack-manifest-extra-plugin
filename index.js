const fse = require('fs-extra')
const path = require('path')
const merge = require('webpack-merge')
const validateOptions = require('schema-utils')
const schema = require('./schema.json')

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

const getSlashPublic = publicPath => {
  if (_.last(publicPath !== '/')) {
    return publicPath + '/'
  }
  return publicPath
}

const WebpackManifestExtraPlugin = class {
  constructor(config = {}) {
    validateOptions(schema, config, '[WebpackManifestExtraPlugin]')
    this.userConfig = config
  }
  apply(compiler) {
    // 添加 外部依赖
    const webpackPublicPath = compiler.options.output.publicPath
    const webpackOutputPath = compiler.options.output.path

    const defaultConfig = {
      publicPath: webpackPublicPath,
      builder: m => m,
      filename: 'manifest.json',
      verbose: true
    }
    this.config = merge(defaultConfig, this.userConfig)

    const manifestPath = path.join(webpackOutputPath, this.config.filename)

    const moduleAssets = {}
    compiler.plugin('compilation', compilation => {
      compilation.plugin('module-asset', ({ userRequest }, file) => {
        moduleAssets[userRequest] = file
      })
    })

    // final stats to manifest.json file
    compiler.plugin('done', stats => {
      console.log(moduleAssets, '==============')
      // if not exit, it will be null
      const old_manifest = fse.readJsonSync(manifestPath, { throws: false })

      const files = stats.toJson().assets.map(asset => {
        // asset.name is like 'static/js/main.js?jsknhd'
        const finalname = asset.name
        // asset.name is like $1['main'] or $2['page1','page2'] or $3[]
        const chunkNames = asset.chunkNames
        let name
        // $1 name will be 'main' + ext
        if (chunkNames.length === 1) {
          name = chunkNames[0] + getExt(getName(finalname))
          // $2 or $3 name will be assetPath but not queryString
        } else {
          name = getName(finalname)
        }

        return {
          name,
          finalname
        }
      })
      // make the manifest hashTable
      const new_manifest = files.reduce((res, f) => {
        res[f.name] = `${this.config.publicPath}${f.finalname}`
        return res
      }, moduleAssets)

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
