import { createContext, useContext, useMemo, useState } from "react";

// The app shell owns the fixed bottom navigation; Detail only registers its actions.
const DetailFooterContext = createContext(null);

export function DetailFooterProvider({ children }) {
  const [actions, setActions] = useState(null);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return <DetailFooterContext.Provider value={value}>{children}</DetailFooterContext.Provider>;
}

export function useDetailFooter() {
  return useContext(DetailFooterContext);
}
