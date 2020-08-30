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
function sleep(s) {
  let remainTime = s - 1
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
    }, s * 1000)
  });
}
async function main () {
  try {
    await driver.init(caps);
  } catch (e) {
    if (!RETRY--) return console.log(e);
    await sleep(2);
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
  await sleep(6)
  await driver.quit();
}
let i=1;
const alive = () => {
  main()
    .then(() => {
      i!=${this.run_num}&&setTimeout(() => {
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
    // hack：录制时会传入3个变量，从视图中修改时只传入2个变量
    let _varName; let _varIndex; let _text
    const argus = Array.from(arguments)
    console.log(argus)
    if (Array.from(arguments).length === 3) {
      [_varName, _varIndex, _text] = argus
      return `await ${this.getVarName(
        _varName,
        _varIndex,
      )}.sendKeys(${JSON.stringify(_text)});`
    }
    [_varName, _text] = argus
    return `await ${_varName}.sendKeys(${JSON.stringify(_text)});`
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

  // ms: 500
  // https://github.com/Magic-Pod/AppiumRegressionCheck/issues/6
  codeFor_swipe(varNameIgnore, varIndexIgnore, x1, y1, x2, y2) {
    // hack：录制时会传入6个变量，从视图中修改时只传入4个变量
    let _x1; let _x2; let _y1; let _y2
    const argus = Array.from(arguments)
    if (Array.from(arguments).length === 4) {
      [_x1, _y1, _x2, _y2] = argus
    } else {
      [,, _x1, _y1, _x2, _y2] = argus
    }
    return `await (new wd.TouchAction(driver))
  .press({x: ${_x1}, y: ${_y1}})
  .wait({ms: 500})
  .moveTo({x: ${_x2}, y: ${_y2}})
  .release()
  .perform();
    `
  }

  codeFor_sleep(s = 1) {
    return `await sleep(${s});`
  }
}

JsWdFramework.readableName = 'JS - WD (Promise)'

export default JsWdFramework
