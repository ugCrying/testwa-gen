import _ from 'lodash'
import { REMOTE_REQUEST } from '../utils/remoteRequest'

export const actionAliasMapping = {
  findAndAssign: '选取元素',
  click: '点击元素',
  sendKeys: '输入文本',
  swipe: '滑动屏幕',
  sleep: '等待',
}

/**
 * 补齐可选参数默认值（供后端格式）
 * @param {String} action
 * @param {any[]} argus
 */
const fixDefaultArugs = function (action = '', argus = []) {
  switch (`${action}`) {
    case 'findAndAssign':
      argus[3] = argus[3] || false
      break
    case 'click':
      if (argus.length === 2) {
        argus.pop()
      }
      break
    case 'clear':
      break
    case 'sendKeys':
      // argus[0]能取到元素内容，元素下标不再需要
      argus.splice(1, 1)
      break
    case 'back':
      break
    case 'sleep':
      break
    case 'tap':
      if (argus.length === 4) {
        argus.unshift('')
        argus.unshift('')
      }
      break
    case 'swipe':
      if (argus.length === 4) {
        argus.unshift('')
        // argus.unshift('')
      }
      if (argus.length === 6) {
        // argus[0]能取到元素内容，元素下标不再需要
        argus.splice(1, 1)
      }
      // debugger
      break
    default:
      break
  }
}

const defaultTitle = function (script = {}) {
  const title = actionAliasMapping[script.action]
  if (title) {
    script.title = title
  }
}

const splitActions = function (scripts) {
  const functions = []
  scripts.forEach((script, index, arr) => {
    if (!script) {
      return
    }
    if (script.action === 'findAndAssign') {
      const nextScript = arr[index + 1]
      // script.functionId = index + 1
      functions.push([
        script,
        nextScript,
      ])
      arr.splice(index, 1, null)
      arr.splice(index + 1, 1, null)
    } else {
      functions.push([
        script,
      ])
      arr.splice(index, 1, null)
    }
  })
  functions.forEach((func, index) => {
    func.forEach((script) => {
      script.functionId = index + 1
    })
  })
  return functions.flat(2)
}

const actionsPipe = function (scripts) {
  scripts = _.cloneDeep(scripts)
  scripts.forEach((script) => {
    // TODO: 前后端字段定义不一致
    script.parameter = script.params
    fixDefaultArugs(
      script.action,
      script.parameter,
    )
    delete (script.params)
    defaultTitle(script)
  })
  return splitActions(scripts)
}

/**
 * 上传脚本到云测平台
 * @param {*} info 脚本信息
 * @param {*} code 脚本代码
 * @return {Promise<any>}
 */
export const uploadScript = function (info, code) {
  // eslint-disable-next-line prefer-object-spread
  const data = Object.assign({}, {
    scriptName: '',
    scriptCaseDesc: '',
    scriptFunctions: actionsPipe(code),
    // TODO: 目前只支持安卓
    platform: 'Android',
  }, info)
  const url = `/v2/project/${info.projectId}/script/save`
  console.log(url, data)
  return REMOTE_REQUEST.post(`/v2/project/${info.projectId}/script/save`, data)
}
