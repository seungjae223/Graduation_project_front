import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { searchPlacesApi } from "../api/placeApi";

const delay = signal => new Promise((resolve, reject) => {
  const cancel = () => { clearTimeout(timer); const error = new Error("검색 취소"); error.code = "ERR_CANCELED"; reject(error); };
  const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, 300);
  signal.addEventListener("abort", cancel, { once: true });
  if (signal.aborted) cancel();
});

export default function useRoutePlaceSearch(open, keyword) {
  const account = useSessionKey();
  const term = String(keyword || "").trim().replace(/\s+/g, " ");
  return useReadQuery(`${account}:${term}`, async signal => {
    await delay(signal);
    return searchPlacesApi(term, { signal });
  }, open && Boolean(term), () => getAuthSnapshot().accountKey === account);
}
