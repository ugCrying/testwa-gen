const Timeout = require('await-timeout')
const {
  fork, spawnSync, spawn, exec,
} = require('child_process')
const {
  app, Menu, BrowserWindow, ipcMain,
} = require('electron')
const { join } = require('path')
const {
  getSource, postSession, startAppium, stopAppium,
} = require('../api/appium')
const { runScript } = require('../api/adb')
const { startU2 } = require('../api/u2')
const { startMini, trackDevices } = require('../api/mini')
const menu = require('./menu')
const upgrade = require('./upgrade')
const { emitter } = require('../api/event')

let mainWindow
let deviceWindow
let cp
let allureCP
const baseUrl = process.defaultApp
  ? 'http://localhost:8000'
  : `file://${__dirname}/../renderer/index.html`
if (process.platform !== 'win32') {
  const { stdout } = spawnSync('/bin/bash', ['-lc', 'env'])
  if (stdout) {
    const ret = {}
    for (const line of stdout.toString().split('\n')) {
      const parts = line.split('=')
      ret[parts.shift()] = parts.join('=')
    }
    Object.assign(process.env, ret)
  }
}

// TODO: 窗口刷新时再次检查
emitter.on('needAdbUsbPermission', (deviceId) => {
  mainWindow && mainWindow.webContents.send('needAdbUsbPermission', deviceId)
})

const setupDevice = async function (device) {
  // await installU2ToDevice(device.id)
  await startU2(device.id)
  // FIXME：必须预留一定长度时间
  await Timeout.set(5500)
  await postSession()
  await Timeout.set(500)
  await runScript(
    device.id,
    'ime set io.appium.uiautomator2.server/io.appium.uiautomator2.handler.TestwaIME',
  )
  // await Timeout.set(1000)
  await runScript(
    device.id,
    'am start io.appium.uiautomator2.server/io.appium.uiautomator2.MainActivity',
  )
}

/**
 *
 * @param {*} device
 * @return {Promise<any>}
 */
