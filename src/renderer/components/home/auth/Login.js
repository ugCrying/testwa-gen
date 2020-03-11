/**
 * （云测平台）登录
 */
import React, { Component } from 'react';
import { Form, Modal, Input } from 'antd';
import { login } from '../../../../api/auth';
import Timeout from 'await-timeout';
import { connect } from "dva";

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
};

class Login extends Component {
  static initialState = {
    visible: false,
    loading: false,
    projectList: []
  }

  constructor(props) {
    super(props);
    this.state = Object.assign({}, Login.initialState)
  }

  async componentDidMount() {
    try {
      const { data } = await login({
        username: "leenotes",
        password: "1q2w3e4r5t6y"
      })
      this.handleLoginSuccess(data.data)
    } catch (e) {
      throw e
    }
  }

  show = () => {
    this.setState({
      visible: true
    })
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
    this.setState({
      visible: false
    })
  }

  afterClose = () => {
    this.setState(Login.initialState);
  }

  handleLoginSuccess = (userInfo) => {
    const { dispatch }  = this.props;
    dispatch({ type: 'user/login', payload: userInfo });
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


function mergeProps(stateProps, dispatchProps, ownProps) {
  return Object.assign({}, ownProps, stateProps, dispatchProps)
}

// function mapDispatchToProps(dispatch) {
//   return dispatch
// }

const mapDispatchToProps = (dispatch) => ({
  // usersAction: bindActionCreators(userAction, dispatch),
  dispatch: dispatch
});

export default connect(state => state, mapDispatchToProps, mergeProps, { withRef: true } )(Login);
