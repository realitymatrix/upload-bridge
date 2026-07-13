// Upload Bridge — local trusted-UI file-upload broker for agentic browser automation.
//
// Trust model (DO NOT weaken):
//  - The agent (Claude) may REQUEST an upload via POST /trigger (localhost only).
//  - Approval happens in a NATIVE Windows dialog rendered by this process,
//    showing the resolved file and target. Default button = Deny.
//  - Only after human approval are file bytes sent to the browser extension
//    over WebSocket (connections accepted from chrome-extension:// origins only).
//  - No skip-dialog flag. Ever. Every upload is logged to uploads.log.
//
// Security hardening:
//  - The dialog message is passed to PowerShell Base64-encoded, so file names
//    cannot inject PowerShell syntax (no string interpolation into the script).
//  - Approval dialogs are serialized: one at a time, in request order, so a
//    click can never land on the wrong request.
//  - Each request carries a requestId; the extension binds the target tab at
//    REQUEST time, so the file cannot land on a tab focused later.

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const { WebSocketServer } = require('ws');

const PORT = 8765;
const LOG = path.join(__dirname, 'uploads.log');

const MIME = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.txt': 'text/plain',
  '.rtf': 'application/rtf',
};

function log(line) {
  const entry = `[${new Date().toISOString()}] ${line}\n`;
  fs.appendFileSync(LOG, entry);
  console.log(entry.trim());
}

// ---- native approval dialog (trusted UI, default = Deny) ----
// The message travels as Base64 and is decoded inside PowerShell, so no
// content from the request (e.g. a hostile filename) is ever parsed as code.
function askHuman(filePath, sizeKb, targetHint) {
  return new Promise((resolve) => {
    // Windows 11 styled WPF/XAML dialog (dialog.ps1). Request data travels
    // Base64-encoded and is assigned to Text properties after XAML parsing,
    // so nothing user-controlled can inject PowerShell or XAML.
    const args = [
      '-NoProfile', '-STA', '-ExecutionPolicy', 'Bypass',
      '-File', path.join(__dirname, 'dialog.ps1'),
      '-f', Buffer.from(filePath, 'utf8').toString('base64'),
      '-s', `${sizeKb} KB`,
      '-t', Buffer.from(String(targetHint), 'utf8').toString('base64'),
    ];
    execFile('powershell.exe', args, { timeout: 120000 }, (err, stdout) => {
      if (err) return resolve({ approved: false, raw: 'dialog error: ' + err.message });
      resolve({ approved: stdout.trim() === 'Yes', raw: stdout.trim() });
    });
  });
}

// Serialize approval dialogs: one visible dialog at a time, FIFO.
let dialogQueue = Promise.resolve();
function askHumanQueued(filePath, sizeKb, targetHint) {
  const turn = dialogQueue.then(() => askHuman(filePath, sizeKb, targetHint));
  dialogQueue = turn.catch(() => {}); // keep the queue alive on errors
  return turn;
}

// ---- WebSocket server for the extension ----
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  log('extension connected');
  ws.on('close', () => clients.delete(ws));
});

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  for (const ws of clients) ws.send(payload);
}

// ---- HTTP server: /trigger (agent-facing) + /health ----
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, extensionConnected: clients.size > 0 }));
  }
  // One-pass form fill: text values only (no files), forwarded to the extension.
  // No native dialog: field values carry no file-exfiltration risk and are
  // human-approved upstream in the agent's confirmation flow. Logged for audit.
  if (req.method === 'POST' && req.url === '/fill') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { res.writeHead(400); return res.end('bad json'); }
      if (!Array.isArray(parsed.fields) || parsed.fields.length === 0) { res.writeHead(400); return res.end('fields[] required'); }
      if (clients.size === 0) { res.writeHead(503); return res.end('extension not connected'); }
      const requestId = crypto.randomUUID();
      log(`FILL ${requestId} ${parsed.fields.length} fields: ${parsed.fields.map((f) => f.label).join(' | ')}`);
      broadcast({ type: 'pending', requestId });
      setTimeout(() => broadcast({ type: 'fill', requestId, fields: parsed.fields }), 300);
      res.writeHead(200); res.end(`dispatched ${parsed.fields.length} fields`);
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/trigger') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', async () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { res.writeHead(400); return res.end('bad json'); }
      const { file, target } = parsed;
      if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end('file not found'); }
      const ext = path.extname(file).toLowerCase();
      if (!MIME[ext]) { res.writeHead(415); return res.end('unsupported file type'); }
      if (clients.size === 0) { res.writeHead(503); return res.end('extension not connected'); }

      const sizeKb = Math.round(fs.statSync(file).size / 1024);
      const targetHint = String(target || 'unspecified').slice(0, 100);
      const requestId = crypto.randomUUID();
      log(`REQUEST ${requestId} file="${file}" (${sizeKb} KB) target="${targetHint}"`);

      // Bind the destination tab NOW, before the human deliberates.
      broadcast({ type: 'pending', requestId });

      const { approved, raw } = await askHumanQueued(file, sizeKb, targetHint);
      if (!approved) {
        log(`DENIED  ${requestId} file="${file}" (${raw})`);
        broadcast({ type: 'cancelled', requestId });
        res.writeHead(403); return res.end('denied by human');
      }
      const b64 = fs.readFileSync(file).toString('base64');
      broadcast({
        type: 'inject',
        requestId,
        fileName: path.basename(file),
        mime: MIME[ext],
        b64,
        targetHint,
      });
      log(`APPROVED ${requestId} file="${file}" -> sent to ${clients.size} extension client(s)`);
      res.writeHead(200); res.end('approved and dispatched');
    });
    return;
  }
  res.writeHead(404); res.end();
});

// Only accept WS upgrades from browser extensions (web pages have http(s) origins).
server.on('upgrade', (req, socket, head) => {
  const origin = req.headers.origin || '';
  if (!origin.startsWith('chrome-extension://')) {
    log(`WS REJECTED origin="${origin}"`);
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

server.listen(PORT, '127.0.0.1', () => log(`upload-bridge listening on 127.0.0.1:${PORT}`));
