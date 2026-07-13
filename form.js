// CLI for the combined approval form.
// Usage: node form.js <spec.json>
// Prints the human's decisions as JSON: { cancelled, answers, files, dispatched }
const http = require('http');
const fs = require('fs');

const [, , specPath] = process.argv;
if (!specPath || !fs.existsSync(specPath)) { console.error('usage: node form.js <spec.json>'); process.exit(2); }

const body = fs.readFileSync(specPath, 'utf8');
JSON.parse(body); // validate

const req = http.request(
  { host: '127.0.0.1', port: 8765, path: '/form', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 610000 },
  (res) => {
    let out = '';
    res.on('data', (c) => (out += c));
    res.on('end', () => { console.log(out); process.exit(res.statusCode === 200 ? 0 : 1); });
  }
);
req.on('error', (e) => { console.error('bridge unreachable: ' + e.message); process.exit(1); });
req.write(body); req.end();
