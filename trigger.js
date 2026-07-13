// CLI trigger for the upload bridge (what the agent calls via Bash).
// Usage: node trigger.js "<absolute file path>" "<target hint, e.g. Resume>"
const http = require('http');

const [, , file, target, targetUrl] = process.argv;
if (!file) { console.error('usage: node trigger.js "<file>" "<target hint>" ["<target url substring>"]'); process.exit(2); }

const body = JSON.stringify({ file, target: target || 'unspecified', targetUrl: targetUrl || undefined });
const req = http.request(
  { host: '127.0.0.1', port: 8765, path: '/trigger', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 130000 },
  (res) => {
    let out = '';
    res.on('data', (c) => (out += c));
    res.on('end', () => { console.log(`${res.statusCode}: ${out}`); process.exit(res.statusCode === 200 ? 0 : 1); });
  }
);
req.on('error', (e) => { console.error('bridge unreachable: ' + e.message); process.exit(1); });
req.write(body); req.end();
