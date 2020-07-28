/**
 * 设备（小窗）
 */

import React, { Component } from 'react';
import { Spin } from 'antd';
import HighlighterRect from './HighlighterRect';
import adbkit from 'adbkit';
// @ts-ignore
import styles from './Inspector.css';
// @ts-ignore
import devices from './devices.css';
// @ts-ignore
import shell from './shell.css';
// @ts-ignore
import { ipcRenderer } from 'electron';
import { emitter } from '../../lib';
import { xmlToJSON } from './lib';
import { connect } from 'dva'
import { startScrcpy } from './scrcpy'
import DeviceControl from './DeviceControl/DeviceControl'
// @ts-ignore
const { runScript } = require('../../../api/adb')

export let sourceXML = null;
console.log('屏幕同步组件入口模块');
let keyboard;
const connectKeyboard = () => {
  keyboard = require('net').connect({ port: 6677 });
  keyboard.on('connect', () => console.log('keyboard 已连接'));
  keyboard.on('close', hadError => {
    keyboard = null;
    console.log(hadError ? 'keyboard连接异常关闭' : 'keyboard连接关闭');
  });
  keyboard.on('error', console.log);
  return keyboard;
};
ipcRenderer.once('mainWinId', (_, { mainWinId }) => {
  localStorage.setItem('mainWinId', mainWinId);
});
let top, left;

export const client = adbkit.createClient();

class Device extends Component {
  constructor(props) {
    console.log('屏幕同步组件实例化');
    super(props);
    this.state = {
      loading: false,
      selectedElement: {},
      // 画布高度
      canvasHeight: ~~(localStorage.getItem('canvasHeight') || 500),
      // 画布宽度
      canvasWidth: 300
    };
    // 是否处于按压状态
    this.isPressing = false;
    // 是否处于滑动（滚动）状态
    this.isMove = false;
    // 是否处于录制状态
    this.record = false;
    // this.canvas = null;
    this.banner = {};
    this.touchSize = [];
    this.minitouch = require('net').connect({ port: 1718 });
    this.minitouch.on('error', console.error)
    emitter.on('selectedElement', selectedElement => {
      this.setState({ selectedElement });
    });
    ipcRenderer.on('record', () => {
      this.record = true;
      console.log('ipcRenderer.on("record", loading true');
      this.setState({ loading: true });
      this.getSource();
    });
    ipcRenderer.on('stoprecord', () => {
      this.setState({ sourceJSON: null });
      this.record = false;
    });
  }

  get ratio() {
    const { realHeight = 1 } = this.banner
    const { canvasHeight = 1 } = this.state
    return realHeight / canvasHeight
  }

  UNSAFE_componentWillMount() {
    ipcRenderer.on('getSouceSuccess', (_, sourceJSON) => {
      sourceXML = sourceJSON.value;
      sourceJSON = xmlToJSON(sourceJSON.value);
      ipcRenderer.send('getSourceJSONSuccess', sourceJSON)
      this.setState({ sourceJSON, loading: false });
    })
    ipcRenderer.on('getSouceFailed', (err) => {
      // TODO: retry
      this.setState({ loading: false });
    })
  }

  /**
   * 键盘输入同步至设备
   * @param {String} text
   */
  doTypeText(text) {
    if (!keyboard) {
      console.log('连接keyboard');
      keyboard = connectKeyboard();
    }
    keyboard.write(text + '\n');
  }

  getSource() {
    this.setState({
      loading: true
    })
    ipcRenderer.send('getSource')
  }

  componentWillUnmount() {
    ipcRenderer.removeAllListeners('stoprecord');
    ipcRenderer.removeAllListeners('record');
    // TODO: remove eventListener "changeStyle"
  }

