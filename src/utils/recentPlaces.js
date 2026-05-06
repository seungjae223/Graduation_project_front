const RECENT_PLACES_KEY = "recentPlaces";
const MAX_RECENT_PLACES = 10;

// 최근 본 장소 목록 가져오기
export const getRecentPlaces = () => {
  try {
    const savedPlaces = localStorage.getItem(RECENT_PLACES_KEY);

    if (!savedPlaces) {
      return [];
    }

    return JSON.parse(savedPlaces);
  } catch (error) {
    console.error("최근 본 장소를 불러오는 중 오류 발생:", error);
    return [];
  }
};

// 최근 본 장소 저장하기
export const saveRecentPlace = (place) => {
  if (!place || !place.id) {
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
    console.error("최근 본 장소를 저장하는 중 오류 발생:", error);
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
    console.error("최근 본 장소를 삭제하는 중 오류 발생:", error);
  }
};

// 최근 본 장소 전체 삭제하기
export const clearRecentPlaces = () => {
  try {
    localStorage.removeItem(RECENT_PLACES_KEY);
  } catch (error) {
    console.error("최근 본 장소 전체 삭제 중 오류 발생:", error);
  }
};