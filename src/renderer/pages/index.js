// @ts-check
"use strict";
import { connect } from "dva";
import Home from "../components/home";
console.log("渲染进程入口模块");
export default connect(state => state)(Home);
