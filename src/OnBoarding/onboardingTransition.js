import { flushSync } from "react-dom";

let activeTransition = null;
let transitionToken = 0;

const clearTransitionState = (root) => {
  document
    .querySelectorAll(
      ".onboarding-route .onboarding-motion-button--onboarding-cta"
    )
    .forEach((button) =>
      button.classList.add("onboarding-motion-button--settled")
    );

  root.classList.remove(
    "onboarding-transitioning",
    "onboarding-transition-fallback"
  );
  delete root.dataset.onboardingDirection;
};

const createExitSnapshots = () => {
  const layer = document.createElement("div");
  const targets = [
    [".image-wrapper", "graphic"],
    [".text-area h2", "title"],
    [".text-area p", "description"],
  ];

  layer.className = "onboarding-exit-layer";
  layer.setAttribute("aria-hidden", "true");
  layer.inert = true;

  targets.forEach(([selector, name]) => {
    const source = document.querySelector(`.onboarding-route ${selector}`);

    if (!source) return;

    const bounds = source.getBoundingClientRect();
    const snapshot = source.cloneNode(true);

    snapshot.classList.add(
      "onboarding-exit-snapshot",
      `onboarding-exit-snapshot--${name}`
    );
    snapshot.setAttribute("aria-hidden", "true");
    snapshot.style.setProperty("--snapshot-left", `${bounds.left}px`);
    snapshot.style.setProperty("--snapshot-top", `${bounds.top}px`);
    snapshot.style.setProperty("--snapshot-width", `${bounds.width}px`);
    snapshot.style.setProperty("--snapshot-height", `${bounds.height}px`);
    layer.appendChild(snapshot);
  });

  document.body.appendChild(layer);
  return layer;
};

export const navigateWithOnboardingTransition = (
  navigate,
  destination,
  direction
) => {
  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    navigate(destination);
    return;
  }

  const root = document.documentElement;
  const currentToken = ++transitionToken;

  activeTransition?.skipTransition?.();
  root.classList.add("onboarding-transitioning");
  root.dataset.onboardingDirection = direction;

  if (!document.startViewTransition) {
    const exitLayer = createExitSnapshots();

    root.classList.add("onboarding-transition-fallback");
    flushSync(() => navigate(destination));

    const cleanup = () => {
      window.clearTimeout(cleanupTimer);
      exitLayer.remove();

      if (currentToken === transitionToken) {
        clearTransitionState(root);
        activeTransition = null;
      }
    };
    const cleanupTimer = window.setTimeout(cleanup, 620);

    activeTransition = { skipTransition: cleanup };
    return;
  }

  try {
    const transition = document.startViewTransition(() => {
      flushSync(() => navigate(destination));
    });

    activeTransition = transition;
    transition.finished
      .catch(() => {})
      .finally(() => {
        if (currentToken !== transitionToken) return;

        clearTransitionState(root);
        activeTransition = null;
      });
  } catch {
    if (currentToken === transitionToken) {
      clearTransitionState(root);
      activeTransition = null;
    }

    navigate(destination);
  }
};
