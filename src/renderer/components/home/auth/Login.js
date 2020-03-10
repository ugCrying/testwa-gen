/**
 * （云测平台）登录
 */
import React, { Component } from 'react';
import { Form, Select, Modal, Input } from 'antd';
import { login } from '../../../../api/auth';
import Timeout from 'await-timeout';

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
};

export default class Login extends Component {
  static initialState = {
    visible: true,
    loading: false,
    projectList: []
  }

  constructor(props) {
    super(props);
    this.state = Object.assign({}, Login.initialState)
  }

  handleOk = async () => {
    try {
      this.setState({ loading: true });
      // await this.formRef.validateFields()
      console.dir(
        this.refs
      )
    //   this.refs.formRef.validateFields((err, values) => {
    // });
      // await login();
      // this.setState({ visible: false });
    } catch (e) {
      throw e
    } finally {
      await Timeout.set(300)
      this.setState({ loading: false });
    }
  }

  handleCancel = () => {

  }

  afterClose = () => {
    this.setState(Login.initialState);
  }

  render() {
    return (
      <Modal
        title="登录云测平台账号"
        destroyOnClose
        visible={this.state.visible}
        onOk={this.handleOk}
        confirmLoading={this.state.loading}
        onCancel={this.handleCancel}
        okText="确认"
        cancelText="取消"
      >
        <Form ref="formRef">
          <Form.Item
            {...formItemLayout}
            name="username"
            label="用户名"
            rules={[
              {
                required: true,
                message: '请输入用户名',
              },
            ]}
          >
            <Input maxLength={32} placeholder="用户名" />
          </Form.Item>
            <Form.Item
            {...formItemLayout}
            name="username"
            label="用户名"
            rules={[
              {
                required: true,
                message: '请输入密码',
              },
            ]}
          >
            <Input.Password  maxLength={32} placeholder="密码" />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}
