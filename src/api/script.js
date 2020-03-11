import _ from 'lodash';

/**
 * 补齐可选参数默认值（供后端格式）
 * @param {String} action 
 * @param {any[]} argus 
 */
const fixDefaultArugs = function (action = '', argus = []) {
  switch (`${action}`) {
    case 'findAndAssign':
      argus[3] = argus[3] || false
      break;
    case 'click':
      break;
    case 'clear':
      break;
    case 'sendKeys':
      break;
    case 'back':
      break;
    case 'tap':
      if (argus.length === 4) {
        argus.unshift('')
        argus.unshift('')
      }
      break;
    case 'swipe':
      if (argus.length === 4) {
        argus.unshift('')
        argus.unshift('')
      }
      break;
  }
}

/**
 * 上传脚本到云测平台
 * @param {*} projectId 所属项目 id 
 * @param {*} data 脚本详情
 * @return {Promise<any>}
 */
export const uploadScript = function (projectId, data) {
  // hack for old data
  console.log(data)
  data = _.cloneDeep(data)
  data.forEach((script) => {
    // TODO: 前后端字段定义不一致
    script.parameter = script.params
    fixDefaultArugs(
      script.action,
      script.parameter
    )
    delete(script.params)
  })
  console.log(data)
}