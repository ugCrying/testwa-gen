const { runScript, getProperties, listDevices, trackDevices: watchDevices, client, installApp } = require('./adb')
const { installU2ToDevice, startU2 } = require('./u2')
const { DEVICE_SCREEN_OUTPUT_RATIO } = require("../common/config");
const { join } = require("path")
const { statSync } = require('fs')
const { connect } = require('net')
const { execSync } = require('child_process')
const lineBreak = (process.platform === 'win32') ? '\n\r' : '\n';

const isOverAndroid10 = (sn) => {
  const command = `adb -s ${sn} shell getprop ro.build.version.release`
  const version = ~~execSync(command).toString().replace(lineBreak, '')
  return version >= 10
}
const baseUrl = process.defaultApp
    ? join(__dirname, "..", "..", "node_modules")
    : join(__dirname, "..", "..")

/**
 * start miniTouch
 * @param {*} device 
 * @return {Promise<any>}
 */
const startMiniTouch = async function (device) {
  return await runScript(
    device.id,
    `/data/local/tmp/minitouch`
  )
}

/**
 * start miniCap
 * @param {*} device 
 * @return {Promise<any>}
 */
const startMiniCap = async function (device) {
  if (device.screen) {
    await runScript(
      device.id,
      `LD_LIBRARY_PATH=/data/local/tmp exec /data/local/tmp/minicap -P ${
        device.screen
      }@${device.screen
        .split("x")
        .map(data => data * DEVICE_SCREEN_OUTPUT_RATIO)
        .join("x")}/0`
    )
  }
}

/**
 * start miniTouch and miniCap
 * @param {*} device 
 * @return {Promise<any>}
 */
const startMini = async function (device) {
  await Promise.all([
    startMiniTouch(device),
    startMiniCap(device)
  ])
}

const getDeviceProperties = async function (device) {
  const properties = await getProperties(device.id);
  device.cpu = properties["ro.product.cpu.abi"];
  device.sdk = properties["ro.build.version.sdk"];
  console.log(device);
  return device;
};

/**
 * push miniTouch、miniCap to devuce
 * @param {*} device 
 * @return {Promise<any>}
 */
const pushMiniToDevice = async function (device) {
  const touchPath = join(
    baseUrl,
    "minitouch-prebuilt-beta",
    "prebuilt",
    device.cpu,
    "bin",
    "minitouch"
  );
  const libcompress = join(
    __dirname,
    'jniLibs',
    device.cpu,
    'libcompress.so'
  );
  const libturbojpeg = join(
    __dirname,
    'libs',
    'libturbojpeg',
    'prebuilt',
    device.cpu,
    'libturbojpeg.so'
  );

  const scrcpyServer = join(
    __dirname,
    'scrcpy-server.jar'
  )
  try {
    statSync(touchPath);
    statSync(libcompress);
    statSync(libturbojpeg);
    statSync(scrcpyServer);
  } catch (e) {
    delete device.screen;
    console.log(e.message, "不支持的设备架构");
    return;
  }
  console.log("推送服务文件到", device.id);
  const tasks = [
    client.push(device.id, touchPath, "/data/local/tmp/minitouch", 511),
    execSync(`adb -s ${device.id} push ${libcompress} /data/local/tmp/`),
    execSync(`adb -s ${device.id} push ${libturbojpeg} /data/local/tmp/`),
    execSync(`adb -s ${device.id} push ${scrcpyServer} /data/local/tmp/`),
    execSync(`adb -s ${device.id} shell chmod 777 /data/local/tmp/scrcpy-server.jar`)
  ]
  if (isOverAndroid10(device.id)) {
    console.log('STFService.apk 推送')
    tasks.push(
      installApp(device.id, join(__dirname, 'STFService.apk'))
    )
  }
  Promise.all(tasks).catch(reason => {
    console.error(reason.message, `向${device.id}推送服务文件失败`);
  });
  await installU2ToDevice(device.id)
  startU2(device.id)
}

const trackDevices = async function () {
  const devices = await listDevices()
  devices
    .filter(el => el.type === 'device')
    .forEach(device => {
      getDeviceProperties(device).then(pushMiniToDevice)
    });
  (await watchDevices()).on("changeSet", async changes => {
    for (const device of changes.changed) {
      if (device.type !== "device") continue;
      getDeviceProperties(device).then(pushMiniToDevice);
    }
  })
}

let src

module.exports = {
  startMini,
  trackDevices,
  isOverAndroid10
}