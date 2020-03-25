// @ts-check
"use strict";
import { getSource, postSession as createSession } from '../api/appium'
import { runScript } from '../api/adb'
import { installU2ToDevice, startU2 } from '../api/u2'
import Timeout from 'await-timeout'
const { fork, spawnSync } = require("child_process");
const { app, Menu, BrowserWindow, ipcMain } = require("electron");
const menu = require("./menu");
const upgrade = require("./upgrade");
const { startMini, trackDevices } = require("./trackDevices");
const { join } = require("path");
const { startAppium, stopAppium } = require("./lib");

const source = async () => {
  try {
    const sourceXML = await getSource()
    console.log('-----------------sendSourceFromMain---------------------------')
    deviceWin.webContents.send("getSouceSuccess", sourceXML)
    console.log('-----------------sendSourceFromMain---------------------------')
  } catch (e) {
    console.log('-----------------source error---------------------------')
    console.log(e)
    console.log('-----------------source error---------------------------')
    throw e
  }
}

ipcMain.on('test', async (e) => {
  try {
    await source()
  } catch (e) {
    // TODO:此处只做了一次
    // deviceWin.webContents.send("getSouceFailed", '')
    startU2(_device.id).then(setTimeout(createSession, 5000));
    // 等待 session 创建成功
    setTimeout(() => {
      source()
    }, 3000)
    // throw e
  }
})

let mainWindow;
let deviceWin;
let cp;
let _device;
let baseUrl = process.defaultApp
  ? "http://localhost:8000"
  : `file://${__dirname}/../renderer/index.html`;
if (process.platform !== "win32") {
  const { stdout } = spawnSync("/bin/bash", ["-lc", "env"]);
  if (stdout) {
    const ret = {};
    for (const line of stdout.toString().split("\n")) {
      const parts = line.split("=");
      ret[parts.shift()] = parts.join("=");
    }
    Object.assign(process.env, ret);
  }
}

/**
 * 
 * @param {*} _ 
 * @param {*} device 
 * @return {Promise<any>}
 */
