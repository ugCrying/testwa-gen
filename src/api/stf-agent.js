const { execSync } = require('child_process')
const adbkit = require("adbkit")
const client = adbkit.createClient()
const lineBreak = (process.platform === 'win32') ? '\n\r' : '\n';

const startAgent = async (sn) => {
  const apk = execSync(`adb shell pm path jp.co.cyberagent.stf | \
  tr -d '\r' | awk -F: '{print $2}'`).toString().replace(lineBreak, '')
  const s = `export CLASSPATH="${apk}"\; exec app_process /system/bin jp.co.cyberagent.stf.Agent`
  await client.shell(
    sn,
    `${s}`
  ).then(r => {
    r.on('data', chunk => {
      console.log(chunk.toString())
    })
  }).catch(console.error)
}
// FIXME: 直接 exec 部分 adb shell 命令无法识别，可以尝试用 adb shell 代替 bash ?
// shell.exec(`${getApkCommand} && echo $APK && ${startAgent}`)

module.exports = {
  startAgent
}

startAgent('UYT7N18202004247')