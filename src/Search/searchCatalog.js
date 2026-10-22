export const SEARCH_PAGE_SIZE = 5;

export function requireSearchPlaces(places) {
  if (!Array.isArray(places) || places.some(place =>
    !Number.isSafeInteger(Number(place?.id)) || Number(place.id) <= 0 ||
    typeof place.name !== "string" || !place.name.trim() ||
    ["region", "address", "placeCategory", "placeCategoryLabel"].some(key => place[key] != null && typeof place[key] !== "string")) ||
    new Set(places.map(place => String(place.id))).size !== places.length) {
    throw new Error("장소 조회 응답을 확인할 수 없습니다.");
  }
  return places;
}

// Options come only from the complete place response. Values retain the server's
// exact region strings; the backend has no separate country or region codes.
export function getSearchRegions(places) {
  const regions = new Map();
  for (const place of places) {
    if (typeof place.region !== "string" || !place.region.trim()) continue;
    const name = place.region.trim();
    if (!regions.has(name)) regions.set(name, { name, values: new Set() });
    regions.get(name).values.add(place.region);
  }
  return [...regions.values()].map(region => ({ name: region.name, values: [...region.values] }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function filterSearchPlaces(places, region) {
  return places.filter(place => !region || region.values.includes(place.region));
}
