import React, { Component } from "react";
import { Button, Spin } from "antd";
import { BannerParser } from "minicap";
import HighlighterRect from "./HighlighterRect";
import adbkit from "adbkit";
// @ts-ignore
import styles from "./Inspector.css";
// @ts-ignore
import devices from "./devices.css";
// @ts-ignore
import shell from "./shell.css";
// @ts-ignore
import { ipcRenderer } from "electron";
import { emitter } from "../../lib";
import { xmlToJSON } from "./lib";
export let sourceXML = null;
console.log("屏幕同步组件入口模块");
const request = require("request").defaults({
  timeout: 3000,
  forever: true,
  json: true,
  baseUrl: "http://localhost:4444/wd/hub/session/1/"
});
let keyboard;
const connectKeyboard = () => {
  keyboard = require("net").connect({ port: 6677 });
  keyboard.on("connect", () => console.log("keyboard 已连接"));
  keyboard.on("close", hadError => {
    keyboard = null;
    console.log(hadError ? "keyboard连接异常关闭" : "keyboard连接关闭");
  });
  keyboard.on("error", console.log);
  return keyboard;
};
ipcRenderer.once("mainWinId", (_, { mainWinId }) => {
  localStorage.setItem("mainWinId", mainWinId);
});
let top, left;
let timer;
export const client = adbkit.createClient();
export default class extends Component {
  constructor(props) {
    console.log("屏幕同步组件实例化");
    super(props);
    this.state = {
      loading: false,
      selectedElement: {},
      canvasHeight: localStorage.getItem("canvasHeight")
        ? localStorage.getItem("canvasHeight")
        : 500,
      canvasWidth: 300
    };
    // this.canvas = null;
    this.banner = null;
    this.touchSize = [];
    this.minitouch = require("net").connect({ port: 1718 });
    emitter.on("selectedElement", selectedElement => {
      this.setState({ selectedElement });
    });
    ipcRenderer.on("record", () => {
      this.record = true;
      this.setState({ loading: true });
      this.getSource();
    });
    ipcRenderer.on("stoprecord", () => {
      this.setState({ sourceJSON: null });
      this.record = false;
    });
  }

