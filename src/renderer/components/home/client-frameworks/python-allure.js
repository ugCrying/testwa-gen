import Framework from './framework'

class PythonFramework extends Framework {
  get language() {
    console.log('python 脚本')
    return 'python'
  }
  index=0;
  addFun=true;
  getPythonVal(jsonVal) {
    if (typeof jsonVal === 'boolean') {
      return jsonVal ? 'True' : 'False'
    }
    return JSON.stringify(jsonVal)
  }

  wrapWithBoilerplate(code) {
    const capStr = Object.keys(this.caps)
      .map((k) => `caps[${JSON.stringify(k)}] = ${this.getPythonVal(
        this.caps[k],
      )}`)
      .join('\n')
    return `# This sample code uses the Appium python client
# pip install Appium-Python-Client
# Then you can paste this into a file and simply run with Python

from appium import webdriver
from time import sleep
import allure
import pytest
caps = {}
${capStr}

driver = webdriver.Remote("${this.serverUrl}", caps)

${code}
def teardown_module():
  sleep(6)
  driver.quit()`
  }

  codeFor_findAndAssign(strategy, locator, localVar, isArray) {
    const suffixMap = {
      xpath: 'xpath',
      'accessibility id': 'accessibility_id',
      id: 'id',
      name: 'name', // TODO: How does Python use name selector
      'class name': 'class_name',
      '-android uiautomator': 'AndroidUIAutomator',
      '-ios predicate string': 'ios_predicate',
      '-ios class chain': 'ios_uiautomation', // TODO: Could not find iOS UIAutomation
    }
    if (!suffixMap[strategy]) {
      throw new Error(`Strategy ${strategy} can't be code-gened`)
    }
    const funHeader=this.addFun?`#@allure.serverity("critical")
def test_action_${this.index++}():
  `:' '
    if (isArray) {
      return funHeader+`${localVar} = driver.find_elements_by_${
        suffixMap[strategy]
      }(${JSON.stringify(locator)})`
    }
    return funHeader+`${localVar} = driver.find_element_by_${
      suffixMap[strategy]
    }(${JSON.stringify(locator)})`
  }

  codeFor_click(varName, varIndex) {
    this.addFun=true;
    return `  ${this.getVarName(varName, varIndex)}.click()`
  }

  codeFor_clear(varName, varIndex) {
    this.addFun=true;
    return `  ${this.getVarName(varName, varIndex)}.clear()`
  }

  codeFor_sendKeys(varName, varIndex, text) {
    this.addFun=true;
    return `  ${this.getVarName(varName, varIndex)}.send_keys(${JSON.stringify(
      text,
    )})`
  }

  codeFor_back() {
    return `#@allure.serverity("critical")
def test_action_${this.index++}():
  driver.back()`
  }

  codeFor_tap(varNameIgnore, varIndexIgnore, x, y) {
    return `#@allure.serverity("critical")
def test_action_${this.index++}():
  TouchAction(driver).tap(x=${x}, y=${y}).perform()`
  }

  codeFor_swipe(varNameIgnore, varIndexIgnore, x1, y1, x2, y2) {
    return `#@allure.serverity("critical")
def test_action_${this.index++}():
  TouchAction(driver) \
  .press(x=${x1}, y=${y1}) \
  .move_to(x=${x2}, y=${y2}) \
  .release() \
  .perform()
    `
  }
  codeFor_sleep(s = 1) {
    this.addFun=false;
    return `#@allure.serverity("critical")
def test_action_${this.index++}():
    sleep(${s})`
  }
}

PythonFramework.readableName = 'Python-Allure'

export default PythonFramework
