/**
 * 应用列表
 */
import React, { Component } from 'react'
import { Icon, Button, Upload, Spin } from 'antd'
import { connect } from 'dva'
import {
  getApkList,
  getPackages,
  onSelectAPK,
  onSelectPackage,
  record,
} from '../lib'
// @ts-ignore
import styles from './app.css'
// @ts-ignore
const defaultAppIcon = require('static/images/default_app_icon.png')

class APP extends Component {
  constructor(props) {
    super(props)
    this.state = {
      // 选中的 app
      select: null,
      // 选中 app 的图标样式
      className: '',
      // loading: true
    }
    this.apkList = []
    getApkList().then((apkList) => {
      this.apkList = apkList
    })
  }

  /**
   * 选中 app
   * @param {*} app
   * @param {'phone' | 'android'} type 设备类型
   */
  selectApp(app, type) {
    if (type === 'phone') {
      onSelectPackage(app)
    } else {
      onSelectAPK(app)
    }
    this.setState({ select: app, className: app.name + type })
  }

  render() {
    return (
      <Spin
        size="large"
        tip="加载应用列表..."
        spinning={!this.props.record.packages && !this.props.record.isOverTime}
      >
        <div className={styles['select-app-wrap']}>
          <div className={styles['title-list']}>
            <Icon type="mobile" />
            <p>选择手机中的应用</p>
            <Button
              className={styles['refresh-btn']}
              shape="circle"
              icon="reload"
              size="small"
              onClick={() => {
                this.props.dispatch({
                  type: 'record/packages',
                  payload: {
                    packages: null,
                  },
                })
                getPackages(this.props.dispatch)
              }}
            />
            <Button
              className={styles['app-control-btn']}
              type="primary"
              disabled={!this.state.select}
              onClick={() => {
                this.props.dispatch({
                  type: 'record/start',
                })
                record()
                this.props.recording()
              }}
            >
              开始录制
            </Button>
          </div>

          {/* 手机自带的 APP */}
          <div className={styles['app-list-wrap']}>
            {this.props.record.packages &&
              this.props.record.packages.map((app, index) => (
                <div
                  className={
                    this.state.className === `${app.name}phone`
                      ? 'app-item selected'
                      : styles['app-item']
                  }
                  key={index}
                  onClick={this.selectApp.bind(this, app, 'phone')}
                >
                  <div className={styles['app-item-mask']}>
                    <Icon
                      type="check"
                      style={{ fontSize: 32, color: '#52c41a' }}
                    />
                  </div>
                  <div className={styles['app-item-icon']}>
                    <img src={app.icon || defaultAppIcon} alt="" />
                  </div>
                  <p className={styles['app-item-name']} title={app.name}>
                    {app.name}
                  </p>
                </div>
              ))}
          </div>

          {/* 本地可上传的 APK */}
          <div className={styles['title-list']}>
            <Icon type="laptop" />
            <p>选择电脑上的应用</p>
          </div>

          {/* 录制工具内可上传的 APK */}
          <div className={styles['app-list-wrap']}>
            {this.apkList.map((app, index) => (
              <div
                className={
                  this.state.className === `${app.name}local`
                    ? 'app-item selected'
                    : 'app-item'
                }
                key={index}
                onClick={this.selectApp.bind(this, app, 'local')}
              >
                <div className={styles['app-item-mask']}>
                  <Icon
                    type="check"
                    style={{ fontSize: 32, color: '#52c41a' }}
                  />
                </div>
                <div className={styles['app-item-icon']}>
                  <img src={app.icon || defaultAppIcon} alt="" />
                </div>
                <p className={styles['app-item-name']} title={app.name}>
                  {app.name}
                </p>
              </div>
            ))}
            <div className={styles['app-item']}>
              <div className={styles['app-item-icon item-uploader']}>
                <Upload
                  {...{
                    beforeUpload: () => false,
                  }}
                  onChange={(evt) => {
                    console.log(evt)
                    this.selectApp(evt.file, 'local')
                  }}
                >
                  <Button>
                    <Icon type="upload" />
                  </Button>
                </Upload>
              </div>
              <p className={styles['app-item-name']}>选择APK上传</p>
            </div>
          </div>
        </div>
      </Spin>
    )
  }
}
export default connect((state) => state)(APP)
