import verifiedImages from "../data/placeImages.json";

const normalize = value => String(value || "").normalize("NFKC").trim().replace(/\s+/g, "").toLowerCase();
const numeric = value => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
const countries = { 한국:"KR", 대한민국:"KR", southkorea:"KR", 일본:"JP", japan:"JP", 日本:"JP", 미국:"US", usa:"US", unitedstates:"US", 필리핀:"PH", philippines:"PH", 태국:"TH", thailand:"TH", 베트남:"VN", vietnam:"VN", 홍콩:"HK", "중국(홍콩)":"HK", hongkong:"HK" };
const countryCode = value => /^[a-z]{2}$/i.test(String(value || "").trim()) ? String(value).trim().toUpperCase() : countries[normalize(value)] || null;
const distanceKm = (lat, lng, record) => {
  const rad = Math.PI / 180;
  const dLat = (record.latitude - lat) * rad, dLng = (record.longitude - lng) * rad;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.sin(dLat / 2) ** 2 + Math.cos(lat * rad) * Math.cos(record.latitude * rad) * Math.sin(dLng / 2) ** 2));
};

export function createPlaceImageResolver(records) {
  const byId = new Map(), byName = new Map();
  for (const record of records) {
    if (record.placeId != null) byId.set(String(record.placeId), record);
    for (const name of [record.placeName, ...(record.aliases || [])]) {
      const key = normalize(name);
      byName.set(key, [...(byName.get(key) || []), record]);
    }
  }
  return place => {
    if (!place || typeof place !== "object") return null;
    // Normalizers preserve the original API object; tripPlace.id is a visit ID.
    const raw = { ...place, ...(place.originalData || place.rawPlace || {}) };
    const name = normalize(raw.name || raw.placeName || raw.title);
    const explicitId = raw.placeId ?? raw.originalId;
    const id = explicitId ?? raw.id;
    const lat = numeric(raw.latitude ?? raw.lat), lng = numeric(raw.longitude ?? raw.lng ?? raw.lon);
    if (!name || lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    const region = normalize(raw.region);
    const explicitCountry = raw.countryCode || raw.country || raw.nationCode;
    const country = countryCode(explicitCountry);
    // RouteResult uses OVERSEAS as a display group, not an ISO country code.
    const overseasGroup = normalize(explicitCountry) === "overseas";
    if (explicitCountry && !country && !overseasGroup) return null;
    const address = normalize(raw.address || raw.roadAddress);
    const matches = record =>
      [record.placeName, ...(record.aliases || [])].some(alias => normalize(alias) === name) &&
      (!region || [record.region, ...(record.regionAliases || [])].some(value => region === normalize(value))) &&
      (!country || country === record.countryCode) &&
      (!overseasGroup || record.countryCode !== "KR") &&
      (!address || address === normalize(record.address)) &&
      distanceKm(lat, lng, record) <= 0.25;
    // Explicit placeId/originalId remains authoritative. A plain catalog id may
    // drift after a local reseed, so a contradictory raw id falls back to
    // unique name + geography matching instead of hiding a valid photo.
    if (explicitId != null && byId.has(String(explicitId))) {
      return matches(byId.get(String(explicitId))) ? byId.get(String(explicitId)) : null;
    }
    if (explicitId == null && id != null && byId.has(String(id))) {
      const idRecord = byId.get(String(id));
      if (matches(idRecord)) return idRecord;
    }
    const candidates = [...new Set((byName.get(name) || []).filter(matches))];
    return candidates.length === 1 ? candidates[0] : null;
  };
}

export const resolvePlaceImage = createPlaceImageResolver(verifiedImages);
export const placeImageUrl = image => image ? `${process.env.PUBLIC_URL || ""}${image.imageUrl}` : "";

// Display enrichment only. Does not alter IDs, region, coordinates or API payloads.
export function withPlaceImage(place) {
  const photo = resolvePlaceImage(place);
  return photo ? { ...place, imageUrl: placeImageUrl(photo), imageCredit: photo.credit } : place;
}
