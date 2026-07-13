// CLI for one-pass form filling via the upload bridge.
// Usage: node fill.js <plan.json>
//   plan.json: { "fields": [ { "label": "First Name", "value": "Petr" },
//                            { "label": "Country", "value": "Canada", "commit": true } ] }
// "commit": true nudges combobox-style fields with ArrowDown+Enter after typing.
const http = require('http');
const fs = require('fs');

const [, , planPath] = process.argv;
if (!planPath || !fs.existsSync(planPath)) { console.error('usage: node fill.js <plan.json>'); process.exit(2); }

const body = fs.readFileSync(planPath, 'utf8');
JSON.parse(body); // validate

const req = http.request(
  { host: '127.0.0.1', port: 8765, path: '/fill', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 30000 },
  (res) => {
    let out = '';
    res.on('data', (c) => (out += c));
    res.on('end', () => { console.log(`${res.statusCode}: ${out}`); process.exit(res.statusCode === 200 ? 0 : 1); });
  }
);
req.on('error', (e) => { console.error('bridge unreachable: ' + e.message); process.exit(1); });
req.write(body); req.end();
