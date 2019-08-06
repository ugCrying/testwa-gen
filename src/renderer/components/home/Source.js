import React, { Component } from "react";
import { Icon, Tree } from "antd";
// @ts-ignore
import InspectorStyles from "./Inspector.css";
import { emitter } from "../../lib";
// @ts-ignore
import styles from "./source.css";
import { connect } from "dva";
import { ipcRenderer } from "electron";
console.log("ui树组件模块");
const { TreeNode } = Tree;
class Source extends Component {
  constructor(props) {
    console.log("ui树组件实例化");
    super(props);
    this.state = { selectedElement: {} };
    ipcRenderer.on("selectedElement", (_, selectedElement) => {
      console.log("得到当前选中元素，更新state");
      this.setState({ selectedElement });
    });
    ipcRenderer.on("expandedPaths", (_, expandedPaths) => {
      console.log("得到展开元素，更新state");
      this.setState({ expandedPaths });
    });
  }
  getFormattedTag(el) {
    const { tagName, attributes } = el;
    let attrs = [];
    for (let attr of [
      "name",
      "content-desc",
      "resource-id",
      "AXDescription",
      "AXIdentifier"
    ])
      if (attributes && attributes[attr])
        attrs.push(
          <span key={attr}>
            &nbsp;
            <i className={InspectorStyles.sourceAttrName}>{attr}</i>=
            <span>
              &quot;
              {attributes[attr]}
              &quot;
            </span>
          </span>
        );
    return (
      <span>
        &lt;
        <b className={InspectorStyles.sourceTag}>{tagName}</b>
        {attrs}
        &gt;
      </span>
    );
  }
  render() {
    console.log("ui树组件渲染");
    let recursive = elemObj =>
      elemObj.children.map(el => (
        <TreeNode title={this.getFormattedTag(el)} key={el.path}>
          {recursive(el)}
        </TreeNode>
      ));
    return (
      <div className={styles["source-wrap"]}>
        <div className={styles["source-title"]}>
          <Icon type="profile" />
          <p>UI树</p>
        </div>
        <div className={styles["source-tree"]}>
          {this.props.record.sourceJSON &&
            this.props.recording === "process" &&
            this.state.selectedElement && (
              <Tree
                showLine
                autoExpandParent={false}
                expandedKeys={this.state.expandedPaths}
                selectedKeys={[this.state.selectedElement.path]}
                onExpand={expandedPaths => {
                  emitter.emit("expandedPaths", expandedPaths);
                }}
                onSelect={selectedPaths =>
                  console.log("选中元素", selectedPaths[0])
                }
              >
                {recursive(this.props.record.sourceJSON)}
              </Tree>
            )}
          {console.log("ui树内容")}
        </div>
      </div>
    );
  }
}
export default connect(state => state)(Source);
