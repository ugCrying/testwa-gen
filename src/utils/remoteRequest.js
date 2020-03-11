import axios from 'axios'
import { notification } from 'antd';
import { ipcRenderer } from "electron";
import { emitter } from '../renderer/lib'
// 统一配置
const REMOTE_REQUEST = axios.create({
  baseURL: 'http://api.testwa.com/',
  responseType: 'json'
})

REMOTE_REQUEST.interceptors.request.use(config => {
  // TODO: 持久化
  const XToken = sessionStorage.getItem('XToken')
  if (XToken) {
    config.headers['X-Token'] = XToken
  }
  return config
})

REMOTE_REQUEST.interceptors.response.use(config => {
  console.log(config)
  if (config.data && !!config.data.success) {
    return config
  } else {
    const msg = config.data.message
    // ipcRenderer.send('request_error', msg)
    emitter.emit('request_error', msg)
    // notification.open({
    //   message: '系统错误',
    //   description: msg
    // });
    return Promise.reject(msg)
  }
})

export {
  REMOTE_REQUEST
}
