// @ts-check
"use strict";
import Device from "../components/device";
import React from "react";
console.log("渲染进程入口模块");
export default props => <Device {...props.location.query} />;
// export default connect(state => state)(Home);
