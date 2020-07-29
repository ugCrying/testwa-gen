const { execSync } = require('child_process')
const { runScript, client } = require('./adb')
const { stopMinitouch } = require('./utils')
// const adbkit = require("adbkit")
// const client = adbkit.createClient()
let agentProcess

const lineBreak = (process.platform === 'win32') ? '\n\r' : '\n';

const startAgent = async (sn) => {
  console.log('startAgent')
  // 关闭之前打开过的
  // stopMinitouch()
  // const apk = execSync(`adb -s ${sn} shell pm path jp.co.cyberagent.stf | \
  // tr -d '\r' | awk -F: '{print $2}'`).toString().replace(lineBreak, '')
  const apk = execSync('adb shell pm path jp.co.cyberagent.stf').toString().replace(lineBreak, '').replace('package:', '')
  const s = `export CLASSPATH="${apk}"\; exec app_process /system/bin jp.co.cyberagent.stf.Agent`
  // console.log(
  //   agentProcess
  // )
  // if (agentProcess && agentProcess.destroy) {
  //   agentProcess.destroy()
  //   agentProcess = null
  //   console.log(agentProcess)
  // }
  agentProcess = await client.shell(
    sn,
    `${s}`
  ).then(r => {
    r.on('data', chunk => {
      console.log(chunk.toString())
    })
    return r
  }).catch(console.error)
  console.log(agentProcess)
  return agentProcess
}
// 直接 exec 部分 adb shell 命令无法识别，可以尝试用 adb shell 代替 bash ?
// shell.exec(`${getApkCommand} && echo $APK && ${startAgent}`)

module.exports = {
  startAgent
}
