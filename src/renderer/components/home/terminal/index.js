/**
 * 日志
 */
// @ts-ignore
import styles from '../devices.layout.css';
import React, { Component } from 'react';
import AnsiConverter from 'ansi-to-html';
import { ipcRenderer } from 'electron';
import { emitter } from '../../../lib';
const convert = new AnsiConverter({ fg: '#bbb', bg: '#222' });

export default class Terminal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      logLines: [],
    };
    emitter.on('clearLog', () => this.setState({ logLines: [] }));
    ipcRenderer.on('log', (_, log) => {
      this.setState({ logLines: [...this.state.logLines, log] });
    });
  }
  
  componentWillUnmount() {
    ipcRenderer.removeAllListeners('log');
  }
  
  render() {
    return (
      <div id={styles['terminal-log-list']}>
        {this.state.logLines.slice(this.state.logLines.length - 200).map((line, i) => {
          let container = document.getElementById(styles['terminal-log-list']);
          container.scrollTop = container.scrollHeight;
          return (
            <div key={i}>
              <span dangerouslySetInnerHTML={{ __html: convert.toHtml(line) }} />
            </div>
          );
        })}
      </div>
    );
  }
}
