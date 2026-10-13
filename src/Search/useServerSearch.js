import { useCallback, useEffect, useRef, useState } from "react";
import { searchPlacesApi } from "../api/placeApi";
import { getApiErrorMessage } from "../api/api";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";

export default function useServerSearch() {
  const account = useSessionKey();
  const [state, setState] = useState({ status: "idle", keyword: "", items: [], error: "" });
  const request = useRef(null);
  const version = useRef(0);
  const cancelRequest = useCallback(() => { ++version.current; request.current?.controller.abort(); request.current = null; }, []);
  useEffect(() => { setState({ status: "idle", keyword: "", items: [], error: "" }); return cancelRequest; }, [account, cancelRequest]);
  const submit = useCallback(async (value) => {
    const keyword = String(value || "").trim().replace(/\s+/g, " ");
    if (!keyword || keyword.length > 100) {
      ++version.current;
      request.current?.controller.abort();
      request.current = null;
      setState({ status: "error", keyword, items: [], error: keyword ? "검색어는 100자 이하로 입력해주세요." : "검색어를 입력해주세요." });
      return;
    }
    if (request.current?.keyword === keyword) return;
    request.current?.controller.abort();
    const controller = new AbortController();
    const ticket = ++version.current;
    request.current = { keyword, controller };
    setState(previous => ({ status: "loading", keyword, items: previous.keyword === keyword ? previous.items : [], error: "" }));
    try {
      const items = await searchPlacesApi(keyword, { signal: controller.signal });
      if (ticket === version.current && !controller.signal.aborted && getAuthSnapshot().accountKey === account) {
        setState({ status: "success", keyword, items, error: "", revision: ticket });
      }
    } catch (error) {
      if (ticket === version.current && !controller.signal.aborted && getAuthSnapshot().accountKey === account && error.code !== "ERR_CANCELED") {
        setState(previous => ({ status: "error", keyword, items: previous.keyword === keyword ? previous.items : [], error: getApiErrorMessage(error, "장소를 검색하지 못했습니다. 다시 검색해주세요.") }));
      }
    } finally {
      if (ticket === version.current) request.current = null;
    }
  }, [account]);
  return { ...state, submit };
}
