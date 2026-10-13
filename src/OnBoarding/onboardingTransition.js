import { flushSync } from "react-dom";

let activeTransition = null;

const clearTransitionState = operation => {
  // Settle only this entry, before removing the class that suppresses its
  // default entrance. A later route mount gets a fresh DOM node.
  if (operation.route) operation.route.dataset.onboardingEntry = "settled";
  operation.layer?.remove();
  operation.resolveArrival?.();
  if (activeTransition !== operation) return;
  document.documentElement.classList.remove("onboarding-transitioning", "onboarding-transition-fallback");
  delete document.documentElement.dataset.onboardingDirection;
  window.removeEventListener("popstate", operation.onPop);
  activeTransition = null;
};

export const cancelOnboardingTransition = () => {
  const operation = activeTransition;
  if (!operation) return;
  operation.cancelled = true;
  operation.native?.skipTransition();
  operation.animations?.forEach(animation => animation.cancel());
  clearTransitionState(operation);
};

// Called after React has committed a route. External navigation cancels the
// old operation; its eventual native callback must never navigate again.
export const syncOnboardingTransitionRoute = pathname => {
  const operation = activeTransition;
  if (!operation) return;
  if (!operation.committed && pathname === operation.from && window.location.href === operation.fromUrl) return;
  const expected = typeof operation.destination === "string" ? operation.destination : null;
  if (!operation.committed || (expected && pathname !== expected) || operation.arrived) {
    cancelOnboardingTransition();
    return;
  }
  operation.arrived = true;
  operation.route = document.querySelector(".onboarding-route");
  operation.resolveArrival?.();
  operation.startFallback?.();
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

const runFallback = operation => {
  if (activeTransition !== operation || operation.cancelled) return;
  operation.layer = createExitSnapshots();
  operation.startFallback = () => {
    if (activeTransition !== operation || operation.cancelled || operation.fallbackStarted) return;
    operation.fallbackStarted = true;
    // Apply incoming motion only after the old route has been replaced.
    document.documentElement.classList.add("onboarding-transition-fallback");
    operation.route = document.querySelector(".onboarding-route");
    operation.animations = [operation.route, operation.layer].flatMap(element =>
      Array.from(element?.getAnimations?.({ subtree: true }) || [])
        .filter(animation => animation.animationName?.startsWith("onboarding-view-"))
    );
    Promise.allSettled(operation.animations.map(animation => animation.finished)).then(() => {
      if (activeTransition === operation) clearTransitionState(operation);
    });
  };
  operation.commit();
  if (activeTransition !== operation || operation.cancelled) { operation.layer.remove(); return; }
  if (operation.arrived) operation.startFallback();
};

export const navigateWithOnboardingTransition = (navigate, destination, direction) => {
  const from = window.location.pathname;
  if (typeof destination === "string" && destination === from) return;
  if (activeTransition && !activeTransition.arrived && activeTransition.from === from && activeTransition.destination === destination) return;
  cancelOnboardingTransition();
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    navigate(destination);
    return;
  }
  const operation = {
    from, fromUrl: window.location.href, destination, committed: false, cancelled: false, arrived: false,
    route: document.querySelector(".onboarding-route"),
  };
  operation.commit = () => {
    if (activeTransition !== operation || operation.cancelled || operation.committed) return;
    if (window.location.href !== operation.fromUrl) { cancelOnboardingTransition(); return; }
    operation.committed = true;
    const arrival = new Promise(resolve => { operation.resolveArrival = resolve; });
    flushSync(() => navigate(destination));
    return arrival;
  };
  operation.onPop = () => {
    if (operation.committed && typeof operation.destination === "number" && !operation.historyPopSeen) {
      operation.historyPopSeen = true;
      return;
    }
    cancelOnboardingTransition();
  };
  activeTransition = operation;
  window.addEventListener("popstate", operation.onPop);
  document.documentElement.classList.add("onboarding-transitioning");
  document.documentElement.dataset.onboardingDirection = direction;
  if (!document.startViewTransition) {
    runFallback(operation);
    return;
  }
  try {
    operation.native = document.startViewTransition(operation.commit);
    // ready rejects when a native animation is skipped, even if navigation succeeds.
    operation.native.ready?.catch(() => {});
    operation.native.finished.catch(() => {}).finally(() => {
      if (activeTransition === operation) clearTransitionState(operation);
    });
  } catch {
    if (activeTransition !== operation) return;
    if (!operation.committed) runFallback(operation);
    else clearTransitionState(operation);
  }
};
