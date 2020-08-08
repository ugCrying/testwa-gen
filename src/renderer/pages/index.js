// @ts-check

import { connect } from 'dva'
import { notification } from 'antd'
import Home from '../components/home'
// eslint-dsiable-next-line
// import { ipcRenderer } from "electron";
import { emitter } from '../lib'

// FIXME
// ipcRenderer.on('request_error', err => {
//   console.log('error', err)
// })
emitter.on('request_error', (err) => {
  notification.error({
    message: '系统错误',
    description: err,
  })
})
export default connect((state) => state)(Home)
