const adbkit = require("adbkit");
const client = (exports.client = adbkit.createClient());
const ApkReader = require("adbkit-apkreader");
const { join } = require("path");
const U2apkPath = join(__dirname, "..", "..", "static", "uiautomator2", "apks");

/**
 * 安装 Uiautomator2 到设备
 * @param {*} deviceId
 * @param {function} cb 安装成功的回调函数
 */
exports.installUiautomator2 = async (deviceId, cb) => {
  const packageInfo = await client
    .shell(deviceId, "dumpsys package io.appium.uiautomator2.server")
    .then(adbkit.util.readAll);
  const apkVersion = (await ApkReader.open(
    join(U2apkPath, "uiautomator2-server.apk")
  ).then(reader => reader.readManifest())).versionName;
  if (!packageInfo.includes("versionName=" + apkVersion)) {
    //如果未安装或版本不一致
    try {
      console.log("1.尝试直接安装或升级");
      await Promise.all([
        client.install(deviceId, join(U2apkPath, "uiautomator2-server.apk")),
        client.install(deviceId, join(U2apkPath, "uiautomator2-test.apk"))
      ]);
      console.log("appium.uiautomator2.server apk 安装成功");
      return cb && cb();
    } catch (e) {
      console.log("直接安装或升级失败", e.message);
    }
    try {
      console.log("2.尝试清理应用重新安装");
      await Promise.all([
        client
          .uninstall(deviceId, "io.appium.uiautomator2.server")
          .then(() =>
            client.install(deviceId, join(U2apkPath, "uiautomator2-server.apk"))
          ),
        client
          .uninstall(deviceId, "io.appium.uiautomator2.server.test")
          .then(() =>
            client.install(deviceId, join(U2apkPath, "uiautomator2-test.apk"))
          )
      ]);
      console.log("appium.uiautomator2.server apk 安装成功");
      return cb && cb();
    } catch (e) {
      console.log("清理应用重新安装失败", e.message);
    }
    try {
      console.log("3.尝试推送apk到设备");
      await Promise.all([
        client.push(
          deviceId,
          join(U2apkPath, "uiautomator2-server.apk"),
          "/sdcard/uiautomator2-server.apk"
        ),
        client.push(
          deviceId,
          join(U2apkPath, "uiautomator2-test.apk"),
          "/sdcard/uiautomator2-test.apk"
        )
      ]);
      console.log("appium.uiautomator2.server apk 安装失败");
      console.log("已推送apks到设备/sdcard 目录,请手动安装后继续");
    } catch (e) {
      console.error(`appium.uiautomator2.server apk 推送失败`, e.message);
    }
  }
};

/**
 * 启动 Uiautomator2
 * @param {*} deviceId
 */
exports.startUiautomator2 = async deviceId => {
  return client
    .shell(
      deviceId,
      `am instrument -w --no-window-animation io.appium.uiautomator2.server.test/androidx.test.runner.AndroidJUnitRunner`
    )
    .then(out => {
      out.on("data", data => console.log("uiautomator2:", data.toString()));
    })
    .catch(e => console.error(e.message, `${deviceId} uiautomator2 启动失败`));
  // client.shell(
  //   deviceId,
  //   "ime set io.appium.uiautomator2.server/io.appium.uiautomator2.handler.TestwaIME"
  // );
};
