const { join } = require("path");
const { fork } = require("child_process");
const client = require("adbkit").createClient();
let appiums = [];
exports.request = require("request").defaults({
  timeout: 1000,
  forever: true,
  json: true,
  baseUrl: "http://localhost:4444/wd/hub/session/1/"
});
exports.startAppium = async mainWindow => {
  let port = 4723;
  let num = (await client.listDevices()).length;
  console.log("appium server数量===============================", num);
  for (let i = 0; i < num; i++) {
    const appium = fork(
      join(__dirname, "..", "..", "static", "wappium", "start_cp")
    );
    appium.send({ port: port++ });
    appium.on("message", msg => mainWindow.webContents.send("log", msg));
    appiums.push(appium);
  }
  (await client.trackDevices()).on("changeSet", async changes => {
    if (!changes.changed.length) return;
    const no = (await client.listDevices()).length - num;
    for (let i = 0; i < no; i++) {
      ++num;
      const appium = fork(
        join(__dirname, "..", "..", "static", "wappium", "start_cp")
      );
      appium.send({ port: port++ });
      appium.on("message", msg => mainWindow.webContents.send("log", msg));
      appiums.push(appium);
    }
    console.log("appium server数量===================================", num);
  });
};
exports.stopAppium = () => {
  for (let appium of appiums) {
    if (appium) {
      try {
        appium.send({ type: "exit" });
      } catch (e) {}
      appium.kill();
      try {
        appium.disconnect();
      } catch (e) {}
      appium = null;
    }
  }
  appiums = [];
};
