import { useEffect, useRef, useState } from "react";
import { searchPlacesApi } from "../api/placeApi";
import { getApiErrorMessage } from "../api/api";

export default function useServerSearch() {
  const [state, setState] = useState({ status: "idle", keyword: "", items: [], error: "" });
  const request = useRef(null);
  const version = useRef(0);
  useEffect(() => () => { ++version.current; request.current?.controller.abort(); }, []);
  const submit = async (value) => {
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
    setState({ status: "loading", keyword, items: [], error: "" });
    try {
      const items = await searchPlacesApi(keyword, { signal: controller.signal });
      if (ticket === version.current && !controller.signal.aborted) {
        setState({ status: "success", keyword, items, error: "" });
      }
    } catch (error) {
      if (ticket === version.current && !controller.signal.aborted && error.code !== "ERR_CANCELED") {
        setState({ status: "error", keyword, items: [], error: getApiErrorMessage(error, "장소를 검색하지 못했습니다. 다시 검색해주세요.") });
      }
    } finally {
      if (ticket === version.current) request.current = null;
    }
  };
  return { ...state, submit };
}
