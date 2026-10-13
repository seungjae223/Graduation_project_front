import api from "./api";
import { requireList } from "./responseContract";
import { toApiTheme } from "../utils/placeTheme";

export const getPlacesApi = async () => requireList((await api.get("/api/places")).data);

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

// The current backend permits review creation only for ADMIN; a USER receives 403.
export const createReviewApi = async ({ placeId, comment, rating }) => {
  const text = String(comment || "").trim();
  const score = Number(rating);
  if (!text || rating == null || rating === "" || !Number.isFinite(score) || score < 0 || score > 5) {
    throw new Error("리뷰 내용과 0~5 사이의 평점을 입력해주세요.");
  }
  return (await api.post(`/api/places/${encodeURIComponent(placeId)}/reviews`, {
    comment: text, rating: score,
  })).data;
};
