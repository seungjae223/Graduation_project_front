import { createContext, useContext, useLayoutEffect, useRef } from "react";

const EntryContext = createContext(null);
const markReady = entry => {
  if (!entry?.contentReady || entry.current?.dataset.pageEntry !== "pending") return;
  entry.current.dataset.pageEntry = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "settled" : "ready";
};

// One DOM entry per existing route key. Suspense may resolve more than once,
// but it never resets an entry that is already ready or settled.
export default function PageTransition({ className, children }) {
  const entry = useRef(null);
  useLayoutEffect(() => { markReady(entry); }, []);
  return <div ref={entry} className={className} data-page-entry="pending"
    onAnimationEnd={event => {
      if (event.target === entry.current && event.animationName === "pageFadeUp") entry.current.dataset.pageEntry = "settled";
    }}>
    <EntryContext.Provider value={entry}>{children}</EntryContext.Provider>
  </div>;
}

export function RouteContentReady({ children }) {
  const entry = useContext(EntryContext);
  useLayoutEffect(() => {
    if (!entry) return;
    entry.contentReady = true;
    markReady(entry);
  }, [entry]);
  return children;
}
