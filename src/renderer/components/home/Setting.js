/**
 * 系统设置页面
 */
import React from 'react'
import {
  Form, Input, Row, Col, InputNumber,
} from 'antd'
import { connect } from 'dva'

const JAVA_HOME = require('electron').remote.process.env.JAVA_HOME || ''
const ANDROID_HOME = require('electron').remote.process.env.ANDROID_HOME || ''
const PYTEST_PATH = require('electron').remote.process.env.PYTEST_PATH || ''
const ALLURE_PATH = require('electron').remote.process.env.ALLURE_PATH || ''

if (localStorage.getItem('PYTEST_PATH')) {
  require('electron').remote.process.env.PATH = require('electron').remote.process.platform !== 'win32'
    ? `${localStorage.getItem('PYTEST_PATH')}:${require('electron').remote.process.env.PATH}`
    : `${localStorage.getItem('PYTEST_PATH')};${require('electron').remote.process.env.PATH}`
}
if (localStorage.getItem('ALLURE_PATH')) {
  require('electron').remote.process.env.PATH = require('electron').remote.process.platform !== 'win32'
    ? `${localStorage.getItem('ALLURE_PATH')}:${require('electron').remote.process.env.PATH}`
    : `${localStorage.getItem('ALLURE_PATH')};${require('electron').remote.process.env.PATH}`
}
const Setting = (props) => {
  // JAVA_HOME 路径
  const CURRENT_JAVA_HOME = props.record.JAVA_HOME || localStorage.getItem('JAVA_HOME') || JAVA_HOME
  // ANDROID_HOME 路径
  const CURRENT_ANDROID_HOME = props.record.ANDROID_HOME || localStorage.getItem('ANDROID_HOME') || ANDROID_HOME
  const CURRENT_PYTEST_PATH = props.record.PYTEST_PATH || localStorage.getItem('PYTEST_PATH') || PYTEST_PATH
  const CURRENT_ALLURE_PATH = props.record.ALLURE_PATH || localStorage.getItem('ALLURE_PATH') || ALLURE_PATH

  return (
    <Row>
      <Col push={1} span={16} xs={20} md={16} lg={12} xl={8}>
        {/* <h1>设置</h1> */}
        {/* <Form> */}
        <Form.Item label="脚本回放次数">
          <InputNumber
            min={1}
            precision={0}
            value={
              props.record.run_code_num
              || localStorage.getItem('run_code_num')
              || 1
            }
            onChange={(value) => {
              // @ts-ignore
              localStorage.setItem('run_code_num', value || '1')
              props.dispatch({
                type: 'record/setting',
                payload: {
                  run_code_num: value || 1,
                },
              })
            }}
          />
        </Form.Item>
        <Form.Item
          wrapperCol={{ span: 24 }}
          label={`JAVA_HOME${JAVA_HOME && ` (Default: ${JAVA_HOME})`}`}
        >
          <Input
            value={CURRENT_JAVA_HOME}
            onClick={() => require('electron').remote.dialog.showOpenDialog(
              {
                properties: ['openDirectory'],
                defaultPath: JAVA_HOME,
              },
              (JAVA_HOME) => {
                if (JAVA_HOME) {
                  require('electron').remote.process.env.JAVA_HOME = JAVA_HOME
                  localStorage.setItem('JAVA_HOME', JAVA_HOME[0])
                  props.dispatch({
                    type: 'record/setting',
                    payload: {
                      JAVA_HOME: JAVA_HOME[0],
                    },
                  })
                }
              },
            )}
          />
        </Form.Item>
        <Form.Item
          label={
            `ANDROID_HOME${
              ANDROID_HOME && ` (Default: ${ANDROID_HOME})`}`
          }
        >
          <Input
            value={CURRENT_ANDROID_HOME}
            onClick={() => {
              require('electron').remote.dialog.showOpenDialog(
                {
                  properties: ['openDirectory'],
                  defaultPath: ANDROID_HOME,
                },
                (ANDROID_HOME) => {
                  if (ANDROID_HOME) {
                    require('electron').remote.process.env.ANDROID_HOME = ANDROID_HOME
                    localStorage.setItem('ANDROID_HOME', ANDROID_HOME[0])
                    props.dispatch({
                      type: 'record/setting',
                      payload: {
                        ANDROID_HOME: ANDROID_HOME[0],
                      },
                    })
                  }
                },
              )
            }}
          />
        </Form.Item>
        <Form.Item
          label="PYTEST_PATH(可执行文件目录)"
        >
          <Input
            value={CURRENT_PYTEST_PATH || ''}
            onClick={() => {
              require('electron').remote.dialog.showOpenDialog(
                {
                  properties: ['openDirectory'],
                  defaultPath: PYTEST_PATH,
                },
                (PYTEST_PATH) => {
                  if (PYTEST_PATH) {
                    require('electron').remote.process.env.PYTEST_PATH = PYTEST_PATH
                    require('electron').remote.process.env.PATH = require('electron').remote.process.platform !== 'win32'
                      ? `${PYTEST_PATH}:${require('electron').remote.process.env.PATH}`
                      : `${PYTEST_PATH};${require('electron').remote.process.env.PATH}`
                    localStorage.setItem('PYTEST_PATH', PYTEST_PATH[0])
                    props.dispatch({
                      type: 'record/setting',
                      payload: {
                        PYTEST_PATH: PYTEST_PATH[0],
                      },
                    })
                  }
                },
              )
            }}
          />
        </Form.Item>
        <Form.Item
          label="ALLURE_PATH(可执行文件目录)"
        >
          <Input
            value={CURRENT_ALLURE_PATH || ''}
            onClick={() => {
              require('electron').remote.dialog.showOpenDialog(
                {
                  properties: ['openDirectory'],
                  defaultPath: ALLURE_PATH,
                },
                (ALLURE_PATH) => {
                  if (ALLURE_PATH) {
                    require('electron').remote.process.env.ALLURE_PATH = ALLURE_PATH
                    require('electron').remote.process.env.PATH = require('electron').remote.process.platform !== 'win32'
                      ? `${ALLURE_PATH}:${require('electron').remote.process.env.PATH}`
                      : `${ALLURE_PATH};${require('electron').remote.process.env.PATH}`
                    localStorage.setItem('ALLURE_PATH', ALLURE_PATH[0])
                    props.dispatch({
                      type: 'record/setting',
                      payload: {
                        ALLURE_PATH: ALLURE_PATH[0],
                      },
                    })
                  }
                },
              )
            }}
          />
        </Form.Item>
        {/* </Form> */}
      </Col>
    </Row>
  )
}

export default connect((state) => state)(Setting)
