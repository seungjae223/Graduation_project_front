import api from "./api";
import { requireList } from "./responseContract";

const normalizeDestinationCode = value => {
  const code = String(value || "").trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) {
    throw new Error("여행지 코드가 올바르지 않습니다.");
  }
  return code;
};

export const getDestinationsApi = async (options = {}) =>
  requireList((await api.get("/api/destinations", options)).data);

export const getDestinationApi = async (code, options = {}) =>
  (await api.get(`/api/destinations/${normalizeDestinationCode(code)}`, options)).data;

export const getDestinationPlacesApi = async (code, options = {}) =>
  requireList((await api.get(
    `/api/destinations/${normalizeDestinationCode(code)}/places`, options
  )).data);
