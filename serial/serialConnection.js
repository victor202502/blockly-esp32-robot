import { log } from '../ui/uiHelpers.js';
import { generateCommands } from '../generators/udpGenerator.js';

// ============================================================
// SERIAL CONNECTION
// Funciona en dos modos detectados automáticamente:
//   - Electron → usa window.serialAPI (Node serialport via IPC)
//   - Browser  → usa navigator.serial (WebSerial API)
// El resto del código (enviarAPi, detenerRobot) es idéntico en ambos.
// ============================================================

const IS_ELECTRON = typeof window !== 'undefined' && window.isElectron === true;

let runAbortado = false;

// ── ABSTRACCIÓN: misma interfaz para Electron y WebSerial ────
const serial = {
  _write: null,   // función (line: string) => Promise

  async connect() {
    if (IS_ELECTRON) return _connectElectron();
    else             return _connectWebSerial();
  },
  async disconnect() {
    if (IS_ELECTRON) return _disconnectElectron();
    else             return _disconnectWebSerial();
  },
  async write(line) {
    if (!this._write) throw new Error('No conectado');
    return this._write(line);
  },
  get connected() {
    return this._write !== null;
  }
};

// ── ELECTRON ─────────────────────────────────────────────────
async function _connectElectron() {
  const ports = await window.serialAPI.list();
  if (ports.length === 0) throw new Error('No se encontraron puertos serie');

  // Filtrar solo puertos USB reales (no Bluetooth)
  const usbPorts = ports.filter(p =>
    p.path.startsWith('COM') || p.path.includes('ttyUSB') || p.path.includes('ttyACM')
  );

  // Si hay más de uno, mostrar selector; si solo hay uno, conectar directo
  let chosen;
  if (usbPorts.length === 1) {
    chosen = usbPorts[0].path;
  } else {
    // Crear diálogo simple de selección
    chosen = await _showPortPicker(usbPorts.length > 0 ? usbPorts : ports);
    if (!chosen) throw new Error('Cancelado');
  }

  await window.serialAPI.open(chosen);
  serial._write = (line) => window.serialAPI.write(line);

  // Escuchar datos entrantes
  window.serialAPI.onData(_handleLine);
  window.serialAPI.onError(msg => log('Serial error: ' + msg, 'error'));
  window.serialAPI.onClose(() => {
    serial._write = null;
    _setUI(false);
    log('Puerto cerrado.', 'warn');
  });

  _setUI(true, chosen);
  log(`✓ Conectado a ${chosen}`, 'success');
}

async function _disconnectElectron() {
  window.serialAPI.removeAllListeners();
  await window.serialAPI.close();
  serial._write = null;
  _setUI(false);
  log('Desconectado.', 'warn');
}

// Selector de puerto (solo Electron, cuando hay varios)
function _showPortPicker(ports) {
  return new Promise(resolve => {
    // Crear overlay simple
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position:fixed;inset:0;background:rgba(0,0,0,0.7);
      display:flex;align-items:center;justify-content:center;z-index:9999`;

    const box = document.createElement('div');
    box.style.cssText = `
      background:#1a1a2e;border:1px solid #333;border-radius:12px;
      padding:24px;min-width:280px;font-family:Nunito,sans-serif`;

    box.innerHTML = `
      <div style="color:#cdd9e5;font-weight:700;font-size:1em;margin-bottom:16px">
        Seleccionar puerto
      </div>`;

    ports.forEach(p => {
      const btn = document.createElement('button');
      btn.textContent = `${p.path}${p.manufacturer ? '  —  ' + p.manufacturer : ''}`;
      btn.style.cssText = `
        display:block;width:100%;margin-bottom:8px;padding:10px 14px;
        background:#252540;border:1px solid #444;border-radius:8px;
        color:#cdd9e5;font-size:0.9em;cursor:pointer;text-align:left`;
      btn.onmouseenter = () => btn.style.background = '#353560';
      btn.onmouseleave = () => btn.style.background = '#252540';
      btn.onclick = () => { document.body.removeChild(overlay); resolve(p.path); };
      box.appendChild(btn);
    });

    const cancel = document.createElement('button');
    cancel.textContent = 'Cancelar';
    cancel.style.cssText = `
      display:block;width:100%;padding:8px;margin-top:4px;
      background:transparent;border:1px solid #555;border-radius:8px;
      color:#888;font-size:0.85em;cursor:pointer`;
    cancel.onclick = () => { document.body.removeChild(overlay); resolve(null); };
    box.appendChild(cancel);

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
}

// ── WEBSERIAL (browser) ───────────────────────────────────────
let _wsPort   = null;
let _wsWriter = null;
let _wsLineBuf = '';

async function _connectWebSerial() {
  if (!('serial' in navigator)) {
    throw new Error('WebSerial no soportado. Usa Chrome o Edge.');
  }
  _wsPort = await navigator.serial.requestPort();
  await _wsPort.open({ baudRate: 115200 });

  const enc = new TextEncoderStream();
  enc.readable.pipeTo(_wsPort.writable);
  _wsWriter = enc.writable.getWriter();

  const dec = new TextDecoderStream();
  _wsPort.readable.pipeTo(dec.writable);
  _wsReadLoop(dec.readable.getReader());

  serial._write = (line) => {
    return _wsWriter.write(line + '\n');
  };

  _setUI(true, 'Wemos');
  log('✓ Wemos conectado', 'success');
}

