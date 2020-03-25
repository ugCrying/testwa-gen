/**
 * @abort
 * move to src/api/mini
 */

console.log("adb封装模块");
const { join } = require("path");
const { client, installUiautomator2, startUiautomator2 } = require("./adb");
const { DEVICE_SCREEN_OUTPUT_RATIO } = require("../common/config");
let baseUrl = process.defaultApp
  ? join(__dirname, "..", "..", "node_modules")
  : join(__dirname, "..", "..");
exports.startMini = device => {
  client.shell(device.id, `/data/local/tmp/minitouch`).catch(reason => {
    console.error(reason.message, `${device.id} minitouch启动失败`);
  });
  device.screen &&
    client
      .shell(
        device.id,
        `LD_LIBRARY_PATH=/data/local/tmp exec /data/local/tmp/minicap -P ${
          device.screen
        }@${device.screen
          .split("x")
          .map(data => data * DEVICE_SCREEN_OUTPUT_RATIO)
          .join("x")}/0`
      )
      .catch(reason => {
        console.error(reason.message, `${device.id} minicap启动失败`);
      });
  //LD_LIBRARY_PATH=/data/local/tmp exec /data/local/tmp/minicap -S -Q 80 -P 720x1280@408x467/0
};
exports.trackDevices = async () => {
  const getDeviceProperties = async device => {
    const properties = await client.getProperties(device.id);
    device.cpu = properties["ro.product.cpu.abi"];
    device.sdk = properties["ro.build.version.sdk"];
    console.log(device);
    return device;
  };
  const push2Device = device => {
    const touchPath = join(
      baseUrl,
      "minitouch-prebuilt",
      "prebuilt",
      device.cpu,
      "bin",
      "minitouch"
    );
    const capPath = join(
      baseUrl,
      "minicap-prebuilt",
      "prebuilt",
      device.cpu,
      "bin",
      "minicap"
    );
    const capSoPath = join(
      baseUrl,
      "minicap-prebuilt",
      "prebuilt",
      device.cpu,
      "lib",
      `android-${device.sdk}`,
      "minicap.so"
    );
    try {
      require("fs").statSync(touchPath);
      require("fs").statSync(capPath);
      require("fs").statSync(capSoPath);
    } catch (e) {
      delete device.screen;
      console.log(e.message, "不支持的设备架构");
      return;
    }
    console.log("推送服务文件到", device.id);
    Promise.all([
      client.push(device.id, touchPath, "/data/local/tmp/minitouch", 511),
      client.push(device.id, capPath, "/data/local/tmp/minicap", 511),
      client.push(device.id, capSoPath, "/data/local/tmp/minicap.so", 511)
      // client.push(
      //   device.id,
      //   join(__dirname, "..", "..", "static", "AppiumBootstrap.jar"),
      //   "/data/local/tmp/AppiumBootstrap.jar"
      // )
    ]).catch(reason => {
      console.error(reason.message, `向${device.id}推送服务文件失败`);
    });
    installUiautomator2(device.id).then(() => {
      // client.shell(
      //   device.id,
      //   "ime set io.appium.uiautomator2.server/io.appium.uiautomator2.handler.TestwaIME"
      // );
      startUiautomator2(device.id);
    });
  };
  const devices = await client.listDevices();
  for (const device of devices) {
    if (device.type !== "device") continue;
    getDeviceProperties(device).then(push2Device);
  }
  (await client.trackDevices()).on("changeSet", async changes => {
    for (const device of changes.changed) {
      if (device.type !== "device") continue;
      getDeviceProperties(device).then(push2Device);
    }
  });
};
