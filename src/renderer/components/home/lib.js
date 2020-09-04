import fs from 'fs'
import { ipcRenderer } from 'electron'
import { client } from 'api/adb'
import _ from 'lodash'
import rxdb from '../../db'
import frameworks from './client-frameworks'

const request = require('request').defaults({
  timeout: 6000,
  forever: true,
  json: true,
  baseUrl: 'http://localhost:4444/wd/hub/session/1/',
})

const adbkit = require('adbkit')
const ApkReader = require('adbkit-apkreader')

let device
let cp

/**
 * 停止正在执行（回放）的脚本
 */
export const codeStop = () => {
  if (cp) {
    cp.kill()
    cp = null
  }
}

/**
 * 返回脚本的内容（供下载）
 * @param {*} info
 * @param {*} recordedActions
 * @return {String}
 */
export const downCode = (info, recordedActions) => {
  // FIXME: 为何只提供 python 格式导出？
  const framework = new frameworks.pythonAllure()
  framework.caps = {
    platformName: 'Android',
    automationName: 'UiAutomator2',
    deviceName: info.id,
    udid: info.id,
    appPackage: info.packageName,
    appActivity: info.activityName,
  }
  framework.actions = recordedActions
  return framework.getCodeString(true)
}

export const getReport = (info) => {
  ipcRenderer.send('getReport', info)
}
/**
 * 执行（回放）脚本
 * @param {*} info
 * @param {*} recordedActions
 */
export const runCode = (info, recordedActions) => {
  const framework = new frameworks.pythonAllure()
  framework.caps = {
    platformName: 'Android',
    automationName: 'UiAutomator2',
    deviceName: info.id,
    udid: info.id,
    appPackage: info.packageName,
    appActivity: info.activityName,
    noReset: 'True',
  }
  framework.actions = recordedActions
  framework.run_num = localStorage.getItem('run_code_num') || 1
  const rawCode = framework.getCodeString(true)
  console.log(
    'rawCode',
    rawCode,
  )
  ipcRenderer.send('startPlayingBackCode', { rawCode, name: info.name, appName: info.appName })
}

export const runCodejs = (info, recordedActions) => {
  const framework = new frameworks.jsWd()
  framework.caps = {
    platformName: 'Android',
    automationName: 'UiAutomator2',
    deviceName: info.id,
    udid: info.id,
    appPackage: info.packageName,
    appActivity: info.activityName,
    noReset: 'True',
  }
  framework.actions = recordedActions
  framework.run_num = localStorage.getItem('run_code_num') || 1
  const rawCode = framework.getCodeString(true)
  console.log(
    'rawCode',
    rawCode,
  )
  ipcRenderer.send('startPlayingBackCode', rawCode)
}
export const record = () => {
  ipcRenderer.send(
    'startRecording',
    device,
    require('electron').remote.BrowserWindow.getFocusedWindow().id,
  )
  // @ts-ignore
  // ipcRenderer.sendTo(localStorage.getItem("deviceWinId"), "record");
}
export const onSelectAPK = async ({ name, path }) => {
  console.log('安装应用', name, path)
  const [apkData] = await Promise.all([
    ApkReader.open(path).then((reader) => reader.readManifest()),
    client.install(device.id, path),
  ])
  console.log('启动应用')
  client.shell(
    device.id,
    `monkey -p ${apkData.package} -c android.intent.category.LAUNCHER 1`,
  )
  console.log('获取应用信息')
  fetch(`http://127.0.0.1:50819/packages/${apkData.package}/info`)
    .then((res) => res.json())
    .then(({ data }) => {
      device.packageName = data.packageName
      device.appName = data.name
      device.activityName = data.activityName
    })
  const db = await rxdb
  // @ts-ignore
  db.apk.atomicUpsert({ name, path })
}
export const onSelectPackage = async ({ packageName, activityName, name }) => {
  // 如果 App 已启动，则强制结束重新启动
  await client.shell(device.id, `am force-stop ${packageName}`)
  client
    .shell(device.id, `am start -n ${packageName}/${activityName}`)
    .then(adbkit.util.readAll)
    .then((data) => console.log(data.toString()))
  device.packageName = packageName
  device.appName = name
  device.activityName = activityName
}

