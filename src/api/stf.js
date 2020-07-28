const { isOverAndroid10 } = require('./mini')
const Timeout = require('await-timeout')
const shell = require('shelljs')
const { startServer } = require('./stf-server')
const { startAgent } = require('./stf-agent')

shell.config.execPath = shell.which('node')

const startStf = async (sn) => {
  if (isOverAndroid10(sn)) {
    console.log('--------------')
    console.log(
      __dirname
    )
    // shell.exec('bash ./stf-server.sh')
    startServer()
    await Timeout.set(100)
    startAgent(sn)
    // shell.exec('bash ./stf-agent.sh')
  }
}

module.exports = {
  startStf
}
