const fs = require('fs');
const adbkit = require('adbkit');

const client = adbkit.createClient();

const XMLPath = '/sdcard/ui.xml';

/**
 * adb UIAutomato2 抓取 XML
 * @param {*} deviceId
 */
const dump = async function(deviceId) {
  // const [device] = await client.listDevices(deviceId);
  // const deviceId = device.id
  await client.shell(deviceId, `uiautomator dump ${XMLPath}`);
  // TODO: 开启 compressed 后貌似会导致 UI 树过于精简
  // await client.shell(deviceId, `uiautomator dump --compressed ${XMLPath}`);
};

/**
 * 复制抓取好的 xml 到本机
 * @param {*} deviceId 
 */
const pull = async function(deviceId) {
  return client.pull(deviceId, `${XMLPath}`).then(function(transfer) {
    return new Promise(function(resolve, reject) {
      transfer.on('progress', function(stats) {
        console.log(
          '[%s] Pulled %d bytes so far',
          deviceId,
          stats.bytesTransferred
        );
      });
      transfer.on('end', function() {
        console.log('[%s] Pull complete', deviceId);
        resolve(deviceId);
      });
      transfer.on('error', reject);
      var fn = 'ui.xml';
      transfer.pipe(fs.createWriteStream(fn));
    });
  });
};

/**
 * 读取复制到本机的 xml
 * @return {String}
 */
const readFile = function() {
  const data = fs.readFileSync('./ui.xml');
  // console.log('同步读取: ' + data.toString());
  return data.toString()
};

/**
 * 获取当前页面的 xml
 * @param {*} deviceId 
 * @return {Promise<String>}
 */
export const adbGetsource = async function (deviceId) {
  await dump(deviceId)
  await pull(deviceId)
  return readFile()
}