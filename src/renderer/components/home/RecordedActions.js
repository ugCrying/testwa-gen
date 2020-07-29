/**
 * 操作行为模块
 */
import React, { Component } from 'react';
import { Select, Tabs, Table, Form, Popconfirm, Input } from 'antd';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/styles/hljs';
import frameworks from './client-frameworks';
// @ts-ignore
import InspectorStyles from './Inspector.css';
// @ts-ignore
import styles from './recordedActions.css';
import { connect } from 'dva';
import rxdb from '../../db';
const { remove } = require('immutable');

console.log('操作行为组件模块');
const Option = Select.Option;
const TabPane = Tabs.TabPane;
const FormItem = Form.Item;
const EditableContext = React.createContext();

/**
 * 可编辑行
 * TODO: 提供下拉框选择
 * @param {*} param0 
 */
const EditableRow = ({ form, index, ...props }) => (
  <EditableContext.Provider value={form}>
    <tr {...props} />
  </EditableContext.Provider>
);

const EditableFormRow = Form.create()(EditableRow);
class EditableCell extends React.Component {
  state = {
    editing: false
  };
  toggleEdit = () => {
    const editing = !this.state.editing;
    this.setState({ editing }, () => {
      if (editing) {
        this.input.focus();
      }
    });
  };
  save = () => {
    const { record, handleSave } = this.props;
    this.form.validateFields((error, values) => {
      if (error) return;
      this.toggleEdit();
      handleSave({ ...record, ...values });
    });
  };
  render() {
    const { editing } = this.state;
    const {
      editable,
      dataIndex,
      title,
      record,
      index,
      handleSave,
      ...restProps
    } = this.props;
    return (
      <td ref={node => (this.cell = node)} {...restProps}>
        {editable ? (
          <EditableContext.Consumer>
            {form => {
              this.form = form;
              return editing ? (
                <FormItem style={{ margin: 0 }}>
                  {form.getFieldDecorator(dataIndex, {
                    rules: [
                      {
                        required: true,
                        message: `${title} 不能为空`
                      }
                    ],
                    initialValue: record[dataIndex]
                  })(
                    <Input
                      ref={node => (this.input = node)}
                      onPressEnter={this.save}
                    />
                  )}
                </FormItem>
              ) : (
                <div
                  className="editable-cell-value-wrap"
                  style={{ paddingRight: 24 }}
                  onClick={this.toggleEdit}
                >
                  {restProps.children}
                </div>
              );
            }}
          </EditableContext.Consumer>
        ) : (
          restProps.children
        )}
      </td>
    );
  }
}
class RecordActions extends Component {
  constructor(props) {
    super(props);
    console.log('操作行为组件实例化');
    this.state = {
      // 当前代码编程语言，可修改
      actionFramework: 'jsWd'
    };
    this.columns = [
      {
        title: '行为',
        dataIndex: 'action',
        // fixed: "left",
        width: 200,
        editable: true
      },
      {
        title: '元素',
        dataIndex: 'params',
        editable: true
      },
      {
        title: '编辑',
        key: 'operation',
        // fixed: "right",
        width: 100,
        render: (_, record) => {
          return (
            <Popconfirm
              title="确定要删除吗?"
              okText="确定"
              cancelText="取消"
              onConfirm={() => this.handleDelete(record)}
            >
              <a href="">删除</a>
            </Popconfirm>
          );
        }
      }
    ];
  }

  /**
   * 删除行
   * TODO:
   */
  handleDelete = async row => {
    this.codes = remove(this.codes, row.key);
    if (this.props.record.code.addTime) {
      const db = await rxdb;
      await db.code
        .findOne(this.props.record.code.addTime)
        .update({ $set: { value: this.codes } });
    } else {
      this.props.dispatch({
        type: 'record/updateRecordedActions',
        payload: this.codes
      });
    }
    this.setState({ fresh: true });
  };

  /**
   * 保存行更改
   */
  handleSave = async row => {
    if (row.params.split) row.params = row.params.split(',');
    this.codes[row.key] = row;
    if (this.props.record.code.addTime) {
      const db = await rxdb;
      await db.code
        .findOne(this.props.record.code.addTime)
        .update({ $set: { value: this.codes } });
    } else {
      this.props.dispatch({
        type: 'record/updateRecordedActions',
        payload: this.codes
      });
    }
    this.setState({ fresh: true });
  };

  getTableData() {
    const datas = [];
    // let params;
    this.codes =
      this.props.record.code && this.props.record.code.value[0]
        ? this.props.record.code.value
        : this.props.record.recordedActions;
    let i = 0;
    if (this.codes)
      for (const data of this.codes) {
        // data.key = i++;
        datas.push({
          action: data.action,
          params: data.params.filter(d => d).join(','),
          key: i++
        });
        //   data.params[1]
        //     ? (params = data.params[1])
        //     : datas.push({ params, key: ++i, action: data.action });
      }
    console.log(datas);
    return datas;
    // this.codes = datas;
    // return this.codes;
  }

  getCode() {
    console.log('脚本代码生成');
    const code =
      this.props.record.code && this.props.record.code.value[0]
        ? this.props.record.code.value
        : this.props.record.recordedActions;
    // if (this.state.actionFramework === "table") return JSON.stringify(code);
    let framework = new frameworks[this.state.actionFramework]();
    framework.actions = code || [];
    return framework.getCodeString();
  }

  render() {
    console.log('操作行为组件渲染');
    const components = {
      body: {
        row: EditableFormRow,
        cell: EditableCell
      }
    };
    const columns = this.columns.map(col => {
      if (!col.editable) return col;
      return {
        ...col,
        onCell: record => ({
          record,
          editable: col.editable,
          dataIndex: col.dataIndex,
          title: col.title,
          handleSave: this.handleSave
        })
      };
    });
    this.data = this.getTableData();

    return (
      <div className={styles['script-wrap']}>
        <Tabs defaultActiveKey="1" className={styles['script-wrap-tabs']}>
          <TabPane tab="视图" key="1">
            <Table
              components={components}
              size="small"
              bordered
              dataSource={this.data}
              columns={columns}
              pagination={false}
              scroll={{
                x: columns.filter(e => e.width).reduce((w1, w2) => {
                  return w1 + w2
                }),
                y: 'calc(100vh - 200px)'
              }}
            />
          </TabPane>
          <TabPane tab="代码" key="2">
            <div className={styles['script-title']}>
              <div className={styles['script-title-select']}>
                <Select
                  defaultValue="jsWd"
                  // @ts-ignore
                  onChange={actionFramework =>
                    this.setState({ actionFramework })
                  }
                  className={InspectorStyles['framework-dropdown']}
                >
                  {Object.keys(frameworks).map(f => (
                    <Option key={f} value={f}>
                      {frameworks[f].readableName}
                    </Option>
                  ))}
                </Select>
              </div>
            </div>
            <div className={styles['script-content']}>
              <SyntaxHighlighter
                language={this.state.actionFramework}
                style={ vs }
                showLineNumbers
              >
                {this.getCode()}
              </SyntaxHighlighter>
            </div>
          </TabPane>
        </Tabs>
      </div>
    );
  }
}

export default connect(state => state)(RecordActions);
