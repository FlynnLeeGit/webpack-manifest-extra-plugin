'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fse = require('fs-extra');
var path = require('path');
var validateOptions = require('schema-utils');

var _ = require('lodash');

var schema = {
  type: 'object',
  properties: {
    verbose: {
      type: 'boolean'
    },
    transform: {
      instanceof: 'Function'
    },
    publicPath: {
      type: 'string'
    },
    filename: {
      type: 'string'
    }
  },
  additionalProperties: false

  /**
   * get file extname 'a.js -> .js'
   * @param {* string }
   */
};var getExt = function getExt(s) {
  var mapReg = /\.map$/;
  if (mapReg.test(s)) {
    return '.' + s.split('.').slice(-2).join('.');
  }
  return path.extname(s);
};
/**
 * remove query string && get name
 * @param {* string}
 */
var getNameWithoutQs = function getNameWithoutQs(s) {
  return s.split('?')[0];
};

var getSlashPublic = function getSlashPublic(publicPath) {
  if (!publicPath || _.last(publicPath) === '/') {
    return publicPath;
  }
  return publicPath + '/';
};

var WebpackManifestExtraPlugin = function () {
  function WebpackManifestExtraPlugin() {
    var config = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, WebpackManifestExtraPlugin);

    validateOptions(schema, config, '[WebpackManifestExtraPlugin]');
    this.userConfig = config;
  }

  _createClass(WebpackManifestExtraPlugin, [{
    key: 'apply',
    value: function apply(compiler) {
      var _this = this;

      // 添加 外部依赖
      // fix no publicPath will be undefined
      var webpackPublicPath = compiler.options.output.publicPath || '';
      var webpackOutputPath = compiler.options.output.path;

      var defaultConfig = {
        publicPath: webpackPublicPath,
        transform: function transform(m) {
          return m;
        },
        filename: 'manifest.json',
        verbose: true
      };

      this.config = _.merge(defaultConfig, this.userConfig);
      this.config.publicPath = getSlashPublic(this.config.publicPath);

      var manifestPath = path.join(webpackOutputPath, this.config.filename);

      var moduleAssets = {};

      compiler.plugin('this-compilation', function () {
        moduleAssets = {};
      });
      // use finalFilename as key, and chunk entry or module.userRequest as value,
      // ensure that every assets should be unique
      compiler.plugin('compilation', function (compilation) {
        compilation.plugin('module-asset', function (_ref, finalname) {
          var userRequest = _ref.userRequest;

          moduleAssets['' + _this.config.publicPath + finalname] = path.isAbsolute(userRequest) ? path.join(path.dirname(finalname), path.basename(userRequest)) : userRequest;
        });
      });

      // final stats to manifest.json file
      compiler.plugin('done', function (stats) {
        var files = stats.toJson().assets.map(function (asset) {
          // asset.name is like 'static/js/main.js?jsknhd'
          var finalname = asset.name;
          // asset.chunkNames is like $1['main'] or $2['page1','page2'] or $3[]
          var chunkNames = asset.chunkNames;

          var name = void 0;
          // $1 name will be 'main' + ext
          if (chunkNames.length === 1) {
            name = chunkNames[0] + getExt(getNameWithoutQs(finalname));
            // $2 or $3 name will be assetPath but not queryString
          } else {
            name = getNameWithoutQs(finalname);
          }
          return {
            name: name,
            finalname: finalname
          };
        });
        // make the manifest hashTable
        files.forEach(function (f) {
          if (!moduleAssets['' + _this.config.publicPath + f.finalname]) {
            moduleAssets['' + _this.config.publicPath + f.finalname] = f.name;
          }
        });

        // read the old manifest if not exit, it will be null
        var old_manifest = fse.readJsonSync(manifestPath, { throws: false });

        var new_manifest = _.reduce(moduleAssets, function (res, v, k) {
          // to unix path if name or value has '\\'
          v = v.replace(/\\/g, '/');
          k = k.replace(/\\/g, '/');
          res[v] = k;
          return res;
        }, {});
        // merge old && new manifest to a final
        var manifest = old_manifest ? _.merge({}, old_manifest, new_manifest) : new_manifest;

        // transform
        manifest = _this.config.transform(manifest, stats.toJson());

        if (!_.isEqual(old_manifest, manifest)) {
          fse.outputJsonSync(manifestPath, manifest, { spaces: 2 });
          if (_this.config.verbose) {
            console.log('\n\n [WebpackManifestExtraPlugin] ' + _this.config.filename + ' generated \n');
          }
        }
      });
    }
  }]);

  return WebpackManifestExtraPlugin;
}();

module.exports = WebpackManifestExtraPlugin;
