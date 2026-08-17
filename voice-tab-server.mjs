import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';

const execFileP = promisify(execFile);
const PORT = process.env.VOICE_TAB_PORT || 3456;
const ENV_PATH = new URL('./.env', import.meta.url).pathname.replace(/^\//, '');

async function listSapiVoices() {
  // Uses PowerShell to query installed SAPI voices and returns JSON array
  try {
    const ps = `Add-Type -AssemblyName System.Speech; $s=(New-Object System.Speech.Synthesis.SpeechSynthesizer); $s.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name } | ConvertTo-Json`;
    const { stdout } = await execFileP('powershell.exe', ['-NoProfile', '-Command', ps], { maxBuffer: 10 * 1024 * 1024 });
    const trimmed = stdout.trim();
    if (!trimmed) return [];
    try { return JSON.parse(trimmed); } catch (e) { return []; }
  } catch (e) {
    return [];
  }
}

async function setEnvValue(key, value) {
  const path = ENV_PATH;
  try {
    let content = '';
    try { content = await readFile(path, 'utf8'); } catch { content = '' }
    const lines = content.split(/\r?\n/);
    const keyLine = `${key}=`;
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(keyLine) || lines[i].startsWith(`${key}="`) ) { lines[i] = `${key}=${JSON.stringify(value)}`; found = true; break; }
    }
    if (!found) lines.push(`${key}=${JSON.stringify(value)}`);
    await writeFile(path, lines.join('\n'), 'utf8');
    return true;
  } catch (e) {
    return false;
  }
}

function htmlPage() {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Ella Voice Tab</title>
<style>
body{font-family:Segoe UI,Arial;max-width:800px;margin:20px}
.tabs{display:flex;gap:8px;margin-bottom:12px}
.tab{padding:8px 12px;border:1px solid #ccc;border-bottom:none;border-radius:6px 6px 0 0;background:#f5f5f5}
.tab.active{background:#fff;font-weight:600}
.panel{border:1px solid #ccc;padding:12px;border-radius:0 6px 6px 6px;background:#fff}
button{padding:8px 12px}
select{min-width:300px;padding:6px}
</style>
</head>
<body>
  <h2>Ella — Voice Settings (Tab)</h2>
  <div class="tabs"><div class="tab active">Voices</div></div>
  <div class="panel">
    <p>Select a SAPI voice for Ella (Windows only). Click Save to update the project's .env and the current session if Ella is restarted with env loaded.</p>
    <div>
      <label for="voices">Installed voices:</label>
      <br/>
      <select id="voices"></select>
    </div>
    <div style="margin-top:12px">
      <button id="refresh">Refresh</button>
      <button id="save">Save and Set</button>
      <span id="status" style="margin-left:12px"></span>
    </div>
  </div>
<script>
async function fetchVoices(){
  const res = await fetch('/voices');
  const list = await res.json();
  const sel = document.getElementById('voices');
  sel.innerHTML = '';
  if(!list || list.length===0){ const opt=document.createElement('option'); opt.text='(no voices found)'; sel.add(opt); return }
  list.forEach(v=>{ const opt=document.createElement('option'); opt.value=v; opt.text=v; sel.add(opt); });
}
document.getElementById('refresh').addEventListener('click', ()=>{ fetchVoices(); document.getElementById('status').textContent=''; });
document.getElementById('save').addEventListener('click', async ()=>{
  const sel = document.getElementById('voices');
  const voice = sel.value;
  document.getElementById('status').textContent='Saving...';
  const res = await fetch('/set-voice', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({voice}) });
  const txt = await res.text();
  document.getElementById('status').textContent = txt;
});
fetchVoices();
</script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(htmlPage());
    return;
  }
  if (req.method === 'GET' && req.url === '/voices') {
    const voices = await listSapiVoices();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(voices));
    return;
  }
  if (req.method === 'POST' && req.url === '/set-voice') {
    let body = '';
    req.on('data', (c) => body += c);
    req.on('end', async () => {
      try {
        const obj = JSON.parse(body || '{}');
        const voice = obj.voice;
        if (!voice) { res.writeHead(400); res.end('Missing voice'); return; }
        const ok = await setEnvValue('SAPI_VOICE', voice);
        if (ok) res.end('Saved'); else { res.writeHead(500); res.end('Failed'); }
      } catch (e) { res.writeHead(500); res.end('Error'); }
    });
    return;
  }
  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, () => console.log(`Voice tab server running at http://localhost:${PORT}/`));

console.log('Run this script and open the URL to change SAPI voice.');
