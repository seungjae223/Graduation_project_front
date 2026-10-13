// Isolated local API fixture. Uses real seed content with synthetic IDs/session.
// Not imported by the app/build. Never sends requests to the production backend.
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = __dirname;
const places = JSON.parse(fs.readFileSync(path.join(root,'seed-places.json'),'utf8'));
const requests = [], folders = [], saved = new Map();
const modeFile = path.join(root,'scenario.json');
fs.writeFileSync(modeFile,JSON.stringify({mode:'ok'}));
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:'place-test@example.com',exp:Math.floor(Date.now()/1000)+7200,role:'USER'})+'.local-test-only';
const json = (res,code,body) => {res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
http.createServer(async(req,res)=>{
  try {
    const url = new URL(req.url,'http://localhost:3002');
    if(url.pathname.startsWith('/api/')) {
      let text=''; for await(const chunk of req) text+=chunk;
      const body=text?JSON.parse(text):undefined;
      requests.push({method:req.method,path:url.pathname,query:Object.fromEntries(url.searchParams),...(body?{body}:{})});
      fs.writeFileSync(path.join(root,'http-requests.json'),JSON.stringify(requests,null,2));
      if(req.method==='GET' && url.pathname==='/api/places') {
        const mode=JSON.parse(fs.readFileSync(modeFile,'utf8')).mode;
        if(mode==='fail') return json(res,500,{message:'Local fixture failure'});
        if(mode==='empty') return json(res,200,[]);
        if(mode==='small') return json(res,200,places.slice(0,9));
        if(mode==='malformed') return json(res,200,{message:'Invalid fixture response'});
        return json(res,200,[...places].reverse()); // frontend must sort deterministically
      }
      if(req.method==='GET' && /^\/api\/places\/\d+$/.test(url.pathname)) {
        const place=places.find(p=>p.id===Number(url.pathname.split('/').at(-1)));
        return json(res,place?200:400,place||{message:'장소를 찾을 수 없습니다.'});
      }
      if(req.method==='GET' && /\/reviews$/.test(url.pathname)) return json(res,200,[]);
      if(url.pathname==='/api/folders') {
        if(req.method==='GET') return json(res,200,folders);
        if(req.method==='POST') {const folder={id:folders.length+1,name:body.name};folders.push(folder);saved.set(folder.id,[]);return json(res,200,'폴더 생성 완료');}
      }
      const folderMatch=url.pathname.match(/^\/api\/folders\/(\d+)\/places(?:\/(\d+))?$/);
      if(folderMatch) {
        const folderId=Number(folderMatch[1]), placeId=Number(folderMatch[2]);
        const members=saved.get(folderId)||[];
        if(req.method==='GET') return json(res,200,members);
        if(req.method==='POST') {if(!members.some(p=>p.id===placeId)) members.push(places.find(p=>p.id===placeId));saved.set(folderId,members);return json(res,200,'장소 저장 완료');}
      }
      return json(res,404,{message:'Not implemented by the local fixture'});
    }
    const upstream=await fetch('http://localhost:3001'+req.url);
    const headers=Object.fromEntries(upstream.headers);delete headers['content-length'];delete headers['content-encoding'];
    if((headers['content-type']||'').includes('text/html')) {
      const theme=url.searchParams.get('auditTheme')||'light';
      const setup=`<script>sessionStorage.setItem('accessToken',${JSON.stringify(token)});localStorage.setItem('site-theme',${JSON.stringify(theme)});</script>`;
      res.writeHead(upstream.status,headers);res.end((await upstream.text()).replace('<head>','<head>'+setup));
    } else {res.writeHead(upstream.status,headers);res.end(Buffer.from(await upstream.arrayBuffer()));}
  } catch {json(res,502,{message:'Local contract fixture unavailable'});}
}).listen(3002,'127.0.0.1',()=>console.log('600-place contract preview: http://localhost:3002/popular-all'));
