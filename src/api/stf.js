const { isOverAndroid10 } = require('./mini')
const Timeout = require('await-timeout')
const { startServer } = require('./stf-server')
const { startAgent } = require('./stf-agent')

const startStf = async (sn) => {
  if (isOverAndroid10(sn)) {
    startServer(sn)
    await Timeout.set(100)
    startAgent(sn)
  }
}

module.exports = {
  startStf
}
