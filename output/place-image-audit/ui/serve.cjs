const path = require('path');
const fs = require('fs');
const http = require('http');
process.env.NODE_ENV = 'development';
process.env.BABEL_ENV = 'development';
process.env.REACT_APP_USE_MOCK = 'false';
process.env.REACT_APP_GOOGLE_MAPS_API_KEY = '';
process.env.REACT_APP_GOOGLE_MAPS_BROWSER_KEY = '';
process.env.REACT_APP_KAKAO_MAP_API_KEY = '';
process.env.REACT_APP_KAKAO_MAP_JS_KEY = '';
process.env.REACT_APP_KAKao_MAP_JS_KEY = '';
process.env.FAST_REFRESH = 'false';
const webpack = require('webpack');
const config = require('react-scripts/config/webpack.config')('development');
const audit = __dirname;
config.entry = path.join(audit, 'preview.jsx');
config.output = { ...config.output, path: path.join(audit, 'dist'), filename: 'preview.js', publicPath: '/', clean: false };
config.devtool = false;
config.cache = false;
config.resolve.plugins = config.resolve.plugins.filter(p => p.constructor.name !== 'ModuleScopePlugin');
config.plugins = config.plugins.filter(p => !['HtmlWebpackPlugin','InterpolateHtmlPlugin','ReactRefreshPlugin','ForkTsCheckerWebpackPlugin','ESLintWebpackPlugin'].includes(p.constructor.name));
const babel = config.module.rules.flatMap(r => r.oneOf || []).find(r => String(r.loader || '').includes('babel-loader') && r.include);
babel.include = [babel.include, audit];
config.module.rules.unshift({ enforce: 'pre', test: /RouteResult\.jsx$/, loader: path.join(audit, 'export-loader.cjs') });

config.plugins.push(new webpack.NormalModuleReplacementPlugin(/(?:[\\/]api|[\\/]useSessionKey|[\\/]authState)$/, resource => {
  if (resource.context === audit) return;
  const target = resource.request.endsWith('useSessionKey') ? 'fixture-session.js' : resource.request.endsWith('authState') ? 'fixture-auth.js' : 'fixture-api.js';
  resource.request = path.join(audit, target);
}));
webpack(config, (err, stats) => {
  if (err || stats.hasErrors()) { console.error(err || stats.toString({ all: false, errors: true })); process.exit(1); }
  console.log(stats.toString({ all: false, warnings: true }));
  const root = config.output.path;
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>장소 사진 UI 검증</title></head><body><div id="root"></div><script src="/preview.js"></script></body></html>');
  fs.writeFileSync(path.join(root, 'frame.html'), '<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>장소 사진 반응형 검증</title><style>html,body{margin:0;padding:0;background:#f8fbfd}iframe{display:block;border:0;margin:0 auto}</style></head><body><iframe title="장소 사진 미리보기" src="/"></iframe><script>const q=new URLSearchParams(location.search);const f=document.querySelector("iframe");f.width=Number(q.get("width"))||390;f.height=Number(q.get("height"))||844;f.src="/?screen="+(q.get("screen")||"search")+"&theme="+(q.get("theme")||"light");</script></body></html>');
  http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    const base = /^\/(place-images|place-photos)\//.test(pathname) ? path.resolve(__dirname, '../../../public') : root;
    const file = path.resolve(base, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(base + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(file, (error, data) => {
      if (error) { res.writeHead(404); res.end(); return; }
      const ext = path.extname(file);
      res.setHeader('Content-Type', ext === '.html' ? 'text/html; charset=utf-8' : ext === '.js' ? 'application/javascript' : ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : ext === '.jpg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'application/octet-stream');
      res.end(data);
    });
  }).listen(3015, '127.0.0.1', () => console.log('PHOTO_UI http://127.0.0.1:3015'));
});
