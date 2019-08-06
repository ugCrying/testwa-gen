export default {
  disableServiceWorker: true,
  hashHistory: true,
  disableHash: true,
  publicPath: "./",
  outputPath: "../../dist/renderer",
  plugins: [
    [
      "umi-plugin-dva",
      {
        immer: true
      }
    ]
  ],
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
  }
};
