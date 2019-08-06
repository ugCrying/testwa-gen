import React, { Component } from "react";
import { Tree } from "antd";
import { getCodes } from "../lib";
import { connect } from "dva";
import rxdb from "../../../db";

class CodeList extends Component {
  constructor(props) {
    super(props);
    this.state = {
      codes: []
    };
    getCodes(this.setState.bind(this));
  }
  codeTag() {
    const codeTree = {};
    for (const code of this.state.codes) {
      const appName = code.info.appName;
      if (!!codeTree[appName]) {
        codeTree[appName].push(code);
      } else {
        codeTree[appName] = [code];
      }
    }
    return codeTree;
  }
  render() {
    return (
      <div style={{ overflow: "scroll", height: "85%" }}>
        <Tree.DirectoryTree
          onSelect={async ([id]) => {
            if (id)
              (await rxdb)["code"]
                .findOne(id)
                .exec()
                .then(code => {
                  this.props.dispatch({
                    type: "record/updateRecordedActions",
                    payload: null
                  });
                  this.props.dispatch({
                    type: "record/addCode",
                    payload: code
                  });
                  this.props.onSelect(id);
                });
          }}
          defaultExpandedKeys={["0"]}
        >
          {Object.entries(this.codeTag()).map(([key, codes]) => {
            return (
              <Tree.TreeNode title={key} key={key}>
                {codes.map(code => {
                  return (
                    <Tree.TreeNode
                      title={code.name || "-"}
                      key={code.addTime}
                      isLeaf
                    />
                  );
                })}
              </Tree.TreeNode>
            );
          })}
        </Tree.DirectoryTree>
      </div>
    );
  }
}
export default connect()(CodeList);
