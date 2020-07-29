const { exec } = require('child_process')

// exec(`adb shell am startservice --user 0 \
// -a jp.co.cyberagent.stf.ACTION_START \
// -n jp.co.cyberagent.stf/.Service`)

// process.on('exit', () => {
//   console.log('stf-server exit')
//   process.exit()
// })

const startServer = async (sn) => {
  console.log('startServer')
  await exec(`adb -s ${sn} shell am startservice --user 0 \
  -a jp.co.cyberagent.stf.ACTION_START \
  -n jp.co.cyberagent.stf/.Service`)
}

module.exports = {
  startServer
}