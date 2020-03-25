// 创建子进程专门用于 appium get page source
import { getSource } from '../api/appium'

module.exports = function () {
  return getSource()
}