import { useCallback, useEffect, useRef, useState } from "react";

// Authentication changes credentials rather than refreshing a read model, so
// its action owns both cancellation and the permission to apply its response.
export default function useAuthRequest(scope) {
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const mounted = useRef(false);
  const active = useRef(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    mounted.current = true;
    setBusy("");
    return () => {
      mounted.current = false;
      active.current?.controller.abort();
      active.current = null;
    };
  }, [scope]);

  const begin = useCallback((kind) => {
    if (!mounted.current || active.current) return null;
    const request = { kind, scope, controller: new AbortController() };
    active.current = request;
    request.isCurrent = () => mounted.current && active.current === request &&
      currentScope.current === request.scope && !request.controller.signal.aborted;
    request.options = { signal: request.controller.signal, isCurrent: request.isCurrent };
    setBusy(kind);
    return request;
  }, [scope]);

  const end = useCallback((request) => {
    if (active.current !== request) return;
    active.current = null;
    if (mounted.current && currentScope.current === request.scope) setBusy("");
  }, []);

  return { busy, begin, end };
}

export const isCanceledAuthRequest = (error) => error?.code === "ERR_CANCELED" ||
  error?.name === "AbortError";
