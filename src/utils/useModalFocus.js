import { useEffect, useRef } from "react";

const modals = [];
const scrollLocks = new Set();
let originalScrollStyles;
let releaseVisualViewport;
function followVisualViewport() {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const rootStyle = document.documentElement.style;
  const properties = ["--modal-viewport-height", "--modal-viewport-top"];
  const previous = properties.map(name => [name, rootStyle.getPropertyValue(name), rootStyle.getPropertyPriority(name)]);
  const sync = () => {
    rootStyle.setProperty(properties[0], `${viewport.height}px`);
    rootStyle.setProperty(properties[1], `${viewport.offsetTop}px`);
  };
  viewport.addEventListener("resize", sync);
  viewport.addEventListener("scroll", sync);
  sync();
  releaseVisualViewport = () => {
    viewport.removeEventListener("resize", sync);
    viewport.removeEventListener("scroll", sync);
    previous.forEach(([name, value, priority]) => value ? rootStyle.setProperty(name, value, priority) : rootStyle.removeProperty(name));
    releaseVisualViewport = null;
  };
}
function lockDocument(token) {
  if (!scrollLocks.size) {
    const scroller = document.scrollingElement || document.documentElement;
    originalScrollStyles = { scroller, overflowY: scroller.style.overflowY, top: scroller.scrollTop, left: scroller.scrollLeft };
    // Lock the viewport scroller. Clipping a 100%-height body collapses the
    // document's scroll extent and jumps a long page back to its beginning.
    scroller.style.overflowY = "hidden";
  }
  scrollLocks.add(token);
  return () => {
    scrollLocks.delete(token);
    if (!scrollLocks.size && originalScrollStyles) {
      const { scroller, overflowY, top, left } = originalScrollStyles;
      scroller.style.overflowY = overflowY;
      scroller.scrollTop = top;
      scroller.scrollLeft = left;
      originalScrollStyles = null;
    }
  };
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const getFocusableElements = (dialog) => {
  return Array.from(dialog?.querySelectorAll(FOCUSABLE_SELECTOR) || []).filter(
    (element) => !element.closest('[hidden], [aria-hidden="true"]') && getComputedStyle(element).display !== "none" && getComputedStyle(element).visibility !== "hidden"
  );
};

export default function useModalFocus({
  open,
  onClose,
  canClose = true,
  lockScroll = false,
}) {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);

  onCloseRef.current = onClose;
  canCloseRef.current = canClose;

  useEffect(() => {
    if (!open) return undefined;

    const dialog = dialogRef.current;
    previousFocusRef.current = document.activeElement;
    const token = {};
    modals.push(token);
    if (modals.length === 1) followVisualViewport();
    const unlock = lockScroll ? lockDocument(token) : () => {};

    const initialFocus =
      dialog?.querySelector("[data-modal-initial-focus]") ||
      getFocusableElements(dialog)[0] ||
      dialog;

    initialFocus?.focus({ preventScroll: true });

    const containFocus = event => {
      if (modals[modals.length - 1] !== token || dialogRef.current?.contains(event.target)) return;
      (getFocusableElements(dialogRef.current)[0] || dialogRef.current)?.focus({ preventScroll: true });
    };

    const handleKeyDown = (event) => {
      if (modals[modals.length - 1] !== token) return;
      if (event.key === "Escape" && canCloseRef.current) {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusableElements = getFocusableElements(dialogRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (!dialogRef.current.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? lastElement : firstElement).focus();
      } else if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", containFocus);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", containFocus);
      const wasTop = modals[modals.length - 1] === token;
      const index = modals.indexOf(token);
      if (index >= 0) modals.splice(index, 1);
      if (!modals.length) releaseVisualViewport?.();
      unlock();
      if (wasTop && previousFocusRef.current?.isConnected) previousFocusRef.current.focus?.({ preventScroll: true });
    };
  }, [lockScroll, open]);

  return dialogRef;
}
