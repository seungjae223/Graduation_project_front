import api from "./api";

const MAX_IDS = 100;

/** Fetch real unique-like and review counts for every supplied place. */
export async function getPlaceEngagementApi(placeIds, options = {}) {
  if (!Array.isArray(placeIds)) throw new Error("장소 ID 목록이 올바르지 않습니다.");
  const ids = [...new Set(placeIds.map(Number))];
  if (ids.some(id => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("장소 ID 목록이 올바르지 않습니다.");
  }
  if (!ids.length) return [];

  const batches = [];
  for (let i = 0; i < ids.length; i += MAX_IDS) batches.push(ids.slice(i, i + MAX_IDS));
  const results = await Promise.all(batches.map(async batch => {
    const response = await api.get("/api/places/engagement", {
      ...options, params: { ids: batch.join(",") },
    });
    if (!Array.isArray(response.data)) throw new Error("장소 정렬 응답을 확인할 수 없습니다.");
    return response.data;
  }));
  const counts = results.flat();
  const expected = new Set(ids);
  const received = new Set();
  for (const item of counts) {
    if (!expected.has(item?.placeId) || received.has(item.placeId) ||
        !Number.isSafeInteger(item.likeCount) || item.likeCount < 0 ||
        !Number.isSafeInteger(item.reviewCount) || item.reviewCount < 0 ||
        (item.averageRating !== undefined && item.averageRating !== null &&
          (!Number.isFinite(item.averageRating) || item.averageRating < 1 || item.averageRating > 5))) {
      throw new Error("장소 정렬 응답을 확인할 수 없습니다.");
    }
    received.add(item.placeId);
  }
  if (received.size !== expected.size) throw new Error("장소 정렬 응답이 누락됐습니다.");
  return counts;
}
