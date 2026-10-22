import { useCallback, useEffect, useRef, useState } from "react";
import { searchPlacesApi } from "../api/placeApi";
import { getApiErrorMessage } from "../api/api";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import { requireSearchPlaces } from "./searchCatalog";

export default function useServerSearch() {
  const account = useSessionKey();
  const [state, setState] = useState({ account, status: "idle", keyword: "", displayedKeyword: "", items: [], error: "" });
  const request = useRef(null);
  const version = useRef(0);
  const cancelRequest = useCallback(() => { ++version.current; request.current?.controller.abort(); request.current = null; }, []);
  const clear = useCallback(() => {
    cancelRequest();
    setState({ account, status: "idle", keyword: "", displayedKeyword: "", items: [], error: "" });
  }, [account, cancelRequest]);
  useEffect(() => { clear(); return cancelRequest; }, [clear, cancelRequest]);
  const submit = useCallback(async (value) => {
    const keyword = String(value || "").trim().replace(/\s+/g, " ");
    if (!keyword || keyword.length > 100) {
      ++version.current;
      request.current?.controller.abort();
      request.current = null;
      setState({ account, status: "error", keyword, displayedKeyword: "", items: [], error: keyword ? "검색어는 100자 이하로 입력해주세요." : "검색어를 입력해주세요." });
      return;
    }
    if (request.current?.keyword === keyword) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    const ticket = ++version.current;
    request.current = { keyword, controller };
    // Keep the last completed list mounted while a different keyword is in flight.
    // The visible keyword is tracked separately so stale cards are never mislabeled.
    setState(previous => ({
      account, status: "loading", keyword,
      displayedKeyword: previous.account === account
        ? (previous.status === "success" ? previous.keyword : previous.displayedKeyword || "") : "",
      items: previous.account === account ? previous.items : [], error: "",
    }));
    try {
      const items = requireSearchPlaces(await searchPlacesApi(keyword, { signal: controller.signal }));
      if (ticket === version.current && !controller.signal.aborted && getAuthSnapshot().accountKey === account) {
        setState({ account, status: "success", keyword, displayedKeyword: keyword, items, error: "", revision: ticket });
      }
    } catch (error) {
      if (ticket === version.current && !controller.signal.aborted && getAuthSnapshot().accountKey === account && error.code !== "ERR_CANCELED") {
        setState({ account, status: "error", keyword, displayedKeyword: "", items: [], error: getApiErrorMessage(error, "장소를 검색하지 못했습니다. 다시 검색해주세요.") });
      }
    } finally {
      if (ticket === version.current) request.current = null;
    }
  }, [account]);
  return { ...(state.account === account ? state : { status: "idle", keyword: "", displayedKeyword: "", items: [], error: "" }), submit, clear };
}
