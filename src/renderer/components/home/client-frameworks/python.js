import Framework from "./framework";

class PythonFramework extends Framework {
  get language() {
    console.log("python 脚本");
    return "python";
  }

  getPythonVal(jsonVal) {
    if (typeof jsonVal === "boolean") {
      return jsonVal ? "True" : "False";
    }
    return JSON.stringify(jsonVal);
  }

  wrapWithBoilerplate(code) {
    let capStr = Object.keys(this.caps)
      .map(k => {
        return `caps[${JSON.stringify(k)}] = ${this.getPythonVal(
          this.caps[k]
        )}`;
      })
      .join("\n");
    return `# This sample code uses the Appium python client
# pip install Appium-Python-Client
# Then you can paste this into a file and simply run with Python

from appium import webdriver
from time import sleep

caps = {}
${capStr}

driver = webdriver.Remote("${this.serverUrl}", caps)
currentWindow = driver.get_window_size()
screenRatioX = currentWindow['width']/${this.deviceWindow[0]}
screenRatioY = currentWindow['height']/${this.deviceWindow[1]}

${code}
driver.quit()`;
  }

  codeFor_findAndAssign(strategy, locator, localVar, isArray) {
    let suffixMap = {
      xpath: "xpath",
      "accessibility id": "accessibility_id",
      id: "id",
      name: "name", // TODO: How does Python use name selector
      "class name": "class_name",
      "-android uiautomator": "AndroidUIAutomator",
      "-ios predicate string": "ios_predicate",
      "-ios class chain": "ios_uiautomation" // TODO: Could not find iOS UIAutomation
    };
    if (!suffixMap[strategy]) {
      throw new Error(`Strategy ${strategy} can't be code-gened`);
    }
    if (isArray) {
      return `${localVar} = driver.find_elements_by_${
        suffixMap[strategy]
      }(${JSON.stringify(locator)})`;
    } else {
      return `${localVar} = driver.find_element_by_${
        suffixMap[strategy]
      }(${JSON.stringify(locator)})`;
    }
  }

  codeFor_click(varName, varIndex) {
    return `${this.getVarName(varName, varIndex)}.click()`;
  }

  codeFor_clear(varName, varIndex) {
    return `${this.getVarName(varName, varIndex)}.clear()`;
  }

  codeFor_sendKeys(varName, varIndex, text) {
    return `${this.getVarName(varName, varIndex)}.send_keys(${JSON.stringify(
      text
    )})`;
  }

  codeFor_back() {
    return `driver.back()`;
  }

  codeFor_tap(varNameIgnore, varIndexIgnore, x, y, timeout) {
    return `sleep(${timeout / 1000})
    TouchAction(driver).tap(x=${x} * screenRatioX, y=${y} * screenRatioY).perform()`;
  }

  codeFor_swipe(varNameIgnore, varIndexIgnore, x1, y1, x2, y2, timeout) {
    return `sleep(${timeout / 1000})
    TouchAction(driver) \
  .press(x=${x1} * screenRatioX, y=${y1} * screenRatioY) \
  .move_to(x=${x2} * screenRatioX, y=${y2} * screenRatioY) \
  .release() \
  .perform()
    `;
  }
}

PythonFramework.readableName = "Python";

export default PythonFramework;
