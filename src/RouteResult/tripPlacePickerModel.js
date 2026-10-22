// V16.6 place picker rules. No new recommendation model or inferred geography.
export const PLACE_CATEGORIES = [
  { key: "ALL", label: "전체" },
  { key: "LANDMARK", label: "명소" },
  { key: "CULTURE", label: "문화" },
  { key: "NATURE", label: "자연" },
  { key: "FOOD", label: "맛집" },
  { key: "SHOPPING", label: "쇼핑" },
  { key: "EXPERIENCE", label: "체험" },
  { key: "STAY", label: "숙박" },
];
export const placeIdOf = place => Number(place?.id ?? place?.placeId);
const normalized = value => String(value ?? "").trim().normalize("NFKC").toLocaleLowerCase("ko");
export const destinationForTrip = (destinations, tripDestination) =>
  destinations.find(item => normalized(item.name) === normalized(tripDestination) ||
    normalized(item.code) === normalized(tripDestination)) || null;

export function belongsToDestination(place, destination, regionIds) {
  const id = placeIdOf(place);
  if (regionIds?.has(id)) return true;
  const region = normalized(place?.region);
  return Boolean(region && destination &&
    [destination.name, destination.code].some(key => normalized(key) === region));
}

export function normalizeFolderPlace(row) {
  const p = row?.place || row;
  const id = placeIdOf(p);
  return Number.isSafeInteger(id) && id > 0
    ? { ...p, id, name: p.name || p.placeName || "", placeCategory: p.placeCategory || "" } : null;
}

export function classifySources(folders, placesByFolder, destination, regionIds, tripStays = []) {
  const ordinary = [];
  const hotels = new Map();
  let favorites = [];
  for (const [index, folder] of folders.entries()) {
    const places = (placesByFolder[String(folder.id)] || []).map(normalizeFolderPlace).filter(Boolean);
    const matching = places.filter(p => belongsToDestination(p, destination, regionIds));
    for (const place of matching) {
      if (place.placeCategory === "STAY") hotels.set(place.id, place);
    }
    if (folder.systemType === "FAVORITES") {
      favorites = matching;
    } else {
      ordinary.push({
        id: "folder:" + folder.id, name: folder.name || "이름 없는 폴더", places: matching,
        count: matching.length, position: index,
      });
    }
  }
  // Trip stops containing a STAY also belong to My Hotels even if not in any saved folder.
  for (const entry of tripStays) {
    const place = normalizeFolderPlace(entry);
    if (place && place.placeCategory === "STAY" &&
        belongsToDestination(place, destination, regionIds)) {
      hotels.set(place.id, place);
    }
  }
  ordinary.sort((a, b) => b.count - a.count || a.position - b.position);
  return [
    { id: "hotel", name: "내 숙소", places: [...hotels.values()], highlight: false },
    { id: "favorites", name: "좋아하는 장소", places: favorites, highlight: false },
    ...ordinary.map(folder => ({
      ...folder, highlight: folder.count > 0, // Blue ring only for travel-region related folders.
    })),
  ];
}

export function filterPlaceList(places, category, keyword = "") {
  const term = normalized(keyword);
  return places.filter(place => (category === "ALL" || place.placeCategory === category) &&
    (!term || [place.name, place.address, place.region].some(text => normalized(text).includes(term))));
}

// Selection remains checked as the user changes the target day.
// The day only determines which schedule receives the selected places on save.
export function togglePlaceSelection(ids, placeId) {
  return ids.includes(placeId) ? ids.filter(id => id !== placeId) : [...ids, placeId];
}

export const pickerReturnPath = (tripId, day) =>
  "/route-result?id=" + encodeURIComponent(tripId) + "&edit=1&day=" + Number(day);
