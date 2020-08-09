const { join } = require('path')
const { statSync } = require('fs')
const {
  runScript, getProperties, listDevices, trackDevices: watchDevices, client,
} = require('./adb')
const { installU2ToDevice, startU2 } = require('./u2')
const { DEVICE_SCREEN_OUTPUT_RATIO } = require('../common/config')

const baseUrl = process.defaultApp
  ? join(__dirname, '..', '..', 'node_modules')
  : join(__dirname, '..', '..')

/**
 * start miniTouch
 * @param {*} device
 * @return {Promise<any>}
 */
const startMiniTouch = async function (device) {
  await runScript(
    device.id,
    '/data/local/tmp/minitouch',
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
        .split('x')
        .map((data) => data * DEVICE_SCREEN_OUTPUT_RATIO)
        .join('x')}/0`,
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
    startMiniCap(device),
  ])
}

const getDeviceProperties = async function (device) {
  const properties = await getProperties(device.id)
  device.cpu = properties['ro.product.cpu.abi']
  device.sdk = properties['ro.build.version.sdk']
  console.log(device)
  return device
}

/**
 * push miniTouch、miniCap to devuce
 * @param {*} device
 * @return {Promise<any>}
 */
const pushMiniToDevice = async function (device) {
  const touchPath = join(
    baseUrl,
    'minitouch-prebuilt',
    'prebuilt',
    device.cpu,
    'bin',
    'minitouch',
  )
  const capPath = join(
    baseUrl,
    'minicap-prebuilt',
    'prebuilt',
    device.cpu,
    'bin',
    'minicap',
  )
  const capSoPath = join(
    baseUrl,
    'minicap-prebuilt',
    'prebuilt',
    device.cpu,
    'lib',
    `android-${device.sdk}`,
    'minicap.so',
  )
  try {
    statSync(touchPath)
    statSync(capPath)
    statSync(capSoPath)
  } catch (e) {
    delete device.screen
    console.log(e.message, '不支持的设备架构')
    return
  }
  console.log('推送服务文件到', device.id)
  Promise.all([
    client.push(device.id, touchPath, '/data/local/tmp/minitouch', 511),
    client.push(device.id, capPath, '/data/local/tmp/minicap', 511),
    client.push(device.id, capSoPath, '/data/local/tmp/minicap.so', 511),
    // client.push(
    //   device.id,
    //   join(__dirname, "..", "..", "static", "AppiumBootstrap.jar"),
    //   "/data/local/tmp/AppiumBootstrap.jar"
    // )
  ]).catch((reason) => {
    console.error(reason.message, `向${device.id}推送服务文件失败`)
  })
  await installU2ToDevice(device.id)
  // await startU2(device.id)
}

const trackDevices = async function () {
  const devices = await listDevices()
  devices
    .filter((el) => el.type === 'device')
    .forEach((device) => {
      getDeviceProperties(device).then(pushMiniToDevice)
    });
  (await watchDevices()).on('changeSet', async (changes) => {
    for (const device of changes.changed) {
      if (device.type !== 'device') continue
      getDeviceProperties(device).then(pushMiniToDevice)
    }
  })
}

module.exports = {
  startMini,
  trackDevices,
}
