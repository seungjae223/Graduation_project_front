const http=require('http'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
http.createServer((req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname==='/'){
    const all=JSON.parse(fs.readFileSync(path.join(__dirname,'downloaded.json'),'utf8')).filter(r=>!r.reason);
    const page=Math.max(1,Number(url.searchParams.get('page'))||1),rows=all.slice((page-1)*16,page*16);
    const esc=s=>String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><title>실제 장소 사진 검토</title><style>body{font:13px/1.4 system-ui;margin:16px;color:#182031;background:#f8fbfd}h1{font-size:20px;margin:0 0 12px}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.card{background:white;border:1px solid #ccd8e6;padding:8px;min-width:0}.card img{width:100%;height:150px;object-fit:contain;background:#edf2f7}.card strong{display:block;margin:4px 0}.card small{display:block;overflow-wrap:anywhere;font-size:10px}a{margin-right:12px}</style><h1>사진 검토 ${page}/${Math.ceil(all.length/16)} · ${all.length}개 후보</h1><nav>${Array.from({length:Math.ceil(all.length/16)},(_,i)=>`<a href="/?page=${i+1}">${i+1}페이지</a>`).join('')}</nav><div class="grid">${rows.map(r=>`<article class="card"><img src="${esc(r.previewPath)}" alt="${esc(r.place.name)}"><strong>${esc(r.place.region)} · ${esc(r.place.name)}</strong><small>${esc(r.file)}</small><small>${esc(r.image.author)} · ${esc(r.image.license)} · 위치 차이 ${r.offsetKm?.toFixed(2)} km</small></article>`).join('')}</div></html>`);return;
  }
  const base=url.pathname.startsWith('/place-photos/')?path.join(root,'public'):__dirname;
  const file=path.resolve(base,'.'+url.pathname);
  if(!file.startsWith(base+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.png')?'image/png':file.endsWith('.webp')?'image/webp':'image/jpeg');res.end(data);});
}).listen(3014,'127.0.0.1',()=>console.log('PHOTO_REVIEW http://127.0.0.1:3014'));
