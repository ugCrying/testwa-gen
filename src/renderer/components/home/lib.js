import rxdb from "../../db";
import fs from "fs";
import { ipcRenderer } from "electron";
import { client } from "../../../main/adb";
import frameworks from "./client-frameworks";
const adbkit = require("adbkit");
const request = require("request").defaults({
  timeout: 6000,
  forever: true,
  json: true,
  baseUrl: "http://localhost:4444/wd/hub/session/1/"
});
const ApkReader = require("adbkit-apkreader");
let device;
let cp;
let timer;

/**
 * 停止正在执行（回放）的脚本
 */
export const codeStop = () => {
  if (cp) {
    cp.kill();
    cp = null;
  }
};

/**
 * 返回脚本的内容（供下载）
 * @param {*} info 
 * @param {*} recordedActions 
 * @return {String}
 */
export const downCode = (info, recordedActions) => {
  // FIXME: 为何只提供 python 格式导出？
  let framework = new frameworks["python"]();
  framework.caps = {
    platformName: "Android",
    automationName: "UiAutomator2",
    deviceName: info.id,
    udid: info.id,
    appPackage: info.packageName,
    appActivity: info.activityName
  };
  framework.actions = recordedActions;
  return framework.getCodeString(true);
};

/**
 * 执行（回放）脚本
 * @param {*} info 
 * @param {*} recordedActions 
 */
export const runCode = (info, recordedActions) => {
  let framework = new frameworks["jsWd"]();
  framework.caps = {
    platformName: "Android",
    automationName: "UiAutomator2",
    deviceName: info.id,
    udid: info.id,
    appPackage: info.packageName,
    appActivity: info.activityName,
    noReset: "True"
  };
  framework.actions = recordedActions;
  framework.run_num = localStorage.getItem("run_code_num") || 1;
  const rawCode = framework.getCodeString(true);
  console.log(
    'rawCode',
    rawCode
  )
  ipcRenderer.send("runcode", rawCode);
};
export const record = () => {
  ipcRenderer.send(
    "record",
    device,
    require("electron").remote.BrowserWindow.getFocusedWindow().id
  );
  // @ts-ignore
  // ipcRenderer.sendTo(localStorage.getItem("deviceWinId"), "record");
};
export const onSelectAPK = async ({ name, path }) => {
  console.log("安装应用", name, path);
  const [apkData] = await Promise.all([
    ApkReader.open(path).then(reader => reader.readManifest()),
    client.install(device.id, path)
  ]);
  console.log("启动应用");
  client.shell(
    device.id,
    `monkey -p ${apkData.package} -c android.intent.category.LAUNCHER 1`
  );
  console.log("获取应用信息");
  fetch(`http://127.0.0.1:50819/packages/${apkData.package}/info`)
    .then(res => res.json())
    .then(({ data }) => {
      device.packageName = data.packageName;
      device.appName = data.name;
      device.activityName = data.activityName;
    });
  const db = await rxdb;
  // @ts-ignore
  db.apk.atomicUpsert({ name, path });
};
export const onSelectPackage = ({ packageName, activityName, name }) => {
  client
    .shell(device.id, `am start -n ${packageName}/${activityName}`)
    .then(adbkit.util.readAll)
    .then(data => console.log(data.toString()));
  device.packageName = packageName;
  device.appName = name;
  device.activityName = activityName;
};
export const getAppInfo = (packageName, cb) => {
  request.get("/package", (_err, _res, body) => {
    try {
      const [app] = JSON.parse(body.value).filter(
        app => app.packageName === packageName
      );
      cb(app);
    } catch (e) {
      console.log("uiautomator2服务异常，应用列表获取失败");
    }
  });
};
const getdeviceApp = (dispatch, cb) => {
  request.get("/package", (err, res, packages) => {
    try {
      packages = JSON.parse(packages.value);
      clearTimeout(timer);
      timer = null;
      return dispatch({
        type: "record/packages",
        payload: {
          packages
        }
      });
    } catch (e) {
      if (cb) cb();
      console.log("getdeviceApp", err || packages || res);
      return setTimeout(() => getdeviceApp(dispatch), 2000);
    }
  });
};

/**
 * 获取设备下 app
 * @param {*} dispatch 
 */
