import api from "../api/api";
import { getAuthSnapshot, notifyAuthChange } from "../utils/authState";

// Cancelling a client task stops subsequent steps; it never rolls back a write.
export function createGenerationRequest({ signal, isCurrent = () => true } = {}) {
  notifyAuthChange();
  const owner = getAuthSnapshot();
  const check = () => {
    notifyAuthChange();
    const current = getAuthSnapshot();
    if (signal?.aborted || !isCurrent() || current.accountKey !== owner.accountKey || current.credentialVersion !== owner.credentialVersion) {
      const error = new Error("화면이나 계정이 변경되어 후속 요청을 중단했습니다. 이미 보낸 요청의 저장 여부는 일정 목록에서 확인해 주세요.");
      error.code = "ERR_CANCELED";
      throw error;
    }
  };
  const request = async (method, url, body, config = {}) => {
    check();
    const options = { ...config, ...(signal ? { signal } : {}), isCurrent: () => {
      try { check(); return true; } catch { return false; }
    } };
    const response = method === "get" ? await api.get(url, options) : await api[method](url, body, options);
    check();
    return response;
  };
  return {
    check,
    get: (url, config) => request("get", url, undefined, config),
    post: (url, body, config) => request("post", url, body, config),
    patch: (url, body, config) => request("patch", url, body, config),
  };
}
