import { createContext, useContext, useLayoutEffect, useRef, useState } from "react";

const EntryContext = createContext(null);
const ENTRY_ANIMATIONS = new Set([
  "pageFadeUp", "nomango-detail-enter", "nomango-detail-return",
  "nomango-tab-enter-right", "nomango-tab-enter-left",
]);
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const markReady = entry => {
  if (!entry?.contentReady || entry.current?.dataset.pageEntry !== "pending") return;
  entry.current.dataset.pageEntry = entry.slideFinished || prefersReducedMotion() ? "settled" : "ready";
};

const finishSlide = entry => {
  if (entry.current?.dataset.pageEntry !== "sliding") return;
  entry.slideFinished = true;
  entry.current.dataset.pageEntry = "pending";
  markReady(entry);
};

// One DOM entry per existing route key. Suspense may resolve more than once,
// but it never resets an entry that is already ready or settled.
export default function PageTransition({ className, startWithSlide = false, children }) {
  const [initial] = useState(() => ({ className, slide: startWithSlide && !prefersReducedMotion() }));
  const entry = useRef(null);
  useLayoutEffect(() => {
    const node = entry.current;
    if (node.dataset.pageEntry !== "sliding") {
      markReady(entry);
      return;
    }

    const animation = node.getAnimations?.().find(item => ENTRY_ANIMATIONS.has(item.animationName));
    if (animation) {
      // A canceled slide must also release the loading indicator.
      const finish = () => { if (entry.current === node) finishSlide(entry); };
      animation.finished.then(finish, finish);
    } else if (node.getAnimations) {
      finishSlide(entry);
    } else {
      const timer = window.setTimeout(() => finishSlide(entry), 350);
      return () => window.clearTimeout(timer);
    }
  }, []);
  return <div ref={entry} className={initial.className} data-page-entry={initial.slide ? "sliding" : "pending"}
    onAnimationEnd={event => {
      if (event.target !== entry.current || !ENTRY_ANIMATIONS.has(event.animationName)) return;
      if (entry.current.dataset.pageEntry === "ready") entry.current.dataset.pageEntry = "settled";
      else finishSlide(entry);
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