const getDeviceApp = () => new Promise((resolve, reject) => {
  request.get('/package', async (err, res, packages) => {
    // 失败轮训
    // FIXME: 超时次数 / 时间
    if (err || !_.get(packages, 'value')) {
      // await Timeout.set(500)
      return getDeviceApp().then(resolve)
    }
    resolve(
      JSON.parse(packages.value),
    )
  })
})

/**
 * 获取设备下 app
 * @param {*} dispatch
 */
export const getPackages = (dispatch) => {
  getDeviceApp().then((packages = []) => {
    dispatch({
      type: 'record/packages',
      payload: {
        packages,
      },
    })
  })
}

/**
 * 选中设备
 * @param {*} _device
 */
export const onSelectDevice = (_device) => {
  device = _device
  console.log('端口映射到', device.id)
  client.forward(device.id, 'tcp:4444', 'tcp:6790') // UI Automator2
  client.forward(device.id, 'tcp:6677', 'tcp:8888') // testwa keyboard
  client.forward(device.id, 'tcp:1717', 'localabstract:minicap')
  client.forward(device.id, 'tcp:1718', 'localabstract:minitouch')
  // client.forward(device.id, "tcp:4444", "tcp:4724"); //UI Automator1
  // 打开设备小窗
  ipcRenderer.send('openDeviceWindow', device)
}

export const getCodes = async (cb) => {
  const db = await rxdb
  // @ts-ignore
  db.code.find().$.subscribe((codes) => {
    // console.dir(codes);
    if (codes) cb({ codes: JSON.parse(JSON.stringify(codes)) })
  })
}

// eslint-disable-next-line no-async-promise-executor
export const getApkList = () => new Promise(async (resolve, reject) => {
  const db = await rxdb
  // @ts-ignore
  db.apk
    .find()
    .exec()
  db.apk.find().$.subscribe((apkList = []) => {
    const result = apkList.filter((apk) => {
      try {
        fs.statSync(apk.path)
        return true
      } catch (e) {
      // @ts-ignore
        db.apk.remove(apk)
        return false
      }
    })
    resolve(result)
  })
})

/**
 * 监听设备信息
 * TODO api/mini 下也有 trackDevices 方法
 * @param {*} dispatch
 */
export const trackDevices = async (dispatch) => {
  const getDeviceProperties = async (device) => {
    const [properties, screen] = await Promise.all([
      client.getProperties(device.id),
      adbkit.util.readAll(await client.shell(device.id, 'wm size')),
      // dumpsys window | grep -Eo 'init=[0-9]+x[0-9]+' | head -1 | cut -d= -f 2
    ])
    device.brand = properties['ro.product.brand']
    device.model = properties['ro.product.model']
    device.cpu = properties['ro.product.cpu.abi']
    device.sdk = properties['ro.build.version.sdk']
    device.release = properties['ro.build.version.release']
    const screens = new RegExp(/Override size: ([^\r?\n]+)*/g).exec(screen)
      || new RegExp(/Physical size: ([^\r?\n]+)*/g).exec(screen)
    screens
      ? (device.screen = screens[1].trim())
      : console.error(`${device.id} 获取分辨率失败`, screen.toString())
    console.log('设备信息', device)
  }
  const devices = await client.listDevices()
  const Promises = []
  for (const device of devices) {
    if (device.type !== 'device') continue
    Promises.push(getDeviceProperties(device))
  }
  try {
    await Promise.all(Promises)
    dispatch({
      type: 'record/devices',
      payload: {
        devices,
      },
    })
  } catch (e) {
    console.error(e.message, '获取设备信息失败')
  }

  (await client.trackDevices()).on('changeSet', async (changes) => {
    if (!changes.removed.length && !changes.changed.length) return
    for (const device of changes.removed) {
      console.log(device.id, '离开')
      ipcRenderer.send('deviceLeave', device.id)
      const idx = devices.findIndex((e) => e.id === device.id)
      if (idx >= 0) devices.splice(idx, 1)
    }
    try {
      for (const device of changes.changed) {
        const idx = devices.findIndex((e) => e.id === device.id)
        if (idx >= 0) {
          if (device.type === 'device') {
            await getDeviceProperties(device)
          }
          console.log(device.id, device.type)
          devices[idx] = device
        } else {
          console.log(device.id, '进入')
          await getDeviceProperties(device)
          devices.push(device)
        }
      }
    } catch (e) {
      console.error(e.message, '获取设备信息失败')
    }
    dispatch({
      type: 'record/devices',
      payload: {
        devices,
      },
    })
  })
}
