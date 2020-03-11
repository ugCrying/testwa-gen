export default {
  state: { userInfo: null },
  reducers: {
    login(state, { payload }) {
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
