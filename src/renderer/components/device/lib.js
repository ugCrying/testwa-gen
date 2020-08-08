/**
 * 录制辅助方法
 */

import XPath from "xpath";
import xpath from 'xpath';
import { DOMParser as DOMParser2 } from 'xmldom';

/**
 * xml 转 json
 * @param {*} source 
 * @return {string}
 */
export const xmlToJSON = source => {
  console.log("xml 转 json");
  let xmlDoc;
  let recursive = (xmlNode, parentPath, index) => {
    // Translate attributes array to an object
    let attrObject = {};
    for (let attribute of xmlNode.attributes || []) {
      attrObject[attribute.name] = attribute.value;
    }

    // Dot Separated path of indices
    let path =
      index !== undefined && `${!parentPath ? "" : parentPath + "."}${index}`;

    return {
      children: [...xmlNode.children].map((childNode, childIndex) =>
        recursive(childNode, path, childIndex)
      ),
      tagName: xmlNode.tagName === "node" ? attrObject.class : xmlNode.tagName,
      attributes: attrObject,
      xpath: getOptimalXPath(xmlDoc, xmlNode, [
        "name",
        "content-desc",
        "id",
        "accessibility-id"
      ]),
      path
    };
  };
  xmlDoc = new DOMParser().parseFromString(source, "text/xml");
  let sourceXML = xmlDoc.children[0];
  return recursive(sourceXML);
};

/**
 * 获取元素最佳 XPath 定位方式
 * Get an optimal XPath for a DOMNode
 * @param {*} domNode {DOMNode}
 * @param {string[]} uniqueAttributes Attributes we know are unique (defaults to just 'id')
 * @return {string} 元素 XPath 路径
 */
function getOptimalXPath(doc, domNode, uniqueAttributes = ["id"]) {
  try {
    // BASE CASE #1: If this isn't an element, we're above the root, return empty string
    if (!domNode.tagName || domNode.nodeType !== 1) {
      return "";
    }
    let domClass;
    for (let attribute of domNode.attributes || []) {
      if (attribute.name === "class") {
        domClass = attribute.value;
        break;
      }
    }
    // BASE CASE #2: If this node has a unique attribute, return an absolute XPath with that attribute
    for (let attrName of uniqueAttributes) {
      const attrValue = domNode.getAttribute(attrName);
      if (attrValue) {
        let xpath = `//${(domNode.tagName === "node"
          ? domClass
          : domNode.tagName) || "*"}[@${attrName}="${attrValue}"]`;
        let othersWithAttr;

        // If the XPath does not parse, move to the next unique attribute
        try {
          othersWithAttr = XPath.select(xpath, doc);
        } catch (ign) {
          continue;
        }

        // If the attribute isn't actually unique, get it's index too
        if (othersWithAttr.length > 1) {
          let index = othersWithAttr.indexOf(domNode);
          xpath = `(${xpath})[${index + 1}]`;
        }
        return xpath;
      }
    }

    // Get the relative xpath of this node using tagName
    let xpath = `/${domNode.tagName === "node" ? domClass : domNode.tagName}`;

    // If this node has siblings of the same tagName, get the index of this node
    if (domNode.parentNode) {
      // Get the siblings
      const childNodes = [...domNode.parentNode.childNodes].filter(
        childNode =>
          childNode.nodeType === 1 && childNode.tagName === domNode.tagName
      );

      // If there's more than one sibling, append the index
      if (childNodes.length > 1) {
        let index = childNodes.indexOf(domNode);
        xpath += `[${index + 1}]`;
      }
    }

    // Make a recursive call to this nodes parents and prepend it to this xpath
    return getOptimalXPath(doc, domNode.parentNode, uniqueAttributes) + xpath;
  } catch (ign) {
    // If there's an unexpected exception, abort and don't get an XPath
    return null;
  }
}

/**
 * 判断定位出的元素是否唯一
 * 比如当用 className 定位元素时可能定位出多个元素
 * @param {*} attrName 
 * @param {*} attrValue 
 * @param {*} sourceXML 
 * @return {Boolean}
 */
export function isUnique(attrName, attrValue, sourceXML) {
  // If no sourceXML provided, assume it's unique
  if (!sourceXML) {
    return true;
  }
  const doc = new DOMParser2().parseFromString(sourceXML);
  return xpath.select(`//*[@${attrName}="${attrValue}"]`, doc).length < 2;
}

// 元素唯一标识符计数器
// TODO: 改为闭包实现
let elVariableCounter = 0;
/**
 * 返回选中的元素在页面中的位置、定位方式等信息
 * @param {*} element 选中的元素
 * @param {*} sourceXML 选中的元素所属的 sourceXML
 * @return {{ variableName: string, strategy: string, selector: string}}
 */
export const getRecordedActions = (element, sourceXML) => {
  console.log("获取操作行为");
  const { attributes, xpath } = element;
  // TODO: appium 还提供了更多方式进行元素定位
  // TODO: appium 有专门针对 IOS 于 Android 的优化定位方式
  const STRATEGY_MAPPINGS = [
    ["name", "accessibility id"],
    ["content-desc", "accessibility id"],
    ["id", "id"],
    ["rntestid", "id"],
    ["resource-id", "id"]
  ];

  // TODO: 是否可以采用多选择器并行定位？
  for (let [strategyAlias, strategy] of STRATEGY_MAPPINGS) {
    const value = attributes[strategyAlias];
    if (value && isUnique(strategyAlias, value, sourceXML)) {
      return {
        variableName: `el${elVariableCounter++}`,
        // variableType: "string",
        strategy,
        selector: attributes[strategyAlias]
      };
    }
  }
  // doc: 代表最后才选择用 xpath 这种低效率方式获取元素？
  return {
    variableName: `el${elVariableCounter++}`,
    // variableType: "string",
    strategy: "xpath",
    selector: xpath
  };
};

/**
 * 格式化坐标？
 * @param {*} element 
 * @return {Object} 要高亮元素的绝对坐标？
 */
export function parseCoordinates(element) {
  // @ts-ignore
  let { bounds, x, y, width, height } = element.attributes || {};

  if (bounds) {
    let boundsArray = bounds.split(/\[|\]|,/).filter(str => str !== "");
    return {
      x1: boundsArray[0],
      y1: boundsArray[1],
      x2: boundsArray[2],
      y2: boundsArray[3]
    };
  } else if (x) {
    x = parseInt(x, 10);
    y = parseInt(y, 10);
    width = parseInt(width, 10);
    height = parseInt(height, 10);
    return { x1: x, y1: y, x2: x + width, y2: y + height };
  } else {
    return {};
  }
}