async function _disconnectWebSerial() {
  try { if (_wsWriter) { await _wsWriter.close(); _wsWriter = null; } } catch(_) {}
  try { if (_wsPort)   { await _wsPort.close();   _wsPort   = null; } } catch(_) {}
  serial._write = null;
  _setUI(false);
  log('Desconectado.', 'warn');
}

function _wsReadLoop(reader) {
  (async () => {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        _wsLineBuf += value;
        let nl;
        while ((nl = _wsLineBuf.indexOf('\n')) !== -1) {
          const line = _wsLineBuf.slice(0, nl).trim();
          _wsLineBuf = _wsLineBuf.slice(nl + 1);
          if (line) _handleLine(line);
        }
      }
    } catch(_) {}
  })();
}

// ── HANDLER COMÚN ────────────────────────────────────────────
function _handleLine(line) {
  if (line.startsWith('WEMOS:')) {
    const msg = line.slice(6);
    if (msg.startsWith('WIFI_OK:'))   log('✓ WiFi: ' + msg.slice(8), 'success');
   else if (msg === 'READY') {
      _telemSet('tWemos', 'Bridge OK', '#58A6FF');
      // <-- NUEVO: Despertar al ESP32 para que empiece a enviar telemetría ya
      serial.write('PING'); 
    }
    else if (msg === 'WIFI_LOST')     log('⚠ WiFi perdido', 'warn');
    else if (msg.startsWith('SENT:')) document.getElementById('tCmd').textContent = msg.slice(5);
    return;
  }
  if (line.startsWith('ESP32:')) {
    const rest  = line.slice(6);
    const colon = rest.indexOf(':');
    if (colon === -1) return;
    _handleTelem(rest.slice(0, colon).toUpperCase(), rest.slice(colon + 1));
    return;
  }
  log('[Serial] ' + line, 'sys');
}

function _handleTelem(type, value) {
  switch (type) {
    case 'STATUS': {
      const ok = value === 'DONE' || value === 'IDLE';
      _telemSet('tStatus', value, ok ? '#3FB950' : '#58A6FF');
      break;
    }
    case 'ENC': {
      const [a, b] = value.split(',');
      document.getElementById('tEncA').textContent = a ?? '—';
      document.getElementById('tEncB').textContent = b ?? '—';
      break;
    }
    case 'COLOR': {
      // El ESP32 envía: R,G,B,Nombre (Ej: 255,50,10,Rojo)
      const parts = value.split(',');
      if (parts.length >= 4) {
        const r = parts[0];
        const g = parts[1];
        const b = parts[2];
        const name = parts[3]; // El nombre calibrado (Rojo, Azul, etc.)

        const elText = document.getElementById('tColorText');
        const elBox = document.getElementById('tColorBox');
        
        if (elText) {
          elText.textContent = name;
          // Pintar la palabra de un color llamativo, o dejarla por defecto
          elText.style.color = '#cdd9e5'; 
        }
        if (elBox) {
          // Cambiamos el color de fondo del cuadradito en el HTML
          elBox.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        }
      }
      break;
    }
    case 'WARN': log('⚠ ESP32: ' + value, 'warn'); break;
    case 'CMD':  document.getElementById('tCmd').textContent = value; break;
  }
}

// ── EXPORTS PÚBLICOS ─────────────────────────────────────────
export async function conectarSerial() {
  if (serial.connected) {
    await serial.disconnect();
    return;
  }
  try {
    await serial.connect();
  } catch(e) {
    log('Error: ' + (e.message || e), 'error');
  }
}

export async function desconectarSerial() {
  await serial.disconnect();
}

export async function serialSend(line) {
  await serial.write(line);
}

export async function enviarAPi() {
  if (!serial.connected) { log('Conecta primero el Wemos.', 'warn'); return; }

  const cmds = generateCommands();
  if (cmds.length === 0) { log('No hay comandos. Añade bloques.', 'warn'); return; }

  runAbortado = false;
  log(`▶ Enviando programa (${cmds.length} líneas)…`, 'success');

  await serial.write('STOP');
  await new Promise(r => setTimeout(r, 150));

  for (const cmd of cmds) {
    if (runAbortado) { log('⛔ Cancelado.', 'warn'); return; }
    try {
      await serial.write(cmd);
      await new Promise(r => setTimeout(r, 10));
    } catch(e) {
      log('Error: ' + e, 'error'); return;
    }
  }
  log('✓ Programa enviado. Ejecutando en robot…', 'success');
}

export async function detenerRobot() {
  runAbortado = true;
  try {
    await serial.write('STOP');
    log('■ STOP enviado.', 'warn');
  } catch(_) {}
}

// ── UI ───────────────────────────────────────────────────────
function _setUI(connected, portName = '') {
  document.getElementById('btnConnect').innerHTML = connected
    ? `<div class="conn-dot connected"></div> ${portName || 'Disconnect'}`
    : '<div class="conn-dot"></div> Connect Wemos';
  const bt = document.getElementById('btStatusText');
  bt.textContent = connected ? `Connected (${portName})` : 'Disconnected';
  bt.style.color  = connected ? '#3FB950' : '#555';
  _telemSet('tWemos', connected ? 'Connected' : '—', connected ? '#3FB950' : '#555');
}

function _telemSet(id, text, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color  = color;
}
