export default {
  state: { recordedActions: [], devices: [] },
  reducers: {
    reset(state) {
      return {
        ...state,
        // devices: [],
        packages: null,
        sourceJSON: null,
        recordedActions: [],
        code: null,
        codeRunning: false,
      }
    },
    devices(state, { payload }) {
      return {
        ...state,
        ...payload,
      }
    },
    setting(state, { payload }) {
      return {
        ...state,
        ...payload,
      }
    },
    packages(state, { payload }) {
      return {
        ...state,
        ...payload,
      }
    },
    addRecordedActions(state, { payload }) {
      return {
        ...state,
        recordedActions: [...state.recordedActions, ...payload.recordedActions],
      }
    },
    updateRecordedActions(state, { payload }) {
      return {
        ...state,
        recordedActions: payload,
      }
    },
    start(state) {
      return {
        ...state,
        code: { value: [] },
        recordedActions: [],
      }
    },
    source(state, { payload }) {
      return {
        ...state,
        sourceJSON: payload,
      }
    },
    // changeActiveKey(state, { payload }) {
    //   return {
    //     ...state,
    //     activeKey: payload,
    //   }
    // },
    addCode(state, { payload }) {
      return {
        ...state,
        code: payload,
      }
    },
  },
}
