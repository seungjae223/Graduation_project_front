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
    const rawLat = raw.latitude ?? raw.lat, rawLng = raw.longitude ?? raw.lng ?? raw.lon;
    const supplied = value => value !== null && value !== undefined && value !== "";
    const hasAnyCoordinate = supplied(rawLat) || supplied(rawLng);
    const lat = numeric(rawLat), lng = numeric(rawLng);
    const hasCoordinates = lat !== null && lng !== null && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    if (!name || (hasAnyCoordinate && !hasCoordinates)) return null;
    const region = normalize(raw.region);
    const explicitCountry = raw.countryCode || raw.country || raw.nationCode;
    const country = countryCode(explicitCountry);
    const overseasGroup = normalize(explicitCountry) === "overseas";
    if (explicitCountry && !country && !overseasGroup) return null;
    const address = normalize(raw.address || raw.roadAddress);
    const matchesIdentity = record =>
      [record.placeName, ...(record.aliases || [])].some(alias => normalize(alias) === name) &&
      (!region || [record.region, ...(record.regionAliases || [])].some(value => region === normalize(value))) &&
      (!country || country === record.countryCode) &&
      (!overseasGroup || record.countryCode !== "KR") &&
      (!address || address === normalize(record.address));
    const matches = record => matchesIdentity(record) && hasCoordinates && distanceKm(lat, lng, record) <= 0.25;
    // Compact cards require an exact stored ID, exact name and region.
    // Supplied but invalid/partial coordinates never become a missing-coordinate fallback.
    const matchesId = record => matchesIdentity(record) && (hasCoordinates ? matches(record) : Boolean(region));
    if (explicitId != null && byId.has(String(explicitId))) {
      const record = byId.get(String(explicitId));
      return matchesId(record) ? record : null;
    }
    if (explicitId == null && id != null && byId.has(String(id))) {
      const record = byId.get(String(id));
      if (matchesId(record)) return record;
    }
    if (!hasCoordinates) return null;
    const candidates = [...new Set((byName.get(name) || []).filter(matches))];
    return candidates.length === 1 ? candidates[0] : null;
  };
}

export const resolvePlaceImage = createPlaceImageResolver(verifiedImages);

const approvedCommonsRedirect = src => {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:" || url.hostname !== "commons.wikimedia.org" ||
        !url.pathname.startsWith("/wiki/Special:Redirect/file/")) return false;
    const filename = decodeURIComponent(url.pathname.slice("/wiki/Special:Redirect/file/".length));
    const width = url.searchParams.get("width");
    return Boolean(filename) && !filename.includes("/") && !filename.includes("\\") &&
      filename.length <= 240 && (width === "640" || width === "960");
  } catch {
    return false;
  }
};
// The bundled manifest is reviewed source data, not an API payload. Accept its
// exact HTTPS photo URLs so newly curated publishers do not render as empty
// sources. This does not permit other URLs on the same publisher's host.
const curatedExternalPhotoUrls = new Set(verifiedImages.map(image => image.imageUrl).filter(src => {
  if (typeof src !== "string" || !src.startsWith("https://")) return false;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}));

// Keep the existing constrained provider patterns for reviewed legacy callers.
// Additional publishers are allowed only through the literal manifest set above.
export const placeImageUrl = image => {
  const src = image?.imageUrl;
  if (typeof src !== "string") return "";
  if (src.startsWith("https://")) {
    if (curatedExternalPhotoUrls.has(src)) return src;
    if (/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//.test(src)) return src;
    if (approvedCommonsRedirect(src)) return src;
    if (src === "https://assets.cntraveller.in/photos/60b9f424aa65b6af02d24f16/master/w_1600,c_limit/fourseasonschiangmai.jpg") return src;
    if (/^https:\/\/images\.unsplash\.com\/photo-\d{13}-[a-f0-9]{12}(?:\?w=(?:640|960)&q=(?:75|85))?$/.test(src)) return src;
    if (/^https:\/\/mediahub\.seoul\.go\.kr\/uploads\/mediahub\/\d{4}\/\d{2}\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp)$/i.test(src)) return src;
    return "";
  }
  return src.startsWith("/") && !src.startsWith("//")
    ? `${process.env.PUBLIC_URL || ""}${src}` : "";
};

// If a verified Wikimedia thumb is unavailable, try its canonical file redirect
// ONCE. This URL is derived only from the curated Commons file page, never from
// arbitrary API data. Local and non-Commons images have no alternate.
export function alternatePlaceImageUrl(image) {
  const src = image?.imageUrl;
  const source = image?.imageSource;
  if (typeof src !== "string" ||
      !/^https:\/\/upload\.wikimedia\.org\/wikipedia\/commons\/thumb\//.test(src) ||
      typeof source !== "string") return "";
  try {
    const page = new URL(source);
    if (page.protocol !== "https:" || page.hostname !== "commons.wikimedia.org" ||
        !page.pathname.startsWith("/wiki/File:")) return "";
    const filename = decodeURIComponent(page.pathname.slice("/wiki/File:".length));
    if (!filename || filename.includes("/") || filename.includes("\\") ||
        filename.length > 240) return "";
    return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(filename)}?width=640`;
  } catch {
    return "";
  }
}

// Display enrichment only. Does not alter IDs, region, coordinates or API payloads.
export function withPlaceImage(place) {
  const photo = resolvePlaceImage(place);
  return photo ? { ...place, imageUrl: placeImageUrl(photo), imageCredit: photo.credit } : place;
}

