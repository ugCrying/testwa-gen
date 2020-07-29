// @ts-check
"use strict";
import { connect } from "dva";
import Home from "../components/home";
import { notification } from 'antd';
// eslint-dsiable-next-line
// import { ipcRenderer } from "electron";
import { emitter } from '../lib'
console.log("渲染进程入口模块");

emitter.on('request_error', err => {
  notification.error({
    message: '系统错误',
    description: err
  });
})
export default connect(state => state)(Home);
