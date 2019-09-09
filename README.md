# testwa-desktop

## 预编译安装包环境依赖

- JDK
- ADB

## 开发环境依赖

- Node.js
- Git

## 总结

- 重启 adb:`adb kill-server&&adb start-server`
- not a valid zip file 错误:`rm -rf ~/Library/Caches/electron`
- 还原 device:`adb shell rm -r /data/local/tmp/mini*&&adb shell ls /data/local/tmp`
- 解决首页图片不显示:修改 node_modules/af-webpack/lib/getConfig.js 的 url-loader options limit: 10000000

