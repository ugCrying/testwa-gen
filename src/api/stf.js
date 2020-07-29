const { isOverAndroid10 } = require('./mini')
const Timeout = require('await-timeout')
const { startServer } = require('./stf-server')
const { startAgent } = require('./stf-agent')

const startStf = async (sn) => {
  console.log('startAgent sn', sn)
  if (isOverAndroid10(sn)) {
    await startServer(sn)
    await Timeout.set(100)
    startAgent(sn)
  }
}

module.exports = {
  startStf
}
