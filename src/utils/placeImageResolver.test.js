import { createPlaceImageResolver, placeImageUrl, resolvePlaceImage, withPlaceImage } from "./placeImageResolver";
import images from "../data/placeImages.json";

const korea = { placeId: 77, placeName: "동명 공원", countryCode: "KR", region: "서울", address: "서울 공원 주소", latitude: 37.57, longitude: 126.98, imageUrl: "/verified-korea.jpg" };
const america = { ...korea, placeId: 88, countryCode: "US", region: "뉴욕", address: "New York Park", latitude: 40.77, longitude: -73.97, imageUrl: "/verified-us.jpg" };
const resolve = createPlaceImageResolver([korea, america]);
const place = record => ({ id: record.placeId, name: record.placeName, region: record.region, address: record.address, latitude: record.latitude, longitude: record.longitude });

test("same names in different countries use geographic identity; a conflicting stable ID fails closed", () => {
  expect(resolve(place(korea))).toBe(korea);
  expect(resolve(place(america))).toBe(america);
  expect(resolve({ ...place(america), id: korea.placeId })).toBe(america);
  expect(resolve({ ...place(america), placeId: korea.placeId })).toBeNull();
  expect(resolve({ ...place(korea), countryCode: "US" })).toBeNull();
  expect(resolve({ ...place(korea), region: "부산" })).toBeNull();
  expect(resolve({ ...place(korea), address: "다른 주소" })).toBeNull();
});

test("an unknown place, a name alone, invalid coordinates and ambiguous candidates never choose a photo", () => {
  expect(resolve({ name: korea.placeName })).toBeNull();
  expect(resolve({ ...place(korea), id: 999, name: "다른 장소" })).toBeNull();
  expect(resolve({ ...place(korea), latitude: NaN })).toBeNull();
  expect(resolve({ ...place(korea), latitude: 0, longitude: 0 })).toBeNull();
  const ambiguous = createPlaceImageResolver([{ ...korea, placeId: null }, { ...korea, placeId: null, imageUrl: "/other.jpg" }]);
  expect(ambiguous(place(korea))).toBeNull();
});

test("trip visit IDs do not replace place IDs, and original API metadata survives UI normalization", () => {
  expect(resolve({ id: 9123, placeId: 77, placeName: korea.placeName, address: korea.address, latitude: korea.latitude, longitude: korea.longitude })).toBe(korea);
  expect(resolve({ title: "화면 제목", originalData: place(korea) })).toBe(korea);
});

test("the trip display group OVERSEAS retains precise place matching and cannot match Korea", () => {
  expect(resolve({ ...place(america), countryCode: "OVERSEAS" })).toBe(america);
  expect(resolve({ ...place(korea), countryCode: "OVERSEAS" })).toBeNull();
  expect(resolve({ ...place(america), countryCode: "unverified-country" })).toBeNull();
});

test("verified production Rinku ID and multilingual names resolve to one photo and reject contradictory fields", () => {
  const photo = images.find(p => p.placeName === "린쿠 프리미엄 아울렛");
  expect(photo.placeId).toBe(16);
  const raw = { id: 16, name: photo.placeName, region: "오사카", countryCode: "JP", address: photo.address, latitude: photo.latitude, longitude: photo.longitude };
  for (const name of [photo.placeName, "Rinku Premium Outlets", "りんくうプレミアム・アウトレット", "린쿠 프리미엄 아웃렛"]) {
    expect(resolvePlaceImage({ ...raw, name })).toBe(photo);
  }
  expect(resolvePlaceImage({ ...raw, name: "Rinku Premium Outlets", region: "Osaka" })).toBe(photo);
  expect(resolvePlaceImage({ ...raw, region: "大阪", countryCode: "日本" })).toBe(photo);
  expect(resolvePlaceImage({ ...raw, countryCode: "US" })).toBeNull();
  expect(resolvePlaceImage({ ...raw, region: "도쿄" })).toBeNull();
  expect(resolvePlaceImage({ ...raw, latitude: 35.68, longitude: 139.76 })).toBeNull();
});

test("the actual mixed-script park names use explicit verified aliases without changing API names", () => {
  for (const name of ["우에노 은賜 공원", "이노카시라 은賜 공원"]) {
    const photo = images.find(p => p.aliases?.includes(name));
    expect(photo).toBeDefined();
    const raw = { id: photo.placeId, name, region: "도쿄", address: photo.address, latitude: photo.latitude, longitude: photo.longitude };
    expect(resolvePlaceImage(raw)).toBe(photo);
    expect(withPlaceImage(raw).name).toBe(name);
  }
});

