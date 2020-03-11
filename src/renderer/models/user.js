import { emitter } from '../lib'

export default {
  state: { userInfo: null },
  reducers: {
    login(state, { payload }) {
      // TODO: use subscription to notice others
      emitter.emit('login')
      return {
        ...state,
        userInfo: payload
      }
    },
    logout(state) {
      return {
        ...state,
        userInfo: null
      }
    }
  }
}
