// ============================================================
// UI HELPERS & TABS
// ============================================================

export function switchTab(tab) {
  document.querySelectorAll('.side-tab').forEach((t,i) => t.classList.toggle('active', (i===0&&tab==='code')||(i===1&&tab==='console')));
  document.querySelectorAll('.side-content').forEach(c => c.classList.remove('active'));
  document.getElementById('tab-'+tab).classList.add('active');
}

export function clearConsole() { 
  document.getElementById('mainConsole').innerHTML = ''; 
}

export function log(msg, type='sys') {
  const con = document.getElementById('mainConsole');
  const div = document.createElement('div');
  div.className = 'console-line ' + type;
  const ts = new Date().toLocaleTimeString('en',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'});
  div.innerHTML = `<span style="color:#444">[${ts}]</span> ${String(msg).replace(/</g,'&lt;').replace(/>/g,'&gt;')}`;
  con.appendChild(div);
  con.scrollTop = con.scrollHeight;
}