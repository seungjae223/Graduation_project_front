// Search uses the destination catalog supplied by the server, not a second
// client-side list of cities. Only country *aliases* are maintained here.
const COUNTRY_ALIASES = Object.freeze({
  kr: ["한국", "대한민국", "south korea", "korea", "republic of korea", "kr"],
  jp: ["일본", "japan", "jp"],
  hk: ["홍콩", "hong kong", "hongkong", "hk"],
  th: ["태국", "thailand", "th"],
  vn: ["베트남", "vietnam", "vn"],
  ph: ["필리핀", "philippines", "ph"],
  us: ["미국", "united states", "united states of america", "usa", "us"],
});

export const normalizeDestinationSearchText = value =>
  String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase();

const safeDestination = item => item &&
  typeof item.code === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.code) &&
  typeof item.name === "string" && Boolean(item.name.trim()) &&
  typeof item.countryName === "string" && Boolean(item.countryName.trim()) &&
  typeof item.countryCode === "string" && Boolean(item.countryCode.trim());

export function requireSearchDestinations(items) {
  if (!Array.isArray(items) || items.some(item => !safeDestination(item)) ||
    new Set(items.map(item => item.code)).size !== items.length) {
    throw new Error("여행지 목록 응답을 확인할 수 없습니다.");
  }
  return items;
}

export function findDestinationSearchMatches(items, keyword) {
  const term = normalizeDestinationSearchText(keyword);
  if (!term) return { isCountrySearch: false, destinations: [] };
  const destinations = requireSearchDestinations(items);
  // If the term is also a city name (Hong Kong), show its place results too.
  const isExactCity = destinations.some(item => normalizeDestinationSearchText(item.name) === term || normalizeDestinationSearchText(item.code) === term);
  const countryCodes = new Set(destinations.filter(item => {
    const code = item.countryCode.trim().toLowerCase();
    return normalizeDestinationSearchText(item.countryName) === term ||
      (Object.prototype.hasOwnProperty.call(COUNTRY_ALIASES, code) ? COUNTRY_ALIASES[code] : []).includes(term);
  }).map(item => item.countryCode.trim().toLowerCase()));
  if (countryCodes.size && !isExactCity) {
    return {
      isCountrySearch: true,
      destinations: destinations.filter(item => countryCodes.has(item.countryCode.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, "ko")),
    };
  }
  const scored = destinations.filter(item =>
    normalizeDestinationSearchText(item.name).includes(term) ||
    normalizeDestinationSearchText(item.code).includes(term));
  scored.sort((a, b) => {
    const rank = item => {
      const name = normalizeDestinationSearchText(item.name);
      const code = normalizeDestinationSearchText(item.code);
      return name === term || code === term ? 0 : name.startsWith(term) || code.startsWith(term) ? 1 : 2;
    };
    return rank(a) - rank(b) || a.name.localeCompare(b.name, "ko");
  });
  return { isCountrySearch: false, destinations: scored };
}
