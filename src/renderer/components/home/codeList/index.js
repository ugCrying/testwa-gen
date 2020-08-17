/**
 * （已保存至本地）脚本列表管理
 */
// @ts-ignore
import React, { Component } from 'react'
import { Tree } from 'antd'
import { connect } from 'dva'
import { getCodes } from '../lib'
import styles from './codeList.css'
import rxdb from '../../../db'

class CodeList extends Component {
  constructor(props) {
    super(props)
    this.state = {
      // 树形结构，仅两层：app文件夹 + app脚本文件
      codes: [],
    }
    getCodes(this.setState.bind(this))
  }

  codeTag() {
    const codeTree = {}
    for (const code of this.state.codes) {
      const { appName } = code.info
      if (codeTree[appName]) {
        codeTree[appName].push(code)
      } else {
        codeTree[appName] = [code]
      }
    }
    return codeTree
  }

  render() {
    return (
      <div className={styles.codeList__body}>
        <Tree.DirectoryTree
          onSelect={async ([id]) => {
            if (id) {
              (await rxdb).code
                .findOne(id)
                .exec()
                .then((code) => {
                  this.props.dispatch({
                    type: 'record/updateRecordedActions',
                    payload: null,
                  })
                  this.props.dispatch({
                    type: 'record/addCode',
                    payload: code,
                  })
                  this.props.onSelect(id)
                })
            }
          }}
          defaultExpandedKeys={['0']}
        >
          {Object.entries(this.codeTag()).map(([key, codes]) => (
            <Tree.TreeNode title={key} key={key}>
              {codes.map((code) => (
                <Tree.TreeNode
                  title={code.name || '-'}
                  key={code.addTime}
                  isLeaf
                />
              ))}
            </Tree.TreeNode>
          ))}
        </Tree.DirectoryTree>
      </div>
    )
  }
}

export default connect()(CodeList)
