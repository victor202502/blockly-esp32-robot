import { log } from '../ui/uiHelpers.js';
import { generateCommands } from '../generators/udpGenerator.js';
 
// ============================================================
// SERIAL CONNECTION (Serielle Verbindungsschnittstelle)
// ============================================================
const IS_ELECTRON = typeof window !== 'undefined' && window.isElectron === true;
 
let runAbortado = false;
 
const serial = {
  _write: null,
  async connect() {
    if (IS_ELECTRON) return _connectElectron();
    else             return _connectWebSerial();
  },
  async disconnect() {
    if (IS_ELECTRON) return _disconnectElectron();
    else             return _disconnectWebSerial();
  },
  async write(line) {
    if (!this._write) throw new Error('Nicht verbunden');
    return this._write(line);
  },
  get connected() {
    return this._write !== null;
  }
};
 
// ── ELECTRON IMPLEMENTIERUNG ─────────────────────────────────
 
async function _connectElectron() {
  const ports = await window.serialAPI.list();
  if (ports.length === 0) throw new Error('Keine seriellen Ports gefunden');
 
  const usbPorts = ports.filter(p =>
    p.path.startsWith('COM') || p.path.includes('ttyUSB') || p.path.includes('ttyACM')
  );
 
  let chosen;
  if (usbPorts.length === 1) {
    chosen = usbPorts[0].path;
  } else {
    chosen = await _showPortPicker(usbPorts.length > 0 ? usbPorts : ports);
    if (!chosen) throw new Error('Abgebrochen');
  }
 
  await window.serialAPI.open(chosen);
  serial._write = (line) => window.serialAPI.write(line);
 
  window.serialAPI.onData(_handleLine);
  window.serialAPI.onError(msg => log('Serial Fehler: ' + msg, 'error'));
  window.serialAPI.onClose(() => {
    serial._write = null;
    _setUI(false);
    log('Port geschlossen.', 'warn');
  });
 
  _setUI(true, chosen);
  log(`✓ Verbunden mit ${chosen}`, 'success');
}
 
async function _disconnectElectron() {
  window.serialAPI.removeAllListeners();
  await window.serialAPI.close();
  serial._write = null;
  _setUI(false);
  log('Getrennt.', 'warn');
}
 
