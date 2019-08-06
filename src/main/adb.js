const adbkit = require("adbkit");
const client = (exports.client = adbkit.createClient());
const ApkReader = require("adbkit-apkreader");
const { join } = require("path");
const U2apkPath = join(__dirname, "..", "..", "static", "uiautomator2", "apks");

exports.installUiautomator2 = (deviceId, start) => {
  const installAPK = async (path, packageName, force, cb) => {
    const packageInfo = await client
      .shell(deviceId, "dumpsys package " + packageName)
      .then(adbkit.util.readAll);
    const apkVersion = (await ApkReader.open(path).then(reader =>
      reader.readManifest()
    )).versionName;
    if (!packageInfo.includes("versionName=" + apkVersion)) {
      //如果未安装或版本不一致
      try {
        console.log("尝试直接安装或升级" + packageName + " on " + deviceId);
        await client.install(deviceId, path);
        console.log("安装成功" + packageName + " on " + deviceId);
        return cb && cb();
      } catch (e) {
        console.log("直接安装或升级失败", e.message);
      }
      if (force)
        try {
          console.log("尝试清理应用重新安装" + packageName + " on " + deviceId);
          await client
            .uninstall(deviceId, packageName)
            .then(() => client.install(deviceId, path));
          console.log("安装成功" + packageName + " on " + deviceId);
          return cb && cb();
        } catch (e) {
          console.log("清理应用重新安装失败", e.message);
        }
      try {
        console.log("尝试推送apk到设备" + packageName + " on " + deviceId);
        await client.push(deviceId, path, "/sdcard/");
        console.log(
          "安装失败,apk已推送到设备/sdcard 目录,请手动安装后继续" +
            packageName +
            " on " +
            deviceId
        );
      } catch (e) {
        console.error(packageName + " on " + deviceId + " 推送失败", e.message);
      }
    } else console.log(deviceId, packageName, "已存在");
  };
  return Promise.all([
    installAPK(
      join(U2apkPath, "uiautomator2-test.apk"),
      "io.appium.uiautomator2.server.test",
      true
    ),
    installAPK(
      join(U2apkPath, "uiautomator2-server.apk"),
      "io.appium.uiautomator2.server",
      true,
      start
    ),
  ]);
};
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
