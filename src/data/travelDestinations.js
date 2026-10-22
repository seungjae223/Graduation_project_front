/**
 * Travel destinations are a product concept, separate from individual places.
 *
 * `regionValues` intentionally keeps the exact backend `Place.region` strings so
 * existing APIs can continue filtering by region while the UI works with a
 * country/region -> destination hierarchy.
 */

export const COUNTRY_REGIONS = [
  { id: "korea", name: "대한민국", scope: "domestic" },
  { id: "japan", name: "일본", scope: "overseas" },
  { id: "hong-kong", name: "홍콩", scope: "overseas" },
  { id: "thailand", name: "태국", scope: "overseas" },
  { id: "vietnam", name: "베트남", scope: "overseas" },
  { id: "philippines", name: "필리핀", scope: "overseas" },
  { id: "united-states", name: "미국", scope: "overseas" },
];

export const TRAVEL_DESTINATIONS = [
  { id: "seoul", name: "서울", countryRegionId: "korea", regionValues: ["서울"] },
  { id: "busan", name: "부산", countryRegionId: "korea", regionValues: ["부산"] },
  { id: "jeju", name: "제주", countryRegionId: "korea", regionValues: ["제주"] },
  { id: "gyeongju", name: "경주", countryRegionId: "korea", regionValues: ["경주"] },

  { id: "tokyo", name: "도쿄", countryRegionId: "japan", regionValues: ["도쿄"] },
  { id: "osaka", name: "오사카", countryRegionId: "japan", regionValues: ["오사카"] },

  { id: "hong-kong", name: "홍콩", countryRegionId: "hong-kong", regionValues: ["홍콩"] },

  { id: "bangkok", name: "방콕", countryRegionId: "thailand", regionValues: ["방콕"] },
  { id: "chiang-mai", name: "치앙마이", countryRegionId: "thailand", regionValues: ["치앙마이"] },

  { id: "da-nang", name: "다낭", countryRegionId: "vietnam", regionValues: ["다낭"] },
  { id: "phu-quoc", name: "푸꾸옥", countryRegionId: "vietnam", regionValues: ["푸꾸옥"] },

  { id: "manila", name: "마닐라", countryRegionId: "philippines", regionValues: ["마닐라"] },
  { id: "cebu", name: "세부", countryRegionId: "philippines", regionValues: ["세부"] },

  { id: "new-york", name: "뉴욕", countryRegionId: "united-states", regionValues: ["뉴욕"] },
  { id: "los-angeles", name: "로스앤젤레스", countryRegionId: "united-states", regionValues: ["로스앤젤레스"] },
];

const countryRegionById = new Map(COUNTRY_REGIONS.map(item => [item.id, item]));
const destinationById = new Map(TRAVEL_DESTINATIONS.map(item => [item.id, item]));
const destinationByRegion = new Map(
  TRAVEL_DESTINATIONS.flatMap(destination =>
    destination.regionValues.map(region => [region, destination])
  )
);

export function getCountryRegion(countryRegionId) {
  return countryRegionById.get(countryRegionId) || null;
}

export function getTravelDestination(destinationId) {
  return destinationById.get(destinationId) || null;
}

export function findTravelDestinationByRegion(region) {
  const normalized = String(region || "").trim();
  return normalized ? destinationByRegion.get(normalized) || null : null;
}

export function getTravelDestinationsByCountryRegion(countryRegionId) {
  return TRAVEL_DESTINATIONS.filter(
    destination => destination.countryRegionId === countryRegionId
  );
}

export function getTravelDestinationContext(destination) {
  if (!destination) return null;
  const countryRegion = getCountryRegion(destination.countryRegionId);
  return countryRegion ? { destination, countryRegion } : null;
}