export const getPackages = dispatch => {
  getdeviceApp(dispatch, () => {
    ipcRenderer.send("startU2");
    setTimeout(
      () =>
        client.shell(
          device.id,
          "am start io.appium.uiautomator2.server/io.appium.uiautomator2.MainActivity"
        ),
      600
    );
  });
  timer = setTimeout(() => {
    timer = null;
    dispatch({
      type: "record/packages",
      payload: {
        packages: []
      }
    });
  }, 25000);
};

/**
 * 选中设备
 * @param {*} _device 
 */
export const onSelectDevice = _device => {
  device = _device;
  console.log("端口映射到", device.id);
  client.forward(device.id, "tcp:4444", "tcp:6790"); //UI Automator2
  client.forward(device.id, "tcp:6677", "tcp:8888"); //testwa keyboard
  client.forward(device.id, "tcp:1717", "localabstract:minicap");
  client.forward(device.id, "tcp:1718", "localabstract:minitouch");
  // client.forward(device.id, "tcp:4444", "tcp:4724"); //UI Automator1
  // 打开设备小窗
  ipcRenderer.send("openDeviceWindow", device);
};

export const getCodes = async cb => {
  const db = await rxdb;
  // @ts-ignore
  db.code.find().$.subscribe(codes => {
    console.dir(codes);
    if (codes) cb({ codes: JSON.parse(JSON.stringify(codes)) });
  });
};
export const getApks = async cb => {
  const db = await rxdb;
  // @ts-ignore
  db.apk
    .find()
    .exec()
    .then(documents => console.dir("rxdb find", documents));
  // @ts-ignore
  db.apk.find().$.subscribe(apks => {
    console.dir("rxdb subscribe", apks);
    if (apks)
      cb({
        _apks: apks.filter(async apk => {
          try {
            fs.statSync(apk.path);
            return true;
          } catch (e) {
            // @ts-ignore
            db.apk.remove(apk);
            return false;
          }
        })
      });
  });
};

/**
 * 监听设备信息
 * @param {*} dispatch 
 */
export const trackDevices = async dispatch => {
  console.log("获取设备列表");
  const getDeviceProperties = async device => {
    const [properties, screen] = await Promise.all([
      client.getProperties(device.id),
      adbkit.util.readAll(await client.shell(device.id, "wm size"))
      // dumpsys window | grep -Eo 'init=[0-9]+x[0-9]+' | head -1 | cut -d= -f 2
    ]);
    device.brand = properties["ro.product.brand"];
    device.model = properties["ro.product.model"];
    device.cpu = properties["ro.product.cpu.abi"];
    device.sdk = properties["ro.build.version.sdk"];
    device.release = properties["ro.build.version.release"];
    const screens =
      new RegExp(/Override size: ([^\r?\n]+)*/g).exec(screen) ||
      new RegExp(/Physical size: ([^\r?\n]+)*/g).exec(screen);
    screens
      ? (device.screen = screens[1].trim())
      : console.error(`${device.id} 获取分辨率失败`, screen.toString());
    console.log("设备信息", device);
  };
  const devices = await client.listDevices();
  const Promises = [];
  for (const device of devices) {
    if (device.type !== "device") continue;
    Promises.push(getDeviceProperties(device));
  }
  try {
    await Promise.all(Promises);
    dispatch({
      type: "record/devices",
      payload: {
        devices
      }
    });
  } catch (e) {
    console.error(e.message, "获取设备信息失败");
  }

  console.log("监听设备变化");
  (await client.trackDevices()).on("changeSet", async changes => {
    if (!changes.removed.length && !changes.changed.length) return;
    for (const device of changes.removed) {
      console.log(device.id, "离开");
      let idx = devices.findIndex(e => e.id === device.id);
      if (idx >= 0) devices.splice(idx, 1);
    }
    try {
      for (const device of changes.changed) {
        let idx = devices.findIndex(e => e.id === device.id);
        if (idx >= 0) {
          if (device.type === "device") {
            await getDeviceProperties(device);
          }
          console.log(device.id, device.type);
          devices[idx] = device;
        } else {
          console.log(device.id, "进入");
          await getDeviceProperties(device);
          devices.push(device);
        }
      }
    } catch (e) {
      console.error(e.message, "获取设备信息失败");
    }
    dispatch({
      type: "record/devices",
      payload: {
        devices
      }
    });
  });
};