const openDeviceWindow = async function (device) {
  // 不同机型间切换可能需要调整 deviceWindow 尺寸
  // 目前样式有 bug，直接重新开始
  if (deviceWindow) {
    deviceWindow.close()
    deviceWindow = null
  }
  await Timeout.set(100)
  if (!device.screen) {
    console.error(`${device.id} 获取分辨率失败`)
    return
  }
  // screen 运行时变量
  const display = require('electron').screen.getPrimaryDisplay()
  const [width, height] = device.screen.split('x')
  if (!deviceWindow) {
    deviceWindow = new BrowserWindow({
      title: '脚本录制',
      // parent: mainWindow,
      autoHideMenuBar: true,
      show: false,
      height: display.workArea.height,
      x: display.workArea.width + display.workArea.x,
      y: display.workArea.y,
      resizable: false,
      alwaysOnTop: false,
      maximizable: false,
      fullscreenable: false,
      frame: false,
      transparent: true,
      webPreferences: {
        // 生产环境禁用 devTools
        nodeIntegration: true,
        devTools: true,
        nodeIntegrationInWorker: true,
      },
    })
    // if (process.defaultApp) deviceWindow.webContents.openDevTools()
    deviceWindow.once('closed', () => {
      mainWindow.webContents.send('recorded')
      deviceWindow = null
    })
    // console.log({
    //   mainWinId: mainWindow.id,
    //   deviceWinId: deviceWindow.id,
    // })
    mainWindow.webContents.send('deviceWinId', deviceWindow.id)
  }

  // 等待调整device样式信息300ms后进行显示device页面
  ipcMain.once('displayDevice', async () => {
    await Timeout.set(300)
    deviceWindow.show()
  })

  ipcMain.once('canvasWidth', (__, canvasWidth) => {
    deviceWindow.webContents.send('mainWinId', {
      mainWinId: mainWindow.id,
    })
    // 原始拟定高度
    const DEVICE_ORIGIN_HEIGHT = display.workArea.height - 50
    // 设备外壳宽度
    const DEVICE_ORIGIN_WIDTH = Math.round((DEVICE_ORIGIN_HEIGHT * 420) / 912)
    // canvas高度
    const canvasHeight = (canvasWidth * height) / width
    // 原始拟定屏幕高度
    const SCREEN_ORIGIN_HEIGHT = (DEVICE_ORIGIN_HEIGHT * 822) / 912
    // 缩放后屏幕差值
    const SCREEN_HEIGHT_DIFF = SCREEN_ORIGIN_HEIGHT - canvasHeight
    // 外壳真实高度
    const SHELL_HEIGHT = Math.round(DEVICE_ORIGIN_HEIGHT - SCREEN_HEIGHT_DIFF)
    // 设备外壳缩放比
    const scale = DEVICE_ORIGIN_WIDTH / 420
    // 缩放前屏幕原始高度差值
    const SCREEN_ORIGIN_HEIGHT_DIFF = Math.abs(SCREEN_HEIGHT_DIFF) / scale

    deviceWindow.setBounds({
      x: display.workArea.width + display.workArea.x - DEVICE_ORIGIN_WIDTH - 75,
      y: display.workArea.y,
      width: DEVICE_ORIGIN_WIDTH + 75,
      height: SHELL_HEIGHT,
    })
    // console.log({
    //   设备窗口高度: DEVICE_ORIGIN_WIDTH + 75,
    //   设备窗口宽度: SHELL_HEIGHT,
    //   投屏高度: canvasHeight,
    //   投屏宽度: canvasWidth,
    //   adb设备实际高度: height,
    //   adb设备实际宽度: width,
    // })
    deviceWindow.webContents.send('changeStyle', {
      canvasWidth,
      canvasHeight,
      shellHeight: SHELL_HEIGHT,
      scale,
      shellHeightDiff: SCREEN_ORIGIN_HEIGHT_DIFF,
    })

    // test log
    // {
    //   deviceWindow.webContents.send('deviceWinShowed', { width, height })
    //   // 屏幕尺寸(屏幕对角线长度)in
    //   const inch = 15.6
    //   // 屏幕分辨率(屏幕宽和高上所拥有像素数)px
    //   const pc_pixel = display.size
    //   // 屏幕像素密度(屏幕上一个对角线为1英寸的正方形所拥有的像素数,衡量清晰度)ppi=
    //   Math.sqrt(Math.pow(pc_pixel.width, 2) + Math.pow(pc_pixel.height, 2))
    //     / inch
    //   console.log('屏幕分辨率', display.size)
    //   console.log('屏幕内容区（去掉win任务栏/mac菜单栏）', display.workArea)
    //   console.log(
    //     '设备分辨率',
    //     { width: +width, height: +height },
    //     height / width,
    //   )
    //   console.log('设备窗口指定', {
    //     x: display.workArea.width + display.workArea.x - DEVICE_ORIGIN_WIDTH,
    //     y: display.workArea.y,
    //     width: DEVICE_ORIGIN_WIDTH,
    //     height: display.workArea.height,
    //   })
    //   console.log('设备窗口', deviceWindow.getBounds())
    //   console.log('设备窗口内容区', deviceWindow.getContentBounds())
    //   console.log('设备窗口屏幕大小指定', {
    //     width: DEVICE_ORIGIN_WIDTH,
    //     height: canvasHeight,
    //   })
    //   console.log('设备屏幕压缩比例(计划)', {
    //     width: width / DEVICE_ORIGIN_WIDTH,
    //     height: height / canvasHeight,
    //   })
    // }
  })
  deviceWindow.loadURL(
    `${baseUrl}#/${device.id}?device=${
      device.id
    }&width=${width}&height=${height}&testwa_ui=${process.env.testwa_ui}&deviceId=${device.id}`,
  )

  startMini(device)
  await setupDevice(device)
}
app.commandLine.appendSwitch('enable-experimental-web-platform-features')
app.once('ready', () => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
    },
    width: 1280,
    height: 768,
    show: true,
  })
  trackDevices()
  startAppium(mainWindow)
  mainWindow.loadURL(baseUrl)
  mainWindow.once('ready-to-show', async () => {
    mainWindow.maximize()
    mainWindow.show()
  })
  mainWindow.once('close', () => {
    deviceWindow && deviceWindow.close()
  })
  // @ts-ignore
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu))
  upgrade()
  if (process.defaultApp) {
    const installer = require('electron-devtools-installer')
    Promise.all([
      installer.default(installer.REACT_DEVELOPER_TOOLS),
      installer.default(installer.REDUX_DEVTOOLS),
    ])
      .then((name) => console.log(`Added Extension:  ${name}`))
      .catch((err) => console.log('An error occurred: ', err))
    // mainWindow.webContents.openDevTools();
  }
})
app.once('before-quit', () => {
  console.log('准备退出')
  if (cp) {
    cp.kill()
    cp = null
  }
  if (allureCP) {
    allureCP.kill()
  }
  stopAppium()
  process.exit()
})
app.once('window-all-closed', app.quit)
ipcMain.on('openDeviceWindow', (__, device) => openDeviceWindow(device))
ipcMain.on('startRecording', async (__, device, id) => {
  if (deviceWindow) {
    deviceWindow.webContents.send('startRecording', id)
  } else if (device) {
    await openDeviceWindow(device)
    deviceWindow.webContents.send('startRecording', id)
  }
})

