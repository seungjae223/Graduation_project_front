import api from "./api";
import { requireList } from "./responseContract";
import { toApiTheme } from "../utils/placeTheme";

export const getPlacesApi = async (options = {}) => {
  const places = requireList((await api.get("/api/places", options)).data);
  if (places.some(place => !Number.isSafeInteger(Number(place?.id)) || Number(place.id) <= 0 || !place.name) ||
      new Set(places.map(place => String(place.id))).size !== places.length) {
    throw new Error("장소 목록 응답을 확인할 수 없습니다.");
  }
  return places;
};

export const createPlaceApi = async (place) =>
  (await api.post("/api/places", place)).data;

export const getPlaceApi = async (placeId) =>
  (await api.get(`/api/places/${encodeURIComponent(placeId)}`)).data;

export const deletePlaceApi = async (placeId) =>
  (await api.delete(`/api/places/${encodeURIComponent(placeId)}`)).data;

export const searchPlacesApi = async (keyword, options = {}) => {
  const normalizedKeyword = String(keyword || "").trim().replace(/\s+/g, " ");
  if (!normalizedKeyword) throw new Error("검색어를 입력해주세요.");
  if (normalizedKeyword.length > 100) {
    throw new Error("검색어는 100자 이하로 입력해주세요.");
  }
  const response = await api.get("/api/places/search", {
    ...options,
    params: { keyword: normalizedKeyword },
  });
  const places = requireList(response.data);
  if (places.some(place => !Number.isSafeInteger(Number(place?.id)) || Number(place.id) <= 0 || !place.name)) {
    throw new Error("장소 검색 응답을 확인할 수 없습니다.");
  }
  return places;
};

export const getRecommendationsApi = async (params = {}, options = {}) => {
  const response = await api.get("/api/recommendations", {
    ...options,
    params: {
      ...(params.region ? { region: params.region } : {}),
      ...(params.theme ? { theme: toApiTheme(params.theme) } : {}),
    },
  });
  return requireList(response.data);
};

export const getRecentSearchesApi = async (options = {}) =>
  requireList((await api.get("/api/recent-searches", options)).data);

export const deleteRecentSearchApi = async (id) =>
  api.delete(`/api/recent-searches/${encodeURIComponent(id)}`);

export const clearRecentSearchesApi = async () =>
  api.delete("/api/recent-searches");

export const getRecentPlacesApi = async (options = {}) =>
  requireList((await api.get("/api/recent-places", options)).data);

export const getFoldersApi = async (options = {}) => requireList((await api.get("/api/folders", options)).data);

export const createFolderApi = async (name) =>
  (await api.post("/api/folders", { name: String(name || "").trim() })).data;

export const savePlaceToFolderApi = async ({ folderId, placeId }) =>
  (await api.post(
    `/api/folders/${encodeURIComponent(folderId)}/places/${encodeURIComponent(placeId)}`
  )).data;

export const removePlaceFromFolderApi = async ({ folderId, placeId }) =>
  (await api.delete(
    `/api/folders/${encodeURIComponent(folderId)}/places/${encodeURIComponent(placeId)}`
  )).data;

export const getFolderPlacesApi = async (folderId, options = {}) =>
  requireList(
    (await api.get(`/api/folders/${encodeURIComponent(folderId)}/places`, options)).data
  );

export const getReviewsApi = async (placeId) =>
  requireList((await api.get(`/api/places/${encodeURIComponent(placeId)}/reviews`)).data);

// Review creation requires an authenticated user; validate before sending the POST.
export const createReviewApi = async ({ placeId, comment, rating }) => {
  const text = String(comment || "").trim();
  const score = Number(rating);
  if (!text || text.length > 255 || rating == null || rating === "" ||
      !Number.isInteger(score) || score < 1 || score > 5) {
    throw new Error("리뷰는 255자 이내로 작성하고, 별점은 1~5점으로 선택해 주세요.");
  }
  return (await api.post(`/api/places/${encodeURIComponent(placeId)}/reviews`, {
    comment: text, rating: score,
  })).data;
};

// Read at most five reviews at once. Keep legacy getReviewsApi for existing clients.
export const getReviewPageApi = async (placeId, page = 0, options = {}) => {
  if (!Number.isSafeInteger(Number(placeId)) || Number(placeId) <= 0 ||
      !Number.isInteger(page) || page < 0 || page > 10000) throw new Error("올바르지 않은 리뷰 페이지입니다.");
  const path = `/api/places/${encodeURIComponent(placeId)}/reviews`;
  let data;
  try {
    data = (await api.get(`${path}/paged`, {
      ...options, params: { page, size: 5 },
    })).data;
  } catch (error) {
    // During local development, a running older backend may not yet expose /paged.
    // Only fall back for an unavailable endpoint. Never turn network, auth, or 5xx
    // errors into an empty review list.
    if (![404, 405].includes(error?.response?.status)) throw error;
    const legacy = requireList((await api.get(path, options)).data);
    const newest = [...legacy].sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    const ratings = legacy.map(item => Number(item?.rating)).filter(value =>
      Number.isFinite(value) && value >= 1 && value <= 5);
    data = {
      content: newest.slice(page * 5, (page + 1) * 5),
      page,
      totalPages: Math.ceil(newest.length / 5),
      totalElements: newest.length,
      averageRating: ratings.length ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null,
    };
  }
  if (!data || !Array.isArray(data.content) || !Number.isInteger(data.page) ||
      !Number.isInteger(data.totalPages) || !Number.isSafeInteger(data.totalElements) ||
      data.page !== page || data.totalElements < 0 || data.totalPages < 0) {
    throw new Error("리뷰 목록 응답이 올바르지 않습니다.");
  }
  return data;
};

export const createReviewWithPhotosApi = async ({ placeId, comment, rating, photos }) => {
  const text = String(comment || "").trim();
  if (!Number.isSafeInteger(Number(placeId)) || Number(placeId) <= 0 || !text || text.length > 255 ||
      !Number.isInteger(rating) || rating < 1 || rating > 5 ||
      !Array.isArray(photos) || photos.length < 1 || photos.length > 5 ||
      photos.some(file => !(file instanceof File) || file.size > 3 * 1024 * 1024 ||
        !["image/webp", "image/jpeg", "image/png"].includes(file.type))) {
    throw new Error("사진은 최대 5장, 각 3MB 이하 JPEG/PNG/WebP로 등록해 주세요.");
  }
  const body = new FormData();
  body.append("comment", text);
  body.append("rating", String(rating));
  photos.forEach(file => body.append("photos", file, file.name));
  return (await api.post(`/api/places/${encodeURIComponent(placeId)}/reviews/with-photos`, body,
    { headers: { "Content-Type": "multipart/form-data" } })).data;
};
