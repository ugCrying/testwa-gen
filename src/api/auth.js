import { REMOTE_REQUEST } from '../utils/remoteRequest';

export const login = async function (data = {}) {
  try {
    const responseConfig = await REMOTE_REQUEST.post('/v1/auth/login', data)
    console.log(responseConfig)
    sessionStorage.setItem('XToken', responseConfig.data.data.accessToken)
    return responseConfig
  } catch (e) {
    throw e
  }
}
