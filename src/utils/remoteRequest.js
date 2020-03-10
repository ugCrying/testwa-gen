import axios from 'axios'

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
  return config
})

export {
  REMOTE_REQUEST
}
