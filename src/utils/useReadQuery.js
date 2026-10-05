import { useCallback, useEffect, useRef, useState } from "react";

// Each key/request owns its success, error and loading updates, including A → B → A.
export default function useReadQuery(key, fetcher, enabled = true, guard = () => true) {
  const latest = useRef({ key, fetcher, enabled, guard });
  latest.current = { key, fetcher, enabled, guard };
  const sequence = useRef(0);
  const active = useRef(null);
  const [state, setState] = useState({ key, status: "loading", data: null, error: "" });
  const retry = useCallback(async () => {
    const target = latest.current;
    if (!target.enabled || active.current?.key === target.key) return;
    active.current?.controller.abort();
    const request = { key: target.key, controller: new AbortController(), version: ++sequence.current };
    active.current = request;
    const alive = () => active.current === request && latest.current.key === target.key && !request.controller.signal.aborted && target.guard();
    setState(s => ({ key: target.key, data: s.key === target.key ? s.data : null, status: "loading", error: "" }));
    try {
      const data = await target.fetcher(request.controller.signal);
      if (alive()) setState({ key: target.key, data, status: "success", error: "" });
      return alive();
    } catch (error) {
      if (alive() && error?.code !== "ERR_CANCELED" && error?.name !== "AbortError") {
        setState(s => ({ ...s, status: "error", error: "다시 시도해 주세요." }));
      }
      return false;
    } finally { if (active.current === request) active.current = null; }
  }, []);
  useEffect(() => {
    active.current?.controller.abort(); active.current = null;
    setState({ key, status: enabled ? "loading" : "idle", data: null, error: "" });
    if (enabled) void retry();
    return () => { active.current?.controller.abort(); active.current = null; };
  }, [key, enabled, retry]);
  return { ...(state.key === key ? state : { status: enabled ? "loading" : "idle", data: null, error: "" }), retry };
}
