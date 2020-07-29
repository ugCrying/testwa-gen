const { isOverAndroid10 } = require('./mini')
const Timeout = require('await-timeout')
const { startServer } = require('./stf-server')
const { startAgent } = require('./stf-agent')

const startStf = async (sn) => {
  console.log('startAgent sn', sn)
  if (isOverAndroid10(sn)) {
    // 必须留出一定等待时间启动 stf，启动后再连接 minitouch，至少 1s?
    await startServer(sn)
    await Timeout.set(500)
    await startAgent(sn)
    await Timeout.set(700)
  }
}

module.exports = {
  startStf
}
