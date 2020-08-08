/**
 * 主页面
 */
import React, { Component } from 'react'
import {
  Layout, Button, Tabs, Modal, Tooltip, Icon, Menu, Dropdown,
  Select,
} from 'antd'

import { Subject } from 'rxjs'
import {
  map, takeUntil, concatAll, withLatestFrom,
} from 'rxjs/operators'
import { ipcRenderer } from 'electron'
import Source from './Source'
import Terminal from './terminal'
import DeviceList from './deviceList'
import SelectApp from './selectApp'
import Setting from './Setting'
import RecordedActions from './RecordedActions'
import CodeList from './codeList'
import CodeUpload from './codeUpload'
import Login from './auth/Login'
// @ts-ignore
import styles from './devices.layout.css'
import { emitter } from '../../lib'
import {
  getPackages, runCode, downCode, trackDevices,
} from './lib'
import rxdb from '../../db'
import SelectedElement from './SelectedElement'

const { TabPane } = Tabs
const { Header, Sider, Content } = Layout
const { Option } = Select
ipcRenderer.on('deviceWinId', (_, id) => {
  localStorage.setItem('deviceWinId', id)
})

export default class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
      // 当前标签页 key 值
      activeKey: '主页',
      // 终端展开 / 收起状态
      terminalDisplay: true,
      // 左侧（已保存本地）脚本列表是否课件
      codeListDisplay: true,
      // 终端是否可见
      terminalShow: false,
      sideWidth: 0,
      // 终端高度（用于鼠标拖动动态调整）
      terminalHeight: 0,
      // 录制结束时保存脚本模态框是否课件
      visible: false,
    }
    this.terminalSwitch = this.terminalSwitch.bind(this)
    this.terminalOpen = this.terminalOpen.bind(this)
    this.codeUploadRef = React.createRef()
    this.loginRef = React.createRef()
    trackDevices(this.props.dispatch)
    ipcRenderer.on('runed', () => {
      this.setState({
        codeRuning: false,
      })
    })
    ipcRenderer.on('recorded', () => {
      !this.saved && this.showModal()
    })
    ipcRenderer.on('sendKeys', (_, recordedActions) => {
      this.props.dispatch({
        type: 'record/addRecordedActions',
        payload: {
          recordedActions,
        },
      })
    })
    ipcRenderer.on('swiped', (_, tap) => {
      this.props.dispatch({
        type: 'record/addRecordedActions',
        payload: {
          recordedActions: [
            {
              action: 'swipe',
              params: [
                '',
                '',
                tap.width,
                tap.height,
                tap.widthEnd,
                tap.heightEnd,
              ],
            },
          ],
        },
      })
    })
    ipcRenderer.on('taped', (_, tap) => {
      localStorage.getItem('tap') === 'true'
        && this.props.dispatch({
          type: 'record/addRecordedActions',
          payload: {
            recordedActions: [
              {
                action: 'tap',
                params: ['', '', tap.width, tap.height],
              },
            ],
          },
        })
    })
    ipcRenderer.on('recordedActions', (_, recordedActions) => {
      console.log('得到操作行为，更新state', recordedActions);
      (!localStorage.getItem('tap')
        || localStorage.getItem('tap') === 'false')
        && this.props.dispatch({
          type: 'record/addRecordedActions',
          payload: {
            recordedActions,
          },
        })
    })
    ipcRenderer.on('getSourceJSONSuccess', (_, sourceJSON) => {
      this.saved = false
      console.log('ipcRenderer getSourceJSONSuccess', sourceJSON)
      this.props.dispatch({
        type: 'record/source',
        payload: sourceJSON,
      })
    })
  }

  selectedCode () {
    return !!this.props.record.code
  }

  showModal() {
    this.saved = true
    this.setState({
      recording: null,
    })
    if (
      this.props.record.recordedActions
      && this.props.record.recordedActions.length
    ) {
      this.setState({
        visible: true,
      })
    }
  }

  /**
   * 保存脚本时点击确定
   */
  handleOk() {
    // @ts-ignore
    this.saveCode(this.refs.input.value)
  }

  /**
   * 保存脚本时点击取消
   */
  handleCancel() {
    this.saveCode()
  }

  /**
   * 保存脚本至本地并结束录制
   * 脚本名为空时仅结束录制
   * TODO: 保存脚本与结束录制拆分为两个方法
   * @param {String} name 脚本名称
   */
  saveCode(name) {
    if (
      name
      && this.props.record.recordedActions
      && this.props.record.recordedActions.length
    ) {
      this.addTime = new Date().getTime().toString()
      rxdb.then((db) => {
        db.code.atomicUpsert({
          name: name || this.addTime,
          addTime: this.addTime,
          info: this.state.device,
          value: this.props.record.recordedActions,
        })
      })
    }
    ipcRenderer.send('stopRecord', null)
    this.setState({
      // device: null,
      visible: false,
    })
    // @ts-ignore
    this.refs.input.value = ''
  }

  /**
   * 保存脚本到本地
   */
  downCode() {
    require('electron').remote.dialog.showSaveDialog(
      { filters: [{ name: 'code', extensions: ['py'] }] },
      (filename) => {
        filename
          && require('fs').writeFile(
            filename,
            downCode(this.props.record.code.info, this.props.record.code.value),
            () => {},
          )
      },
    )
    // this.setState({ downCode: true });
  }

  /**
   * 上传脚本到云测平台
   */
  uploadCode() {
    const { userInfo } = this.props.user
    if (userInfo) {
      this.codeUploadRef.show()
    } else {
      this.showLogin()
    }
  }

  // handleDownCode() {
  //   console.log(this.downCodePath.name, this.downCodePath.path);
  // }

  /**
   * 删除选中的脚本
   */
  delCode() {
    console.log(this.props.record.code)
    const { confirm } = Modal
    const { code } = this.props.record
    const { dispatch } = this.props
    confirm({
      title: '确定删除脚本?',
      content: code.name,
      okText: '确定',
      cancelText: '取消',
      onOk() {
        rxdb.then((db) => {
          db.code.findOne(code.addTime).remove()
          dispatch({ type: 'record/addCode', payload: { value: [] } })
        })
      },
      onCancel() {
        console.log('Cancel')
      },
    })
  }

  /**
   * 事件绑定：鼠标拖动调整宽高
   */
  async componentDidMount() {
    const tabs = document.querySelector(
      `.${styles['main-common-tabs']} .ant-tabs-content`,
    )
    tabs.className = `${tabs.className} ${styles['ant-tabs-content']}`
    const side = document.getElementsByClassName(
      styles['main-layout-sider'],
    )[0]
    const sideDrag = document.getElementsByClassName(
      styles['side-custom-tabs-tabpane-content-drag'],
    )[0]
    const sideMouseDown = new Subject()
    const sideMouseMove = new Subject()
    const sideMouseUp = new Subject()

    const ter = document.getElementsByClassName(styles['main-terminal'])[0]
    const terDrag = document.getElementsByClassName(
      styles['main-terminal-drag-line'],
    )[0]
    const terMouseDown = new Subject()
    const terMouseMove = new Subject()
    const terMouseUp = new Subject()

    sideDrag.addEventListener('mousedown', (event) => {
      sideMouseDown.next(event)
    })
    document.body.addEventListener('mousemove', (event) => {
      sideMouseMove.next(event)
    })
    document.body.addEventListener('mouseup', (event) => {
      sideMouseUp.next(event)
    })

    terDrag.addEventListener('mousedown', (event) => {
      terMouseDown.next(event)
    })
    document.body.addEventListener('mousemove', (event) => {
      terMouseMove.next(event)
    })
    document.body.addEventListener('mouseup', (event) => {
      terMouseUp.next(event)
    })

    sideMouseDown
      .pipe(
        map((event) => (event.preventDefault()
          ? event.preventDefault()
          : (event.returnValue = false)),
        ),
        // @ts-ignore
        map((event) => sideMouseMove.pipe(takeUntil(sideMouseUp))),
        concatAll(),
        // @ts-ignore
        map((event) => event.clientX),
        withLatestFrom(sideMouseDown, (move, down) => move - down.offsetX + 2),
      )
      .subscribe((event) => {
        this.setState({ sideWidth: event })
        // @ts-ignore
        side.style.flex = `0 0 ${this.state.sideWidth}px`
      })

    terMouseDown
      .pipe(
        map((event) => (event.preventDefault()
          ? event.preventDefault()
          : (event.returnValue = false)),
        ),
        // @ts-ignore
        map((event) => terMouseMove.pipe(takeUntil(terMouseUp))),
        concatAll(),
        // @ts-ignore
        map((event) => event.clientY),
        withLatestFrom(terMouseDown, (move, down) => move - down.offsetY),
      )
      .subscribe((event) => {
        this.setState({
          terminalHeight: ter.getBoundingClientRect().bottom - event,
        })
        // @ts-ignore
        ter.style.height = `${this.state.terminalHeight}px`
      })
  }

  /**
   * 组件销毁时事件解绑
   */
  componentWillUnmount() {
    ipcRenderer.removeAllListeners('recordedActions')
    ipcRenderer.removeAllListeners('getSourceJSONSuccess')
  }

  /**
   * 展开 / 关闭终端
   */
  terminalSwitch() {
    this.setState({ terminalDisplay: !this.state.terminalDisplay })
  }

  /**
   * 展开终端
   */
  terminalOpen() {
    this.setState({ terminalDisplay: true })
  }

  showLogin = () => {
    this.loginRef.show()
  }

  switchUser = () => {
    // this.logout()
    this.showLogin()
  }

  logout = () => {
    this.props.dispatch({ type: 'user/logout' })
  }

  /**
   * 标签页切换（此处未使用 router 而是简单的页面切换实现）
   */
  content() {
    let content
    switch (this.state.activeKey) {
      case '设备列表':
        content = (
          <DeviceList
            onSelectDevice={(device) => {
              this.props.dispatch({
                type: 'record/packages',
                payload: {
                  packages: null,
                },
              })
              this.setState({ activeKey: '应用列表', device })
              setTimeout(() => getPackages(this.props.dispatch), 500)
            }}
          />
        )
        break
      case '应用列表':
        content = (
          <SelectApp
            recording={() => {
              this.setState({
                recording: 'process',
                activeKey: '脚本录制',
              })
            }}
          />
        )
        break
      case '脚本录制':
        content = (
          <RecordedActions addTime={this.addTime} device={this.state.device} />
        )
        break
      case '设置':
        content = <Setting />
        break
      case '主页':
        content = (
          <div className={styles.welcome}>
            <img
              className={styles.code}
              width="100"
              height="100"
              src={require('./二维码.png')}
              alt="二维码"
            />
          </div>
        )
        break
      default:
        throw new Error(`unknown activeKey: ${this.state.activeKey}`)
    }
    return content
  }

  menu() {
    return (
      <Menu>
        <Menu.Item key="0">
          <a target="_blank" rel="noopener noreferrer" href="http://www.alipay.com/">
            切换帐号
          </a>
        </Menu.Item>
        <Menu.Item key="1">
          <a target="_blank" rel="noopener noreferrer" href="http://www.taobao.com/">
            注销
          </a>
        </Menu.Item>
      </Menu>
    )
  }

  // onLoginRef = (ref) => {
  //   this.loginRef = ref.getWrappedInstance()
  // }

  // onCodeUploadRef= (ref) => {
  //   this.codeUploadRef = ref.getWrappedInstance()
  // }

  render() {
    const { userInfo } = this.props.user

    const menu = (
      <Menu>
        <Menu.Item key="0">
          <span onClick={this.switchUser}>
            切换帐号
          </span>
        </Menu.Item>
        <Menu.Item key="1">
          <span onClick={this.logout}>
            注销
          </span>
        </Menu.Item>
      </Menu>
    )

    return (
      <div className={styles['devices-wrap']}>
        <Layout className={styles['main-layout']}>
          <Header className={styles['main-layout-header']}>
            <div className={styles['main-header-brand']}>
              <img
                // @ts-ignore
                src={require('static/images/logo.png')}
                alt=""
              />
              {
                userInfo ? (
                  <Dropdown overlay={menu}>
                    <span className={styles['main-header-brand-user-info']}>
                      { userInfo.username }
                    </span>
                  </Dropdown>
                ) : (
                  <span className={styles['main-header-brand-user-info']} onClick={this.showLogin}>
                    {/* 登录 */}
                  </span>
                )
              }
            </div>
            <div className={styles['main-header-control']}>
              <div className={styles['header-control-buttons']}>
                <Button
                  size="small"
                  onClick={() => {
                    this.setState({ activeKey: '主页' })
                  }}
                >
                  <div className={styles['button-icon']}>
                    <Icon type="home" />
                    主页
                  </div>
                </Button>
                <Button
                  size="small"
                  disabled={
                    !(!this.state.codeRuning && this.state.device)
                  }
                >
                  {this.state.recording ? (
                    <div
                      className={styles['button-icon']}
                      onClick={() => {
                        this.showModal()
                      }}
                    >
                      <img
                        // @ts-ignore
                        src={require('static/images/recording.svg')}
                        alt=""
                      />
                      停止
                    </div>
                  ) : (
                    <div
                      className={styles['button-icon']}
                      onClick={() => {
                        // connectSTF(this.state.device.id);
                        // require("electron")
                        //   .remote.require("./adb")
                        //   .startUiautomator2(this.state.device.id)
                        //   .then(() => setTimeout(getPackages, 5000));
                        // getPackages(this.props.dispatch);
                        this.setState({ activeKey: '应用列表' })
                      }}
                    >
                      <img
                        alt=""
                        // @ts-ignore
                        src={require('static/images/record.svg')}
                      />
                      录制
                    </div>
                  )}
                </Button>
                <Button
                  size="small"
                  disabled={
                    !(!this.state.recording
                    && ((this.props.record.code
                      && this.props.record.code.value.length)
                      || (this.props.record.recordedActions
                        && this.props.record.recordedActions.length)))
                  }
                >
                  {this.state.codeRuning ? (
                    <div
                      className={styles['button-icon']}
                      onClick={() => {
                        this.setState({
                          codeRuning: false,
                        })
                        ipcRenderer.send('stopcode')
                      }}
                    >
                      <img
                        alt=""
                        // @ts-ignore
                        src={require('static/images/recording.svg')}
                      />
                      停止
                    </div>
                  ) : (
                    <div
                      className={styles['button-icon']}
                      onClick={() => {
                        runCode(
                          {
                            ...this.state.device,
                            ...this.props.record.code.info,
                          },
                          this.props.record.recordedActions
                            || this.props.record.code.value,
                        )
                        this.setState({
                          codeRuning: true,
                        })
                      }}
                    >
                      <img
                        // @ts-ignore
                        src={require('static/images/replay.svg')}
                        alt=""
                      />
                      <div className={styles['button-icon']}>
                        回放
                      </div>
                    </div>
                  )}
                </Button>
                <Button
                  size="small"
                  icon={
                    this.state.recording === 'pause' ? 'play-circle' : 'pause'
                  }
                  disabled={!this.state.recording}
                  onClick={() => {
                    if (this.state.recording === 'pause') {
                      this.setState({ recording: 'process' })
                      ipcRenderer.send(
                        'record',
                        null,
                        require('electron').remote.BrowserWindow.getFocusedWindow()
                          .id,
                      )
                    } else {
                      this.setState({ recording: 'pause' })
                      ipcRenderer.send('stopRecord', null)
                    }
                  }}
                >
                  <div className={styles['button-icon']}>
                    {this.state.recording === 'pause' ? '继续' : '暂停'}
                  </div>

                </Button>
                <Button
                  icon="mobile"
                  size="small"
                  onClick={() => this.setState({ activeKey: '设备列表' })}
                  disabled={
                    !!(this.state.recording || this.state.codeRuning)
                  }
                >
                  <div className={styles['button-icon']}>
                    设备
                  </div>
                </Button>
                {/* <Button icon="question-circle" size={"small"}>
                  帮助
                </Button> */}
              </div>
              <div className={styles['header-control-login']}>
                {/* <p>
                  欢迎你，
                  <a>登录/注册</a>
                </p> */}
                <Tooltip
                  title={
                    !this.state.codeListDisplay
                      ? '展开脚本列表'
                      : '收起脚本列表'
                  }
                >
                  <Button
                    className={styles['circle-btn']}
                    shape="circle"
                    icon="menu-fold"
                    onClick={() => this.setState({
                      codeListDisplay: !this.state.codeListDisplay,
                    })}
                  />
                </Tooltip>
                <Tooltip
                  title={!this.state.terminalShow ? '展开终端' : '收起终端'}
                >
                  <Button
                    className={styles['circle-btn']}
                    shape="circle"
                    icon="menu-unfold"
                    onClick={() => this.setState({
                      terminalShow: !this.state.terminalShow,
                    })}
                  />
                </Tooltip>
                <Tooltip title="设置">
                  <Button
                    className={styles['circle-btn']}
                    shape="circle"
                    icon="setting"
                    onClick={() => this.setState({
                      activeKey: '设置',
                    })}
                  />
                </Tooltip>
                {/* <Button icon="poweroff" size={"small"}>
                  退出
                </Button> */}
              </div>
            </div>
          </Header>
          <Layout className={styles['main-first-layout']}>
            <Sider
              style={{
                display: this.state.codeListDisplay ? '' : 'none',
              }}
              className={styles['main-layout-sider']}
            >
              <Tabs
                defaultActiveKey="1"
                className={styles['side-custom-tabs']}
                tabBarExtraContent={(
                  <div>
                    {/* <Tooltip title="上传脚本至云测平台">
                      <Button disabled={!this.selectedCode.apply(this)} type="link" icon="upload" onClick={this.uploadCode.bind(this)} />
                    </Tooltip> */}
                    <Tooltip title="下载脚本至本地">
                      <Button disabled={!this.selectedCode.apply(this)} type="link" icon="download" onClick={this.downCode.bind(this)} />
                    </Tooltip>
                    <Tooltip title="删除脚本文件">
                      <Button disabled={!this.selectedCode.apply(this)} type="link" icon="delete" onClick={this.delCode.bind(this)} />
                    </Tooltip>
                  </div>
                )}
              >
                <TabPane tab="脚本列表" key="1">
                  <div className={styles['side-custom-tabs-wrap']}>
                    <div className={styles['side-custom-tabs-tabpane-content']}>
                      <div
                        className={
                          styles['side-custom-tabs-tabpane-content-list']
                        }
                      >
                        <CodeList
                          onSelect={(addTime) => {
                            this.addTime = addTime
                            this.setState({ activeKey: '脚本录制' })
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </TabPane>
                {/* <AppList /> */}
              </Tabs>
              <div
                className={styles['side-custom-tabs-tabpane-content-drag']}
              />
            </Sider>
            <Content className={styles['main-layout-content']}>
              <Layout className={styles['main-content-layout']}>
                <div className={styles['main-content-layout-wrap']}>
                  <div className={styles['main-route-bar']}>
                    {/* <p>User</p> <span> > </span> */}
                    <p className={styles['main-route-bar-title']}>{this.state.activeKey || 'Testwa'}</p>
                  </div>
                  <div className={styles['main-business-wrap']}>
                    <div className={styles['main-business-worker-area']}>
                      {this.content()}
                    </div>
                  </div>
                  <div
                    style={{
                      display:
                        // this.state.codeRuning ||
                        // this.state.recording ||
                        this.state.terminalShow ? '' : 'none',
                    }}
                    className={
                      this.state.terminalDisplay
                        ? styles['main-terminal']
                        : `${styles['main-terminal-wrap-hide']} ${styles['main-terminal']}`
                    }
                  >
                    <div className={styles['main-terminal-drag-line']} />
                    <div className={styles['main-terminal-control-bar']}>
                      <Tooltip title="清除日志">
                        <Icon
                          type="delete"
                          onClick={() => {
                            emitter.emit('clearLog')
                          }}
                        />
                      </Tooltip>
                      <Tooltip
                        title={
                          !this.state.terminalDisplay ? '展开终端' : '收起终端'
                        }
                      >
                        <Icon
                          type={
                            !this.state.terminalDisplay
                              ? 'arrow-up'
                              : 'arrow-down'
                          }
                          onClick={this.terminalSwitch.bind(this)}
                        />
                      </Tooltip>
                    </div>
                    <Tabs
                      className={styles['main-common-tabs']}
                      onTabClick={this.terminalOpen}
                    >
                      <TabPane
                        tab="日志"
                        key="log"
                        className={styles['main-terminal-area']}
                      >
                        <div className={styles['terminal-area-log']}>
                          <Terminal />
                        </div>
                        <div className={styles['terminal-area-select']}>
                          <Select
                            defaultValue="none"
                            className={styles['terminal-select']}
                          >
                            <Option value="none">日志级别(无)</Option>
                            <Option value="detail">详细</Option>
                            <Option value="test">测试</Option>
                            <Option value="info">信息</Option>
                            <Option value="warn">警告</Option>
                            <Option value="error">错误</Option>
                            <Option value="deadly">致命</Option>
                          </Select>
                        </div>
                      </TabPane>
                      <TabPane
                        tab="UI树"
                        key="tree"
                        className={styles['main-tree-area']}
                      >
                        <Source recording={this.state.recording} />
                      </TabPane>
                      <TabPane
                        tab="操作面板"
                        key="el"
                        className={styles['main-el-area']}
                      >
                        <SelectedElement {...this.props} />
                      </TabPane>
                      {/* {this.state.codeRuning ? (
                        <TabPane
                          tab="日志"
                          key="log"
                          className={styles['main-terminal-area']}
                        >
                          <div className={styles['terminal-area-log']}>
                            <Terminal />
                          </div>
                          <div className={styles['terminal-area-select']}>
                            <Select
                              defaultValue="none"
                              className={styles['terminal-select']}
                            >
                              <Option value="none">日志级别(无)</Option>
                              <Option value="detail">详细</Option>
                              <Option value="test">测试</Option>
                              <Option value="info">信息</Option>
                              <Option value="warn">警告</Option>
                              <Option value="error">错误</Option>
                              <Option value="deadly">致命</Option>
                            </Select>
                          </div>
                        </TabPane>
                      ) : (
                        <TabPane
                          tab="UI树"
                          key="tree"
                          disabled={this.state.recording ? false : true}
                          className={styles['main-tree-area']}
                        >
                          <Source recording={this.state.recording} />
                        </TabPane>
                      )} */}
                      {/* {this.state.recording && (
                        <TabPane
                          tab="操作面板"
                          key="el"
                          className={styles['main-el-area']}
                        >
                          <SelectedElement {...this.props} />
                        </TabPane>
                      )} */}
                    </Tabs>
                  </div>
                </div>
              </Layout>
            </Content>
          </Layout>
        </Layout>
        <Modal
          title="指定脚本名称"
          visible={this.state.visible}
          onOk={this.handleOk.bind(this)}
          onCancel={this.handleCancel.bind(this)}
          width={300}
          okText="确定"
          cancelText="取消"
        >
          <input
            ref="input"
            placeholder="脚本名称"
            onBlur={(e) => {
              const { value } = e.target
              console.log(value)
            }}
          />
        </Modal>
        <CodeUpload ref={this.codeUploadRef} />
        <Login ref={this.loginRef} />
      </div>
    )
  }
}
