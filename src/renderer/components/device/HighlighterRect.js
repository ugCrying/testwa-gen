import React from "react";
import { getRecordedActions, parseCoordinates } from "./lib";
import { ipcRenderer } from "electron";
import { emitter } from "../../lib";
import { sourceXML } from ".";
// @ts-ignore
import styles from "./Inspector.css";
export default ({
  selectedElement,
  element,
  zIndex,
  ratio,
  record,
  text,
  textId,
  clearText
}) => {
  const { x1, y1, x2, y2 } = parseCoordinates(element);
  let left = x1 / ratio;
  let top = y1 / ratio;
  let width = ((x2 - x1) / ratio) * 0.97;
  let height = ((y2 - y1) / ratio) * 0.97;
  let timer;
  return (
    <div
      className={
        selectedElement.path === element.path && record
          ? `${styles["highlighter-box"]} ${styles["hovered-element-box"]}`
          : styles["highlighter-box"]
      }
      onClick={() => {
        if (!record) {
          return;
        }
        //check
        console.log("输入文本录制", text);
        if (text) {
          const { variableName } = getRecordedActions(element, sourceXML);
          ipcRenderer.send(
            //+localStorage.getItem("mainWinId"), 
            "sendKeys", [
              {
                action: "findAndAssign",
                params: ["id", textId, "keys" + variableName]
              },
              {
                action: "sendKeys",
                params: ["keys" + variableName, "", text]
              }
            ]);
        }
        clearText();
        const { variableName, strategy, selector } = getRecordedActions(
          element, sourceXML
        );
        require('electron').remote.BrowserWindow.fromId(+localStorage.getItem("mainWinId")).webContents.send(
          // ipcRenderer.sendTo(
          //渲染进程通信消息中转
          // +localStorage.getItem("mainWinId"),
          "recordedActions",
          [
            {
              action: "findAndAssign",
              params: [strategy, selector, variableName]
            },
            {
              action: "click",
              params: [variableName]
            }
          ]
        );
      }}
      onMouseOver={() => {
        timer = setTimeout(() => {
          emitter.emit("selectedElement", element);
          ipcRenderer.send(
            // +localStorage.getItem("mainWinId"),
            "selectedElement",
            element
          );
          const expandedPaths = [];
          const pathArr = element.path
            .split(".")
            .slice(0, element.path.length - 1);
          while (pathArr.length > 1) {
            pathArr.splice(pathArr.length - 1);
            let path = pathArr.join(".");
            expandedPaths.push(path);
          }
          emitter.emit("expandedPaths", expandedPaths);
          ipcRenderer.send(
            // +localStorage.getItem("mainWinId"),
            "expandedPaths",
            expandedPaths
          );
        }, 300);
      }}
      onMouseOut={() => {
        clearTimeout(timer);
        timer = null;
      }}
      key={element.path}
      style={{
        zIndex,
        left: left || 0,
        top: top || 0,
        width: width || 0,
        height: height || 0
      }}
    >
      <div />
    </div>
  );
};