const openDeviceWindow = async function (_, device) {
  _device = device;
  if (!device.screen) {
    console.error(`${device.id} 获取分辨率失败`);
    return;
  }
  const display = require("electron").screen.getPrimaryDisplay();
  const [width, height] = device.screen.split("x");
  console.log("创建设备窗口 Renderer");
  startMini(device);
  await installU2ToDevice(device.id)
  await startU2(device.id)
  await Timeout.set(5000)
  createSession()
  runScript(
    device.id,
    "ime set io.appium.uiautomator2.server/io.appium.uiautomator2.handler.TestwaIME"
  )
  await Timeout.set(600)
  runScript(
    device.id,
    "am start io.appium.uiautomator2.server/io.appium.uiautomator2.MainActivity"
  )
  if (!deviceWin) {
    deviceWin = new BrowserWindow({
      title: "脚本录制",
      // parent: mainWindow,
      autoHideMenuBar: true,
      show: false,
      height: display.workArea.height,
      x: display.workArea.width + display.workArea.x,
      y: display.workArea.y,
      resizable: false,
      alwaysOnTop: true,
      maximizable: false,
      fullscreenable: false,
      frame: false,
      transparent: true,
      webPreferences: {
        // 生产环境禁用 devTools
        nodeIntegration: true,
        devTools: true,
        nodeIntegrationInWorker: true
      }
    });
    // if (process.defaultApp) deviceWin.webContents.openDevTools();
    deviceWin.once("closed", () => {
      mainWindow.webContents.send("recorded");
      deviceWin = null;
    });
    console.log({
      mainWinId: mainWindow.id,
      deviceWinId: deviceWin.id
    });
    mainWindow.webContents.send("deviceWinId", deviceWin.id);
  }

  // 等待调整device样式信息100ms后进行显示device页面
  ipcMain.once("displayDevice", () => {
    setTimeout(() => {
      deviceWin.show();
    }, 500);
  });

  ipcMain.once("canvasWidth", (_, canvasWidth) => {
    deviceWin.webContents.send("mainWinId", {
      mainWinId: mainWindow.id
    });
    // 原始拟定高度
    const DEVICE_ORIGIN_HEIGHT = display.workArea.height - 50;
    // 设备外壳宽度
    const DEVICE_ORIGIN_WIDTH = Math.round((DEVICE_ORIGIN_HEIGHT * 420) / 912);
    // canvas高度
    const canvasHeight = (canvasWidth * height) / width;
    // 原始拟定屏幕高度
    const SCREEN_ORIGIN_HEIGHT = (DEVICE_ORIGIN_HEIGHT * 822) / 912;
    // 缩放后屏幕差值
    const SCREEN_HEIGHT_DIFF = SCREEN_ORIGIN_HEIGHT - canvasHeight;
    // 外壳真实高度
    const SHELL_HEIGHT = Math.round(DEVICE_ORIGIN_HEIGHT - SCREEN_HEIGHT_DIFF);
    // 设备外壳缩放比
    const scale = DEVICE_ORIGIN_WIDTH / 420;
    // 缩放前屏幕原始高度差值
    const SCREEN_ORIGIN_HEIGHT_DIFF = Math.abs(SCREEN_HEIGHT_DIFF) / scale;

    deviceWin.setBounds({
      x: display.workArea.width + display.workArea.x - DEVICE_ORIGIN_WIDTH - 75,
      y: display.workArea.y,
      width: DEVICE_ORIGIN_WIDTH + 75,
      height: SHELL_HEIGHT
    });
    console.log({
      设备窗口高度: DEVICE_ORIGIN_WIDTH + 75,
      设备窗口宽度: SHELL_HEIGHT,
      投屏高度: canvasHeight,
      投屏宽度: canvasWidth,
      adb设备实际高度: height,
      adb设备实际宽度: width
    });
    deviceWin.webContents.send("changeStyle", {
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight,
      shellHeight: SHELL_HEIGHT,
      scale: scale,
      shellHeightDiff: SCREEN_ORIGIN_HEIGHT_DIFF
    });

    //test log
    {
      deviceWin.webContents.send("deviceWinShowed", { width, height });
      // 屏幕尺寸(屏幕对角线长度)in
      const inch = 15.6;
      // 屏幕分辨率(屏幕宽和高上所拥有像素数)px
      const pc_pixel = display.size;
      // 屏幕像素密度(屏幕上一个对角线为1英寸的正方形所拥有的像素数,衡量清晰度)ppi=
      Math.sqrt(Math.pow(pc_pixel.width, 2) + Math.pow(pc_pixel.height, 2)) /
        inch;
      console.log("屏幕分辨率", display.size);
      console.log("屏幕内容区（去掉win任务栏/mac菜单栏）", display.workArea);
      console.log(
        "设备分辨率",
        { width: +width, height: +height },
        height / width
      );
      console.log("设备窗口指定", {
        x: display.workArea.width + display.workArea.x - DEVICE_ORIGIN_WIDTH,
        y: display.workArea.y,
        width: DEVICE_ORIGIN_WIDTH,
        height: display.workArea.height
      });
      console.log("设备窗口", deviceWin.getBounds());
      console.log("设备窗口内容区", deviceWin.getContentBounds());
      console.log("设备窗口屏幕大小指定", {
        width: DEVICE_ORIGIN_WIDTH,
        height: canvasHeight
      });
      console.log("设备屏幕压缩比例(计划)", {
        width: width / DEVICE_ORIGIN_WIDTH,
        height: height / canvasHeight
      });
    }
  });
  deviceWin.loadURL(
    `${baseUrl}#/${device.id}?device=${
    device.id
    }&width=${width}&height=${height}&testwa_ui=${process.env.testwa_ui}`
  );
};
app.commandLine.appendSwitch("enable-experimental-web-platform-features");
app.once("ready", () => {
  mainWindow = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true
    },
    show: false
    // backgroundColor: "#2e2c29"
  });
  mainWindow.loadURL(baseUrl);
  mainWindow.once("ready-to-show", async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    mainWindow.maximize();
    mainWindow.show();
  });
  trackDevices();
  startAppium(mainWindow);
  mainWindow.once("close", () => {
    deviceWin && deviceWin.close();
  });
  // @ts-ignore
  Menu.setApplicationMenu(Menu.buildFromTemplate(menu));
  upgrade();
  if (process.defaultApp) {
    const installer = require("electron-devtools-installer");
    Promise.all([
      installer.default(installer.REACT_DEVELOPER_TOOLS),
      installer.default(installer.REDUX_DEVTOOLS)
    ])
      .then(name => console.log(`Added Extension:  ${name}`))
      .catch(err => console.log("An error occurred: ", err));
    // mainWindow.webContents.openDevTools();
  }
});
app.once("before-quit", () => {
  console.log("准备退出");
});
app.once("window-all-closed", app.quit);
ipcMain.on("openDeviceWindow", openDeviceWindow);
// start to record
ipcMain.on("record", async (_, device, id) => {
  if (deviceWin) {
    deviceWin.webContents.send("record", id)
  } else if (device) {
    await openDeviceWindow('', device)
    deviceWin.webContents.send("record", id)
  }
});

