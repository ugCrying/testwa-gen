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
    return `#  -*-coding:utf8 -*-
# This sample code uses the Appium python client
# pip install Appium-Python-Client
# Then you can paste this into a file and simply run with Python

from appium import webdriver
from time import sleep
import allure
import pytest
from selenium.common.exceptions import InvalidSessionIdException
from appium.webdriver.common.touch_action import TouchAction
import logging

logging.basicConfig(level=logging.DEBUG)

caps = {}
${capStr}

EXECUTOR = "${this.serverUrl}"
# driver = webdriver.Remote(command_executor=EXECUTOR, desired_capabilities=caps)

def take_screenshot_and_logcat(driver, calling_request):
    __save_log_type(driver, calling_request, "logcat")

def take_screenshot_and_syslog(driver, calling_request):
    __save_log_type(driver, calling_request, "syslog")

def __save_log_type(driver, calling_request, type):
    try:
        logcat_data = driver.get_log(type)
    except InvalidSessionIdException:
        logcat_data = ""

    data_string = ""
    for data in logcat_data:
        data_string = data_string + "%s:  %s\\n" % (data["timestamp"], data["message"].encode("utf-8"))
    allure.attach(data_string, "日志", allure.attachment_type.TEXT)
    allure.attach(driver.get_screenshot_as_png(), "操作截图", allure.attachment_type.PNG)

class Singleton(object):
    driver = None

    def __new__(cls, *args, **kw):
        if not hasattr(cls, "_instance"):
            driver = webdriver.Remote(command_executor=EXECUTOR, desired_capabilities=caps)
            orig = super(Singleton, cls)
            cls._instance = orig.__new__(cls, *args, **kw)
            cls._instance.driver = driver
        return cls._instance

class DriverClient(Singleton):
    pass

@allure.feature("testwaCase")
class TestWaBasic():

    def setup_class(cls):
        cls.client = DriverClient().driver

    def teardown_class(cls):
        sleep(6)
        cls.client.close_app()

    @pytest.fixture(scope='function')
    def driver(self, request):
        calling_request = request._pyfuncitem.name
        driver = DriverClient().driver
        def fin():
            take_screenshot_and_logcat(driver, calling_request)
        request.addfinalizer(fin)
        return driver
    
${code}`
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
    const funHeader = this.addFun ? `    @allure.severity("critical")
    def test_action_${this.index++}(self,driver):
        ` : '        '
    if (isArray) {
      return `${funHeader}${localVar} = driver.find_elements_by_${
        suffixMap[strategy]
      }(${JSON.stringify(locator)})`
    }
    return `${funHeader}${localVar} = driver.find_element_by_${
      suffixMap[strategy]
    }(${JSON.stringify(locator)})`
  }

  codeFor_click(varName, varIndex) {
    this.addFun = true
    return `        ${this.getVarName(varName, varIndex)}.click()`
  }

  codeFor_clear(varName, varIndex) {
    this.addFun = true
    return `        ${this.getVarName(varName, varIndex)}.clear()`
  }

  codeFor_sendKeys(varName, varIndex, text) {
    this.addFun = true
    // hack：录制时会传入3个变量，从视图中修改时只传入2个变量
    let _varName; let _varIndex; let _text
    const argus = Array.from(arguments)
    if (argus.length === 3) {
      [_varName, _varIndex, _text] = argus
      return `        ${this.getVarName(varName, varIndex)}.send_keys(${JSON.stringify(
        text,
      )})`
    }
    [_varName, _text] = argus
    return `await ${_varName}.sendKeys(${JSON.stringify(_text)});`
  }

  codeFor_back() {
    return `    @allure.severity("critical")
    def test_action_${this.index++}(self,driver):
        driver.back()`
  }

  codeFor_tap(varNameIgnore, varIndexIgnore, x, y) {
    return `    @allure.severity("critical")
    def test_action_${this.index++}(self,driver):
        TouchAction(driver).tap(x=${x}, y=${y}).perform()`
  }

  codeFor_swipe(varNameIgnore, varIndexIgnore, x1, y1, x2, y2) {
    // hack：录制时会传入6个变量，从视图中修改时只传入4个变量
    let _x1; let _x2; let _y1; let _y2
    const argus = Array.from(arguments)
    if (argus.length === 4) {
      [_x1, _y1, _x2, _y2] = argus
    } else {
      [,, _x1, _y1, _x2, _y2] = argus
    }
    return `    @allure.severity("critical")
    def test_action_${this.index++}(self,driver):
        TouchAction(driver) \
        .press(x=${_x1}, y=${_y1}) \
        .move_to(x=${_x2}, y=${_y2}) \
        .release() \
        .perform()
    `
  }

  codeFor_sleep(s = 1) {
    this.addFun = false
    return `    @allure.severity("critical")
    def test_action_${this.index++}(self,driver):
        sleep(${s})`
  }
}

PythonFramework.readableName = 'Python-Allure'

export default PythonFramework
