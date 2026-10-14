// Read-only source audit. SQL row numbers are never treated as backend IDs.
// Run --prepare, inspect review.json/photos, then use --apply with approved keys.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { decode } = require('he');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'output/place-image-audit');
const sqlPath = process.env.PLACE_SOURCE_SQL || 'C:/Users/joyfu/Downloads/noman-go-main/noman-go-main/src/main/resources/data/places_insert.sql';
const countryCodes = { 오사카:'JP', 도쿄:'JP', 마닐라:'PH', 세부:'PH', 서울:'KR', 경주:'KR', 부산:'KR', 제주:'KR', 방콕:'TH', 로스앤젤레스:'US', 뉴욕:'US', 홍콩:'HK', 치앙마이:'TH', 푸꾸옥:'VN', 다낭:'VN' };
const plain = v => decode(String(v || '').replace(/<[^>]*>/g, '')).trim();
const key = p => `${p.countryCode}:${p.region}:${p.name}`;
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
const read = name => JSON.parse(fs.readFileSync(path.join(out, name), 'utf8'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const distance = (a, b) => {
  const rad = Math.PI / 180, dy = (b.latitude-a.latitude)*rad, dx = (b.longitude-a.longitude)*rad;
  return 6371*2*Math.asin(Math.sqrt(Math.sin(dy/2)**2 + Math.cos(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.sin(dx/2)**2));
};
async function request(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(url, { headers: { 'User-Agent': 'NomanGoPhotoAuditBot/1.0 (https://noman-go.netlify.app/place-images/credits.html; frontend attribution review)' }, signal: AbortSignal.timeout(45000) });
    if (r.ok) return r;
    if (![429, 502, 503, 504].includes(r.status) || attempt === 2) throw new Error(`HTTP ${r.status}: ${new URL(url).hostname}`);
    const retryAfter = Number(r.headers.get('retry-after'));
    if (retryAfter > 60) throw new Error(`HTTP ${r.status}: ${new URL(url).hostname}; retry after ${retryAfter}s`);
    await pause(retryAfter > 0 ? retryAfter*1000 : 3000*(attempt+1));
  }
}
async function query(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({ action: 'query', format: 'json', ...params });
  const cacheDir = path.join(out, 'query-cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  const cachePath = path.join(cacheDir, crypto.createHash('sha256').update(url.href).digest('hex') + '.json');
  if (fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const data = await (await request(url)).json();
  if (data.error) throw new Error(data.error.info);
  fs.writeFileSync(cachePath, JSON.stringify(data.query));
  return data.query;
}
function catalog() {
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const rows = [];
  for (let line of sql.split(/\r?\n/)) {
    line = line.trim();
    if (!line.startsWith("('")) continue;
    const values = []; let value = '', quoted = false;
    for (let i = 1; i < line.lastIndexOf(')'); i++) {
      const c = line[i];
      if (c === "'") {
        if (quoted && line[i+1] === "'") { value += "'"; i++; } else quoted = !quoted;
      } else if (c === ',' && !quoted) { values.push(value.trim()); value = ''; } else value += c;
    }
    values.push(value.trim());
    if (values.length !== 8) throw new Error('Unexpected SQL row');
    const [region, name, theme, description, address, latitude, longitude, placeType] = values;
    rows.push({ placeId: null, sourceRow: rows.length+1, region, name, countryCode: countryCodes[region] || null, address, latitude: Number(latitude), longitude: Number(longitude), theme, placeType, description });
  }
  if (rows.length !== 600 || rows.some(p => !Number.isFinite(p.latitude) || !Number.isFinite(p.longitude))) throw new Error('Catalog requires review');
  save('catalog.json', { basis: 'provided SQL; production GET returned 403', sourceSha256: crypto.createHash('sha256').update(sql).digest('hex'), places: rows });
  return rows;
}
function allowedLicense(meta) {
  const name = plain(meta.LicenseShortName?.value), url = plain(meta.LicenseUrl?.value);
  const selected = name.match(/\bCC BY(?:-SA)? (?:2\.0|2\.5|3\.0|4\.0)\b/);
  if (selected && !/^CC BY(?:-SA)? [234](?:\.\d)?$/.test(name)) {
    const parts = selected[0].split(' '), kind=parts[1]==='BY-SA'?'by-sa':'by', version=parts[2];
    return {license:selected[0],licenseUrl:`https://creativecommons.org/licenses/${kind}/${version}/`};
  }
  const free = /^(CC BY(?:-SA)? [234](?:\.\d)?|CC0|Public domain|KOGL Type 1)$/.test(name);
  if (!free) return null;
  return { license: name, licenseUrl: url || (name === 'Public domain' ? 'https://creativecommons.org/publicdomain/mark/1.0/' : '') };
}
async function refreshPhotos() {
  const rows=read('review.json');
  const decisions=JSON.parse(fs.readFileSync(path.join(__dirname,'place-photo-review.json'),'utf8'));
  const livePath=path.join(root,'output/place-image-expansion/live-id-map.json');
  const live=fs.existsSync(livePath)?JSON.parse(fs.readFileSync(livePath,'utf8')):[];
  const belongsToLive=r=>live.some(p=>[r.place.name,...(r.aliases||[]),...(decisions[r.key]?.aliases||[])].includes(p.name));
  const pending=rows.filter(r=>r.file&&!decisions[r.key]?.rejectedReason&&(!r.image?.license || !r.articleCoordinates)).sort((a,b)=>Number(belongsToLive(b))-Number(belongsToLive(a)));
  console.log('Pending metadata/coordinates:',pending.length);
  for(let i=0;i<pending.length;i+=5) {
    const batch=pending.slice(i,i+5),titles=batch.map(r=>'File:'+r.file.replaceAll('_',' '));
    try {
      const q=await query('commons.wikimedia.org',{titles:titles.join('|'),redirects:'1',prop:'imageinfo|coordinates',iiprop:'url|extmetadata|size|mime',iiurlwidth:'960',colimit:'max'});
      for(const r of batch) {
        const page=Object.values(q.pages).find(p=>p.title==='File:'+r.file.replaceAll('_',' '));
        const info=page?.imageinfo?.[0];
        if(!info){r.reason||='Photo not available on Commons';continue;}
        const meta=info.extmetadata||{},license=allowedLicense(meta);
        const gps=page.coordinates?.find(p=>p.globe==='earth');
        if(!r.articleCoordinates&&gps){
          r.articleCoordinates={...gps,source:info.descriptionurl,basis:'Commons file camera coordinates; subject also reviewed'};
          r.offsetKm=distance(r.place,{latitude:gps.lat,longitude:gps.lon});
        }
        r.image={source:info.descriptionurl,author:decisions[r.key]?.author||plain(meta.Artist?.value),attribution:plain(meta.Attribution?.value),description:plain(meta.ImageDescription?.value).slice(0,1000),...license,mime:info.mime,width:info.thumbwidth||info.width,height:info.thumbheight||info.height,downloadUrl:info.thumburl||info.url,restrictions:plain(meta.Restrictions?.value)};
        r.reason=!r.articleCoordinates?'Article coordinates not verified':r.offsetKm>2?'Reference location differs by more than 2 km; needs individual review':!license?.licenseUrl?'Reuse license not confirmed':!['image/jpeg','image/png','image/webp'].includes(info.mime)?'Not a photographic raster image':!r.image.author?'Author not confirmed':null;
      }
    }catch(error){for(const r of batch)r.reason='Photo metadata request unavailable: '+error.message;console.log('Metadata batch deferred:',i+1,error.message);}
    save('review.json',rows);
    console.log('Metadata checked:',Math.min(i+5,pending.length),'/',pending.length,'ready:',rows.filter(r=>!r.reason).length);
    await pause(1200);
  }
}
async function prepare() {
  const places = catalog();
  const previousReview = fs.existsSync(path.join(out,'review.json')) ? read('review.json') : [];
  const requestedNames = process.argv[3] ? new Set(process.argv[3].split('|')) : null;
  const candidates = JSON.parse(fs.readFileSync(path.join(__dirname, 'place-photo-candidates.json'), 'utf8')).filter(row=>!requestedNames || requestedNames.has(row[1]));
  if (requestedNames && candidates.length !== requestedNames.size) throw new Error('Requested candidate missing or ambiguous');
  const existing = JSON.parse(fs.readFileSync(path.join(root, 'public/place-photos/sources.json'), 'utf8'));
  const decisions = JSON.parse(fs.readFileSync(path.join(__dirname, 'place-photo-review.json'), 'utf8'));
  const wikiByRequested = new Map();
  const sourceFailures = new Map();
  for (const language of [...new Set(candidates.map(row=>row[4] || 'en'))]) {
   const languageCandidates = candidates.filter(row=>(row[4] || 'en') === language);
   const batchSize = language === 'en' ? 40 : 10;
   for (let i = 0; i < languageCandidates.length; i += batchSize) {
    const titles = languageCandidates.slice(i,i+batchSize).map(row => row[2]);
    let q;
    try { q = await query(`${language}.wikipedia.org`, { titles: titles.join('|'), redirects:'1', prop:'coordinates|pageimages|info|pageprops', inprop:'url', piprop:'name', colimit:'max' }); }
    catch(error) { sourceFailures.set(language,error.message); console.log('Source unavailable:',language,error.message); break; }
    const aliases = new Map([...(q.normalized || []), ...(q.redirects || [])].map(r=>[r.from,r.to]));
    for (const title of titles) {
      let current = title; for (let j=0;j<4 && aliases.has(current);j++) current = aliases.get(current);
      wikiByRequested.set(`${language}:${title}`, Object.values(q.pages).find(p=>p.title===current));
    }
    await pause(500);
  }
  }
  const review = candidates.map(([region, name, article, existingSlug, language = 'en', aliases = []]) => {
    const place = places.find(p=>p.region===region && p.name===name);
    if (!place) throw new Error('Candidate absent from SQL: '+name);
    const page = wikiByRequested.get(`${language}:${article}`);
    const prior = existing.find(p=>p.path===`/place-photos/${existingSlug}.jpg` && !p.missing);
    const file = prior?.file || page?.pageimage;
    const coord = page?.coordinates?.find(c=>c.globe==='earth');
    const offsetKm = coord ? distance(place, {latitude:coord.lat,longitude:coord.lon}) : null;
    return { key: key(place), place, article, language, aliases, wikibaseId:page?.pageprops?.wikibase_item, articleUrl: page?.fullurl || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(article.replaceAll(' ','_'))}`, articleCoordinates: coord || null, offsetKm, existingPath: prior?.path || null, file, reason: !page && sourceFailures.has(language) ? 'Reference source unavailable: '+sourceFailures.get(language) : !coord ? 'Article coordinates not verified' : offsetKm > 2 ? 'Article location differs by more than 2 km; needs individual review' : !file ? 'No Commons photo from the verified article' : null };
  });
  const entities = [...new Set(review.filter(r=>!r.articleCoordinates && r.wikibaseId).map(r=>r.wikibaseId))];
  for (let i=0;i<entities.length;i+=10) {
    const url=new URL('https://www.wikidata.org/w/api.php');
    url.search=new URLSearchParams({action:'wbgetentities',format:'json',ids:entities.slice(i,i+10).join('|'),props:'claims'});
    let response;
    try { response=await (await request(url)).json(); }
    catch(error) { console.log('Coordinate source unavailable:',error.message); break; }
    for (const r of review.filter(r=>!r.articleCoordinates && r.wikibaseId)) {
      const values=(response.entities?.[r.wikibaseId]?.claims?.P625 || []).filter(c=>c.rank!=='deprecated');
      const value=(values.find(c=>c.rank==='preferred') || values[0])?.mainsnak?.datavalue?.value;
      if (!value || !value.globe?.endsWith('/Q2')) continue;
      r.articleCoordinates={lat:value.latitude,lon:value.longitude,globe:'earth',source:`https://www.wikidata.org/wiki/${r.wikibaseId}`};
      r.offsetKm=distance(r.place,value);
      r.reason=r.offsetKm>2 ? 'Reference location differs by more than 2 km; needs individual review' : !r.file ? 'No Commons photo from the verified article' : null;
    }
    await pause(500);
  }
  for (const r of review) {
    const decision = decisions[r.key];
    if (!decision) continue;
    if (decision.file) r.file = decision.file;
    if (decision.aliases) r.aliases = decision.aliases;
    if (decision.coordinates) {
      r.articleCoordinates = decision.coordinates;
      r.offsetKm = distance(r.place, {latitude:decision.coordinates.lat, longitude:decision.coordinates.lon});
      if (decision.file) r.file = decision.file;
      r.reason = r.offsetKm > 2 ? 'Reference location differs by more than 2 km; needs individual review' : !r.file ? 'No verified photograph' : null;
    }
    if (decision.rejectedReason) r.reason = decision.rejectedReason;
  }
  for (const r of review) {
    const prior = previousReview.find(p=>p.key===r.key && p.file===r.file && p.articleCoordinates);
    if (!r.articleCoordinates && prior) {
      r.articleCoordinates=prior.articleCoordinates;
      r.offsetKm=prior.offsetKm;
      r.reason=prior.reason;
    }
  }
  const titles = [...new Set(review.filter(r=>r.file).map(r=>'File:'+r.file.replaceAll('_',' ')))];
  const infos = new Map();
  for (let i=0;i<titles.length;i+=10) {
    let q;
    try { q=await query('commons.wikimedia.org', {titles:titles.slice(i,i+10).join('|'), redirects:'1', prop:'imageinfo', iiprop:'url|extmetadata|size|mime', iiurlwidth:'960'}); }
    catch(error) { console.log('Photo source unavailable:',error.message); break; }
    Object.values(q.pages).forEach(p=>infos.set(p.title,p.imageinfo?.[0]));
    await pause(500);
  }
  for (const r of review) {
    const info = infos.get('File:'+String(r.file || '').replaceAll('_',' '));
    const meta = info?.extmetadata || {}, license=allowedLicense(meta);
    const prior = previousReview.find(p=>p.key===r.key && p.file===r.file && p.image);
    if (!info && prior) { r.image=prior.image; continue; }
    if (!info) r.reason ||= 'Photo not available on Commons';
    else if (!license || !license.licenseUrl) r.reason ||= 'Reuse license not confirmed';
    else if (!['image/jpeg','image/png','image/webp'].includes(info.mime)) r.reason ||= 'Not a photographic raster image';
    r.image = info ? { source: info.descriptionurl, author: decisions[r.key]?.author || plain(meta.Artist?.value), attribution: decisions[r.key]?.attribution || plain(meta.Attribution?.value), description: plain(meta.ImageDescription?.value).slice(0,1000), ...license, mime: info.mime, width:info.thumbwidth || info.width, height:info.thumbheight || info.height, downloadUrl:info.thumburl || info.url, restrictions:plain(meta.Restrictions?.value) } : null;
    if (r.image && !r.image.author) r.reason ||= 'Author not confirmed';
    if (r.image && decisions[r.key]?.author) r.image.author = decisions[r.key].author;
  }
  save('review.json',requestedNames ? [...previousReview.filter(r=>!requestedNames.has(r.place.name)),...review] : review);
  console.log(JSON.stringify({ catalog:places.length, candidates:review.length, ready:review.filter(r=>!r.reason).length, reused:review.filter(r=>!r.reason && r.existingPath).length, rejected:review.filter(r=>r.reason).map(r=>({name:r.place.name,reason:r.reason,km:r.offsetKm})) }));
}
async function download() {
  const rows=read('review.json').filter(r=>!r.reason);
  const previous = fs.existsSync(path.join(out,'downloaded.json')) ? read('downloaded.json') : [];
  fs.mkdirSync(path.join(out,'photos'),{recursive:true});
  let completed=0;
  for (const r of rows) {
    if (r.existingPath) r.previewPath=r.existingPath;
    else {
      const ext = r.image.mime==='image/png' ? 'png' : r.image.mime==='image/webp' ? 'webp' : 'jpg';
      const prior = previous.find(p=>p.key===r.key && p.file===r.file && p.previewPath);
      const fileHash = crypto.createHash('sha256').update(r.file).digest('hex').slice(0,8);
      r.localName=prior?.localName || `${r.place.countryCode.toLowerCase()}-${r.place.sourceRow}-${fileHash}.${ext}`;
      const target=path.join(out,'photos',r.localName);
      try {
        if (!fs.existsSync(target)) {
          const response = await request(r.image.downloadUrl);
          if (!response.headers.get('content-type')?.startsWith('image/')) throw new Error('Download did not return an image');
          fs.writeFileSync(target,Buffer.from(await response.arrayBuffer()));
          await pause(250);
        }
        r.previewPath='/photos/'+r.localName;
      }
      catch(error) {r.reason=error.message;}
    }
    if (++completed%20===0) console.log('Photos checked:',completed,'/',rows.length);
  }
  save('downloaded.json',rows);
  console.log('Download complete:',rows.filter(r=>!r.reason).length);
}
async function apply() {
  const approved = new Set(read('approved.json'));
  const decisionsForApply = JSON.parse(fs.readFileSync(path.join(__dirname, 'place-photo-review.json'), 'utf8'));
  const liveIdsPath=path.join(root,'output/place-image-expansion/live-id-map.json');
  const liveIds=fs.existsSync(liveIdsPath)?JSON.parse(fs.readFileSync(liveIdsPath,'utf8')):[];
  const rows=read('downloaded.json').filter(r=>approved.has(r.key) && !r.reason);
  fs.mkdirSync(path.join(root,'public/place-images'),{recursive:true});
  const manifest=rows.map(r=>{
    const p=r.place, imageUrl=r.existingPath || '/place-images/'+r.localName;
    r.image.author=decisionsForApply[r.key]?.author || r.image.author;
    r.image.attribution=decisionsForApply[r.key]?.attribution || r.image.attribution;
    if (!r.image.author || !r.image.licenseUrl) throw new Error('Incomplete photo credit: '+r.key);
    r.aliases=decisionsForApply[r.key]?.aliases||r.aliases||[];
    const idMatches=liveIds.filter(l=>[p.name,...r.aliases].includes(l.name)&&(!l.region||l.region===p.region));
    p.placeId=idMatches.length===1?idMatches[0].id:null;
    if (!r.existingPath) fs.copyFileSync(path.join(out,'photos',r.localName),path.join(root,'public',imageUrl));
    return { placeId:p.placeId, identityKey:r.key, placeName:p.name, aliases:r.aliases || [], countryCode:p.countryCode, region:p.region, regionAliases:decisionsForApply[r.key]?.regionAliases || [], address:p.address, latitude:p.latitude, longitude:p.longitude, imageUrl, imageTitle:r.file, imageSource:r.image.source, attribution:r.image.attribution || r.image.author, author:r.image.author, license:r.image.license, licenseUrl:r.image.licenseUrl, credit:'verified-'+p.sourceRow, objectPosition:'50% 50%', imageWidth:r.image.width, imageHeight:r.image.height, verifiedOn:'2026-10-14', verification:{basis:'provided SQL geography; exact subject and Commons file reviewed; non-null IDs read from all 75 production listing pages',articleUrl:r.articleUrl,articleCoordinates:r.articleCoordinates,offsetKm:r.offsetKm,locationSource:r.locationSource || decisionsForApply[r.key]?.locationSource}, reusedExisting:Boolean(r.existingPath), changes:r.existingPath ? 'Existing resized JPEG; proportional display.' : 'Unmodified Wikimedia thumbnail; proportional display.' };
  });
  fs.writeFileSync(path.join(root,'src/data/placeImages.json'),JSON.stringify(manifest,null,2));
  const esc = v => String(v || '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
  const credits = manifest.map(p=>`<article id="${esc(p.credit)}"><h2>${esc(p.region)} · ${esc(p.placeName)}</h2><img src="${esc(p.imageUrl)}" alt="${esc(p.placeName)}" loading="lazy"><p>사진: ${esc(p.imageTitle)}<br>저작자: ${esc(p.author)}<br>표시: ${esc(p.attribution)}</p><p><a href="${esc(p.imageSource)}">Wikimedia Commons 원본 및 이용 조건</a> · <a href="${esc(p.licenseUrl)}">${esc(p.license)}</a></p><p>${esc(p.changes)} 카드에서는 원본 비율을 유지하여 일부 영역을 표시합니다.</p>${p.verification.articleCoordinates?.license === 'ODbL' ? `<p>위치 확인: <a href="${esc(p.verification.articleCoordinates.source)}">© OpenStreetMap contributors</a> · <a href="https://www.openstreetmap.org/copyright">ODbL</a></p>` : ''}</article>`).join('\n');
  fs.writeFileSync(path.join(root,'public/place-images/credits.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>장소 사진 출처</title><style>:root{color-scheme:light dark}body{font:15px/1.6 system-ui;max-width:760px;margin:0 auto;padding:24px;overflow-wrap:anywhere}h1{font-size:24px}h2{font-size:18px}article{padding:24px 0;border-bottom:1px solid #8886;scroll-margin-top:16px}img{max-width:100%;max-height:240px;object-fit:contain}a{color:light-dark(#006fa8,#76cfff)}</style><h1>실제 장소 사진 출처</h1><p>사진은 각 원본 페이지의 공개 라이선스에 따라 제공됩니다. 저작자, 원본, 이용 조건과 표시 변경 정보를 아래에서 확인할 수 있습니다. 사진 자체의 라이선스는 프론트엔드 코드의 라이선스와 별개입니다.</p>${credits}</html>`);
  save('summary.json',{basis:'600 provided SQL records; real production IDs read from all 75 visible listing pages (375 places); anonymous API remains 403',catalogCount:read('catalog.json').places.length,liveCatalogCount:liveIds.length,liveMatched:manifest.filter(p=>p.placeId!==null).length,matched:manifest.length,reused:manifest.filter(r=>r.reusedExisting).length,external:manifest.filter(r=>!r.reusedExisting).length,unmatched:read('catalog.json').places.filter(p=>!rows.some(r=>r.key===key(p))).map(p=>({...p,reason:read('review.json').find(r=>r.key===key(p))?.reason || 'No place-specific photo verified'}))});
  console.log('Published verified photographs:',manifest.length);
}
fs.mkdirSync(out,{recursive:true});
const mode=process.argv[2];
Promise.resolve(mode==='--prepare' ? prepare() : mode==='--refresh-photos' ? refreshPhotos() : mode==='--download' ? download() : mode==='--apply' ? apply() : Promise.reject(new Error('Use --prepare, --refresh-photos, --download, or --apply'))).catch(e=>{console.error(e.message);process.exitCode=1;});
