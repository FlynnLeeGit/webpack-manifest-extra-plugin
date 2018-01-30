const webpack = require('webpack')
const path = require('path')
const _ = require('lodash')
const Plugin = require('../index.js')

const ExtractTextPlugin = require('extract-text-webpack-plugin')
const webpackMerge = require('webpack-merge')
const fse = require('fs-extra')
const { spawnSync } = require('child_process')

class Urls {
  constructor(manifestName) {
    this.outputPath = path.join(__dirname, 'dist')
    this.manifestPath = path.join(this.outputPath, manifestName)
  }
}
const urls = new Urls('manifest.json')

const WebpackBuilder = class {
  constructor(firstConfig, secondConfig = {}) {
    const getConfig = (webpackUserConfig, manifestUserConfig) => {
      return webpackMerge(
        {
          context: __dirname,
          output: {
            path: urls.outputPath,
            filename: '[name].js'
          },
          plugins: [new Plugin(_.merge({ verbose: false }, manifestUserConfig))]
        },
        webpackUserConfig
      )
    }

    if (typeof firstConfig === 'object') {
      this.webpackConfig = getConfig(firstConfig, secondConfig)
    }

    if (Array.isArray(firstConfig)) {
      this.webpackConfig = firstConfig.map(c => getConfig(c, secondConfig))
    }
  }
  compile(cb, clean = true) {
    if (clean) {
      spawnSync('rm', ['-rf', urls.outputPath], { stdio: 'inherit' })
    }
    const compiler = webpack(this.webpackConfig)
    compiler.run((err, stats) => {
      const manifestFile = fse.readJsonSync(urls.manifestPath, {
        throws: false
      })
      expect(err).toBeFalsy()
      expect(stats.hasErrors()).toBe(false)

      cb(manifestFile, stats)
    })
  }
}

describe('WebpackManifestExtraPlugin', () => {
  test('should Plugin exits', () => {
    expect(Plugin).toBeDefined()
  })
})

describe('basic behavior', () => {
  test('outputs a manifest of one file', done => {
    new WebpackBuilder({
      entry: './fixtures/one.js'
    }).compile((manifest, stats) => {
      expect(manifest).toBeDefined()
      expect(manifest).toEqual({
        'main.js': 'main.js'
      })
      done()
    })
  })
  test('outputs a manifest of multiple files', done => {
    new WebpackBuilder({
      entry: {
        one: './fixtures/one',
        two: './fixtures/two'
      }
    }).compile(manifest => {
      expect(manifest).toEqual({
        'one.js': 'one.js',
        'two.js': 'two.js'
      })
      done()
    })
  })
  test('works with hashes in the filename', done => {
    new WebpackBuilder({
      entry: {
        one: './fixtures/one.js'
      },
      output: {
        filename: '[name].[hash].js'
      }
    }).compile((manifest, stats) => {
      expect(manifest).toEqual({
        'one.js': `one.${stats.hash}.js`
      })
      done()
    })
  })
  test('works with source map', done => {
    new WebpackBuilder({
      devtool: 'sourcemap',
      entry: {
        one: './fixtures/one.js'
      },
      output: {
        filename: '[name].js'
      }
    }).compile(manifest => {
      expect(manifest).toEqual({
        'one.js': 'one.js',
        'one.js.map': 'one.js.map'
      })
      done()
    })
  })
  test('with webpack publicPath', done => {
    new WebpackBuilder({
      entry: {
        one: './fixtures/one.js'
      },
      output: {
        filename: '[name].[hash].js',
        publicPath: '/dist/'
      }
    }).compile((manifest, stats) => {
      expect(manifest).toEqual({
        'one.js': `/dist/one.${stats.hash}.js`
      })
      done()
    })
  })
  test('with webpack publicPath but no slash on tail', done => {
    new WebpackBuilder({
      entry: {
        one: './fixtures/one.js'
      },
      output: {
        filename: '[name].[hash].js',
        publicPath: '/dist'
      }
    }).compile((manifest, stats) => {
      expect(manifest).toEqual({
        'one.js': `/dist/one.${stats.hash}.js`
      })
      done()
    })
  })
  test('output a manifest of no-js file', done => {
    new WebpackBuilder({
      entry: './fixtures/one.txt',
      module: {
        loaders: [{ test: /\.txt$/, loader: 'file-loader?name=[name].[ext]' }]
      }
    }).compile(manifest => {
      expect(manifest).toBeDefined()
      expect(manifest).toEqual({
        'main.js': 'main.js',
        'one.txt': 'one.txt'
      })
      done()
    })
  })
  test('should output unix paths', done => {
    new WebpackBuilder({
      entry: {
        'dir\\main': './fixtures/one.js',
        'some\\dir\\main': './fixtures/two.js'
      }
    }).compile(manifest => {
      expect(manifest).toBeDefined()
      expect(manifest).toEqual({
        'dir/main.js': 'dir/main.js',
        'some/dir/main.js': 'some/dir/main.js'
      })
      done()
    })
  })
})

