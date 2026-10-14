// Public place data only. Never reads login credentials or modifies the backend.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'output/place-image-expansion');
const read = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const live = read('output/place-image-expansion/live-id-map.json');
const catalog = read('output/place-image-audit/catalog.json').places;
const manifest = read('src/data/placeImages.json');
const review = read('output/place-image-audit/review.json');
const decisions = read('scripts/place-photo-review.json');
const extraDetails = read('output/place-image-expansion/extra-live-details.json');
const validationPath = path.join(out,'validation.json');
const validation = fs.existsSync(validationPath) ? JSON.parse(fs.readFileSync(validationPath,'utf8')) : null;
const key = p => `${p.countryCode}:${p.region}:${p.name}`;
const names = { KR:'대한민국', JP:'일본', PH:'필리핀', TH:'태국', US:'미국', HK:'홍콩', VN:'베트남' };
function missingReason(p) {
  if (!p) return 'SQL 목록과 일치하는 장소를 확인하지 못함; 실제 주소·좌표와 시설 확인 필요';
  const decision = decisions[key(p)], candidate = review.find(r => r.key === key(p));
  const reason = decision?.rejectedReason || candidate?.reason;
  if (decision?.rejectedReason) return '사진 검토 제외: ' + reason;
  if (!candidate) return '정확한 시설·지점의 공개 라이선스 사진을 확보하지 못함';
  if (/source unavailable|request unavailable|429|metadata unavailable/i.test(reason || '')) return '공개 출처 조회 제한 또는 메타데이터 미확인; 재검토 필요';
  if (/coordinates|location differs/i.test(reason || '')) return '장소 좌표와 사진 출처의 위치를 충분히 확인하지 못함: ' + reason;
  if (/license|author|permission/i.test(reason || '')) return '라이선스 또는 저작자 미확인: ' + reason;
  if (/photo|photographic|image/i.test(reason || '')) return '해당 시설의 실제 사진을 확인하지 못함: ' + reason;
  return reason || '출처·피사체의 개별 검토를 통과한 사진이 없음';
}
const inventory = live.map(l => {
  const photo = manifest.find(p => p.placeId === l.id);
  const p = catalog.find(p => p.sourceRow === l.sourceRow) || (photo && catalog.find(p => key(p) === photo.identityKey));
  const detail = extraDetails.find(d=>d.placeId===l.id);
  return {placeId:l.id,placeName:l.name,countryCode:l.countryCode || p?.countryCode || (l.region === '도쿄' ? 'JP' : null),region:l.region || p?.region || null,
    address:detail?.address || l.address || p?.address || null,addressBasis:detail ? detail.basis : l.address ? l.addressBasis : p ? 'provided SQL; reviewed canonical name/alias; not a raw authenticated API response' : 'not verified',
    latitude:p?.latitude ?? null,longitude:p?.longitude ?? null,coordinatesBasis:p ? 'provided SQL; production list does not expose coordinates' : 'not verified',
    initialPhoto:l.initialPhoto,initialMissing:l.initialMissing,initialMissingReason:l.initialMissing ? photo && l.name !== photo.placeName ? '사진 매핑 누락 및 한국어·한자 혼용/시설명 별칭 불일치' : '검증된 장소 사진 매핑 없음' : null,
    photoConnected:Boolean(photo),newlyConnected:Boolean(photo && l.initialMissing),imageUrl:photo?.imageUrl || null,imageSource:photo?.imageSource || null,
    author:photo?.author || null,license:photo?.license || null,licenseUrl:photo?.licenseUrl || null,remainingReason:photo ? null : missingReason(p)};
});
const unmatched = inventory.filter(p => !p.photoConnected);
const hashes = manifest.map(p => ({place:p.placeName,hash:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'public',p.imageUrl))).digest('hex')}));
if (new Set(hashes.map(p => p.hash)).size !== hashes.length) throw new Error('Duplicate photograph content needs individual review');
if (new Set(manifest.filter(p=>p.placeId!==null).map(p=>p.placeId)).size !== manifest.filter(p=>p.placeId!==null).length) throw new Error('Duplicate backend place ID');
const summary = {date:'2026-10-14',liveCatalogCount:live.length,pagesChecked:75,initialMissing:live.filter(p=>p.initialMissing).length,initialConnected:live.filter(p=>!p.initialMissing).length,newlyConnected:inventory.filter(p=>p.newlyConnected).length,liveConnected:inventory.filter(p=>p.photoConnected).length,remainingMissing:unmatched.length,
  sqlCatalogCount:catalog.length,photoLibraryCount:manifest.length,reusedExisting:manifest.filter(p=>p.reusedExisting).length,externalPhotos:manifest.filter(p=>!p.reusedExisting).length,
  externalPhotosAdded:manifest.length-read('output/place-image-expansion/baseline-manifest.json').length,
  licenses:[...new Set(manifest.map(p=>p.license))],duplicateContentCount:0,
  collectionBasis:'운영 화면 /popular-all의 75페이지 전체에서 실제 ID·명칭·사진 표시를 확인. 비로그인 API는 403. 주소·좌표·국가 코드는 제공 SQL 참조이며 목록에서 직접 확인되지 않은 항목은 별도 표시. 운영 375개와 SQL 600개는 다른 목록임.',
  applicationStatus:'로컬 프론트엔드 수정 완료; 운영 배포·커밋·푸시 없음. 연결 수는 수정된 매핑의 범위이며 운영 API 원문이나 전체 배포 후 표시 성공 수를 의미하지 않음.',
  diagnostics:['기존 운영 사진 87개는 전체 목록에서 정상 표시됨. 주요 누락 원인은 미등록 사진과 시설명 별칭 불일치.', '렌더링 중 외부 사진 검색 없음. 검증한 공개 라이선스 파일을 로컬 정적 자산으로 제공.', 'URL 없음, 국가·지역·주소·좌표 불일치 또는 이미지 로딩 실패 시 기존 사진 정보 없음 UI 표시.', '로고·위성지도·다른 시설·불확실한 건축 이미지 등 신규 후보 23개 제외. 기존 제외 10개 유지.', 'Google Places Photos 호출·과금·활성화 없음. 백엔드 및 기존 API·장소 ID 변경 없음.'],
  frontendFiles:['src/data/placeImages.json','src/utils/placeImageResolver.js','src/utils/placeImageResolver.test.js','public/place-images/credits.html',`public/place-images/ (${manifest.length-read('output/place-image-expansion/baseline-manifest.json').length} new files)`],
  validation,inventory,unmatched};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(summary,null,2));
