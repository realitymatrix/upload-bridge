// Upload Bridge - CLI to request a payment authorization (demo).
// Usage:
//   node authorize.js spec.json
//   node authorize.js "$4,000.00" "Acme Contracting" "ACCT ****8842" "Invoice #1042"
// spec.json: { amount, payee, account, memo, targetUrl }
//
// Prints the bridge's response. The native dialog shows amount + payee as the
// bound object; nothing moves without a human click. Demo only, no payment rail.

const fs = require('fs');
const http = require('http');

let spec;
const a = process.argv.slice(2);
if (a.length === 1 && a[0].endsWith('.json')) {
  spec = JSON.parse(fs.readFileSync(a[0], 'utf8'));
} else if (a.length >= 2) {
  spec = { amount: a[0], payee: a[1], account: a[2] || '', memo: a[3] || '' };
} else {
  console.error('usage: node authorize.js spec.json  |  node authorize.js "<amount>" "<payee>" ["<account>"] ["<memo>"]');
  process.exit(1);
}

const payload = JSON.stringify(spec);
const req = http.request(
  { host: '127.0.0.1', port: 8765, path: '/authorize', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } },
  (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      console.log(`${res.statusCode}: ${body}`);
      process.exit(res.statusCode === 200 ? 0 : 1);
    });
  }
);
req.on('error', (e) => { console.error('bridge unreachable:', e.message); process.exit(1); });
req.write(payload);
req.end();
