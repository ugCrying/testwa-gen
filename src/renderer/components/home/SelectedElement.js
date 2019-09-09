import React, { Component } from "react";
import _ from "lodash";
import { Button, Row, Table } from "antd";
import { ipcRenderer } from "electron";

export default class SelectedElement extends Component {
  constructor(props) {
    super(props);
    // this.handleSendKeys = this.handleSendKeys.bind(this);
    this.state = { selectedElement: {} };
    this.text = "";
    ipcRenderer.on("selectedElement", (_, selectedElement) => {
      this.setState({ selectedElement });
    });
  }

  render() {
    const { attributes } = this.state.selectedElement;
    let attributeColumns = [
      {
        title: "属性",
        dataIndex: "name",
        key: "name",
        width: 100
      },
      {
        title: "值",
        dataIndex: "value",
        key: "value"
      }
    ];

    let attrArray = _.toPairs(attributes).filter(([key]) => key !== "path");
    let dataSource = attrArray.map(([key, value]) => ({
      key,
      value,
      name: key
    }));

    return (
      dataSource.length > 0 && (
        <div>
          <Button
            onClick={() => {
              localStorage.setItem("tap", !this.state.tap);
              this.setState({ tap: !this.state.tap });
            }}
          >
            {this.state.tap ? "点元素" : "点坐标"}
          </Button>

          <Row>
            <Table
              columns={attributeColumns}
              dataSource={dataSource}
              size="small"
              pagination={false}
            />
          </Row>
        </div>
      )
    );
  }
}