  doTypeText(text) {
    if (!keyboard) {
      console.log("连接keyboard");
      keyboard = connectKeyboard();
    }
    keyboard.write(text + "\n");
  }
  appiumGetSource(cb) {
    request.get("/source", (err, res, sourceJSON) => {
      try {
        sourceXML = sourceJSON.value
        sourceJSON = xmlToJSON(sourceJSON.value);
        clearTimeout(timer);
        timer = null;
        require('electron').remote.BrowserWindow.fromId(+localStorage.getItem("mainWinId")).webContents.send("getSourceJSON",
          sourceJSON);
        // ipcRenderer.send(
        //   // +localStorage.getItem("mainWinId"),
        //   "getSourceJSON",
        //   sourceJSON
        // );
        return this.setState({ sourceJSON, loading: false });
      } catch (e) {
        cb && cb();
        console.log("getSource", err || sourceJSON || res);
        return setTimeout(() => {
          this.appiumGetSource();
        }, 2000);
      }
    });
  }
  getSource() {
    console.log("sourceJSON");
    this.appiumGetSource(() => {
      ipcRenderer.send("startU2");
    });
    timer = setTimeout(() => {
      timer = null;
      this.setState({ loading: false });
    }, 15000);
  }
  componentWillUnmount() {
    ipcRenderer.removeAllListeners("stoprecord");
    ipcRenderer.removeAllListeners("record");
  }
  onMouseDown(evt) {
    this.isPressing = true;
    const width = Math.round(
      (evt.clientX - left) *
      this.ratio *
      (this.touchSize[2] / this.banner.realWidth)
    );
    const height = Math.round(
      (evt.clientY - top) *
      this.ratio *
      (this.touchSize[3] / this.banner.realHeight)
    );
    this.minitouch.write(
      // `d 0 ${evt.nativeEvent.offsetX * 2} ${evt.nativeEvent.offsetY * 2} 50\n` d 触控点个数 x y 压力值
      `d 0 ${width} ${height} 50\n`
    );
    this.minitouch.write("c\n");
    this.tap = { width, height };
  }
  onMouseUp(evt) {
    this.isPressing = false;
    this.minitouch.write("u 0\n");
    this.minitouch.write("c\n");
    if (this.record) {
      const widthEnd = Math.round(
        (evt.clientX - left) *
        this.ratio *
        (this.touchSize[2] / this.banner.realWidth)
      );
      const heightEnd = Math.round(
        (evt.clientY - top) *
        this.ratio *
        (this.touchSize[3] / this.banner.realHeight)
      );
      if (widthEnd - this.tap.width === 0 && heightEnd - this.tap.height === 0)
        this.isMove = false;
      ipcRenderer.send(
        // +localStorage.getItem("mainWinId"),
        this.isMove ? "swiped" : "taped",
        this.isMove ? { ...this.tap, widthEnd, heightEnd } : this.tap
      );
      setTimeout(this.getSource.bind(this), 300);
      this.setState({ loading: true });
    }
    this.isMove = false;
  }
  onMouseMove(evt) {
    if (!this.isPressing) return;
    this.isMove = true;
    const width = Math.round(
      (evt.clientX - left) *
      this.ratio *
      (this.touchSize[2] / this.banner.realWidth)
    );
    const height = Math.round(
      (evt.clientY - top) *
      this.ratio *
      (this.touchSize[3] / this.banner.realHeight)
    );
    this.minitouch.write(
      // `m 0 ${evt.nativeEvent.offsetX * 2} ${evt.nativeEvent.offsetY * 2}  50\n`
      `m 0 ${width} ${height} 50\n`
    );
    this.minitouch.write("c\n");
  }
  info() {
    // 原始拟定高度
    const DEVICE_ORIGINAL_HEIGHT = window.screen.availHeight - 50;
    // 设备外壳宽度
    const DEVICE_ORIGINAL_WIDTH = (DEVICE_ORIGINAL_HEIGHT * 420) / 912;
    // canvas宽度
    this.canvasWidth = (DEVICE_ORIGINAL_WIDTH * 400) / 420;
    console.log("投屏宽度", this.canvasWidth);
    ipcRenderer.send("canvasWidth", this.canvasWidth);
    this.setState({
      canvasWidth: this.canvasWidth
    });
    //test log
    ipcRenderer.once("deviceWinShowed", (_, { width, height }) => {
      console.log("屏幕分辨率", {
        width: window.screen.width,
        height: window.screen.height
      });
      console.log("屏幕内容区（去掉win任务栏/mac菜单栏）", {
        width: window.screen.availWidth,
        height: window.screen.availHeight
      });
      console.log("设备窗口内容区(除去菜单栏、工具栏等)=body.client+滚动条", {
        width: window.innerWidth,
        height: window.innerHeight
      });
      console.log("设备窗口屏幕大小", {
        width: this.canvas.getBoundingClientRect().width,
        height: this.canvas.getBoundingClientRect().height
      });
      console.log("设备屏幕压缩比例(实际)", {
        width: width / this.canvas.getBoundingClientRect().width,
        height: height / this.canvas.getBoundingClientRect().height
      });
      console.log(
        "win标题栏/mac红绿灯高度(屏幕内容区高度-最大化浏览器内容区高度)",
        window.screen.availHeight - window.innerHeight
      );
      // console.log("底部按钮高度", this.footer.scrollHeight);
      console.log("body.client，内容＋内边距+边框(height + padding+border)", {
        width: document.body.clientWidth,
        height: document.body.clientHeight
      });
      console.log("body.offset，内容＋内边距(height + padding)+溢出部分", {
        width: document.body.offsetWidth,
        height: document.body.offsetHeight
      });
      console.log("body.scroll，offset+border", {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight
      });
    });
  }
  componentDidMount() {
    this.info();
    // 接受来自main，更改样式大小
    ipcRenderer.on("changeStyle", (_, args) => {
      this.canvasHeight = args.canvasHeight;
      this.setState({
        canvasHeight: this.canvasHeight
      });
      top = 45 * args.scale;
      left = 10 * args.scale;
      this.device.style.height = args.shellHeight + "px";
      this.shell.style.transform = `scale3d(${args.scale}, ${args.scale}, 1)`;
      this.shell.style.height = 822 - args.shellHeightDiff + "px";
      this.screen.style.width = args.canvasWidth + "px";
      this.screen.style.height = args.canvasHeight + "px";
      this.screen.style.top = top + "px";
      this.screen.style.left = left + "px";
      this.screen.style.borderRadius = 14 * args.scale + "px";
      ipcRenderer.send("displayDevice");
    });
    const g = this.canvas.getContext("2d");
    let drawing = false;
    const minicap = require("net").connect({ port: 1717 });
    let img = new Image();
    img.onload = () => {
      if (!this.canvas) return (drawing = false);
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      console.log("投屏尺寸", this.canvas.width, this.canvas.height);
      g.drawImage(img, 0, 0);
      return (drawing = false);
    };
    const connectminicap = () => {
      let data = [];
      let header = true;
      let compiling = true;
      const screen = () => {
        compiling = true;
        const arr = data.slice(0, 4); //前四个字节是帧大小
        const size =
          (arr[3] << 24) | (arr[2] << 16) | (arr[1] << 8) | (arr[0] << 0); //获得帧大小
        if (data.length >= size + 4) {
          //获取帧内容
          // imgStream.push(chunk, "base64");
          if (drawing === false) {
            drawing = true;
            img.src =
              "data:image/png;base64," +
              Buffer.from(data.slice(4, 4 + size)).toString("base64");
          }
          data = data.slice(4 + size);
          return screen();
        }
        return (compiling = false);
      };
      drawing = false;
      minicap.on("data", chunk => {
        // @ts-ignore
        data.push(...chunk);
        if (compiling === false) return screen();
        if (header) {
          const parser = new BannerParser();
          parser.parse(data.splice(0, 24)); //前24个字节是头信息
          this.banner = parser.take();
          // @ts-ignore
          console.log("minicap获取的设备屏幕实际高度", this.banner.realHeight);
          setTimeout(() => {
            this.ratio = this.banner.realHeight / this.state.canvasHeight;
            console.log(
              "realHeight&canvasHeight",
              this.ratio,
              this.banner.realHeight,
              this.state.canvasHeight
            );
          }, 1000);
          header = false;
          compiling = false;
        }
      });
      minicap.on("connect", () => console.log("minicap 已连接"));
      minicap.on("close", hadError =>
        console.log(hadError ? "minicap连接异常关闭" : "minicap连接关闭")
      );
      minicap.on("error", console.log);
    };
    connectminicap();
    this.minitouch.on("data", chunk => {
      this.touchSize = chunk
        .toString()
        .split("^")[1]
        .split(" ");
    });
    this.minitouch.on("connect", () => console.log("minitouch 已连接"));
    this.minitouch.on("close", hadError =>
      console.log(hadError ? "minitouch连接异常关闭" : "minitouch连接关闭")
    );
    this.minitouch.on("error", console.log);
  }

