## webpack-manifest-extra-plugin

#### manifest.json generator can be used not only include all emitted assets but also in multiply compilation cases

### why?

`webpack-manifest-plugin` is fine? why another manifest-plugin?

* can not used in multiply compilation cases, use 'seed' option sometimes it will get wrong file format
* if you include another plugin that just emit file in webpack compilation, the manifest.json will not find it

### how?

after every emit and done,this plugin will find the manifest.json in dist folder,if already has,it will merge old manifest and new manifest to a final file,and you can modify it just by `builder` function

install

```shell
yarn add webpack-manifest-extra-plugin -D
# or
npm install webpack-manifest-extra-plugin -D
```

use

```js
// webpack.config.js
const WebpackManifestExtraPlugin = require('webpack-manifest-extra-plugin')
{
  //...
  plugins:[
    new WebpackManifestExtraPlugin({
      filename:'manifest.json' // default -> manifest.json,
      verbose: true // default -> true,
      publicPath:'/' // default -> webpack's publicPath config
      builder(manifest,statsJson){ // manifest.json object && webpack's statsJson object
        // ... your transforms
        return manifest // return
      }
    })
  ]
  //...
}
```

use in multiply compilation
in this example two compilation are all use the default same filename 'manifest.json', so plugin will merge it to one final file
```js
// webpack.config.js
[
  // first
  {
    // ...
    plugins: [new WebpackManifestExtraPlugin()]
    // ...
  },
  // second
  {
    //...
    plugins: [new WebpackManifestExtraPlugin()]
    //...
  }
]
```
