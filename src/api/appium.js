// import axios from 'axios'
const axios = require('axios')

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

module.exports = {
  postSession,
  getSource
}