function _showPortPicker(ports) {
  return new Promise(resolve => {
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
        Port auswählen
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
    cancel.textContent = 'Abbrechen';
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
 
// ── WEBSERIAL IMPLEMENTIERUNG (Browser) ──────────────────────
 
let _wsPort    = null;
let _wsWriter  = null;
let _wsLineBuf = '';
 
async function _connectWebSerial() {
  if (!('serial' in navigator)) {
    throw new Error('WebSerial wird nicht unterstützt. Bitte nutze Chrome oder Edge.');
  }
  _wsPort = await navigator.serial.requestPort();
  await _wsPort.open({ baudRate: 115200 });
 
  const enc = new TextEncoderStream();
  enc.readable.pipeTo(_wsPort.writable);
  _wsWriter = enc.writable.getWriter();
 
  const dec = new TextDecoderStream();
  _wsPort.readable.pipeTo(dec.writable);
  _wsReadLoop(dec.readable.getReader());
 
  serial._write = (line) => _wsWriter.write(line + '\n');
 
  _setUI(true, 'Wemos');
  log('✓ Wemos (WebSerial) verbunden', 'success');
}
 
async function _disconnectWebSerial() {
  try { if (_wsWriter) { await _wsWriter.close(); _wsWriter = null; } } catch(_) {}
  try { if (_wsPort)   { await _wsPort.close();   _wsPort   = null; } } catch(_) {}
  serial._write = null;
  _setUI(false);
  log('Getrennt.', 'warn');
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
 
// ── GEMEINSAME HANDLER-LOGIK FÜR EINGEHENDE DATEN ────────────
 
function _handleLine(line) {
  if (line.startsWith('WEMOS:')) {
    const msg = line.slice(6);
    if (msg.startsWith('WIFI_OK:'))   log('✓ WiFi: ' + msg.slice(8), 'success');
    else if (msg === 'READY') {
      _telemSet('tWemos', 'Bridge OK', '#58A6FF');
      serial.write('PING');
    }
    else if (msg === 'WIFI_LOST')     log('⚠ WiFi verloren', 'warn');
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
 
/**
 * Aktualisiert die Telemetrie-Leiste im UI basierend auf dem Datentyp.
 */
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
      const parts = value.split(',');
      if (parts.length >= 4) {
        const [r, g, b, name] = parts;
        const elText = document.getElementById('tColorText');
        const elBox  = document.getElementById('tColorBox');
        if (elText) { elText.textContent = name; elText.style.color = '#cdd9e5'; }
        if (elBox)  { elBox.style.backgroundColor = `rgb(${r}, ${g}, ${b})`; }
      }
      break;
    }
 
    // ── DISTANCIA VL53L1X ──────────────────────────────────
    // Formato recibido: "DIST:1234"  (milímetros, entero)
    case 'DIST': {
      const el = document.getElementById('tDist');
      if (el) {
        const mm = parseInt(value, 10);
        if (!isNaN(mm) && mm > 0 && mm < 4000) {
          el.textContent  = mm;
          // Color visual: verde si hay espacio, naranja si está cerca, rojo si muy cerca
          el.style.color  = mm < 150  ? '#F85149'   // rojo  — obstáculo inmediato
                          : mm < 400  ? '#E3B341'   // naranja — precaución
                          :             '#3FB950';  // verde  — libre
        } else {
          el.textContent = '—';
          el.style.color = '#555';
        }
      }
      break;
    }
 
    case 'WARN':
      log('⚠ ESP32: ' + value, 'warn');
      break;
    case 'CMD':
      document.getElementById('tCmd').textContent = value;
      break;
  }
}
 
// ── ÖFFENTLICHE EXPORTS ──────────────────────────────────────
 
export async function conectarSerial() {
  if (serial.connected) {
    await serial.disconnect();
    return;
  }
  try {
    await serial.connect();
  } catch(e) {
    log('Fehler: ' + (e.message || e), 'error');
  }
}
 
export async function desconectarSerial() {
  await serial.disconnect();
}
 
export async function serialSend(line) {
  await serial.write(line);
}
 
export async function enviarAPi() {
  if (!serial.connected) { log('Verbinde zuerst den Wemos.', 'warn'); return; }
 
  const cmds = generateCommands();
  if (cmds.length === 0) { log('Keine Befehle vorhanden. Füge Blöcke hinzu.', 'warn'); return; }
 
  runAbortado = false;
  log(`▶ Sende Programm (${cmds.length} Zeilen)…`, 'success');
 
  await serial.write('STOP');
  await new Promise(r => setTimeout(r, 150));
 
  for (const cmd of cmds) {
    if (runAbortado) { log('⛔ Abgebrochen.', 'warn'); return; }
    try {
      await serial.write(cmd);
      await new Promise(r => setTimeout(r, 10));
    } catch(e) {
      log('Fehler beim Senden: ' + e, 'error'); return;
    }
  }
  log('✓ Programm gesendet. Roboter führt es aus…', 'success');
}
 
export async function detenerRobot() {
  runAbortado = true;
  try {
    await serial.write('STOP');
    log('■ STOP gesendet.', 'warn');
  } catch(_) {}
}
 
// ── INTERNE UI HILFSFUNKTIONEN ───────────────────────────────
 
function _setUI(connected, portName = '') {
  document.getElementById('btnConnect').innerHTML = connected
    ? `<div class="conn-dot connected"></div> ${portName || 'Trennen'}`
    : '<div class="conn-dot"></div> Connect Wemos';
 
  const bt = document.getElementById('btStatusText');
  bt.textContent = connected ? `Verbunden (${portName})` : 'Getrennt';
  bt.style.color  = connected ? '#3FB950' : '#555';
 
  _telemSet('tWemos', connected ? 'Verbunden' : '—', connected ? '#3FB950' : '#555');
}
 
function _telemSet(id, text, color) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.style.color  = color;
}