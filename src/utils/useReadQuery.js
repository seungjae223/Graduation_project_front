import { useCallback, useEffect, useRef, useState } from "react";

// Each key/request owns its success, error and loading updates, including A → B → A.
// Only explicitly opted-in, short-lived reads use this memory-only cache.
// Account-scoped keys must be used for private data; never persist to storage.
const readCache = new Map();
const MAX_CACHED_READS = 40;
export function clearReadQueryCache() { readCache.clear(); }
const cachedValue = (key, maxAgeMs) => {
  if (!(maxAgeMs > 0)) return null;
  const item = readCache.get(key);
  if (!item) return null;
  if (Date.now() - item.at < maxAgeMs) return item;
  readCache.delete(key);
  return null;
};
const rememberValue = (key, value) => {
  readCache.delete(key);
  readCache.set(key, { value, at: Date.now() });
  if (readCache.size > MAX_CACHED_READS) readCache.delete(readCache.keys().next().value);
};
export default function useReadQuery(key, fetcher, enabled = true, guard = () => true, cacheMs = 0) {
  const latest = useRef({ key, fetcher, enabled, guard, cacheMs });
  latest.current = { key, fetcher, enabled, guard, cacheMs };
  const sequence = useRef(0);
  const active = useRef(null);
  const [state, setState] = useState(() => {
    const cached = enabled && guard() ? cachedValue(key, cacheMs) : null;
    return { key, status: cached ? "success" : enabled ? "loading" : "idle",
      data: cached ? cached.value : null, error: "", cause: null };
  });
  const retry = useCallback(async (options = {}) => {
    const target = latest.current;
    if (!target.enabled || active.current?.key === target.key) return;
    active.current?.controller.abort();
    const request = { key: target.key, controller: new AbortController(), version: ++sequence.current };
    active.current = request;
    const alive = () => active.current === request && latest.current.key === target.key && !request.controller.signal.aborted && target.guard();
    setState(s => ({ key: target.key, data: s.key === target.key ? s.data : null, status: "loading", error: "", cause: null }));
    try {
      const data = await target.fetcher(request.controller.signal);
      if (alive()) {
        if (target.cacheMs > 0) rememberValue(target.key, data);
        setState({ key: target.key, data, status: "success", error: "", cause: null });
      }
      return alive() ? (options.returnData ? data : true) : false;
    } catch (error) {
      if (alive() && error?.code !== "ERR_CANCELED" && error?.name !== "AbortError") {
        setState(s => ({ ...s, status: "error", error: "다시 시도해 주세요.", cause: error }));
      }
      return false;
    } finally { if (active.current === request) active.current = null; }
  }, []);
  useEffect(() => {
    active.current?.controller.abort(); active.current = null;
    const cached = enabled && latest.current.guard() ? cachedValue(key, cacheMs) : null;
    setState({ key, status: cached ? "success" : enabled ? "loading" : "idle",
      data: cached ? cached.value : null, error: "", cause: null });
    if (enabled && !cached) void retry();
    return () => { active.current?.controller.abort(); active.current = null; };
  }, [key, enabled, retry, cacheMs]);
  return { ...(state.key === key ? state : { status: enabled ? "loading" : "idle", data: null, error: "", cause: null }), retry, read: () => retry({ returnData: true }) };
}