// forward the recordedActions detail from deviceWindow to mainWindow
ipcMain.on('recordedActions', (__, data) => mainWindow.webContents.send('recordedActions', data))
// forward the sendKeys action from deviceWindow to mainWindow
ipcMain.on('sendKeys', (__, data) => mainWindow.webContents.send('sendKeys', data))
// forward the expandedPaths action from deviceWindow to mainWindow
ipcMain.on('expandedPaths', (__, data) => mainWindow.webContents.send('expandedPaths', data))
// forward the swipe action from deviceWindow to mainWindow
ipcMain.on('selectedElement', (__, data) => mainWindow.webContents.send('selectedElement', data))
// forward the swipe action from deviceWindow to mainWindow
ipcMain.on('swiped', (__, data) => mainWindow.webContents.send('swiped', data))
// forward the taped action from deviceWindow to mainWindow
ipcMain.on('taped', (__, data) => mainWindow.webContents.send('taped', data))

ipcMain.on('getSourceJSONSuccess', (__, data) => {
  mainWindow.webContents.send('getSourceJSONSuccess', data)
})

// loading ui request from deviceWindow
ipcMain.on('getSource', async (e) => {
  try {
    // 获取失败可能因为 appium 挂掉，重试一次
    const sourceXML = await getSource()
      .catch(async () => {
        await postSession()
        await Timeout.set(1000)
        const data = await getSource()
        return data
      })
    // render cover layer on deviceWindow
    deviceWindow.webContents.send('getSourceSuccess', sourceXML)
    // render ui tree on mainWindow
    // FIXME: node环境下的xmlToJSON与浏览器环境下表现不一致
    // mainWindow.webContents.send("getSourceJSONSuccess", xmlToJSON(sourceXML.value))
  } catch (err) {
    deviceWindow.webContents.send('getSourceFailed', err)
  }
})

ipcMain.on(
  'stopRecording',
  () => deviceWindow && deviceWindow.webContents.send('stopRecording'),
)
let port = 1212
const runAllureCP = (name = '', appName = '') => {
  if (allureCP) allureCP.kill()
  // name 与 appName 可能包含空格，需要用引号连接
  if (process.platform !== 'win32') {
    name = `"${name}"`
    appName = `"${appName}"`
  } else {
    // TODO
    name = name.replace(/\s+/, '_')
    appName = appName.replace(/\s+/g, '_')
  }
  const p = join(
    __dirname,
    '..',
    '..',
    'static',
    'wappium',
    'tests',
    appName,
    name || '',
  )

  allureCP = exec(`allure serve -p ${port++} -h localhost ${p}`)
  allureCP.stdout.on('data', (chunk) => {
    mainWindow.webContents.send('log', chunk.toString())
  })
  allureCP.stderr.on('data', (data) => {
    mainWindow.webContents.send('log', data)
  })
}
ipcMain.on('getReport', (__, { name, appName }) => {
  runAllureCP(name, appName)
})
ipcMain.on('startPlayingBackCode', (__, { rawCode, name, appName }) => {
  const path = join(
    __dirname,
    '..',
    '..',
    'static',
    'wappium',
    'tests',
    'code.py',
  )

  if (name)name = name.replace(/\s+/g, '_')
  appName = appName.replace(/\s+/g, '_')
  console.log(path, '脚本路径')
  require('fs').writeFile(path, rawCode, () => {
    let cp = spawn('pytest', [path, `--alluredir=${join(
      __dirname,
      '..',
      '..',
      'static',
      'wappium',
      'tests', appName,
      name || '',
    )}`])
    cp.stdout.on('data', (chunk) => {
      mainWindow.webContents.send('log', chunk.toString())
    })
    cp.stderr.on('data', (data) => {
      mainWindow.webContents.send('log', data)
    })
    cp.on('close', (code) => {
      console.log(`close code : ${code}`)
    })
    cp.on('exit', (code) => {
      console.log(`cp exit with code ${code}`)
      cp = null
      mainWindow.webContents.send('finishPlayBackCode')
      runAllureCP(name, appName)
    })

    // cp = fork(path)
    // cp.on('message', (msg) => {
    //   mainWindow.webContents.send('log', msg)
    // })
    // cp.on('exit', (code) => {
    //   console.log(`cp exit with code ${code}`)
    //   cp = null
    //   mainWindow.webContents.send('finishPlayBackCode')
    // })
  })
})

ipcMain.on('stopPlayingBackCode', () => {
  stopAppium()
  setTimeout(() => {
    startAppium(mainWindow)
  }, 1000)
  if (cp) {
    cp.kill()
    cp = null
  }
})

// close deviceWindow
ipcMain.on('close', (__) => {
  mainWindow.webContents.send('closeDeviceWindow')
  if (deviceWindow) {
    deviceWindow.close()
  }
  deviceWindow = null
})

ipcMain.on('minimizeDeviceWindow', (__) => {
  deviceWindow.minimize()
})

ipcMain.on('deviceLeave', (__, deviceId) => {
  deviceWindow && deviceWindow.webContents && deviceWindow.webContents.send('deviceLeave', deviceId)
})
