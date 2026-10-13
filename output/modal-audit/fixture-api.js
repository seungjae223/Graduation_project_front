// Isolated preview responses. No request can reach the service backend.
export const counters = { delete: 0, save: 0, pdf: 0 };
export const getAccessToken = () => "preview-only";
export const clearAuthStorage = () => {};
export const getApiErrorMessage = () => "미리보기 오류";
const api = {
  get: async () => ({ data: [] }),
  post: async () => { counters.save++; return { data: {} }; },
  patch: async () => { counters.save++; return { data: {} }; },
  put: async () => { counters.save++; return { data: {} }; },
  delete: async () => { counters.delete++; throw new Error("Preview: response lost"); },
};
export default api;
