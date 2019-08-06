// @ts-check
"use strict";
console.log(require("os").tmpdir(), "系统临时目录");
console.log("主进程入口模块");
const { fork, spawnSync } = require("child_process");
const { app, Menu, BrowserWindow, ipcMain } = require("electron");
const menu = require("./menu");
const upgrade = require("./upgrade");
const { startMini, trackDevices } = require("./trackDevices");
const { join } = require("path");
const { client, installUiautomator2, startUiautomator2 } = require("./adb");
const { startAppium, stopAppium } = require("./lib");
let mainWindow;
let deviceWin;
let cp = [];
let cpno;
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

const createSession = () => {
  require("request").post(
    "http://localhost:4444/wd/hub/session",
    {
      json: true,
      body: { desiredCapabilities: {} }
    },
    (err, res, data) =>
      console.log("createSession", (err && err.message) || data || res)
  );
};
// global.sharedObj = {
//   aapt: require("path").join(
//     __dirname,
//     "..",
//     "..",
//     "static",
//     "aapt",
//     require("os").platform(),
//     "aapt"
//   )
// };

const openDeviceWindow = (_, device, cb) => {
  _device = device;
  if (!device.screen) {
    console.error(`${device.id} 获取分辨率失败`);
    return;
  }
  const display = require("electron").screen.getPrimaryDisplay();
  const [width, height] = device.screen.split("x");
  console.log("创建设备窗口 Renderer");
  startMini(device);
  installUiautomator2(device.id, () => {
    // 重装后启动服务
    startUiautomator2(device.id); //.then(setTimeout(createSession, 5000));
  }).then(() => {
    createSession();
    setTimeout(
      () =>
        client.shell(
          device.id,
          "am start io.appium.uiautomator2.server/io.appium.uiautomator2.MainActivity"
        ),
      600
    );
  });
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
    cb && cb();
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
    show: false
    // backgroundColor: "#2e2c29"
  });
  mainWindow.loadURL(baseUrl);
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
  mainWindow.once("ready-to-show", async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    mainWindow.maximize();
    mainWindow.show();
  });
});
app.once("before-quit", () => {
  console.log("准备退出");
});
app.once("window-all-closed", app.quit);
ipcMain.on("openDeviceWindow", openDeviceWindow);
ipcMain.on("record", (_, device, id) => {
  if (deviceWin) deviceWin.webContents.send("record", id);
  else
    device &&
      openDeviceWindow(_, device, () =>
        deviceWin.webContents.send("record", id)
      );
});
ipcMain.on(
  "stoprecord",
  () => deviceWin && deviceWin.webContents.send("stoprecord")
);
// ipcMain.on("restartAppium", () => {
// appium.kill();
// appium.send({ type: "exit" });
// setTimeout(() => {
//   appium = fork(join(__dirname, "..", "..", "static", "wappium", "start_cp"));
//   appium.on("message", msg => mainWindow.webContents.send("log", msg));
// }, 3000);
// });
let delay = 0;
ipcMain.on("runcode", (_, rawCode, deviceId) => {
  const path = join(
    __dirname,
    "..",
    "..",
    "static",
    "wappium",
    "tests",
    deviceId + ".js"
  );
  console.log(path, "脚本路径");
  require("fs").writeFile(path, rawCode, () => {
    setTimeout(() => {
      let proc = fork(path);
      cp.push(proc);
      cpno = cp.length;
      proc.on("exit", () => {
        proc = null;
        cpno--;
        console.log("回放的进程数", cpno);
        if (!cpno) {
          mainWindow.webContents.send("runed");
          delay = 0;
        }
      });
    }, delay);
    delay += 4000;
  });
});
ipcMain.on("stopcode", () => {
  for (let proc of cp) {
    if (proc) {
      try {
        proc.send({ type: "exit" });
      } catch (e) {}
      proc.kill();
      try {
        proc.disconnect();
      } catch (e) {}
    }
  }
  cp = [];
  stopAppium();
  setTimeout(() => {
    startAppium(mainWindow);
  }, 1000);
});

ipcMain.on("close", _ => {
  deviceWin.close();
});
ipcMain.on("min", _ => {
  deviceWin.minimize();
});
ipcMain.on("startU2", () => {
  startUiautomator2(_device.id).then(setTimeout(createSession, 5000));
});
