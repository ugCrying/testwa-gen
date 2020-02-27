/**
 * 脚本生成代码出口
 */

import JsWdFramework from "./js-wd";
import JavaFramework from "./java";
import PythonFramework from "./python";
// import JsWdIoFramework from "./js-wdio";
// import RubyFramework from "./ruby";
console.log("脚本代码模块");
const frameworks = {
  python: PythonFramework,
  java: JavaFramework,
  jsWd: JsWdFramework
  // jsWdIo: JsWdIoFramework,
  // ruby: RubyFramework,
  // table: "Table"
};

export default frameworks;
