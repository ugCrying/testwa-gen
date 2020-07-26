const { execSync, spawn, exec } = require('child_process')

let isForwarded = false

// FIXME: 当设备连接后再 forward
if (!isForwarded) {
  execSync('adb forward tcp:1717 tcp:6612')
}
const command = 'adb shell LD_LIBRARY_PATH=/system/lib64:/vendor/lib64:/data/local/tmp CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server'
exec(command)

process.on('close', () => {
  console.log('close')
})



process.on('exit', (e) => {
  console.log('exit')
  process.exit()
})