import { REMOTE_REQUEST } from '../utils/remoteRequest'

const baseInfo = async function () {
  try {
    const responseConfig = await REMOTE_REQUEST.get('/v1/user/baseinfo')
    sessionStorage.setItem('username', responseConfig.data.data.username)
    return responseConfig
  } catch (e) {
    return Promise.reject(e)
  }
}

export const login = async function (data = {}) {
  try {
    const responseConfig = await REMOTE_REQUEST.post('/v1/auth/login', data)
    sessionStorage.setItem('XToken', responseConfig.data.data.accessToken)
    // return responseConfig
    await baseInfo()
  } catch (e) {
    return Promise.reject(e)
  }
}

export const logout = function () {
  sessionStorage.removeItem('username')
}
