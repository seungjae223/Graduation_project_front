// Preview-only: these are examples, never live ranking results.
// Names and photos are sourced from the existing verified place image catalog.
// Never invent user counts or navigate by possibly stale place IDs.
import verifiedImages from "../data/placeImages.json";

const DEMO_CITY_NAMES = [
  ["osaka", "오사카", "일본", "도톤보리"],
  ["tokyo", "도쿄", "일본", "센소지"],
  ["hong-kong", "홍콩", "홍콩", null],
  ["seoul", "서울", "대한민국", "북촌한옥마을"],
  ["busan", "부산", "대한민국", "해운대 해수욕장"],
  ["jeju", "제주", "대한민국", "성산일출봉"],
  ["bangkok", "방콕", "태국", "룸피니 공원"],
  ["da-nang", "다낭", "베트남", "바나힐 골든 브릿지"],
  ["new-york", "뉴욕", "미국", "센트럴 파크"],
  ["cebu", "세부", "필리핀", "산 페드로 요새"],
];
const DEMO_PLACE_NAMES = [
  ["오사카", "오사카성"],
  ["도쿄", "센소지"],
  ["서울", "북촌한옥마을"],
  ["부산", "해운대 해수욕장"],
  ["제주", "성산일출봉"],
  ["오사카", "도톤보리"],
  ["서울", "광장시장"],
];

// Deterministic, visibly DEMO-only activity. It is never mixed into real DB totals.
const DEMO_TRIP_COUNTS = [21, 18, 16, 14, 12, 10, 8, 7, 5, 3];
const DEMO_LIKES = [42, 36, 30, 25, 19, 14, 9];
const DEMO_REVIEWS = [14, 12, 10, 9, 8, 5, 3];

const findVerified = (region, name) =>
  verifiedImages.find(record => record.region === region && record.placeName === name && record.imageUrl);

export const previewCities = DEMO_CITY_NAMES.map(([code, name, countryName, photoName], index) => {
  const photo = photoName ? findVerified(name, photoName) : null;
  return {
    code, name, countryName, tripCount: DEMO_TRIP_COUNTS[index], isPreview: true,
    previewPhoto: photo ? { src: `${process.env.PUBLIC_URL || ""}${photo.imageUrl}`, source: photo.imageSource } : null,
  };
});

export const previewHotPlaces = DEMO_PLACE_NAMES.map(([region, name], index) => {
  const photo = findVerified(region, name);
  return {
    // Preview ID is purely for keyed rendering; preview cards never link to a real place.
    placeId: `demo-${index + 1}`, name, region, isPreview: true,
    likeCount: DEMO_LIKES[index], reviewCount: DEMO_REVIEWS[index],
    engagementCount: DEMO_LIKES[index] + DEMO_REVIEWS[index],
    imageUrl: photo ? `${process.env.PUBLIC_URL || ""}${photo.imageUrl}` : null,
    previewPhotoSource: photo?.imageSource || null,
  };
});
