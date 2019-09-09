import Framework from "./framework";

class JsWdFramework extends Framework {
  // @ts-ignore
  get language() {
    console.log("wd 脚本");
    return "js";
  }

  wrapWithBoilerplate(code) {
    let caps = JSON.stringify(this.caps);
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
  return new Promise(resolve => setTimeout(resolve, ms));
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
  await sleep(10000);
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
  }
  await driver.quit();
}
let i=1;
const alive = () => {
  main()
    .then(() => {
      i!=${this.run_num}&&setTimeout(() => {
        console.log('第',++i,'次回放')
        alive();
      }, 5000);
    });
};
alive();
`;
  }

  codeFor_findAndAssign(strategy, locator, localVar, isArray) {
    let suffixMap = {
      xpath: "XPath",
      "accessibility id": "AccessibilityId",
      id: "Id",
      name: "Name",
      "class name": "ClassName",
      "-android uiautomator": "AndroidUIAutomator",
      "-ios predicate string": "IosUIAutomation",
      "-ios class chain": "IosClassChain"
    };
    if (!suffixMap[strategy]) {
      throw new Error(`Strategy ${strategy} can't be code-gened`);
    }
    if (isArray) {
      return `let ${localVar} = await driver.elementsBy${
        suffixMap[strategy]
      }(${JSON.stringify(locator)});`;
    } else {
      return `let ${localVar} = await driver.elementBy${
        suffixMap[strategy]
      }(${JSON.stringify(locator)});`;
    }
  }

  codeFor_click(varName, varIndex) {
    return `await ${this.getVarName(
      varName,
      varIndex
    )}.click();await sleep(3000);`;
  }

  codeFor_clear(varName, varIndex) {
    return `await ${this.getVarName(varName, varIndex)}.clear();`;
  }

  codeFor_sendKeys(varName, varIndex, text) {
    return `await ${this.getVarName(
      varName,
      varIndex
    )}.sendKeys(${JSON.stringify(text)});`;
  }

  codeFor_back() {
    return `await driver.back();`;
  }

  codeFor_tap(varNameIgnore, varIndexIgnore, x, y) {
    return `await (new wd.TouchAction(driver))
  .tap({x: ${x}, y: ${y}})
  .perform()
    `;
  }

  codeFor_swipe(varNameIgnore, varIndexIgnore, x1, y1, x2, y2) {
    return `await (new wd.TouchAction(driver))
  .press({x: ${x1}, y: ${y1}})
  .moveTo({x: ${x2}, y: ${y2}})
  .release()
  .perform()
    `;
  }
}

JsWdFramework.readableName = "JS - WD (Promise)";

export default JsWdFramework;
