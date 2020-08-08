const path = require('path')

function resolve (dir) {
  return path.join(__dirname, dir)
}
export default {
  history: 'hash',
  publicPath: "./",
  outputPath: "../../dist/renderer",
  plugins: [
    [
      'umi-plugin-react', {
        dynamicImport: true,
        dva: true,
        antd: true
    }],
  ],
  treeShaking: true,
  externals(_, request, callback) {
    let isExternal;
    const load = [
      "electron",
      "fs",
      "path",
      "os",
      "url",
      "net",
      "child_process"
    ];
    if (load.includes(request)) {
      isExternal = `require("${request}")`;
    }
    const appDeps = Object.keys(require("../../package").dependencies);
    if (appDeps.includes(request)) {
      isExternal = `require('${request}')`;
    }
    callback(null, isExternal);
  },
  chainWebpack(config, { webpack }) {
    console.log(
      __dirname
    )
    // 设置 alias
    config.resolve.alias.set('static', resolve('../../static'))
    config.resolve.alias.set('api', resolve('../api'))
  },
  
  // FIXME: theme
  // theme: require('./theme.js')()
  // theme: "./theme.js"
  theme: {
    'primary-color': '#52c41a'
  }
};
