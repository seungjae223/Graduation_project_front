import api from "./api";

const list = (data) => {
  if (Array.isArray(data)) return data;
  return data?.data || data?.content || data?.items || [];
};

export const getPlacesApi = async () => (await api.get("/api/places")).data;

export const createPlaceApi = async (place) =>
  (await api.post("/api/places", place)).data;

export const getPlaceApi = async (placeId) =>
  (await api.get(`/api/places/${encodeURIComponent(placeId)}`)).data;

export const deletePlaceApi = async (placeId) =>
  (await api.delete(`/api/places/${encodeURIComponent(placeId)}`)).data;

export const searchPlacesApi = async (keyword) => {
  const normalizedKeyword = String(keyword || "").trim().replace(/\s+/g, " ");
  if (!normalizedKeyword) throw new Error("검색어를 입력해주세요.");
  if (normalizedKeyword.length > 100) {
    throw new Error("검색어는 100자 이하로 입력해주세요.");
  }
  const response = await api.get("/api/places/search", {
    params: { keyword: normalizedKeyword },
  });
  return list(response.data);
};

export const getRecommendationsApi = async (params = {}) => {
  const response = await api.get("/api/recommendations", {
    params: {
      ...(params.region ? { region: params.region } : {}),
      ...(params.theme ? { theme: params.theme } : {}),
    },
  });
  return list(response.data);
};

export const getRecentSearchesApi = async () =>
  list((await api.get("/api/recent-searches")).data);

export const deleteRecentSearchApi = async (id) =>
  api.delete(`/api/recent-searches/${encodeURIComponent(id)}`);

export const clearRecentSearchesApi = async () =>
  api.delete("/api/recent-searches");

export const getRecentPlacesApi = async () =>
  list((await api.get("/api/recent-places")).data);

export const getFoldersApi = async () => list((await api.get("/api/folders")).data);

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

export const getFolderPlacesApi = async (folderId) =>
  list(
    (await api.get(`/api/folders/${encodeURIComponent(folderId)}/places`)).data
  );

export const getReviewsApi = async (placeId) =>
  list((await api.get(`/api/places/${encodeURIComponent(placeId)}/reviews`)).data);

export const createReviewApi = async ({ placeId, comment, rating }) =>
  (await api.post(`/api/places/${encodeURIComponent(placeId)}/reviews`, {
    comment: String(comment || "").trim(),
    rating: Number(rating),
  })).data;