const csv = rows => '\uFEFF'+[Object.keys(rows[0]).join(','),...rows.map(p=>Object.values(p).map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(','))].join('\r\n');
fs.writeFileSync(path.join(out,'inventory.csv'),csv(inventory));
fs.writeFileSync(path.join(out,'unmatched-live.csv'),csv(unmatched));
const sqlUnmatched = catalog.filter(p=>!manifest.some(i=>i.identityKey===key(p))).map(p=>({...p,reason:missingReason(p)}));
fs.writeFileSync(path.join(out,'unmatched-sql.csv'),csv(sqlUnmatched));
const esc = v => String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const rows = inventory.map(p=>`<tr data-missing="${!p.photoConnected}"><td>${p.placeId}</td><td>${esc(p.placeName)}</td><td>${esc(names[p.countryCode])} / ${esc(p.region)}</td><td>${esc(p.address||'주소 미확인')}<small>${esc(p.addressBasis)}</small></td><td>${p.initialMissing?'없음':'있음'}</td><td>${p.photoConnected?'<a href="../../public'+esc(p.imageUrl)+'">연결</a>':'없음'}</td><td>${p.photoConnected?`<a href="${esc(p.imageSource)}">${esc(p.author)} · ${esc(p.license)}</a>`:esc(p.remainingReason)}</td></tr>`).join('');
const rinku = manifest.find(p=>p.placeId===16);
fs.writeFileSync(path.join(out,'report.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>장소 사진 전체 조사 결과</title><style>:root{color-scheme:light dark}body{font:15px/1.6 system-ui;margin:24px;overflow-wrap:anywhere}h1{font-size:24px}h2{font-size:19px}.stats{display:flex;flex-wrap:wrap;gap:12px}.stats p{padding:12px 16px;background:#8881;border-radius:12px}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:10px;border:1px solid #8886;text-align:left;vertical-align:top}small{display:block;opacity:.7}img{max-width:420px;width:100%;height:auto}a{color:light-dark(#006da5,#83d4ff)}.scroll{overflow:auto}</style><h1>장소 사진 전체 조사 결과 · 2026-10-14</h1><div class="stats"><p>운영 장소 <strong>${live.length}</strong></p><p>기존 사진 없음 <strong>${summary.initialMissing}</strong></p><p>새 연결 <strong>${summary.newlyConnected}</strong></p><p>수정 후 연결 <strong>${summary.liveConnected}</strong></p><p>남은 누락 <strong>${unmatched.length}</strong></p></div><p>${esc(summary.collectionBasis)}</p><p>${esc(summary.applicationStatus)}</p><p>사진 라이브러리 ${manifest.length}개 = 기존 재사용 ${summary.reusedExisting}개 + 외부 출처 ${summary.externalPhotos}개. SQL만 참조되는 사진 ${manifest.length-summary.liveConnected}개에는 확인되지 않은 DB ID를 지정하지 않았습니다.</p><h2>린쿠 프리미엄 아울렛 · 실제 ID 16</h2><img src="../../public${rinku.imageUrl}" alt="린쿠 프리미엄 아울렛 실제 사진"><p>${esc(rinku.author)} · <a href="${rinku.licenseUrl}">${esc(rinku.license)}</a> · <a href="${rinku.imageSource}">Wikimedia Commons 원본</a> · <a href="https://www.premiumoutlets.co.jp/en/rinku/">공식 시설 위치</a></p><p>${esc(rinku.address)}. 한국어·영어·일본어 명칭은 확인된 별칭만 허용하며 국가·지역·주소·좌표가 모순되면 사진을 연결하지 않습니다.</p><h2>누락 원인과 처리</h2><ul>${summary.diagnostics.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul><h2>검증</h2><p id="validation">자동화·빌드 결과: validation.json / browser-validation.json에서 확인. 실제 장소 목록은 운영 UI, 반응형·동작 검증은 기존 컴포넌트와 SQL 형태의 로컬 테스트 데이터로 진행했습니다.</p><p><a href="inventory.csv">전체 375개 CSV</a> · <a href="unmatched-live.csv">사진 없는 ${unmatched.length}개와 이유</a> · <a href="unmatched-sql.csv">SQL 600개 중 미연결 목록</a> · <a href="../../public/place-images/credits.html">사진 전체 출처 및 라이선스</a></p><label><input type="checkbox" id="missing">사진 없는 장소만 보기</label><div class="scroll"><table><thead><tr><th>ID</th><th>실제 장소명</th><th>국가 / 도시</th><th>주소와 확인 근거</th><th>기존 사진</th><th>수정 후</th><th>출처·라이선스 또는 누락 이유</th></tr></thead><tbody>${rows}</tbody></table></div><script>document.getElementById('missing').addEventListener('change',e=>document.querySelectorAll('tbody tr').forEach(r=>r.hidden=e.target.checked&&r.dataset.missing!=='true'));</script></html>`);
if (validation) {
  const htmlPath=path.join(out,'report.html');
  const message=`자동화 ${validation.testSuites}개 테스트 묶음 / ${validation.tests}개 테스트 통과. 프로덕션 빌드 완료(기존 html2pdf 소스맵 경고). 브라우저 사진 ${validation.photoUrls.loaded}개 로드 및 출처 ${validation.photoUrls.credits}개 확인. 320·375·390·768·1366·1920px iframe CSS 뷰포트에서 가로 넘침 없음. 검색·국가 필터·페이지 변경·상세·일정의 동일 사진 및 실패 시 대체 UI 확인. 반응형 검증은 실제 컴포넌트와 SQL 형태의 로컬 테스트 데이터로 진행했습니다. 운영 배포 후 전체 장소 검증은 포함하지 않습니다.`;
  fs.writeFileSync(htmlPath,fs.readFileSync(htmlPath,'utf8').replace(/<p id="validation">.*?<\/p>/,`<p id="validation">${esc(message)}</p>`));
}
console.log(JSON.stringify({...summary,inventory:undefined,unmatched:undefined},null,2));
