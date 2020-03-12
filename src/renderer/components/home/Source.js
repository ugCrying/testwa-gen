import React, { Component } from "react";
import { Tree } from "antd";
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
      if (attributes[attr])
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
    const mapping = {}
    let recursive = elemObj =>
      elemObj.children.map(el => {
        mapping[el.path] = el
        return (
          <TreeNode
            title={
              // <p onMouseOver={() => {
              //   console.log(this.getFormattedTag(el))
              // } }>
              //   {this.getFormattedTag(el)}
              // </p>
              <a onMouseEnter={() => {
                // TODO: 反向选中
                // emitter.emit("selectedElement", el);
                // ipcRenderer.send("selectedElement", el);
              }}>{this.getFormattedTag(el)}</a>
            }
            key={el.path}
          >
            {recursive(el)}
          </TreeNode>
        )
      });
    return (
      <div className={styles["source-wrap"]}>
        {/* <div className={styles["source-title"]}>
          <Icon type="profile" />
          <p>UI树</p>
        </div> */}
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
                  // TODO: 反向选中
                  this.setState({ expandedPaths })
                  // TODO: 父组件未处理，是否需要冒泡与处理？
                  emitter.emit("expandedPaths", expandedPaths);
                }}
                onSelect={(key) => {
                  console.log("UI树里选中元素", mapping[key])
                  // emitter.emit("selectedElement", mapping[key]);
                  // ipcRenderer.send("selectedElement", mapping[key]);
                }
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
