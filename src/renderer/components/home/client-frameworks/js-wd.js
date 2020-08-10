import Framework from './framework'

class JsWdFramework extends Framework {
  // @ts-ignore
  get language() {
    console.log('wd 脚本')
    return 'js'
  }

  // https://juejin.im/post/6844903693632946189#comment
  // FIMXE: 连续两条 sleep 执行会导致脚本退出，这可能与 node 时间轮训机制有关，这属于遗留问题。
  // 直接 node code.js 正常运行，但在 electron 中回放不行，这可能是 electron node 环境与直接运行 node 环境有不同
  wrapWithBoilerplate(code) {
    const caps = JSON.stringify(this.caps)
    return `// Requires the admc/wd client library
// (npm install wd)
// Then paste this into a .js file and run with Node 7.6+

let RETRY = 5;
const wd = require('wd');
const driver = wd.promiseChainRemote("${this.serverUrl}");
const caps = ${caps};
const fs = require('fs-extra')
const adb = require('adbkit');
const client = adb.createClient();
const request = require('request').defaults({
  timeout: 3000,
  forever: true,
  json: true,
  baseUrl: 'http://localhost:4444/wd/hub/session/1/',
});
function sleep(ms) {
  let remainTime = ms / 1000 - 1
  let timer = setInterval(() => {
    const info = '剩余' + (parseInt(remainTime--)) + 's进入下一步' 
    console.log(info)
    process.send(info)
    if (remainTime <= 0) {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
  return new Promise(resolve => {
    setTimeout(() => {
      clearInterval(timer)
      timer = null
      resolve()
    }, ms)
  });
}
async function main () {
  try {
    await driver.init(caps);
  } catch (e) {
    if (!RETRY--) return console.log(e);
    await sleep(2000);
    console.log("wd retry");
    return main().catch(console.log);
  }
  try{
  ${this.indent(code, 2)}
  }catch(e){
    const date = new Date().getTime();
    request.get('/source', (_err, _res, body) => {
      fs.outputFile(require('path').join(__dirname,'source', caps.udid, date + '.xml'), body&&body.value);
    });
    client
      .screencap(caps.udid)
      .then(adb.util.readAll)
      .then(function(output) {
        fs.outputFile(require('path').join(__dirname,'screen', caps.udid, date + '.png'), output);
      });
    console.log(e);
    process.send('遇到异常')
    process.send(e)
  }
  console.log("准备退出");
  process.send("准备退出")
  await driver.quit();
}
let i=1;
const alive = () => {
  main()
    .then(() => {
      i!=${this.run_num}&&setTimeout(() => {
        const msg = ['第', ++i, '次回放'].join('')
        console.log(msg)
        process.send(msg)
        alive();
      }, 5000);
    });
};
alive();
`
  }

  codeFor_findAndAssign(strategy, locator, localVar, isArray) {
    const suffixMap = {
      xpath: 'XPath',
      'accessibility id': 'AccessibilityId',
      id: 'Id',
      name: 'Name',
      'class name': 'ClassName',
      '-android uiautomator': 'AndroidUIAutomator',
      '-ios predicate string': 'IosUIAutomation',
      '-ios class chain': 'IosClassChain',
    }
    if (!suffixMap[strategy]) {
      throw new Error(`Strategy ${strategy} can't be code-gened`)
    }
    if (isArray) {
      return `let ${localVar} = await driver.elementsBy${
        suffixMap[strategy]
      }(${JSON.stringify(locator)});`
    }
    return `let ${localVar} = await driver.elementBy${
      suffixMap[strategy]
    }(${JSON.stringify(locator)});`
  }

  codeFor_click(varName, varIndex) {
    return `await ${this.getVarName(
      varName,
      varIndex,
    )}.click();`
  }

  codeFor_clear(varName, varIndex) {
    return `await ${this.getVarName(varName, varIndex)}.clear();`
  }

  codeFor_sendKeys(varName, varIndex, text) {
    return `await ${this.getVarName(
      varName,
      varIndex,
    )}.sendKeys(${JSON.stringify(text)});`
  }

  codeFor_back() {
    return `await driver.back();`
  }

  codeFor_tap(varNameIgnore, varIndexIgnore, x, y) {
    return `await (new wd.TouchAction(driver))
  .tap({x: ${x}, y: ${y}})
  .perform()
    `
  }

  codeFor_swipe(varNameIgnore, varIndexIgnore, x1, y1, x2, y2) {
    return `await (new wd.TouchAction(driver))
  .press({x: ${x1}, y: ${y1}})
  .moveTo({x: ${x2}, y: ${y2}})
  .release()
  .perform()
    `
  }

  codeFor_sleep(ms = 1000) {
    return `await sleep(${ms})`
  }
}

JsWdFramework.readableName = 'JS - WD (Promise)'

export default JsWdFramework
