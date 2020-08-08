import React, { Component } from 'react';
import { Layout, Button, Tooltip, Icon, Menu, Dropdown } from 'antd';
// @ts-ignore
import styles from '../devices.layout.css';
import Login from '../auth/Login'
import { connect } from 'dva';
import { ipcRenderer } from 'electron';
import { runCode } from '../lib';

const { Header } = Layout;

class GlobalHeader extends Component {
  onLoginRef = ref => {
    this.loginRef = ref.getWrappedInstance()
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

  render() {
    const { userInfo } = this.props.user

    const menu = (
      <Menu>
        <Menu.Item key="0">
          <span onClick={ this.switchUser }>
            切换帐号
          </span>
        </Menu.Item>
        <Menu.Item key="1">
          <span onClick={ this.logout }>
            注销
          </span>
        </Menu.Item>
      </Menu>
    )
    
    return (
      <Header className={styles['main-layout-header']}>
        <div className={styles['main-header-brand']}>
          <img
            // @ts-ignore
            src={require('../../../../../static/images/logo.png')}
          />
          {
            userInfo ? (
              <Dropdown overlay={menu}>
                <span className={styles['main-header-brand-user-info']}>
                  { userInfo.username }
                </span>
              </Dropdown>
            ) : (
                <span className={styles['main-header-brand-user-info']} onClick={ this.showLogin }>
                  登录
              </span>
            )
          }
        </div>
        <div className={styles['main-header-control']}>
          <div className={styles['header-control-buttons']}>
            <Button
              size={'small'}
              onClick={() => {
                this.props.setState({ activeKey: '主页' });
              }}
            >
              <div className={styles['button-icon']}>
                <Icon type="home" />
                主页
              </div>
            </Button>
            <Button
              size={'small'}
              disabled={
                !this.props.state.codeRuning && this.props.state.device ? false : true
              }
            >
              {this.props.state.recording ? (
                <div
                  className={styles['button-icon']}
                  onClick={() => {
                    this.props.showModal();
                  }}
                >
                  <img
                    // @ts-ignore
                    src={require(`static/images//recording.svg`)}
                    alt=""
                  />
                  停止
                </div>
              ) : (
                <div
                  className={styles['button-icon']}
                  onClick={() => {
                    this.props.setState({ activeKey: '应用列表' });
                  }}
                >
                  <img
                    alt=""
                    // @ts-ignore
                    src={require(`static/images//record.svg`)}
                  />
                  录制
                </div>
              )}
            </Button>
            <Button
              size={'small'}
              disabled={
                !this.props.state.recording &&
                ((this.props.record.code &&
                  this.props.record.code.value.length) ||
                  (this.props.record.recordedActions &&
                    this.props.record.recordedActions.length))
                  ? false
                  : true
              }
            >
              {this.props.state.codeRuning ? (
                <div
                  className={styles['button-icon']}
                  onClick={() => {
                    this.props.setState({
                      codeRuning: false
                    });
                    ipcRenderer.send('stopcode');
                  }}
                >
                  <img
                    alt=""
                    // @ts-ignore
                    src={require(`static/images//recording.svg`)}
                  />
                  停止
                </div>
              ) : (
                <div
                  className={styles['button-icon']}
                  onClick={() => {
                    runCode(
                      {
                        ...this.props.state.device,
                        ...this.props.record.code.info,
                      },
                      this.props.record.recordedActions ||
                        this.props.record.code.value
                    );
                    this.props.setState({
                      codeRuning: true
                    });
                  }}
                >
                  <img
                    // @ts-ignore
                    src={require(`static/images//replay.svg`)}
                    alt=""
                    />
                    <div className={styles['button-icon']}>
                      回放
                    </div>
                </div>
              )}
            </Button>
            <Button
              size={'small'}
              icon={
                this.props.state.recording === 'pause' ? 'play-circle' : 'pause'
              }
              disabled={this.props.state.recording ? false : true}
              onClick={() => {
                if (this.props.state.recording === 'pause') {
                  this.props.setState({ recording: 'process' });
                  ipcRenderer.send(
                    'record',
                    null,
                    require('electron').remote.BrowserWindow.getFocusedWindow()
                      .id
                  );
                } else {
                  this.props.setState({ recording: 'pause' });
                  ipcRenderer.send('stopRecord', null);
                }
              }}
            >
              <div className={styles['button-icon']}>
                {this.props.state.recording === 'pause' ? '继续' : '暂停'}
              </div>
              
            </Button>
            <Button
              icon="mobile"
              size={'small'}
              onClick={() => this.props.setState({ activeKey: '设备列表' })}
              disabled={
                this.props.state.recording || this.props.state.codeRuning ? true : false
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
            <Tooltip
              title={
                !this.props.state.codeListDisplay
                  ? '展开脚本列表'
                  : '收起脚本列表'
              }
            >
              <Button
                className={styles['circle-btn']}
                shape="circle"
                icon="menu-fold"
                onClick={() =>
                  this.props.setState({
                    codeListDisplay: !this.props.state.codeListDisplay
                  })
                }
              />
            </Tooltip>
            <Tooltip
              title={!this.props.state.terminalShow ? '展开终端' : '收起终端'}
            >
              <Button
                className={styles['circle-btn']}
                shape="circle"
                icon="menu-unfold"
                onClick={() =>
                  this.props.setState({
                    terminalShow: !this.props.state.terminalShow
                  })
                }
              />
            </Tooltip>
            <Tooltip title="设置">
              <Button
                className={styles['circle-btn']}
                shape="circle"
                icon="setting"
                onClick={() =>
                  this.props.setState({
                    activeKey: '设置'
                  })
                }
              />
            </Tooltip>
          </div>
        </div>
        <Login ref={ this.onLoginRef } />
      </Header>
    );
  }
}

export default connect(state => state)(GlobalHeader);
