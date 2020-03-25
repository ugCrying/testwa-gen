import React from 'react';
import { Button, Tooltip } from 'antd';
import { ipcRenderer } from 'electron';

// @ts-ignore
import styles from '../Inspector.css';

const DeviceControl = (props) => {
  return (
    <div className={styles['control-wrap']}>
      <div className={styles['control-space']} />
      <div className={styles['control-container']}>
        <div className={styles['control-bar']}>
          <Tooltip title="关闭窗口">
            <Button
              onClick={() => {
                ipcRenderer.send('close');
              }}
            >
              <img
                // @ts-ignore
                src={require(`../../../../../static/images/close.svg`)}
                alt=""
              />
            </Button>
            </Tooltip>
          <Tooltip title="最小化窗口">
            <Button
              onClick={() => {
                ipcRenderer.send('min');
              }}
            >
              <img
                // @ts-ignore
                src={require(`../../../../../static/images/min.svg`)}
                alt=""
              />
            </Button>
          </Tooltip>
          <Tooltip title="返回上一级">
            <Button
              onClick={props.goBack}
            >
              <img
                className={styles['reply-button']}
                // @ts-ignore
                src={require(`../../../../../static/images/reply.svg`)}
                alt=""
              />
            </Button>
          </Tooltip>
          <Tooltip title="回到桌面">
            <Button
              onClick={props.home}
            >
              <img
                // @ts-ignore
                src={require('../../../../../static/images/home.svg')}
                alt=""
              />
            </Button>
          </Tooltip>
          <Tooltip title="任务列表">
            <Button
              onClick={props.task}
            >
              <img
                // @ts-ignore
                src={require(`../../../../../static/images/menu.svg`)}
                alt=""
              />
            </Button>
          </Tooltip>
          <Tooltip title="刷新UI树">
            <Button
              onClick={props.refreshUI}
            >
              <img
                // @ts-ignore
                src={require(`../../../../../static/images/refresh.svg`)}
                alt=""
              />
            </Button>
          </Tooltip>
        </div>
        <div className={styles['control-container-space']} />
      </div>
    </div>
  )
}

export default DeviceControl