// Local browser QA: compiled app with its API URL redirected to the local fixture.
// Does not change build files or contact the production backend.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../build');
const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost:3001').pathname);
    let file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, 'index.html');
    const ext = path.extname(file);
    let body = fs.readFileSync(file);
    if (ext === '.js') body = Buffer.from(body.toString('utf8').replaceAll('https://nomango-backend-prod-3-27-110-86.nip.io', 'http://localhost:3002'));
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch { res.writeHead(500); res.end('Local preview error'); }
}).listen(3001, '127.0.0.1', () => console.log('Compiled UI preview ready on localhost:3001'));
