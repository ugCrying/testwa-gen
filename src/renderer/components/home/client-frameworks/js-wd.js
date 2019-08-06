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
function wait(time) {
  return new Promise(resolve => {
    while (true) {
      if (new Date().getTime() >= time) {
        resolve();
        break;
      }
    }
  });
}
async function main () {
  let screenRatioX,screenRatioY;
  try {
    await driver.init(caps);
    await driver.context("NATIVE_APP");
    const currentWindow=await driver.getWindowSize();
		screenRatioX = currentWindow['width']/${this.deviceWindow[0]};
		screenRatioY = currentWindow['height']/${this.deviceWindow[1]};
    console.log(currentWindow);
  } catch (e) {
    if (!RETRY--) return console.log(e);
    await sleep(2000);
    console.log("wd retry");
    return main().catch(console.log);
  }
  try{
    let time=${this.time}<new Date().getTime()?new Date().getTime():${this.time}
    ${this.indent(code, 2)}
    await wait(time+=10000);
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
process.on("message", ({ type }) => {
  switch (type) {
    case "exit":
      console.log("${this.caps.udid}回放被终止")
      process.exit(1);
      break;
  }
});
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

  codeFor_activeSendKeys(text) {
    return `driver.keys(${JSON.stringify(text)});await sleep(3000);`;
  }
  codeFor_back() {
    return `await driver.back();await sleep(3000);`;
  }

  codeFor_tap(varNameIgnore, varIndexIgnore, x, y, timeout = 0) {
    return `${
      +timeout !== 0 ? `await wait(time+=${timeout});` : ""
    }await (new wd.TouchAction(driver))
  .tap({x: ${x} * screenRatioX, y: ${y} * screenRatioY})
  .perform();
    `;
  }

  codeFor_swipe(varNameIgnore, varIndexIgnore, x1, y1, x2, y2, timeout = 0) {
    return `${
      +timeout !== 0 ? `await wait(time+=${timeout});` : ""
    }await (new wd.TouchAction(driver))
  .press({x: ${x1} * screenRatioX, y: ${y1} * screenRatioY})
  .moveTo({x: ${x2} * screenRatioX, y: ${y2} * screenRatioY})
  .release()
  .perform();
    `;
  }
}

JsWdFramework.readableName = "JS - WD (Promise)";

export default JsWdFramework;
