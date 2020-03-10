/**
 * 上传脚本到云测平台
 */
import React, { Component } from 'react';
import { Form, Select, Modal, Input } from 'antd';
import { getProjectList } from '../../../../api/project';
import { login } from '../../../../api/auth';
import Timeout from 'await-timeout';

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
};

export default class CodeUpload extends Component {
  static initialState = {
    visible: false,
    loading: false,
    projectList: []
  }

  constructor(props) {
    super(props);
    // this.state = this.setState(CodeUpload.initialState);
    this.state = Object.assign({}, CodeUpload.initialState)
  }

  async componentDidMount() {
    await this.fetchProjectList()
  }

  handleOk = async () => {
    try {
      this.setState({ loading: true });
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
    this.setState(CodeUpload.initialState);
  }

  fetchProjectList = async () => {
    await login({
      username: "leenotes",
      password: "1q2w3e4r5t6y"
    })
    try {
      this.setState({ loading: true })
      const { data } = await getProjectList()
      this.setState({
        projectList: data.data.pages
      })
    } catch (e) {
      this.setState({
        projectList: []
      })
      throw e
    } finally {
      this.setState({ loading: false })
    }
  }

  render() {
    return (
      <Modal
        title="上传脚本至云测平台"
        destroyOnClose
        visible={this.state.visible}
        onOk={this.handleOk}
        confirmLoading={this.state.loading}
        onCancel={this.handleCancel}
        okText="确认"
        cancelText="取消"
      >
        <Form>
        <Form.Item
          {...formItemLayout}
          name="username"
          label="脚本名称"
          rules={[
            {
              required: true,
              // TODO: 自动读入脚本名称
              message: '请输入脚本名称',
            },
          ]}
        >
          <Input maxLength={32} placeholder="脚本名称" />
        </Form.Item>
          <Form.Item
            {...formItemLayout}
            label="所属项目"
            hasFeedback
            rules={[{ required: true, message: '请选择所属项目' }]}
          >
            <Select placeholder="所属项目">
              {
                this.state.projectList.map(project => {
                  return (
                    <Select.Option
                      value={project.id}
                      key={project.id}
                    >{project.projectName}</Select.Option>
                  )
                })
              }
            </Select>
          </Form.Item>
          <Form.Item
            {...formItemLayout}
            name="username"
            label="脚本描述"
            rules={[
              {
                required: true,
                message: '请输入脚本描述',
              },
            ]}
          >
            <Input.TextArea maxLength="96" autoSize={{ minRows: 2, maxRows: 3 }} placeholder="脚本描述" />
          </Form.Item>
        </Form>
      </Modal>
    )
  }
}
