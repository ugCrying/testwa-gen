import { emitter } from '../lib'

function getUserInfo() {
  try {
    const lastTime = Number(localStorage.getItem('lastTime'))
    // const expireTime = Number(localStorage.getItem('expireTime'))
    // TODO: 动态
    const expireTime = 28800
    const now = (new Date).getTime()
    if ((now - lastTime) >= expireTime) {
      throw new Error('token 过期')
    }
    return JSON.parse(
      localStorage.getItem('userInfo')
    )
  } catch (e) {
    return null
  }
}

export default {
  state: { userInfo: getUserInfo() },
  reducers: {
    login(state, { payload }) {
      // TODO: use subscription to notice others
      emitter.emit('login')
      localStorage.setItem('userInfo', JSON.stringify(payload))
      const now = (new Date).getTime()
      localStorage.setItem('lastTime', now)
      return {
        ...state,
        userInfo: payload
      }
    },
    logout(state) {
      localStorage.removeItem('userInfo')
      return {
        ...state,
        userInfo: null
      }
    }
  }
}
