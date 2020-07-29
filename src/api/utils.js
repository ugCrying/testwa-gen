const { execSync } = require('child_process')

const killProcessByPort = (port) => {
  try {
    const pid = ~~execSync(`lsof -i :${port} -t`).toString()
    console.log(pid)
    execSync(`kill -9 ${pid}`)
    console.log('kill success')
  } catch (e) {
    console.log('pid 不存在')
    throw e
  }
}

const stopMinitouch = () => {
  try {
    // kill stf-agent
    killProcessByPort('5037')
    // kill minitouch
    // killProcessByPort('1718')
    console.log('kill stf-agent and minitouch')
  } catch (e) {
    console.error(e)
  }
}

module.exports = {
  stopMinitouch
}