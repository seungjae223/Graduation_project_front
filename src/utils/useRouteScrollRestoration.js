import { useLayoutEffect, useRef } from "react";

const MAX_ENTRIES = 80;
const SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "]);

export default function useRouteScrollRestoration(mainRef, entryKey, viewKey, navigationType, account) {
  const positions = useRef(new Map());
  const current = useRef(null);

  useLayoutEffect(() => {
    if (!("scrollRestoration" in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    return () => { window.history.scrollRestoration = previous; };
  }, []);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const previous = current.current;
    if (previous?.account !== account) positions.current.clear();
    if (!previous || previous.key !== entryKey || previous.account !== account) {
      const sameView = previous?.viewKey === viewKey && previous.account === account;
      const target = navigationType === "POP" ? positions.current.get(entryKey) :
        navigationType === "REPLACE" && sameView ? previous.target : null;
      current.current = { key: entryKey, viewKey, account, target: target ?? null };
      if (previous && !sameView && target == null && window.scrollY) window.scrollTo(0, 0);
    }
    const entry = current.current;
    const contentReady = () => main.querySelector(":scope > .route-transition > .route-content:not([data-loading])");
    const save = () => {
      if (entry.target !== null || !contentReady()) return;
      const remembered = positions.current;
      remembered.delete(entryKey);
      remembered.set(entryKey, window.scrollY);
      if (remembered.size > MAX_ENTRIES) remembered.delete(remembered.keys().next().value);
    };

    let mutations;
    let sizes;
    const stopRestoring = () => {
      entry.target = null;
      mutations?.disconnect();
      sizes?.disconnect();
    };
    const restore = () => {
      if (entry.target === null || !contentReady()) return;
      const max = Math.max(0, (document.scrollingElement || document.documentElement).scrollHeight - window.innerHeight);
      const y = Math.min(entry.target, max);
      if (Math.abs(window.scrollY - y) > 1) window.scrollTo(0, y);
      if (Math.abs(window.scrollY - entry.target) <= 1) {
        stopRestoring();
        save();
      }
    };
    if (entry.target !== null) {
      mutations = new MutationObserver(restore);
      mutations.observe(main, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-loading"] });
      if (typeof ResizeObserver !== "undefined") {
        sizes = new ResizeObserver(restore);
        sizes.observe(main);
      }
      restore();
    }

    const cancelOnScrollKey = event => { if (SCROLL_KEYS.has(event.key)) stopRestoring(); };
    window.addEventListener("scroll", save, { passive: true });
    window.addEventListener("click", save, true);
    window.addEventListener("popstate", save, true);
    window.addEventListener("wheel", stopRestoring, { passive: true });
    window.addEventListener("touchmove", stopRestoring, { passive: true });
    window.addEventListener("keydown", cancelOnScrollKey);
    return () => {
      mutations?.disconnect();
      sizes?.disconnect();
      window.removeEventListener("scroll", save);
      window.removeEventListener("click", save, true);
      window.removeEventListener("popstate", save, true);
      window.removeEventListener("wheel", stopRestoring);
      window.removeEventListener("touchmove", stopRestoring);
      window.removeEventListener("keydown", cancelOnScrollKey);
    };
  }, [mainRef, entryKey, viewKey, navigationType, account]);
}
