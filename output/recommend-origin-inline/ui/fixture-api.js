// QA only: supplied backend SQL, with IDs from the previously observed live list.
// This adapter is excluded from the application/build. Reviews are the empty-list test case.
import catalog from '../../place-image-audit/catalog.json';
import liveIds from '../../place-image-expansion/live-id-map.json';
export const places = catalog.places.map(p => ({ ...p, id: liveIds.find(l=>l.sourceRow===p.sourceRow)?.id || 20000 + p.sourceRow }));
export const getAccessToken = () => 'preview-only';
export const clearAuthStorage = () => {};
export const getApiErrorMessage = () => '미리보기 오류';
const api = {
  get: async (url, options = {}) => {
    const params = options.params || {};
    if (/\/reviews$/.test(url) || /folders|recent|trips/.test(url)) return { data: [] };
    if (/\/places\/\d+$/.test(url)) return { data: places.find(p => String(p.id) === url.split('/').pop()) };
    if (/places|recommendations/.test(url)) return { data: places.filter(p => (!params.region || p.region === params.region) && (!params.theme || p.theme === params.theme) && (!params.keyword || `${p.region} ${p.name} ${p.address}`.includes(params.keyword))) };
    return { data: [] };
  },
  post: async () => { throw new Error('Preview prevents service writes'); },
  put: async () => { throw new Error('Preview prevents service writes'); },
  patch: async () => { throw new Error('Preview prevents service writes'); },
  delete: async () => { throw new Error('Preview prevents service writes'); },
};
export default api;
