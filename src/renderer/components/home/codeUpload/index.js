/**
 * 上传脚本到云测平台
 */
import React, { Component } from 'react';
import { Form, Select, Modal, Input, notification } from 'antd';
import { getProjectList } from '../../../../api/project';
import Timeout from 'await-timeout';
import { uploadScript } from '../../../../api/script'
import { connect } from "dva";

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 },
};

const CollectionCreateForm = Form.create({ name: 'form_in_modal' })(
  // eslint-disable-next-line
  class extends React.Component {
    
    render() {
      const { visible, onCancel, onOk, form, loading, projectList } = this.props;
      const { getFieldDecorator } = form;

      const { Option} = Select

      return (
        <Modal
        title="上传脚本至云测平台"
        destroyOnClose
        visible={visible}
        onOk={onOk}
        confirmLoading={loading}
        onCancel={onCancel}
        okText="确认"
        cancelText="取消"
      >
        <Form>
          <Form.Item
            {...formItemLayout}
            label="脚本名称"
              >
                {getFieldDecorator('scriptName', {
                  rules: [{ required: true, message: '请输入脚本名称' }],
                })(<Input maxLength={32} placeholder="脚本名称" />)}
          </Form.Item>
          <Form.Item
            {...formItemLayout}
            label="所属项目"
          >
              {getFieldDecorator('projectId', {
              rules: [{ required: true, message: '请输入密码' }],
            })(
              <Select placeholder="所属项目">
                {
                  projectList.map(project => {
                    return (
                      <Option value={project.id} key={project.id}>{ project.projectName }</Option>
                    )
                  })
                }
              </Select>
            )}
          </Form.Item>
          <Form.Item {...formItemLayout} label="脚本描述">
              {getFieldDecorator('scriptCaseDesc', {
                // rules: [{ required: true, message: '请输入脚本描述' }],
              })(<Input.TextArea maxLength={96} autoSize={{ minRows: 2, maxRows: 3 }} placeholder="脚本描述" />)}
          </Form.Item>
        </Form>
      </Modal>
      )
    }
  }
)

class CodeUpload extends Component {
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

  show = () => {
    this.setState({ visible: true })
    console.log(
      this.props.record.code
    )
    this.fetchProjectList()
  }

  handleOk = async () => {
    try {
      this.setState({ loading: true });
      const values = await this.getFormValues()
      values['appBasePackage'] = this.props.record.code.info.packageName
      await uploadScript(values, this.props.record.code.value)
      notification.success({
        message: '系统提示',
        description: '上传脚本成功'
        // description: '点击查看详情'
      });
      this.setState({ visible: false })
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
    this.setState(CodeUpload.initialState);
  }

  fetchProjectList = async () => {
    // await login({
    //   username: "leenotes",
    //   password: "1q2w3e4r5t6y"
    // })
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

  saveFormRef = formRef => {
    this.formRef = formRef;
  };

  getFormValues = () => {
    return new Promise((resolve, reject) => {
      const { form } = this.formRef.props;
      form.validateFields((err, values) => err ? reject(err) : resolve(values))
    })
  }

  render() {
    return (
      <CollectionCreateForm
        wrappedComponentRef={this.saveFormRef}
        visible={this.state.visible}
        onCancel={this.handleCancel}
        onOk={this.handleOk}
        projectList={this.state.projectList}
        loading={this.state.loading}
      />
    )
  }
}

function mergeProps(stateProps, dispatchProps, ownProps) {
  return Object.assign({}, ownProps, stateProps, dispatchProps)
}

const mapDispatchToProps = (dispatch) => ({ dispatch });

export default connect(state => state, mapDispatchToProps, mergeProps, { withRef: true } )(CodeUpload);
