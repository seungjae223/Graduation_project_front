import api from "./api";
import { requireList } from "./responseContract";

const positiveId = value => Number.isSafeInteger(Number(value)) && Number(value) > 0;

export const getPlaceEngagementApi = async (placeIds, options = {}) => {
  if (!Array.isArray(placeIds) || !placeIds.length || !placeIds.every(positiveId)) {
    throw new Error("집계할 유효한 장소 ID를 입력해주세요.");
  }
  const ids = [...new Set(placeIds.map(Number))];
  const batches = [];
  for (let start = 0; start < ids.length; start += 100) batches.push(ids.slice(start, start + 100));
  const responses = await Promise.all(batches.map(batch => api.get("/api/places/engagement", {
    ...options,
    params: { ids: batch.join(",") },
  })));
  const data = responses.flatMap(response => requireList(response.data));
  if (data.length !== ids.length || data.some(row =>
      !ids.includes(Number(row?.placeId)) || !Number.isSafeInteger(Number(row.likeCount)) ||
      Number(row.likeCount) < 0 || !Number.isSafeInteger(Number(row.reviewCount)) ||
      Number(row.reviewCount) < 0) ||
      new Set(data.map(row => Number(row.placeId))).size !== ids.length) {
    throw new Error("좋아요·리뷰 집계 응답을 확인할 수 없습니다.");
  }
  return data;
};

export const likePlaceApi = async placeId => {
  if (!positiveId(placeId)) throw new Error("장소 ID를 확인해주세요.");
  return (await api.put(`/api/favorites/places/${encodeURIComponent(placeId)}`)).data;
};

export const unlikePlaceApi = async placeId => {
  if (!positiveId(placeId)) throw new Error("장소 ID를 확인해주세요.");
  return (await api.delete(`/api/favorites/places/${encodeURIComponent(placeId)}`)).data;
};
