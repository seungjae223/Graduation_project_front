import { createContext, useContext, useLayoutEffect } from "react";

export const RoutePendingContext = createContext(null);

export function useRoutePending(pending) {
  const register = useContext(RoutePendingContext);
  useLayoutEffect(() => {
    if (pending && register) return register();
  }, [pending, register]);
}
