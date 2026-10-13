import { useEffect, useRef } from "react";

// Only a new keyboard-initiated PUSH announces new content. POP and query edits keep focus.
export default function useKeyboardRouteFocus(pathname, navigationType) {
  const keyboard = useRef(false);
  const previousPath = useRef(pathname);
  useEffect(() => {
    const key = event => { if (["Tab", "Enter", " "].includes(event.key)) keyboard.current = true; };
    const pointer = () => { keyboard.current = false; };
    document.addEventListener("keydown", key, true);
    document.addEventListener("pointerdown", pointer, true);
    return () => { document.removeEventListener("keydown", key, true); document.removeEventListener("pointerdown", pointer, true); };
  }, []);
  useEffect(() => {
    const changed = previousPath.current !== pathname;
    previousPath.current = pathname;
    if (!changed || navigationType !== "PUSH" || !keyboard.current || pathname.startsWith("/onboarding") || pathname === "/") return;
    let done = false;
    const focus = () => {
      const entry = document.querySelector('.route-transition[data-page-entry="ready"], .route-transition[data-page-entry="settled"]');
      if (done) return;
      if (entry?.querySelector('[role="dialog"], [role="alertdialog"]') || document.querySelector('[aria-modal="true"]')) {
        // Modal dismissal restores its opener; this entry must not steal that focus later.
        done = true;
        observer.disconnect();
        return;
      }
      if (!entry) return;
      const target = entry.querySelector("h1, h2, [role=heading]") || entry;
      target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
      done = true;
      observer.disconnect();
    };
    const observer = new MutationObserver(focus);
    observer.observe(document.getElementById("root") || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-page-entry"] });
    focus();
    return () => observer.disconnect();
  }, [pathname, navigationType]);
}
