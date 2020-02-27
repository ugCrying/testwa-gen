/**
 * 设备列表
 */
// @ts-ignore
import styles from "../deviceList/deviceList.css";
import React from "react";
import { onSelectDevice } from "../lib";
import { connect } from "dva";

const DeviceList = props => {
  return (
    <div className={styles["equipment-list"]}>
      {props.record.devices.length === 0 ? (
        <div className={styles["equipment-item"]}>
          <div className={styles["equipment-item-svg"]}>
            <img
              className={styles["none-equipment"]}
              // @ts-ignore
              src={require(`../../../../../static/images/none_equipment.svg`)}
              alt=""
            />
          </div>
          <div className={styles["equipment-item-brand"]}>
            <p>无设备连接</p>
          </div>
        </div>
      ) : (
        props.record.devices.map((device, index) => {
          return (
            <div
              className={styles["equipment-item"]}
              key={index}
              onClick={() => {
                if (!device.screen) {
                  alert("不支持的设备");
                  return;
                }
                onSelectDevice(device);
                props.onSelectDevice(device);
              }}
            >
              <div className={styles["equipment-item-img"]}>
                <img
                  // @ts-ignore
                  src={require(`../../../../../static/images/equipment.jpg`)}
                  alt=""
                />
              </div>
              <div className={styles["equipment-item-brand"]}>
                {device.type === "device" ? (
                  <p>{device.model}</p>
                ) : (
                  <p title={"设备已离线，请重新打开USB调试"}>
                    设备已离线，请重新打开USB调试
                  </p>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default connect(state => state)(DeviceList);
