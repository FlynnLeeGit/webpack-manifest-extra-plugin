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
const getExt = s => {
  const mapReg = /\.map$/
  if (mapReg.test(s)) {
    return (
      '.' +
      s
        .split('.')
        .slice(-2)
        .join('.')
    )
  }
  return path.extname(s)
}
/**
 * remove query string && get name
 * @param {* string}
 */
const getNameWithoutQs = s => s.split('?')[0]

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
      transform: m => m,
      filename: 'manifest.json',
      verbose: true
    }

    this.config = merge(defaultConfig, this.userConfig)

    const manifestPath = path.join(webpackOutputPath, this.config.filename)

    let moduleAssets = {}

    compiler.plugin('this-compilation', () => {
      moduleAssets = {}
    })
    // use finalFilename as key, and chunk entry or module.userRequest as value,
    // ensure that every assets should be unique
    compiler.plugin('compilation', compilation => {
      compilation.plugin('module-asset', ({ userRequest }, finalname) => {
        moduleAssets[`${this.config.publicPath}${finalname}`] = path.isAbsolute(
          userRequest
        )
          ? path.join(path.dirname(finalname), path.basename(userRequest))
          : userRequest
      })
    })

    // final stats to manifest.json file
    compiler.plugin('done', stats => {
      const files = stats.toJson().assets.map(asset => {
        // asset.name is like 'static/js/main.js?jsknhd'
        const finalname = asset.name
        // asset.chunkNames is like $1['main'] or $2['page1','page2'] or $3[]
        const chunkNames = asset.chunkNames
        let name
        // $1 name will be 'main' + ext
        if (chunkNames.length === 1) {
          name = chunkNames[0] + getExt(getNameWithoutQs(finalname))
          // $2 or $3 name will be assetPath but not queryString
        } else {
          name = getNameWithoutQs(finalname)
        }

        return {
          name,
          finalname
        }
      })
      // make the manifest hashTable
      files.forEach(f => {
        if (!moduleAssets[`${this.config.publicPath}${f.finalname}`]) {
          moduleAssets[`${this.config.publicPath}${f.finalname}`] = f.name
        }
      })

      // read the old manifest if not exit, it will be null
      const old_manifest = fse.readJsonSync(manifestPath, { throws: false })

      const new_manifest = _.reduce(
        moduleAssets,
        (res, v, k) => {
          res[v] = k
          return res
        },
        {}
      )

      // merge old && new manifest to a final
      let manifest = old_manifest
        ? merge(old_manifest, new_manifest)
        : new_manifest

      // transform
      manifest = this.config.transform(manifest, stats.toJson())

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