  /**
   * 鼠标按下同步至设备
   * @param {*} evt
   */
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
    this.minitouch.write('c\n');
    this.tap = { width, height };
  }

  /**
   * 鼠标抬起同步至设备
   * @param {*} evt
   */
  onMouseUp(evt) {
    this.isPressing = false;
    this.minitouch.write('u 0\n');
    this.minitouch.write('c\n');
    // 处于录制状态下时录制脚本
    if (this.record) {
      const widthEnd = Math.round(
        (evt.clientX - left) * (this.state.canvasWidth * this.touchSize[2])
      );
      const heightEnd = Math.round(
        (evt.clientY - top) * (this.state.canvasHeight * this.touchSize[3])
      );
      if (widthEnd - this.tap.width === 0 && heightEnd - this.tap.height === 0)
        this.isMove = false;
      ipcRenderer.send(
        // +localStorage.getItem("mainWinId"),
        this.isMove ? 'swiped' : 'taped',
        this.isMove ? { ...this.tap, widthEnd, heightEnd } : this.tap
      );
      // TODO: 为何要延迟 300ms
      setTimeout(() => {
        console.log(this.isMove)
        this.getSource.bind(this)()
      }, 300);
      console.log('onmouseup loading true');
      // TODO: loading 控制放到 getSource 方法内？
      this.setState({ loading: true });
    }
    this.isMove = false;
  }

  /**
   * 鼠标滑动同步至设备
   * @param {*} evt
   */
  onMouseMove(evt) {
    // 当鼠标按下时，滑动才有效
    if (!this.isPressing) {
      return;
    }
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
    this.minitouch.write('c\n');
  }

  /**
   * 初始化画布、并打印设备宽高信息
   */
  info() {
    // 原始拟定高度
    const DEVICE_ORIGINAL_HEIGHT = window.screen.availHeight - 50;
    // 设备外壳宽度
    const DEVICE_ORIGINAL_WIDTH = (DEVICE_ORIGINAL_HEIGHT * 420) / 912;
    // canvas宽度
    this.canvasWidth = (DEVICE_ORIGINAL_WIDTH * 400) / 420;
    console.log('投屏宽度', this.canvasWidth);
    ipcRenderer.send('canvasWidth', this.canvasWidth);
    this.setState({
      canvasWidth: this.canvasWidth
    });
    ipcRenderer.once('deviceWinShowed', (_, { width, height }) => {
      console.log('屏幕分辨率', {
        width: window.screen.width,
        height: window.screen.height
      });
      console.log('屏幕内容区（去掉win任务栏/mac菜单栏）', {
        width: window.screen.availWidth,
        height: window.screen.availHeight
      });
      console.log('设备窗口内容区(除去菜单栏、工具栏等)=body.client+滚动条', {
        width: window.innerWidth,
        height: window.innerHeight
      });
      console.log('设备窗口屏幕大小', {
        width: this.canvas.getBoundingClientRect().width,
        height: this.canvas.getBoundingClientRect().height
      });
      console.log('设备屏幕压缩比例(实际)', {
        width: width / this.canvas.getBoundingClientRect().width,
        height: height / this.canvas.getBoundingClientRect().height
      });
      console.log(
        'win标题栏/mac红绿灯高度(屏幕内容区高度-最大化浏览器内容区高度)',
        window.screen.availHeight - window.innerHeight
      );
      // console.log("底部按钮高度", this.footer.scrollHeight);
      console.log('body.client，内容＋内边距+边框(height + padding+border)', {
        width: document.body.clientWidth,
        height: document.body.clientHeight
      });
      console.log('body.offset，内容＋内边距(height + padding)+溢出部分', {
        width: document.body.offsetWidth,
        height: document.body.offsetHeight
      });
      console.log('body.scroll，offset+border', {
        width: document.body.scrollWidth,
        height: document.body.scrollHeight
      });
    });
  }

  componentDidMount() {
    this.info();
    // 接受来自main，更改样式大小
    ipcRenderer.on('changeStyle', (_, args) => {
      this.canvasHeight = args.canvasHeight;
      this.setState({
        canvasHeight: this.canvasHeight
      });
      top = 45 * args.scale;
      left = 10 * args.scale;
      const deviceStyle = {
        height: args.shellHeight + 'px',
      }
      const shellStyle = {
        transform: `scale3d(${args.scale}, ${args.scale}, 1)`,
        height: 822 - args.shellHeightDiff + 'px'
      }
      const screenStyle = {
        width: args.canvasWidth + 'px',
        height: args.canvasHeight + 'px',
        top: top + 'px',
        left: left + 'px',
        borderRadius: 14 * args.scale + 'px'
      }
      Object.assign(this.device.style, deviceStyle)
      Object.assign(this.shell.style, shellStyle)
      Object.assign(this.screen.style, screenStyle)
      ipcRenderer.send('displayDevice');
    });
    const g = this.canvas.getContext('2d');
    let img = new Image();
    const config = {
      drawing: false,
      img
    }
    img.onload = () => {
      if (!this.canvas) return (config.drawing = false);
      this.canvas.width = img.width;
      this.canvas.height = img.height;
      console.log('投屏尺寸', this.canvas.width, this.canvas.height);
      g.drawImage(img, 0, 0);
      return (config.drawing = false);
    };
    // @ts-ignore
    startScrcpy(this.canvas, {
      success: (banner) => {
        this.banner = banner || this.banner
        this.setState({ loading: false })
      },
      error: () => this.setState({ loading: true })
    })
    // connectminicap(config, async (banner) => {
    //   this.banner = banner
    //   await Timeout.set(1000)
    //   // @ts-ignore
    //   this.ratio = this.banner.realHeight / this.state.canvasHeight;
    //   console.log(this.banner, this.ratio)
    // })
    this.minitouch.on('data', chunk => {
      this.touchSize = chunk
        .toString()
        .split('^')[1]
        .split(' ');
    });
    this.minitouch.on('connect', () => console.log('minitouch 已连接'));
    this.minitouch.on('close', hadError =>
      console.log(hadError ? 'minitouch连接异常关闭' : 'minitouch连接关闭')
    );
    this.minitouch.on('error', console.log);
  }

  highlighterRects() {
    let start = new Date().getTime();
    console.log('进入highlighterRects');
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
          clearText={() => (this.text = '')}
        />
      );
      for (let childEl of element.children) recursive(childEl, zIndex + 1);
    };
    this.state.sourceJSON && recursive(this.state.sourceJSON);
    let end = new Date().getTime();
    console.log('highlighterRects耗时', (end - start) / 1000);
    return highlighterRects;
  }

  render() {
    console.log('屏幕组件渲染');
    return (
      <Spin size="large" tip="同步 UI Source..." spinning={this.state.loading}>
        <div
          ref={device => (this.device = device)}
          className={styles['device-wrap']}
        >
          <div className={styles['screen-wrap']}>
            <div
              ref={shell => (this.shell = shell)}
              className={`${shell['marvel-device']} ${shell['note8']}`}
            >
              <div className={shell['inner']} />
              <div className={shell['overflow']}>
                <div className={shell['shadow']} />
              </div>
              <div className={shell['speaker']} />
              <div className={shell['sensors']} />
              <div className={shell['more-sensors']} />
              <div className={shell['sleep']} />
              <div className={shell['volume']} />
              <div className={shell['camera']} />
              <div className={shell['screen']} />
            </div>
            <div
              ref={screen => (this.screen = screen)}
              className={styles['screen-canvas']}
            >
              <div
                className={devices['canvas-container']}
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
          <DeviceControl
            refreshUI={() => this.getSource()}
            goBack={() => runScript(this.props.device, 'input keyevent "KEYCODE_BACK"')}
            task={() => runScript(this.props.device, 'input keyevent "KEYCODE_MENU"')}
            home={() => runScript(this.props.device, 'input keyevent "KEYCODE_HOME"')}
            input={(e) => {
              this.text = e.target.value;
              if (this.state.selectedElement.attributes) {
                this.textId = this.state.selectedElement.attributes[
                  "resource-id"
                ];
              }
              this.doTypeText(this.text);
            }}
          />
        </div>
      </Spin>
    );
  }
}

export default connect(state => state)(Device)
