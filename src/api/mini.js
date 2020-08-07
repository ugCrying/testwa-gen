const { join } = require('path')
const { statSync } = require('fs')
const { connect } = require('net')
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
  return await runScript(
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
  startU2(device.id)
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

// const getMinicapImgBase64 = function () {
//   const minicap = connect({ port: 1717 })
//   let data = []
//   let base64
//   const convertBufferToBase64 = function () {
//     //前四个字节是帧大小
//     const arr = data.slice(0, 4)
//     //获得帧大小
//     const size = (arr[3] << 24) | (arr[2] << 16) | (arr[1] << 8) | (arr[0] << 0)
//     if (data.length >= size + 4) {
//       //获取帧内容
//       // imgStream.push(chunk, "base64");
//       base64 = 'data:image/png;base64,' + Buffer.from(data.slice(4, 4 + size)).toString('base64');
//       data = data.slice(4 + size);
//       convertBufferToBase64();
//     }
//   }
//   minicap.on('data', chunk => {
//     // @ts-ignore
//     data.push(...chunk)
//     convertBufferToBase64()
//     // return base64
//     console.log('base64', base64, data.length)
//   })
// }

let src

const getMinicapImgBase64 = (cb = (v) => {}) => {
  let drawing = false
  const connectMinicap = () => {
    const { BannerParser } = require('minicap')
    const parser = new BannerParser()
    const minicap = connect({ port: 1717 })
    let data = []
    let header = true
    let compiling = true
    const screen = () => {
      compiling = true
      const arr = data.slice(0, 4) // 前四个字节是帧大小
      const size = (arr[3] << 24) | (arr[2] << 16) | (arr[1] << 8) | (arr[0] << 0) // 获得帧大小
      if (data.length >= size + 4) {
        // 获取帧内容
        // imgStream.push(chunk, "base64");
        if (drawing === false) {
          drawing = true
          src = `data:image/png;base64,${
            Buffer.from(data.slice(4, 4 + size)).toString('base64')}`
          // cb(src)
          // console.log('--------------------')
          // console.log('--------------------')
          // console.log('--------------------')
          // console.log('src', src)
          // console.log('--------------------')
          // console.log('--------------------')
          // console.log('--------------------')
        }
        data = data.slice(4 + size)
        return screen()
      }
      return (compiling = false)
    }
    drawing = false
    minicap.on('data', (chunk) => {
      // @ts-ignore
      data.push(...chunk)
      console.log('minicap data')
      cb(src)
      if (compiling === false) return screen()
      if (header) {
        parser.parse(data.splice(0, 24)) // 前24个字节是头信息
        // @ts-ignore
        header = false
        compiling = false
      }
    })
  }
  connectMinicap()
}

module.exports = {
  startMini,
  trackDevices,
  getMinicapImgBase64,
}