// forward the recordedActions detail from deviceWindow to mainWindow
ipcMain.on('recordedActions', (_, data) => mainWindow.webContents.send("recordedActions", data))
// forward the sendKeys action from deviceWindow to mainWindow
ipcMain.on('sendKeys', (_, data) => mainWindow.webContents.send("sendKeys", data))
// forward the expandedPaths action from deviceWindow to mainWindow
ipcMain.on('expandedPaths', (_, data) => mainWindow.webContents.send("expandedPaths", data))
// forward the swipe action from deviceWindow to mainWindow
ipcMain.on('selectedElement', (_, data) => mainWindow.webContents.send("selectedElement", data))
// forward the page source json from deviceWindow to mainWindow
ipcMain.on('getSourceJSON', (_, data) => {
   console.log('main getSourceJSON', _, data)
    mainWindow.webContents.send("getSourceJSON", data)
})
// forward the swipe action from deviceWindow to mainWindow
ipcMain.on('swiped', (_, data) => mainWindow.webContents.send("swiped", data))
// forward the taped action from deviceWindow to mainWindow
ipcMain.on('taped', (_, data) => mainWindow.webContents.send("taped", data))

// stop recording code
ipcMain.on(
  "stoprecord",
  () => deviceWin && deviceWin.webContents.send("stoprecord")
);

// play back code
ipcMain.on("runcode", (_, rawCode) => {
  const path = join(
    __dirname,
    "..",
    "..",
    "static",
    "wappium",
    "tests",
    "code.js"
  );
  console.log(path, "脚本路径");
  require("fs").writeFile(path, rawCode, () => {
    console.log(
      'rawCode',
      rawCode
    )
    cp = fork(path);
    cp.on("exit", () => {
      cp = null;
      mainWindow.webContents.send("runed");
    });
  });
});

// stop playing back code
ipcMain.on("stopcode", () => {
  stopAppium();
  setTimeout(() => {
    startAppium(mainWindow);
  }, 1000);
  if (cp) {
    cp.kill();
    cp = null;
  }
});

// close deviceWindow
ipcMain.on("close", _ => {
  deviceWin.close();
});

// minimize deviceWindow
ipcMain.on("min", _ => {
  deviceWin.minimize();
});

// start Uiautomator2
ipcMain.on("startU2", async () => {
  await startU2(_device.id)
  setTimeout(createSession, 5000)
});
