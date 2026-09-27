import { useEffect, useRef } from "react";

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
    (element) => !element.hasAttribute("hidden") && element.getAttribute("aria-hidden") !== "true"
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
    const originalOverflow = document.body.style.overflow;

    if (lockScroll) {
      document.body.style.overflow = "hidden";
    }

    const initialFocus =
      dialog?.querySelector("[data-modal-initial-focus]") ||
      getFocusableElements(dialog)[0] ||
      dialog;

    initialFocus?.focus();

    const handleKeyDown = (event) => {
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

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      if (lockScroll) {
        document.body.style.overflow = originalOverflow;
      }

      previousFocusRef.current?.focus?.();
    };
  }, [lockScroll, open]);

  return dialogRef;
}
