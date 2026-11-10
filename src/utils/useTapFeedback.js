import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function useTapFeedback() {
  const { key } = useLocation();
  const timeout = useRef();
  useLayoutEffect(() => () => clearTimeout(timeout.current), [key]);

  return (event, action) => {
    clearTimeout(timeout.current);
    if (!action || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;

    const { pointerType } = event.nativeEvent;
    const touch = pointerType === "touch" || (!pointerType && event.detail > 0 &&
      window.matchMedia?.("(pointer: coarse)").matches);
    if (!touch) return false;

    event.preventDefault();
    timeout.current = setTimeout(action, 150);
    return true;
  };
}
