import './blocks/blockDefinitions.js';
import { initWorkspace, getWorkspace } from './blockly/workspace.js';
import { generateCode, highlightCommands } from './generators/codeRenderer.js';
import { switchTab, clearConsole, log } from './ui/uiHelpers.js';
import { conectarSerial, enviarAPi, detenerRobot } from './serial/serialConnection.js';

// ── WORKSPACE ────────────────────────────────────────────────
const workspace = initWorkspace('blocklyDiv');

function updateCode() {
  const text = generateCode();
  document.getElementById('pythonCode').innerHTML = highlightCommands(text);
  document.getElementById('blockCount').textContent = workspace.getAllBlocks().length;
}

workspace.addChangeListener(e => {
  if (e.type !== Blockly.Events.UI && e.type !== Blockly.Events.VIEWPORT_CHANGE) {
    updateCode();
  }
});

updateCode();
window.addEventListener('resize', () => Blockly.svgResize(workspace));

// ── WINDOW EXPORTS (onclick en HTML) ─────────────────────────
window.switchTab      = switchTab;
window.clearConsole   = clearConsole;
window.conectarSerial = conectarSerial;
window.enviarAPi      = enviarAPi;
window.detenerRobot   = detenerRobot;

// Save / Load / sendConsoleCmd — sin cambios de lógica
window.saveProject = function () {
  const xml  = Blockly.Xml.workspaceToDom(workspace);
  const text = Blockly.Xml.domToText(xml);
  const blob = new Blob([text], { type: 'text/xml' });
  const a    = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob), download: 'robot_project.xml'
  });
  a.click();
};

window.loadProject = function (event) {
  const file   = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const xml = Blockly.utils.xml.textToDom(e.target.result);
      Blockly.Xml.clearWorkspaceAndLoadFromXml(xml, workspace);
      log('✓ Proyecto cargado', 'success');
    } catch (err) {
      log('Error al cargar: ' + err, 'error');
    }
  };
  reader.readAsText(file);
};

window.sendConsoleCmd = async function () {
  const input = document.getElementById('consoleInput');
  const cmd   = input.value.trim();
  if (!cmd) return;
  input.value = '';
  log('> ' + cmd, 'info');
  try {
    const { serialSend } = await import('./serial/serialConnection.js');
    await serialSend(cmd);
  } catch (e) {
    log('Error: ' + e, 'error');
  }
};

log('Robot Controller listo.', 'success');
