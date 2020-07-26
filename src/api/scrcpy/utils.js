const { execSync } = require('child_process')

const lineBreak = (process.platform === 'win32') ? '\n\r' : '\n';
const hasDevice = () => {
  const deviceList = execSync('adb devices')
    .toString()
    .replace('List of devices attached', '')
    .split(lineBreak)
    .filter(Boolean)
  return deviceList.length > 0
}

// hasDevice()
module.exports = {
  hasDevice
}