const { execSync, exec } = require('child_process')
const { argv } = require('yargs')

const lineBreak = (process.platform === 'win32') ? '\n\r' : '\n';

const sleep = function (ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms)
  })
}

const f = async function () {
  // 运行时注入的变量
  const { sn } = argv
  // const sn = 'UYT7N18202004247'
  execSync(`adb -s ${sn} forward tcp:1717 tcp:6612`)
  await sleep(500)
  const LD_LIBRARY_PATH = execSync('adb shell CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server -L').toString().replace(lineBreak, '').trim()

  console.log(LD_LIBRARY_PATH)
  // return
  // const LD_LIBRARY_PATH = '/system/lib64:/system/product/lib64:/hw_product/lib64:/system/product/lib64'
  
  const command = `adb -s ${sn} shell LD_LIBRARY_PATH=${LD_LIBRARY_PATH}:/data/local/tmp CLASSPATH=/data/local/tmp/scrcpy-server.jar app_process / com.genymobile.scrcpy.Server`
  exec(command)
  
  console.log('--------------')
  // console.log(process.execArgv);
  // console.log(argv.sn);
  console.log(command)
  console.log('--------------')
  
  process.on('close', () => {
    console.log('close')
  })
  
  process.on('exit', () => {
    console.log('exit')
    process.exit()
  })
}

f()