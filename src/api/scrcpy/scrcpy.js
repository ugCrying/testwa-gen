const { execSync, exec } = require('child_process')
const { argv } = require('yargs')

const lineBreak = (process.platform === 'win32') ? '\n\r' : '\n';

// 运行时注入的变量
const { sn } = argv

const LD_LIBRARY_PATH = execSync('adb shell CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server -L').toString().replace(lineBreak, '')

execSync(`adb -s ${sn} forward tcp:1717 tcp:6612`)
const command = `adb -s ${sn} shell LD_LIBRARY_PATH=${LD_LIBRARY_PATH}:/data/local/tmp CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server`
exec(command)

console.log('--------------')
// console.log(process.execArgv);
console.log(argv.sn);
console.log('--------------')

process.on('close', () => {
  console.log('close')
})

process.on('exit', () => {
  console.log('exit')
  process.exit()
})