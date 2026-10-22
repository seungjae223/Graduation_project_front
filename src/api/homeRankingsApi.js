import api from "./api";

const validCount = value => Number.isSafeInteger(Number(value)) && Number(value) >= 1;
const validName = value => typeof value === "string" && value.trim().length > 0;

export const getHomeRankingsApi = async (options = {}) => {
  const { data } = await api.get("/api/home/rankings", options);
  if (!data || !Array.isArray(data.cities) || !Array.isArray(data.hotPlaces) || data.windowDays !== 30 ||
      data.cities.length > 10 || data.hotPlaces.length > 7 ||
      data.cities.some(item => !validName(item.code) || !validName(item.name) || !validCount(item.tripCount)) ||
      data.hotPlaces.some(item => !validCount(item.placeId) || !validName(item.name) || !validCount(item.engagementCount) ||
        !Number.isSafeInteger(item.likeCount) || item.likeCount < 0 ||
        !Number.isSafeInteger(item.reviewCount) || item.reviewCount < 0 ||
        item.likeCount + item.reviewCount !== item.engagementCount) ||
      new Set(data.cities.map(item => item.code)).size !== data.cities.length ||
      new Set(data.hotPlaces.map(item => item.placeId)).size !== data.hotPlaces.length) {
    throw new Error("홈 인기 순위 응답이 올바르지 않습니다.");
  }
  return data;
};
