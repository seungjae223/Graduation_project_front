import { logSafeApiError } from "./safeLog";
const RECENT_PLACES_KEY = "recentPlaces";
const MAX_RECENT_PLACES = 10;

export const isRecentPlaceRecord = place => Boolean(place && typeof place === "object" && !Array.isArray(place) &&
  Number.isSafeInteger(Number(place.id)) && Number(place.id) > 0 &&
  ((typeof place.name === "string" && place.name.trim()) || (typeof place.title === "string" && place.title.trim())) &&
  (!place.viewedAt || Number.isFinite(Date.parse(place.viewedAt))));

// 최근 본 장소 목록 가져오기
export const getRecentPlaces = () => {
  try {
    const savedPlaces = localStorage.getItem(RECENT_PLACES_KEY);

    if (!savedPlaces) {
      return [];
    }

    const records = JSON.parse(savedPlaces);
    return Array.isArray(records) ? records.filter(isRecentPlaceRecord).slice(0, MAX_RECENT_PLACES) : [];
  } catch (error) {
    logSafeApiError(error, "recentPlaces.js");
    return [];
  }
};

// 최근 본 장소 저장하기
export const saveRecentPlace = (place) => {
  if (!isRecentPlaceRecord(place)) {
    return;
  }

  try {
    const recentPlaces = getRecentPlaces();

    // 이미 본 장소라면 기존 목록에서 제거
    const filteredPlaces = recentPlaces.filter(
      (item) => String(item.id) !== String(place.id)
    );

    // 새 장소를 맨 앞에 추가
    const updatedPlaces = [
      {
        ...place,
        viewedAt: new Date().toISOString(),
      },
      ...filteredPlaces,
    ].slice(0, MAX_RECENT_PLACES);

    localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(updatedPlaces));
  } catch (error) {
    logSafeApiError(error, "recentPlaces.js");
  }
};

// 최근 본 장소 하나 삭제하기
export const removeRecentPlace = (placeId) => {
  try {
    const recentPlaces = getRecentPlaces();

    const updatedPlaces = recentPlaces.filter(
      (place) => String(place.id) !== String(placeId)
    );

    localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(updatedPlaces));
  } catch (error) {
    logSafeApiError(error, "recentPlaces.js");
  }
};

// 최근 본 장소 전체 삭제하기
export const clearRecentPlaces = () => {
  try {
    localStorage.removeItem(RECENT_PLACES_KEY);
  } catch (error) {
    logSafeApiError(error, "recentPlaces.js");
  }
};
