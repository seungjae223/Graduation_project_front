// Local contract fixture only. Not imported by the application or production build.
// Synthetic trip data persists across browser reloads. No production requests.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const scenarioFile = path.join(root, 'scenario.json');
const logFile = path.join(root, 'http-requests.json');
const trip = { id: 7, title: '순서 저장 테스트', destination: '테스트 여행', startDate: '2026-10-13', endDate: '2026-10-13', mapType: 'KAKAO', routeUrl: '' };
let visits = ['A', 'B', 'C'].map((name, index) => ({ id: 91+index, tripId: 7, placeId: 101+index, placeName: name,
  latitude: 37.57+index*.01, longitude: 126.98, address: name+' 주소', placeType: 'ATTRACTION', day: 1,
  visitOrder: index+1, isStartPoint: false, arrivalTime: '10:00', departureTime: '10:30',
  stayDuration: 30, isFixed: false, isNextDay: false, memo: name+' 메모' }));
let requests = [];
fs.writeFileSync(scenarioFile, JSON.stringify({ mode: 'ok', delay: 1600 }));
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
const token = encode({ alg: 'HS256', typ: 'JWT' })+'.'+encode({ sub: 'order-test@example.com', exp: Math.floor(Date.now()/1000)+7200, role: 'USER' })+'.local-test-only';
const json = (res, code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); };
const minutes = n => String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const ordered = () => [...visits].sort((a,b)=>a.visitOrder-b.visitOrder);
const persist = () => fs.writeFileSync(path.join(root,'fixture-state.json'), JSON.stringify(ordered(),null,2));
persist();
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost:3002');
    if (url.pathname.startsWith('/api/')) {
      let text = ''; for await (const part of req) text += part;
      const body = text ? JSON.parse(text) : undefined;
      requests.push({ method: req.method, path: url.pathname, ...(body ? { body } : {}) });
      fs.writeFileSync(logFile, JSON.stringify(requests,null,2));
      if (req.method==='GET') {
        if (url.pathname==='/api/trips') return json(res,200,[trip]);
        if (url.pathname==='/api/trips/7') return json(res,200,trip);
        if (url.pathname==='/api/trips/7/places' || url.pathname==='/api/trips/7/days/1/places') return json(res,200,ordered());
        if (url.pathname==='/api/trips/7/days/1/timeline') return json(res,200,ordered().map((item,index)=>({
          visitOrder: item.visitOrder, placeName: item.placeName, placeType: item.placeType,
          arrivalTime: minutes(600+index*45), departureTime: minutes(630+index*45),
          arrivalDateTime: '2026-10-13T'+minutes(600+index*45), departureDateTime: '2026-10-13T'+minutes(630+index*45),
          arrivalDayOffset: 0, departureDayOffset: 0, stayMinutes: 30, travelMinutesFromPrevious: index?15:0 })));
        if (['/api/folders','/api/recent-places','/api/recent-searches'].includes(url.pathname)) return json(res,200,[]);
      }
      if (req.method==='PATCH' && url.pathname==='/api/trips/7/days/1/places/order') {
        const scenario=JSON.parse(fs.readFileSync(scenarioFile,'utf8'));
        fs.writeFileSync(scenarioFile,JSON.stringify({ mode:'ok', delay:1600 }));
        await new Promise(resolve=>setTimeout(resolve,scenario.delay??1600));
        if (scenario.mode==='fail') return json(res,400,{message:'고정 시간에 도착할 수 없습니다.'});
        if (scenario.mode==='networkBefore') return res.destroy();
        if (!Array.isArray(body?.tripPlaceIds) || body.tripPlaceIds.length!==visits.length ||
            new Set(body.tripPlaceIds).size!==visits.length || body.tripPlaceIds.some(id=>!visits.some(item=>item.id===id)) ||
            body.startTime!=='10:00') return json(res,400,{message:'잘못된 순서 요청'});
        const next=body.tripPlaceIds.map((id,index)=>({...visits.find(item=>item.id===id), visitOrder:index+1,
          arrivalTime:minutes(600+index*45),departureTime:minutes(630+index*45)}));
        if (scenario.mode!=='staleRead') { visits=next; persist(); }
        if (scenario.mode==='networkAfter') return res.destroy();
        return json(res,200,next);
      }
      return json(res,404,{message:'테스트 명세에 없는 요청'});
    }
    const upstream=await fetch('http://localhost:3001'+req.url);
    const headers=Object.fromEntries(upstream.headers);
    delete headers['content-length']; delete headers['content-encoding'];
    if ((headers['content-type']||'').includes('text/html')) {
      const theme=url.searchParams.get('auditTheme')||'light';
      const setup=`<script>sessionStorage.setItem('accessToken',${JSON.stringify(token)});localStorage.setItem('site-theme',${JSON.stringify(theme)});</script>`;
      res.writeHead(upstream.status,headers);
      res.end((await upstream.text()).replace('<head>','<head>'+setup));
    } else { res.writeHead(upstream.status,headers); res.end(Buffer.from(await upstream.arrayBuffer())); }
  } catch(error) { json(res,502,{message:'Local contract fixture unavailable'}); }
}).listen(3002,'127.0.0.1',()=>console.log('Contract fixture: http://localhost:3002; synthetic data only'));
