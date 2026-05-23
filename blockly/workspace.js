import { toolboxXml } from './toolbox.js';

let workspace = null;

export function initWorkspace(containerId) {
  workspace = Blockly.inject(containerId, {
    toolbox: toolboxXml,
    renderer: 'zelos',
    zoom: { controls: true, wheel: true, startScale: 0.9 },
    trashcan: true
  });
  return workspace;
}

export function getWorkspace() {
  return workspace;
}