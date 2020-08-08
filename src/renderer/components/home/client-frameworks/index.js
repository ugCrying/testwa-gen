/**
 * 脚本生成代码出口
 * https://github.com/appium/appium-desktop/tree/master/app/renderer/lib/client-frameworks
 */

import JsWdFramework from "./js-wd";
import JavaFramework from "./java";
import PythonFramework from "./python";
// import JsWdIoFramework from "./js-wdio";
// import RubyFramework from "./ruby";
const frameworks = {
  python: PythonFramework,
  java: JavaFramework,
  jsWd: JsWdFramework
  // jsWdIo: JsWdIoFramework,
  // ruby: RubyFramework,
  // table: "Table"
};

export default frameworks;