  highlighterRects() {
    const highlighterRects = [];
    let recursive = (element, zIndex = 0) => {
      highlighterRects.push(
        <HighlighterRect
          selectedElement={this.state.selectedElement}
          element={element}
          zIndex={zIndex}
          key={element.path}
          ratio={this.ratio}
          text={this.text}
          textId={this.textId}
          record={this.record}
          clearText={() => (this.text = "")}
        />
      );
      for (let childEl of element.children) recursive(childEl, zIndex + 1);
    };
    this.state.sourceJSON && recursive(this.state.sourceJSON);
    return highlighterRects;
  }
  render() {
    console.log("屏幕组件渲染");
    return (
      <Spin size="large" tip="同步 UI Source..." spinning={this.state.loading}>
        <div
          ref={device => (this.device = device)}
          className={styles["device-wrap"]}
        >
          <div className={styles["screen-wrap"]}>
            <div
              ref={shell => (this.shell = shell)}
              className={`${shell["marvel-device"]} ${shell["note8"]}`}
            >
              <div className={shell["inner"]} />
              <div className={shell["overflow"]}>
                <div className={shell["shadow"]} />
              </div>
              <div className={shell["speaker"]} />
              <div className={shell["sensors"]} />
              <div className={shell["more-sensors"]} />
              <div className={shell["sleep"]} />
              <div className={shell["volume"]} />
              <div className={shell["camera"]} />
              <div className={shell["screen"]} />
            </div>
            <div
              ref={screen => (this.screen = screen)}
              className={styles["screen-canvas"]}
            >
              <div
                className={devices["canvas-container"]}
                style={{
                  height: this.state.canvasHeight
                }}
                onMouseDown={this.onMouseDown.bind(this)}
                onMouseUp={this.onMouseUp.bind(this)}
                onMouseMove={this.onMouseMove.bind(this)}
                onMouseOut={() => (this.isPressing = false)}
              >
                <canvas ref={canvas => (this.canvas = canvas)} />
                {this.highlighterRects()}
              </div>
            </div>
          </div>
          <div className={styles["control-wrap"]}>
            <div className={styles["control-space"]} />
            <div className={styles["control-container"]}>
              <div className={styles["control-bar"]}>
                <Button
                  onClick={() => {
                    ipcRenderer.send("close");
                  }}
                >
                  <img
                    // @ts-ignore
                    src={require(`../../../../static/images/close.svg`)}
                    alt=""
                  />
                </Button>
                <Button
                  onClick={() => {
                    ipcRenderer.send("min");
                  }}
                >
                  <img
                    // @ts-ignore
                    src={require(`../../../../static/images/min.svg`)}
                    alt=""
                  />
                </Button>
                <Button
                  onClick={() =>
                    client.shell(
                      this.props.device,
                      'input keyevent "KEYCODE_BACK"'
                    )
                  }
                >
                  <img
                    className={styles["reply-button"]}
                    // @ts-ignore
                    src={require(`../../../../static/images/reply.svg`)}
                    alt=""
                  />
                </Button>
                <Button
                  onClick={() =>
                    client.shell(
                      this.props.device,
                      'input keyevent "KEYCODE_HOME"'
                    )
                  }
                >
                  <img
                    // @ts-ignore
                    src={require(`../../../../static/images/home.svg`)}
                    alt=""
                  />
                </Button>
                <Button
                  onClick={() => {
                    client.shell(
                      this.props.device,
                      'input keyevent "KEYCODE_MENU"'
                    );
                  }}
                >
                  <img
                    // @ts-ignore
                    src={require(`../../../../static/images/menu.svg`)}
                    alt=""
                  />
                </Button>
                <Button
                  onClick={() => {
                    this.setState({ loading: true });
                    this.getSource();
                  }}
                >
                  <img
                    // @ts-ignore
                    src={require(`../../../../static/images/refresh.svg`)}
                    alt=""
                  />
                </Button>
                <input
                  className={styles["v-input"]}
                  autoFocus
                  onBlur={e => {
                    e.target.focus();
                    e.target.value = "";
                    console.log("失去焦点清空文本", e.target.value);
                  }}
                  onChange={e => {
                    this.text = e.target.value;
                    if (this.state.selectedElement.attributes) {
                      this.textId = this.state.selectedElement.attributes[
                        "resource-id"
                      ];
                    }
                    this.doTypeText(this.text);
                    console.log("文本同步输入", this.text);
                  }}
                />
              </div>
              <div className={styles["control-container-space"]} />
            </div>
          </div>
        </div>
      </Spin>
    );
  }
}
