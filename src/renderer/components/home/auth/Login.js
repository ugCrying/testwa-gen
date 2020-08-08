/**
 * （云测平台）登录
 */
import React, { Component } from 'react'
import { Form, Modal, Input } from 'antd'
import Timeout from 'await-timeout'
import { connect } from 'dva'
import { login } from '../../../../api/auth'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
}

const CollectionCreateForm = Form.create({ name: 'form_in_modal' })(
  // eslint-disable-next-line
  class extends React.Component {
    render() {
      const {
        visible, onCancel, onOk, form, loading,
      } = this.props
      const { getFieldDecorator } = form

      return (
        <Modal
          title="登录云测平台账号"
          destroyOnClose
          visible={visible}
          onOk={onOk}
          confirmLoading={loading}
          onCancel={onCancel}
          okText="确认"
          cancelText="取消"
        >
          <Form id="myForm">
            <Form.Item
              {...formItemLayout}
              name="username"
              label="用户名"
            >
              {getFieldDecorator('username', {
                rules: [{ required: true, message: '请输入用户名' }],
              })(<Input maxLength={32} placeholder="用户名" />)}
            </Form.Item>
            <Form.Item
              {...formItemLayout}
              name="password"
              label="密码"
            >
              {getFieldDecorator('password', {
                rules: [{ required: true, message: '请输入密码' }],
              })(<Input.Password maxLength={32} placeholder="密码" />)}
            </Form.Item>
          </Form>
        </Modal>
      )
    }
  },
)

class Login extends Component {
  static initialState = {
    visible: false,
    loading: false,
    projectList: [],
  }

  constructor(props) {
    super(props)
    this.state = { ...Login.initialState }
  }

  async componentDidMount() {
    // for dev
    // const { data } = await login({ username: 'leenotes', password: '1q2w3e4r5t6y' })
    // this.handleLoginSuccess(data.data)
  }

  show = () => {
    this.setState({
      visible: true,
    })
  }

  handleOk = async () => {
    try {
      this.setState({ loading: true })
      const values = await this.getFormValues()
      const { data } = await login(values)
      this.handleLoginSuccess(data.data)
      this.setState({ visible: false })
    } catch (e) {
      throw e
    } finally {
      await Timeout.set(300)
      this.setState({ loading: false })
    }
  }

  getFormValues = () => new Promise((resolve, reject) => {
    const { form } = this.formRef.props
    form.validateFields((err, values) => (err ? reject(err) : resolve(values)))
  })

  handleCancel = () => {
    this.setState({
      visible: false,
    })
  }

  saveFormRef = (formRef) => {
    this.formRef = formRef
  };

  afterClose = () => {
    this.setState(Login.initialState)
  }

  handleLoginSuccess = (userInfo) => {
    const { dispatch }  = this.props
    dispatch({ type: 'user/login', payload: userInfo })
  }

  render() {
    return (
      <CollectionCreateForm
        wrappedComponentRef={this.saveFormRef}
        visible={this.state.visible}
        onCancel={this.handleCancel}
        loading={this.state.loading}
        onOk={this.handleOk}
      />
    )
  }
}

function mergeProps(stateProps, dispatchProps, ownProps) {
  return { ...ownProps, ...stateProps, ...dispatchProps }
}

const mapDispatchToProps = (dispatch) => ({ dispatch })

export default connect((state) => state, mapDispatchToProps, mergeProps, { forwardRef: true })(Login)
