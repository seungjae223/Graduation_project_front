// The API exposes region, not country/countryCode. These exact city values come
// from places_insert.sql (15 regions) and the existing local place fixtures.
// This is display metadata only: no country codes are sent to the backend.
const countriesByRegion = {
  서울: "한국", 경주: "한국", 부산: "한국", 제주: "한국",
  도쿄: "일본", 오사카: "일본", 교토: "일본", 나라: "일본", 후쿠오카: "일본", 삿포로: "일본",
  마닐라: "필리핀", 세부: "필리핀",
  방콕: "태국", 치앙마이: "태국",
  푸꾸옥: "베트남", 다낭: "베트남",
  로스앤젤레스: "미국", 뉴욕: "미국",
  홍콩: "중국(홍콩)",
};

export const getPlaceCountry = place => {
  const region = String(place?.region || "").trim();
  return Object.prototype.hasOwnProperty.call(countriesByRegion, region) ? countriesByRegion[region] : null;
};

export const getAvailableCountries = places => [...new Set(places.map(getPlaceCountry).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, "ko"));
