const { execSync, spawn, exec } = require('child_process')
const { argv } = require('yargs')

let isForwarded = false

// 运行时注入的变量
const { sn } = argv

execSync(`adb -s ${sn} forward tcp:1717 tcp:6612`)
const command = `adb -s ${sn} shell LD_LIBRARY_PATH=/system/lib64:/vendor/lib64:/data/local/tmp CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server`
exec(command)

console.log('--------------')
// console.log(process.execArgv);
console.log(argv.sn);
console.log('--------------')

process.on('close', () => {
  console.log('close')
})



process.on('exit', (e) => {
  console.log('exit')
  process.exit()
})