describe('with ExtractTextPlugin', () => {
  test('works when extracting css into a seperate file', done => {
    new WebpackBuilder({
      entry: {
        style: './fixtures/style.css'
      },
      module: {
        loaders: [
          {
            test: /\.css$/,
            loader: ExtractTextPlugin.extract({
              fallback: 'style-loader',
              use: 'css-loader'
            })
          }
        ]
      },
      plugins: [
        new ExtractTextPlugin({
          filename: '[name].css',
          allChunks: true
        })
      ]
    }).compile(manifest => {
      expect(manifest).toEqual({
        'style.js': 'style.js',
        'style.css': 'style.css'
      })
      done()
    })
  })
})

describe('with Plugin has module-asset apply', () => {
  test('should has relative name', done => {
    const ConcatPlugin = require('webpack-concat-plugin')
    new WebpackBuilder({
      entry: {
        one: './fixtures/one'
      },
      plugins: [
        new ConcatPlugin({
          filesToConcat: ['./fixtures/two.js', './fixtures/one.txt'],
          name: 'concat'
        })
      ]
    }).compile(manifest => {
      expect(manifest).toEqual({
        'one.js': 'one.js',
        'concat.js': 'concat.js'
      })
      done()
    })
  })
})

describe('manifest options behavior', () => {
  test('should output the corrent filename', done => {
    new WebpackBuilder(
      {
        entry: './fixtures/one.js'
      },
      {
        filename: 'manifest/webpack.manifest.json'
      }
    ).compile(() => {
      const manifestPath = new Urls('manifest/webpack.manifest.json')
        .manifestPath
      const manifest = fse.readJsonSync(manifestPath, { throws: false })
      expect(manifest).toEqual({
        'main.js': 'main.js'
      })
      done()
    })
  })

  test('should use user publicPath', done => {
    new WebpackBuilder(
      {
        entry: {
          one: './fixtures/one.js'
        },
        output: {
          filename: '[name].[hash].js',
          publicPath: '/dist/'
        }
      },
      { publicPath: '/' }
    ).compile((manifest, stats) => {
      expect(manifest).toEqual({
        'one.js': `/one.${stats.hash}.js`
      })
      done()
    })
  })

  test('should transform manifest file', done => {
    const manifestTransform = manifest => {
      manifest['b.js'] = '/static/b.js'
      return manifest
    }

    new WebpackBuilder(
      {
        entry: {
          one: './fixtures/one.js'
        }
      },
      {
        transform: manifestTransform
      }
    ).compile(manifest => {
      expect(manifest).toEqual({
        'one.js': 'one.js',
        'b.js': '/static/b.js'
      })
      done()
    })
  })

  test('should verbose look down', done => {
    new WebpackBuilder(
      {
        entry: {
          one: './fixtures/one'
        }
      },
      { verbose: true }
    ).compile(manifest => {
      done()
    })
  })
})

describe('with multiply compilation', () => {
  test('generate old manifest', done => {
    new WebpackBuilder([
      {
        entry: {
          one: './fixtures/one'
        }
      },
      {
        entry: {
          two: './fixtures/two'
        }
      },
      {
        entry: {
          three: './fixtures/one'
        }
      }
    ]).compile((manifest, stats) => {
      expect(manifest).toEqual({
        'one.js': 'one.js',
        'two.js': 'two.js',
        'three.js': 'three.js'
      })
      done()
    })
  })
})
