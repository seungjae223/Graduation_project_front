// Shared destination grouping for discovery and trip creation.
export const DESTINATION_GROUPS = [
  { key: "all", label: "전체" },
  { key: "japan", label: "일본" },
  { key: "southeast-asia", label: "동남아시아" },
  { key: "americas", label: "아메리카" },
  { key: "greater-china", label: "중화" },
  { key: "other", label: "기타" },
];
const CODES = {
  japan: ["jp"],
  "southeast-asia": ["th","vn","ph","sg","my","id","kh","la","mm","bn","tl"],
  americas: ["us","ca","mx","br","ar","cl","pe","co"],
  "greater-china": ["cn","hk","tw","mo"],
};
export const getDestinationGroup = item =>
  Object.keys(CODES).find(key=>CODES[key].includes(String(item.countryCode || "").trim().toLowerCase())) || "other";

export function filterDestinationCatalog(destinations, scope, group) {
  const inScope = destinations.filter(item => item.scope === scope);
  const visible = group === "all" || scope === "DOMESTIC"
    ? inScope : inScope.filter(item => getDestinationGroup(item) === group);
  const groups = scope === "OVERSEAS"
    ? DESTINATION_GROUPS.filter(item => item.key !== "other" ||
      inScope.some(destination => getDestinationGroup(destination) === "other"))
    : [DESTINATION_GROUPS[0]];
  return { visible, groups };
}

// Editorial descriptions, not engagement statistics or database values.
const TAGLINES = Object.freeze({
  tokyo:"골목마다 새로움을 만나는 도시",
  osaka:"먹거리와 활기로 가득한 거리",
  "hong-kong":"야경과 미식이 빛나는 밤",
  seoul:"오래된 골목과 새로운 감각",
  busan:"바다와 도시가 만나는 풍경",
  jeju:"바람과 푸른 자연의 시간",
  gyeongju:"천 년의 이야기가 깃든 도시",
  bangkok:"찬란한 사원과 활기찬 거리",
  "chiang-mai":"느긋한 하루가 어울리는 곳",
  "da-nang":"해변과 도시가 이어지는 휴식",
  "phu-quoc":"에메랄드빛 바다의 여유",
  manila:"오래된 이야기와 현대의 풍경",
  cebu:"따뜻한 바다로 떠나는 여행",
  "new-york":"매 순간 새로운 장면의 도시",
  "los-angeles":"햇살 아래 펼쳐지는 다양한 매력",
});
export const getDestinationTagline = destination =>
  TAGLINES[destination.code] || (destination.countryName + "의 새로운 풍경");