test("known backend IDs and photo paths are unique, and every entry retains complete credit information", () => {
  const ids = images.filter(p => p.placeId != null).map(p => p.placeId);
  expect(ids.every(id => Number.isSafeInteger(id) && id > 0)).toBe(true);
  expect(new Set(ids).size).toBe(ids.length);
  expect(new Set(images.map(p => p.imageUrl)).size).toBe(images.length);
  for (const photo of images) {
    expect(photo.imageTitle).toBeTruthy();
    expect(photo.author).toBeTruthy();
    expect(photo.licenseUrl).toMatch(/^https?:\/\//);
  }
});

test("all published photos have provenance and resolve equally from catalog and trip payloads without changing IDs", () => {
  for (const image of images) {
    const original = { id: 90000, name: image.placeName, region: image.region, address: image.address, latitude: image.latitude, longitude: image.longitude };
    const tripPlace = { id: 50000, placeId: original.id, placeName: original.name, address: original.address, latitude: original.latitude, longitude: original.longitude, countryCode: image.countryCode === "KR" ? "KR" : "OVERSEAS" };
    expect(resolvePlaceImage(original)).toBe(image);
    expect(resolvePlaceImage(tripPlace)).toBe(image);
    expect(image).toMatchObject({ imageSource: expect.stringMatching(/^https:\/\//), author: expect.any(String), license: expect.any(String), licenseUrl: expect.stringMatching(/^https?:\/\//) });
    expect(image.author.length).toBeGreaterThan(0);
    expect(placeImageUrl(image)).not.toBe("");
    const enriched = withPlaceImage(original);
    expect(enriched.id).toBe(original.id);
    expect(original).not.toHaveProperty("imageUrl");
    expect(enriched.latitude).toBe(original.latitude);
  }
});

test("approved first-batch photo additions preserve identity, credit and fixed-size remote Wikimedia URLs", () => {
  const expected = ["코엑스 별마당도서관", "혼톰 케이블카", "월트 디즈니 콘서트홀", "코니아일랜드 루나파크"];
  for (const name of expected) {
    const photo = images.find(image => image.placeName === name);
    expect(photo).toBeDefined();
    expect(photo.placeId).toBeNull(); // Historical production IDs must not be guessed.
    expect(photo.imageUrl).toMatch(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//);
    expect(photo.imageUrl).toContain("/640px-");
    expect(photo.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(photo.licenseUrl).toMatch(/^https:\/\//);
    const original = { id: 90000, name, region: photo.region, address: photo.address,
      latitude: photo.latitude, longitude: photo.longitude };
    expect(resolvePlaceImage(original)).toBe(photo);
    expect(withPlaceImage(original).imageUrl).toBe(photo.imageUrl);
    expect(resolvePlaceImage({ ...original, name: "전혀 다른 장소" })).toBeNull();
  }
});

test("unverified photo URLs are not permitted as an external image source", () => {
  const { placeImageUrl } = require("./placeImageResolver");
  expect(placeImageUrl({ imageUrl: "https://example.com/elsewhere.jpg" })).toBe("");
  expect(placeImageUrl({ imageUrl: "http://upload.wikimedia.org/elsewhere.jpg" })).toBe("");
  expect(placeImageUrl({ imageUrl: "//example.com/elsewhere.jpg" })).toBe("");
  expect(placeImageUrl({ imageUrl: "/place-images/verified.jpg" })).toBe("/place-images/verified.jpg");
});
test("verified Commons image has a constrained single fallback without arbitrary host redirects", () => {
  const { alternatePlaceImageUrl } = require("./placeImageResolver");
  const photo = images.find(image => image.placeName === "코엑스 별마당도서관");
  const fallback = alternatePlaceImageUrl(photo);
  expect(fallback).toBe(
    "https://commons.wikimedia.org/wiki/Special:Redirect/file/Books_in_Byeolmadang_Library_(254828841).jpg?width=640"
  );
  expect(alternatePlaceImageUrl(images[0])).toBe("");
  expect(alternatePlaceImageUrl({ imageUrl: photo.imageUrl,
    imageSource: "https://example.org/wiki/File:fake.jpg" })).toBe("");
  expect(alternatePlaceImageUrl({ imageUrl: "https://example.org/fake.jpg",
    imageSource: photo.imageSource })).toBe("");
});

test("second verified photo batch has exact SQL identity and source/licence metadata", () => {
  const expected = ["우도","미케 비치","코끼리 자연 공원","침사추이 프롬나드","나카노시마 공원","요요기 공원","선유도공원","오륙도 스카이워크","청계천","쓰키지 장외시장","섭지코지","흰여울문화마을","센트럴 워터프런트 프롬나드","하이반 고개","오모이데 요코초","남포동 BIFF 광장","에식스 마켓","꼰 시장","핑크 성당","푸꾸옥 야시장","부평 깡통시장"];
  for (const name of expected) {
    const image = images.find(x => x.placeName === name);
    expect(image).toBeDefined();
    expect(image.placeId).toBeNull();
    expect(image.verifiedOn).toBe("2026-11-09");
    expect(image.imageUrl).toMatch(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//);
    expect(image.imageUrl).toContain("640px-");
    expect(image.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(image.author).toBeTruthy();
    expect(image.licenseUrl).toMatch(/^https:\/\//);
    const raw = { id: 99999, name: image.placeName, region: image.region, address: image.address, latitude: image.latitude, longitude: image.longitude };
    expect(resolvePlaceImage(raw)).toBe(image);
    expect(resolvePlaceImage({ ...raw, region: "전혀 다른 도시" })).toBeNull();
  }
});

test("curated third batch preserves matching for named locations without claiming backend IDs", () => {
  const expected = ["야나카 긴자", "아얄라 박물관", "오슬롭 고래상어 와칭", "타이쿤"];
  for (const name of expected) {
    const image = images.find(p => p.placeName === name);
    expect(image).toBeDefined();
    expect(image.placeId).toBeNull();
    expect(image.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(image.imageUrl).toMatch(/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//);
    const place = {id:123456,name:image.placeName,region:image.region,
      address:image.address,latitude:image.latitude,longitude:image.longitude};
    expect(resolvePlaceImage(place)).toBe(image);
    expect(resolvePlaceImage({...place,region:"not this city"})).toBeNull();
  }
});
test("verified third-plus photo batch matches each destination and retains license proof", () => {
  const names = ["서울역사박물관","서울공예박물관","이화벽화마을","하늘공원","포린 수도원","옹핑 빌리지","하이 아일랜드 저수지 동쪽 댐"];
  for (const name of names) {
    const item = images.find(x => x.placeName === name);
    expect(item).toBeDefined();
    expect(item.placeId).toBeNull();
    expect(item.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(item.licenseUrl).toMatch(/^https:\/\//);
    const raw = {id:90000,name,region:item.region,address:item.address,
      latitude:item.latitude,longitude:item.longitude};
    expect(resolvePlaceImage(raw)).toBe(item);
    expect(resolvePlaceImage({...raw,name:"다른 장소"})).toBeNull();
  }
});
test("new Tokyo street and venue photos match only their exact SQL identities", () => {
  const names = ["하라주쿠 다케시타 거리","츠키시마 몬자 스트리트","료고쿠 국기관","미야시타 파크"];
  for (const name of names) {
    const photo=images.find(x=>x.placeName===name);
    expect(photo).toBeDefined();
    expect(photo.imageSource).toContain("commons.wikimedia.org/wiki/File:");
    expect(photo.licenseUrl).toMatch(/^https:\/\//);
    const place={name,region:photo.region,address:photo.address,latitude:photo.latitude,longitude:photo.longitude,id:9000};
    expect(resolvePlaceImage(place)).toBe(photo);
    expect(resolvePlaceImage({...place,address:"different address"})).toBeNull();
  }
});
test("review additions for Busan Sky Capsule and Huntington gardens match identity", () => {
  for (const name of ["해운대 블루라인파크", "헌팅턴 도서관·미술관·식물원"]) {
    const photo = images.find(x => x.placeName === name);
    expect(photo).toBeDefined();
    expect(photo.author).toBeTruthy();
    expect(photo.licenseUrl).toMatch(/^https:\/\//);
    const raw = {name,region:photo.region,address:photo.address,
      latitude:photo.latitude,longitude:photo.longitude,id:12500};
    expect(resolvePlaceImage(raw)).toBe(photo);
    expect(resolvePlaceImage({...raw,region:"not this city"})).toBeNull();
  }
});
test("named Jeju forest, tea museum and Camellia Hill photos remain location-specific", () => {
  for (const name of ["카멜리아 힐","제주 오설록 티뮤지엄","비자림"]) {
    const p=images.find(x=>x.placeName===name);
    expect(p).toBeDefined();
    expect(p.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(p.placeId).toBeNull();
    const raw={id:91111,name,region:p.region,address:p.address,
      latitude:p.latitude,longitude:p.longitude};
    expect(resolvePlaceImage(raw)).toBe(p);
    expect(resolvePlaceImage({...raw,latitude:0})).toBeNull();
  }
});

test("specific SeouI attractions use attributed on-location photos without asserting live IDs", () => {
  const names=["홍대거리","문화비축기지","서울함공원","망원시장","더현대 서울"];
  for (const name of names) {
    const img=images.find(x=>x.placeName===name);
    expect(img).toBeDefined();
    expect(img.placeId).toBeNull();
    expect(img.imageSource).toMatch(/^https:\/\/(?:commons\.wikimedia\.org\/wiki\/File:|english\.seoul\.go\.kr\/)/);
    expect(placeImageUrl(img)).not.toBe("");
    expect(img.licenseUrl).toMatch(/^https:\/\//);
    const p={name,region:img.region,address:img.address,latitude:img.latitude,longitude:img.longitude,id:990000};
    expect(resolvePlaceImage(p)).toBe(img);
    expect(resolvePlaceImage({...p,region:"another"})).toBeNull();
  }
});

test("museum, named beach and Busan coastal trail map to exact SQL location only", () => {
  const names=["대한민국역사박물관","월정리 해변","이기대 수변공원"];
  for (const name of names) {
    const img=images.find(x=>x.placeName===name);
    expect(img).toBeDefined();
    expect(img.placeId).toBeNull();
    expect(img.author).toBeTruthy();
    expect(img.imageSource).toContain("commons.wikimedia.org/wiki/File:");
    const p={id:910000,name,region:img.region,address:img.address,latitude:img.latitude,longitude:img.longitude};
    expect(resolvePlaceImage(p)).toBe(img);
    expect(resolvePlaceImage({...p,name:"another"})).toBeNull();
  }
});

test("recent Tokyo architecture and shopping photos match verified exact place identities", () => {
  const names=["츠타야 서점 다이칸야마","진보초 고서점가","도쿄도미술관","선샤인시티"];
  for (const name of names) {
    const item=images.find(p=>p.placeName===name);
    expect(item).toBeDefined();
    expect(item.placeId).toBeNull();
    expect(item.licenseUrl).toMatch(/^https:\/\//);
    const p={id:91001,name,region:item.region,address:item.address,latitude:item.latitude,longitude:item.longitude};
    expect(resolvePlaceImage(p)).toBe(item);
    expect(resolvePlaceImage({...p,name:"wrong"})).toBeNull();
  }
});

test("Hong Kong site photos are identity-specific and use licensed source pages", () => {
  const names=["홍콩 역사박물관","홍콩 미술관","금붕어 시장","플라워 마켓","스탠리 메인 스트리트","빅웨이브베이"];
  for(const name of names) {
    const ph=images.find(x=>x.placeName===name);
    expect(ph).toBeDefined();
    expect(ph.placeId).toBeNull();
    expect(ph.author).toBeTruthy();
    expect(ph.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    const raw={id:91234,name,region:ph.region,address:ph.address,latitude:ph.latitude,longitude:ph.longitude};
    expect(resolvePlaceImage(raw)).toBe(ph);
    expect(resolvePlaceImage({...raw,region:"서울"})).toBeNull();
  }
});

test("Cebu landmark, market and mall photos preserve exact location, author and licence", () => {
  const names=["탑스 전망대","아얄라 센터 세부","SM 시사이드 시티","수그보 메르카도 (야시장)"];
  for(const name of names) {
    const photo=images.find(x=>x.placeName===name);
    expect(photo).toBeDefined();
    expect(photo.placeId).toBeNull();
    expect(photo.author).toBeTruthy();
    expect(photo.licenseUrl).toMatch(/^https:\/\//);
    const raw={id:910000,name,region:photo.region,address:photo.address,
      latitude:photo.latitude,longitude:photo.longitude};
    expect(resolvePlaceImage(raw)).toBe(photo);
    expect(resolvePlaceImage({...raw,latitude:0})).toBeNull();
  }
});

test("Hong Kong batch-03 photos preserve exact place identity and reuse proof", () => {
  const names=["웨스트 카오룽 아트 파크","제이드 마켓","캣 스트리트","IFC 몰","애버딘 프롬나드"];
  for(const name of names) {
    const photo=images.find(x=>x.placeName===name);
    expect(photo).toBeDefined();
    expect(photo.placeId).toBeNull();
    const replacedInBatch04 = ["제이드 마켓", "캣 스트리트", "IFC 몰"].includes(name);
    expect(photo.reviewBatch).toBe(replacedInBatch04 ? "2026-11-09-batch-04" : "2026-11-09-batch-03");
    expect(photo.author).toBeTruthy();
    expect(photo.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(photo.licenseUrl).toMatch(/^https:\/\//);
    const raw={id:920000,name,region:photo.region,address:photo.address,
      latitude:photo.latitude,longitude:photo.longitude};
    expect(resolvePlaceImage(raw)).toBe(photo);
    expect(resolvePlaceImage({...raw,region:"서울"})).toBeNull();
  }
});

test("official Seoul media photo host is narrowly allowlisted", () => {
  const approved="https://mediahub.seoul.go.kr/uploads/mediahub/2022/05/hiOyAnFauPSVjChDvANdlFiBNbMDeNRR.jpg";
  expect(placeImageUrl({imageUrl:approved})).toBe(approved);
  expect(placeImageUrl({imageUrl:"https://mediahub.seoul.go.kr/other/photo.jpg"})).toBe("");
  expect(placeImageUrl({imageUrl:"https://example.com/photo.jpg"})).toBe("");
});

test("batch-04 replacements and twenty new mappings keep exact place identity", () => {
  const names=["망원시장","수그보 메르카도 (야시장)","제이드 마켓","캣 스트리트","IFC 몰","도쿄 디즈니씨","도쿄 캐릭터 스트리트","오쿠타마호","스미다 수족관","팀랩 보더리스","마루노우치 나카도리","스타 시티","더 패닌슐라 마닐라","성수동 카페거리","서소문성지역사박물관","서울약령시한의약박물관","서울식물원","더베이101","아홉산숲","방끄라차오 시 나콘 쿠언 칸 공원","아이콘시암","마하나콘 스카이워크","도쿄 라멘 스트리트","스모 박물관","마닐라 오션 파크","타임스퀘어 영등포","롯데월드몰","라마 섬"];
  expect(names).toHaveLength(28);
  for(const name of names) {
    const photo=images.find(x=>x.placeName===name);
    expect(photo).toBeDefined();
    expect(photo.reviewBatch).toBe("2026-11-09-batch-04");
    expect(photo.author).toBeTruthy();
    expect(photo.licenseUrl).toMatch(/^https:\/\//);
    const raw={id:930000,name,region:photo.region,address:photo.address,latitude:photo.latitude,longitude:photo.longitude};
    expect(resolvePlaceImage(raw)).toBe(photo);
    expect(resolvePlaceImage({...raw,latitude:0})).toBeNull();
  }
});

test("canonical Commons file redirects are narrowly allowlisted", () => {
  const ok="https://commons.wikimedia.org/wiki/Special:Redirect/file/Seochon%20scene.jpg?width=960";
  expect(placeImageUrl({imageUrl:ok})).toBe(ok);
  expect(placeImageUrl({imageUrl:"https://commons.wikimedia.org/wiki/Special:Redirect/file/%2Fetc%2Fpasswd?width=960"})).toBe("");
  expect(placeImageUrl({imageUrl:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Seochon%20scene.jpg?width=1200"})).toBe("");
  expect(placeImageUrl({imageUrl:"https://evil.example/wiki/Special:Redirect/file/a.jpg?width=960"})).toBe("");
});

test("batch-05 adds forty canonical Commons mappings with exact SQL identity", () => {
  const names=["도쿄 토요스 만요클럽","스몰 월즈","워너 브라더스 스튜디오 투어 도쿄","콘래드 마닐라","페어몬트 마카티","서촌마을","이태원 경리단길","신사동 가로수길","삼청동","여의도한강공원","아차산","대학로","한양도성 백악구간","국립극장","주상절리 파도소리길","사려니숲길","한라산 (영실코스)","성이시돌목장","곽지해수욕장 (과물노천탕)","웨스틴 조선 부산","그랜드 조선 부산","롯데호텔 제주","방콕 현대미술관 모카","비스타 허모사 자연공원","워너브라더스 스튜디오 투어","로즈우드 홍콩","홍콩 오션파크 메리어트 호텔","어퍼 하우스 (The Upper House)","클리어워터베이 세컨드 비치","워터 월드 오션파크","후아이 퉁 타오 호수","매림 식물원","원 님만","빈펄 사파리","호국사","지중해 마을","영응사","손짜 반도 드라이브","오행산 동굴 탐험","바나힐 프렌치 빌리지"];
  expect(names).toHaveLength(40);
  for(const name of names) {
    const photo=images.find(x=>x.placeName===name);
    expect(photo).toBeDefined();
    expect(photo.reviewBatch).toBe(name === "서촌마을" ? "2026-11-09-batch-06" : "2026-11-09-batch-05");
    expect(photo.placeId).toBeNull();
    expect(photo.author).toBeTruthy();
    expect(photo.imageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:Redirect\/file\//);
    expect(photo.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(photo.licenseUrl).toMatch(/^https?:\/\//);
    const raw={id:940000,name,region:photo.region,address:photo.address,latitude:photo.latitude,longitude:photo.longitude};
    expect(resolvePlaceImage(raw)).toBe(photo);
    expect(resolvePlaceImage({...raw,region:"잘못된지역"})).toBeNull();
  }
});

test("batch-06 includes one Seochon replacement and forty new exact mappings", () => {
  const names=["서촌마을","한강공원 (반포/뚝섬)","아모레퍼시픽미술관","백인제가옥","청담패션거리","부암동","북악스카이웨이 팔각정","포시즌스 호텔 서울","돈의문박물관마을","압구정 로데오거리","잠실한강공원","감포항 & 송대말등대","전포카페거리","시라오 가든","세부 사파리 & 어드벤처 파크","올랑고섬 패키지","판단논섬","10,000 장미 카페","제이파크 아일랜드 리조트","샹그릴라 막탄 리조트","쉐라톤 세부 막탄 리조트","더 마르코 폴로 플라자","포시즌스 호텔 방콕 앳 차오프라야 리버","아난타라 리버사이드 방콕 리조트","짜오프라야 관광 보트","셔터스 온 더 비치","테라니아 리조트","어반 라이트","원 호텔 브루클린 브리지","더 윌리엄 베일","얏록 (Yat Lok)","타마린드 빌리지","함닌 어촌 마을","빈원더스","JW 메리어트 푸꾸옥","코코넛 배 탑승","하얏트 리젠시 다낭","사랑의 부두","경주엑스포대공원","시그니엘 부산","파크 하얏트 서울"];
  expect(names).toHaveLength(41);
  expect(names.filter(name=>name==="서촌마을")).toHaveLength(1);
  for(const name of names) {
    const photo=images.find(x=>x.placeName===name);
    expect(photo).toBeDefined();
    const replacedInBatch07 = ["청담패션거리", "압구정 로데오거리", "시그니엘 부산"].includes(name);
    expect(photo.reviewBatch).toBe(replacedInBatch07 ? "2026-11-09-batch-07" : "2026-11-09-batch-06");
    expect(photo.author).toBeTruthy();
    expect(photo.imageUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:Redirect\/file\//);
    expect(photo.imageSource).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    expect(photo.licenseUrl).toMatch(/^https?:\/\//);
    const raw={id:950000,name,region:photo.region,address:photo.address,latitude:photo.latitude,longitude:photo.longitude};
    expect(resolvePlaceImage(raw)).toBe(photo);
    expect(resolvePlaceImage({...raw,latitude:0})).toBeNull();
  }
  const seochon=images.find(x=>x.placeName==="서촌마을");
  expect(seochon.imageTitle).toBe("Seochon Village, Nuha-dong.jpg");
  expect(seochon.credit).toBe("verified-629");
});



const restoredPublisherNames = ["이촌한강공원", "송도 해상케이블카", "청사포 다릿돌전망대", "날루수안섬", "서울달", "경주 보문정", "노형슈퍼마캩", "경주 풍력발전단지", "산방산 탄산온천", "선셋 사나토 비치 클럽", "동래파전 골목"];

test("curated publisher photos produce display URLs for every previously blocked location", () => {
  for (const name of restoredPublisherNames) {
    const photo = images.find(image => image.placeName === name);
    expect(photo).toBeDefined();
    expect(placeImageUrl(photo)).toBe(`${photo.imageUrl.startsWith("/") ? process.env.PUBLIC_URL || "" : ""}${photo.imageUrl}`);
    expect(withPlaceImage({ name, region: photo.region, address: photo.address,
      latitude: photo.latitude, longitude: photo.longitude }).imageUrl).toBe(placeImageUrl(photo));
  }
});

test("manifest approval does not admit unlisted URLs or altered queries on the same publisher", () => {
  const photo = images.find(image => image.placeName === "경주 보문정");
  expect(photo).toBeDefined();
  for (const imageUrl of [
    "https://tong.visitkorea.or.kr/cms/resource/00/unreviewed.jpg",
    "https://tong.visitkorea.or.kr/cms/resource/10/2654210_image2_1.jpg?unreviewed=1",
    "https://www.kogl.or.kr/unreviewed.jpg",
    "https://tong.visitkorea.or.kr.evil.example/photo.jpg",
    "https://tong.visitkorea.or.kr@evil.example/photo.jpg",
    "http://tong.visitkorea.or.kr/cms/resource/10/2654210_image2_1.jpg",
    "//tong.visitkorea.or.kr/cms/resource/10/2654210_image2_1.jpg",
    "javascript:alert(1)"
  ]) expect(placeImageUrl({ imageUrl })).toBe("");
});

const remaining49CatalogFixtures = [
  {
    "name": "나니와노유 온천",
    "region": "오사카",
    "countryCode": "JP",
    "address": "1 Chome-7-31 Naniwanaka, Kita Ward, Osaka",
    "latitude": 34.7171,
    "longitude": 135.5152
  },
  {
    "name": "센난 롱 파크",
    "region": "오사카",
    "countryCode": "JP",
    "address": "2-1 Rinkuminamihama, Sennan, Osaka",
    "latitude": 34.3644,
    "longitude": 135.2444
  },
  {
    "name": "스타 디스트릭트 (파사이)",
    "region": "마닐라",
    "countryCode": "PH",
    "address": "Roxas Blvd, Pasay, Manila",
    "latitude": 14.5422,
    "longitude": 120.9904
  },
  {
    "name": "샹그릴라 더 포트 보니파시오",
    "region": "마닐라",
    "countryCode": "PH",
    "address": "30th St, Bonifacio Global City, Taguig",
    "latitude": 14.5518,
    "longitude": 121.0454
  },
  {
    "name": "시라오 피크",
    "region": "세부",
    "countryCode": "PH",
    "address": "Sibugay, Cebu City",
    "latitude": 10.4011,
    "longitude": 123.9022
  },
  {
    "name": "D뮤지엄",
    "region": "서울",
    "countryCode": "KR",
    "address": "83-21 Wangsimni-ro, Seongdong-gu, Seoul",
    "latitude": 37.5441,
    "longitude": 127.0448
  },
  {
    "name": "추억의 달동네",
    "region": "경주",
    "countryCode": "KR",
    "address": "경상북도 경주시 보문로 424-34",
    "latitude": 35.8344,
    "longitude": 129.2941
  },
  {
    "name": "반얀트리 클럽 앤 스파 서울",
    "region": "서울",
    "countryCode": "KR",
    "address": "서울특별시 중구 장충단로 60",
    "latitude": 37.551,
    "longitude": 126.9995
  },
  {
    "name": "시그니엘 서울",
    "region": "서울",
    "countryCode": "KR",
    "address": "서울특별시 송파구 올림픽로 300",
    "latitude": 37.5126,
    "longitude": 127.1025
  },
  {
    "name": "라한셀렉트 경주",
    "region": "경주",
    "countryCode": "KR",
    "address": "경상북도 경주시 보문로 338",
    "latitude": 35.8447,
    "longitude": 129.2743
  },
  {
    "name": "더케이호텔 경주",
    "region": "경주",
    "countryCode": "KR",
    "address": "경상북도 경주시 엑스포로 45",
    "latitude": 35.8402,
    "longitude": 129.2858
  },
  {
    "name": "블루원리조트",
    "region": "경주",
    "countryCode": "KR",
    "address": "경상북도 경주시 보문로 390-31",
    "latitude": 35.8286,
    "longitude": 129.2908
  },
  {
    "name": "코오롱호텔",
    "region": "경주",
    "countryCode": "KR",
    "address": "경상북도 경주시 불국로 289-17",
    "latitude": 35.7876,
    "longitude": 129.3245
  },
  {
    "name": "아난티 앳 부산 기장",
    "region": "부산",
    "countryCode": "KR",
    "address": "부산광역시 기장군 기장읍 기장해안로 268-32",
    "latitude": 35.1969,
    "longitude": 129.2285
  },
  {
    "name": "파크 하얏트 부산",
    "region": "부산",
    "countryCode": "KR",
    "address": "부산광역시 해운대구 마린시티1로 51",
    "latitude": 35.1554,
    "longitude": 129.1396
  },
  {
    "name": "그랜드 하얏트 제주",
    "region": "제주",
    "countryCode": "KR",
    "address": "제주특별자치도 제주시 노연로 12",
    "latitude": 33.4852,
    "longitude": 126.4815
  },
  {
    "name": "파르나스 호텔 제주",
    "region": "제주",
    "countryCode": "KR",
    "address": "제주특별자치도 서귀포시 중문관광로72번길 100",
    "latitude": 33.2405,
    "longitude": 126.4095
  },
  {
    "name": "JW 메리어트 제주 리조트 앤 스파",
    "region": "제주",
    "countryCode": "KR",
    "address": "제주특별자치도 서귀포시 호근서호로 162",
    "latitude": 33.2285,
    "longitude": 126.5358
  },
  {
    "name": "쿠아 압손",
    "region": "방콕",
    "countryCode": "TH",
    "address": "503/3 Dinso Rd, Sao Chingcha, Phra Nakhon, Bangkok 10200, Thailand",
    "latitude": 13.757729,
    "longitude": 100.501637
  },
  {
    "name": "카펠라 방콕",
    "region": "방콕",
    "countryCode": "TH",
    "address": "300/2 Charoen Krung Rd, Yannawa, Sathorn, Bangkok 10120, Thailand",
    "latitude": 13.71297,
    "longitude": 100.510997
  },
  {
    "name": "산타모니카 프로퍼 호텔",
    "region": "로스앤젤레스",
    "countryCode": "US",
    "address": "700 Wilshire Blvd, Santa Monica, CA 90401, USA",
    "latitude": 34.021575,
    "longitude": -118.494717
  },
  {
    "name": "님만해민 스파",
    "region": "치앙마이",
    "countryCode": "TH",
    "address": "Nimmanahaeminda Rd, Chiang Mai",
    "latitude": 18.7981,
    "longitude": 98.9667
  },
  {
    "name": "타이 쿠킹 클래스",
    "region": "치앙마이",
    "countryCode": "TH",
    "address": "Mueang Chiang Mai District, Chiang Mai",
    "latitude": 18.7885,
    "longitude": 98.9856
  },
  {
    "name": "무에타이 체험",
    "region": "치앙마이",
    "countryCode": "TH",
    "address": "Mueang Chiang Mai District, Chiang Mai",
    "latitude": 18.796,
    "longitude": 98.968
  },
  {
    "name": "통마 스튜디오",
    "region": "치앙마이",
    "countryCode": "TH",
    "address": "Mae Rim District, Chiang Mai",
    "latitude": 18.922,
    "longitude": 98.932
  },
  {
    "name": "촘 카페",
    "region": "치앙마이",
    "countryCode": "TH",
    "address": "Hang Dong District, Chiang Mai",
    "latitude": 18.7408,
    "longitude": 98.9332
  },
  {
    "name": "137 필라스 하우스",
    "region": "치앙마이",
    "countryCode": "TH",
    "address": "Wat Ket, Chiang Mai",
    "latitude": 18.7909,
    "longitude": 99.0039
  },
  {
    "name": "아난타라 치앙마이 리조트",
    "region": "치앙마이",
    "countryCode": "TH",
    "address": "Charoen Prathet Rd, Mueang Chiang Mai",
    "latitude": 18.7808,
    "longitude": 99.004
  },
  {
    "name": "라야 헤리티지",
    "region": "치앙마이",
    "countryCode": "TH",
    "address": "Mae Rim District, Chiang Mai",
    "latitude": 18.8471,
    "longitude": 98.9818
  },
  {
    "name": "호핑투어",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "An Thoi, Phu Quoc",
    "latitude": 10.0242,
    "longitude": 103.9935
  },
  {
    "name": "오징어 낚시 투어",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Duong Dong, Phu Quoc",
    "latitude": 10.2241,
    "longitude": 103.9583
  },
  {
    "name": "ATV 정글 투어",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Cua Can, Phu Quoc",
    "latitude": 10.2505,
    "longitude": 103.9942
  },
  {
    "name": "크랩 하우스",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Duong Dong, Phu Quoc",
    "latitude": 10.2201,
    "longitude": 103.9575
  },
  {
    "name": "분짜 하노이 푸꾸옥",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Duong Dong, Phu Quoc",
    "latitude": 10.2163,
    "longitude": 103.9632
  },
  {
    "name": "해산물 숯불구이 거리",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Duong Dong, Phu Quoc",
    "latitude": 10.2198,
    "longitude": 103.9586
  },
  {
    "name": "OCSEN 비치 바",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Duong Dong, Phu Quoc",
    "latitude": 10.1962,
    "longitude": 103.963
  },
  {
    "name": "리젠트 푸꾸옥",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Duong To, Phu Quoc",
    "latitude": 10.1581,
    "longitude": 103.9786
  },
  {
    "name": "살린다 리조트",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Duong To, Phu Quoc",
    "latitude": 10.1947,
    "longitude": 103.9658
  },
  {
    "name": "남응이 코럴 페닌슐라",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Cua Can, Phu Quoc",
    "latitude": 10.3204,
    "longitude": 103.8569
  },
  {
    "name": "인터컨티넨탈 푸꾸옥",
    "region": "푸꾸옥",
    "countryCode": "VN",
    "address": "Duong To, Phu Quoc",
    "latitude": 10.1601,
    "longitude": 103.9791
  },
  {
    "name": "남하이 스파",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Dien Ban, Quang Nam",
    "latitude": 15.908,
    "longitude": 108.312
  },
  {
    "name": "미케 비치 패러세일링",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Son Tra District, Da Nang",
    "latitude": 16.059,
    "longitude": 108.2495
  },
  {
    "name": "한강 유람선 투어",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Hai Chau District, Da Nang",
    "latitude": 16.0654,
    "longitude": 108.2263
  },
  {
    "name": "반쎄오 바즈엉",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Hai Chau District, Da Nang",
    "latitude": 16.0631,
    "longitude": 108.2173
  },
  {
    "name": "목 해산물 식당",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Son Tra District, Da Nang",
    "latitude": 16.0635,
    "longitude": 108.2452
  },
  {
    "name": "콩카페",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Hai Chau District, Da Nang",
    "latitude": 16.0695,
    "longitude": 108.223
  },
  {
    "name": "퓨전 마이아 다낭",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Ngu Hanh Son District, Da Nang",
    "latitude": 16.0371,
    "longitude": 108.2514
  },
  {
    "name": "티아 웰니스 리조트",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Ngu Hanh Son District, Da Nang",
    "latitude": 16.035,
    "longitude": 108.25
  },
  {
    "name": "나만 리트리트",
    "region": "다낭",
    "countryCode": "VN",
    "address": "Ngu Hanh Son District, Da Nang",
    "latitude": 15.968,
    "longitude": 108.2711
  }
];

test("the requested 49 catalog locations resolve to bundled photos with source attribution", () => {
  expect(remaining49CatalogFixtures).toHaveLength(49);
  const matched = remaining49CatalogFixtures.map(raw => {
    const photo = resolvePlaceImage(raw);
    expect(photo).not.toBeNull();
    expect(photo.imageUrl).toMatch(/^\/place-images\//);
    expect(photo.imageSource).toMatch(/^https:\/\//);
    expect(photo.author).toBeTruthy();
    expect(photo.license).toBeTruthy();
    expect(photo.licenseUrl).toMatch(/^https?:\/\//);
    expect(withPlaceImage(raw).imageUrl).toBe(`${process.env.PUBLIC_URL || ""}${photo.imageUrl}`);
    expect(resolvePlaceImage({ ...raw, region: "unrelated region" })).toBeNull();
    return photo.identityKey;
  });
  expect(new Set(matched).size).toBe(49);
});
