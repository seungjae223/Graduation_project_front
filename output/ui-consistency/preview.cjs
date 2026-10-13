// Isolated UI audit fixture. This proxy is never included in the application build.
// All application requests use the separate CRA process with REACT_APP_USE_MOCK=true.
const http = require('node:http');
const user = { id: 1, name: '테스트 사용자', nickname: '테스트 사용자', email: 'test@example.com', role: 'ADMIN' };
const session = JSON.stringify({ token: 'mock.' + Buffer.from(JSON.stringify({ ...user, sub: 'mock:test@example.com' })).toString('base64') + '.demo', user });
http.createServer(async (req, res) => {
  try {
    const upstream = await fetch('http://localhost:3001' + req.url);
    const headers = Object.fromEntries(upstream.headers);
    delete headers['content-length']; delete headers['content-encoding'];
    if ((headers['content-type'] || '').includes('text/html')) {
      const theme = new URL(req.url, 'http://localhost:3002').searchParams.get('auditTheme');
      const setup = `<script>sessionStorage.setItem('mock_auth_session',${JSON.stringify(session)});${theme === 'dark' || theme === 'light' ? `localStorage.setItem('site-theme',${JSON.stringify(theme)});` : ''}</script>`;
      res.writeHead(upstream.status, headers);
      res.end((await upstream.text()).replace('<head>', '<head>' + setup));
    } else {
      res.writeHead(upstream.status, headers);
      res.end(Buffer.from(await upstream.arrayBuffer()));
    }
  } catch { res.writeHead(502); res.end('Mock preview unavailable'); }
}).listen(3002, '127.0.0.1', () => console.log('Isolated Mock UI audit: http://localhost:3002'));
