// 创建子进程专门用于 appium get page source

const request = require('request').defaults({
  // FIXME: 此处大小会影响 getPageSource
  timeout: 5000,
  forever: true,
  json: true,
  baseUrl: 'http://localhost:4444/wd/hub/session/1/'
});

module.exports = function () {
  return new Promise((resolve, reject) => {
    request.get('/source', (err, res, sourceXML) => {
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      // console.log('child_process_source', err || res)
      if (sourceXML) {
        // console.log(sourceXML)
        // resolve(xmlToJSON(sourceXML))
        resolve(sourceXML)
      } else {
        reject(err)
      }
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
      console.log('--------------------------------------------')
    })
  })
}