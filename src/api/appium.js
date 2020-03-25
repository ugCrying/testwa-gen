// import axios from 'axios'
const axios = require('axios')
const { join } = require("path");
const { fork } = require("child_process");
let appium;

const request = axios.create({
  timeout: 5000,
  baseURL: 'http://localhost:4444/wd/hub/session'
})

request.interceptors.response.use(({ data }) => data)

/**
 * https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#session-1
 */
const postSession = function () {
  return request.post('', {
    "desiredCapabilities": {}
  })
}

/**
 * https://github.com/SeleniumHQ/selenium/wiki/JsonWireProtocol#get-sessionsessionidsource
 */
const getSource = function (sessionId = '1') {
  return request.get(`/${sessionId}/source`)
}

const startAppium = function (mainWindow) {
  appium = fork(join(__dirname, "..", "..", "static", "wappium", "start_cp"));
  appium.on("message", msg => mainWindow.webContents.send("log", msg));
}

const stopAppium = function () {
  if (appium) {
    appium.send({ type: "exit" });
    appium.kill();
    appium.disconnect();
  }
}

module.exports = {
  postSession,
  getSource,
  startAppium,
  stopAppium
}