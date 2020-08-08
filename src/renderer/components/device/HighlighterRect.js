/**
 * xml 元素高亮
 */
import React from 'react'
import { ipcRenderer } from 'electron'
import { getRecordedActions, parseCoordinates } from './lib'
import { emitter } from '../../lib'
import { sourceXML } from '.'
// @ts-ignore
import styles from './Inspector.css'

export default ({
  selectedElement,
  element,
  zIndex,
  ratio,
  record,
  text,
  textId,
  clearText,
  updateLastActionTime,
  lastActionTime,
}) => {
  const {
    x1, y1, x2, y2,
  } = parseCoordinates(element)
  const left = (x1 / ratio) || 0
  const top = (y1 / ratio) || 0
  const width = ((x2 - x1) / ratio) * 0.97
  const height = ((y2 - y1) / ratio) * 0.97
  let timer
  return (
    <div
      className={
        selectedElement.path === element.path && record
          ? `${styles['highlighter-box']} ${styles['hovered-element-box']}`
          : styles['highlighter-box']
      }
      onClick={() => {
        if (!record) return
        if (text) {
          const { variableName } = getRecordedActions(element, sourceXML)
          ipcRenderer.send(
            'sendKeys', [
              {
                action: 'findAndAssign',
                params: ['id', textId, `keys${variableName}`],
              },
              {
                action: 'sendKeys',
                params: [`keys${variableName}`, '', text],
              },
            ])
        }
        clearText()
        updateLastActionTime()
        const { variableName, strategy, selector } = getRecordedActions(
          element, sourceXML,
        )
        const currentActionTime = (new Date()).getTime()
        lastActionTime = lastActionTime || currentActionTime
        ipcRenderer.send(
          'recordedActions',
          [
            {
              action: 'sleep',
              params: [currentActionTime - lastActionTime],
            },
            {
              action: 'findAndAssign',
              params: [strategy, selector, variableName],
            },
            {
              action: 'click',
              params: [variableName],
            },
          ],
        )
        lastActionTime = (new Date()).getTime()
      }}
      onMouseOver={() => {
        timer = setTimeout(() => {
          emitter.emit('selectedElement', element)
          ipcRenderer.send(
            'selectedElement',
            element,
          )
          const expandedPaths = []
          const pathArr = element.path
            .split('.')
            .slice(0, element.path.length - 1)
          while (pathArr.length > 1) {
            pathArr.splice(pathArr.length - 1)
            const path = pathArr.join('.')
            expandedPaths.push(path)
          }
          emitter.emit('expandedPaths', expandedPaths)
          ipcRenderer.send(
            'expandedPaths',
            expandedPaths,
          )
        }, 300)
      }}
      onMouseOut={() => {
        clearTimeout(timer)
        timer = null
      }}
      key={element.path}
      style={{
        top,
        left,
        zIndex,
        width,
        height,
      }}
    >
      <div />
    </div>
  )
}
