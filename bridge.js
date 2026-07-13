// Upload Bridge — local trusted-UI file-upload broker for agentic browser automation.
//
// Trust model (DO NOT weaken):
//  - The agent (Claude) may REQUEST an upload via POST /trigger (localhost only).
//  - Approval happens in a NATIVE Windows dialog rendered by this process,
//    showing the resolved file and target. Default button = Deny.
//  - Only after human approval are file bytes sent to the browser extension
//    over WebSocket (connections accepted from chrome-extension:// origins only).
//  - No skip-dialog flag. Ever. Every upload is logged to uploads.log.

const http = require('http');
const fs = require('fs');
const path = require('path');
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
function askHuman(filePath, sizeKb, targetHint, cb) {
  const msg = `An agent requests to upload a file to a web form.\n\nFile: ${filePath}\nSize: ${sizeKb} KB\nTarget field: ${targetHint}\n\nApprove this upload?`;
  const ps = [
    '-NoProfile', '-Command',
    `Add-Type -AssemblyName System.Windows.Forms; ` +
    `$r=[System.Windows.Forms.MessageBox]::Show(@'\n${msg.replace(/'/g, "''")}\n'@,'Upload Bridge - Human Approval Required',` +
    `[System.Windows.Forms.MessageBoxButtons]::YesNo,[System.Windows.Forms.MessageBoxIcon]::Warning,` +
    `[System.Windows.Forms.MessageBoxDefaultButton]::Button2); Write-Output $r`,
  ];
  execFile('powershell.exe', ps, { timeout: 120000 }, (err, stdout) => {
    if (err) return cb(false, 'dialog error: ' + err.message);
    cb(stdout.trim() === 'Yes', stdout.trim());
  });
}

// ---- WebSocket server for the extension ----
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();
wss.on('connection', (ws) => {
  clients.add(ws);
  log('extension connected');
  ws.on('close', () => clients.delete(ws));
});

// ---- HTTP server: /trigger (agent-facing) + /health ----
const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, extensionConnected: clients.size > 0 }));
  }
  if (req.method === 'POST' && req.url === '/trigger') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let parsed;
      try { parsed = JSON.parse(body); } catch { res.writeHead(400); return res.end('bad json'); }
      const { file, target } = parsed;
      if (!file || !fs.existsSync(file)) { res.writeHead(404); return res.end('file not found'); }
      const ext = path.extname(file).toLowerCase();
      if (!MIME[ext]) { res.writeHead(415); return res.end('unsupported file type'); }
      if (clients.size === 0) { res.writeHead(503); return res.end('extension not connected'); }

      const sizeKb = Math.round(fs.statSync(file).size / 1024);
      const targetHint = String(target || 'unspecified').slice(0, 100);
      log(`REQUEST file="${file}" (${sizeKb} KB) target="${targetHint}"`);

      askHuman(file, sizeKb, targetHint, (approved, raw) => {
        if (!approved) {
          log(`DENIED  file="${file}" (${raw})`);
          res.writeHead(403); return res.end('denied by human');
        }
        const b64 = fs.readFileSync(file).toString('base64');
        const payload = JSON.stringify({
          type: 'inject',
          fileName: path.basename(file),
          mime: MIME[ext],
          b64,
          targetHint,
        });
        for (const ws of clients) ws.send(payload);
        log(`APPROVED file="${file}" -> sent to ${clients.size} extension client(s)`);
        res.writeHead(200); res.end('approved and dispatched');
      });
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
