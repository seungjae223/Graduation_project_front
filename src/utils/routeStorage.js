const STORAGE_KEY = "mock_saved_route_results";
export const ROUTE_STORAGE_EVENT = "mock-routes-updated";

const isBrowser = typeof window !== "undefined";

export const getSavedRoutes = () => {
  if (!isBrowser) return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("저장된 일정 불러오기 실패:", error);
    return [];
  }
};

export const saveRoute = (route) => {
  if (!isBrowser) return;

  try {
    const prev = getSavedRoutes().filter((item) => item.id !== route.id);
    const next = [route, ...prev];

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ROUTE_STORAGE_EVENT));
  } catch (error) {
    console.error("일정 저장 실패:", error);
  }
};

export const getSavedRouteById = (routeId) => {
  return getSavedRoutes().find((item) => item.id === routeId);
};

export const removeSavedRoute = (routeId) => {
  if (!isBrowser) return;

  try {
    const filtered = getSavedRoutes().filter((item) => item.id !== routeId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    window.dispatchEvent(new CustomEvent(ROUTE_STORAGE_EVENT));
  } catch (error) {
    console.error("일정 삭제 실패:", error);
  }
};