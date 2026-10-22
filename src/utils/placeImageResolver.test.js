import { createPlaceImageResolver, resolvePlaceImage, withPlaceImage } from "./placeImageResolver";
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
    expect(image).toMatchObject({ imageSource: expect.stringMatching(/^https:\/\/commons.wikimedia.org\//), author: expect.any(String), license: expect.any(String), licenseUrl: expect.stringMatching(/^https?:\/\//) });
    expect(image.author.length).toBeGreaterThan(0);
    const enriched = withPlaceImage(original);
    expect(enriched.id).toBe(original.id);
    expect(original).not.toHaveProperty("imageUrl");
    expect(enriched.latitude).toBe(original.latitude);
  }
});
