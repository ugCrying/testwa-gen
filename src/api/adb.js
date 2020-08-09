const adbkit = require('adbkit')

const client = adbkit.createClient()

/**
 * install an app to device
 * @param {String} deviceId
 * @param {String} apkPath
 * @return {Promise<any>}
 */
const installApp = async function (deviceId, apkPath) {
  return await client.install(deviceId, apkPath)
}

/**
 * push a file to device
 * @param {String} deviceId
 * @param {String} fromPath
 * @param {String} toPath
 * @return {Promise<any>}
 */
const pushFile = async function (deviceId, fromPath, toPath) {
  return await client.push(deviceId, fromPath, toPath)
}

/**
 * run a script on adb
 * @param {String} deviceId
 * @param {String} script
 * @return {Promise<any>}
 */
const runScript = async function (deviceId, script) {
  return await client
    .shell(
      deviceId,
      `${script}`,
    )
}

const getProperties = async function (deviceId) {
  return client.getProperties(deviceId)
}

/**
 * @return {Promise<any>}
 */
const listDevices = async function () {
  return await client.listDevices()
}

const trackDevices = async function () {
  return await client.trackDevices()
}

module.exports = {
  client,
  installApp,
  listDevices,
  pushFile,
  runScript,
  getProperties,
  trackDevices,
}
