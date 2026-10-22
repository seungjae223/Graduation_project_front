import { useEffect, useRef, useState } from "react";

/** Native rail scrolling, a dedicated draggable range thumb and seamless auto-loop clones. */
export default function useHomeCarousel(count, { loop = false, auto = false } = {}) {
  const ref = useRef(null);
  const pauseUntil = useRef(0);
  const changing = useRef(false);
  const scrub = useRef(false);
  const drag = useRef(null);
  const suppressNextClick = useRef(false);
  const releaseFrame = useRef(null);
  const releaseSnap = useRef(null);
  const releaseScrollBehavior = useRef(null);
  const scrubTarget = useRef(null);
  const scrubFrame = useRef(null);
  const [progress, updateProgress] = useState(0);

  const stepSize = el => {
    const items = el?.children || [];
    return items.length > 1 ? items[1].offsetLeft - items[0].offsetLeft : 0;
  };
  const groupSize = el => {
    const items = el?.children || [];
    return items.length > count ? items[count].offsetLeft - items[0].offsetLeft : 0;
  };

  const pauseAutoplay = () => { pauseUntil.current = Date.now() + 6000; };
  const sync = () => {
    const el = ref.current;
    if (!el) return;
    const span = loop && count > 1 ? groupSize(el) : 0;
    const max = span || Math.max(0, el.scrollWidth - el.clientWidth);
    // Clamp manual endpoints: modulo would flip a chosen 100% position to 0%.
    const location = span ? Math.max(0, Math.min(span, el.scrollLeft - span)) : Math.max(0, el.scrollLeft);
    const next = max > 0 ? Math.round(location / max * 100) : 0;
    updateProgress(old => old === next ? old : next);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener("resize", sync);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("resize", sync); };
  }, [count, loop]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !loop || count <= 1) return;
    const start = () => { const width = groupSize(el); if (width) el.scrollLeft = width; sync(); };
    start();
    const frame = window.requestAnimationFrame(start);
    return () => window.cancelAnimationFrame(frame);
  }, [count, loop]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !auto || !loop || count <= 1) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const id = window.setInterval(() => {
      if (document.hidden || reduce?.matches || Date.now() < pauseUntil.current || !ref.current) return;
      const step = stepSize(el);
      if (step) el.scrollBy({ left: step, behavior: "smooth" });
    }, 4000);
    return () => window.clearInterval(id);
  }, [count, loop, auto]);

  const onScroll = () => {
    const el = ref.current;
    if (!el || changing.current) return;
    // Keep the selected thumb position while scrubbing and during the interaction pause.
    if (scrub.current !== false) return; // Keep the thumb under the pointer while the rail eases behind it.
    if (Date.now() < pauseUntil.current) { sync(); return; }
    if (!loop || count <= 1) { sync(); return; }
    const span = groupSize(el);
    if (!span) { sync(); return; }
    if (el.scrollLeft < span - 2 || el.scrollLeft >= span * 2 - 2) {
      changing.current = true;
      const snap = el.style.scrollSnapType;
      const scroll = el.style.scrollBehavior;
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      const shift = el.scrollLeft < span - 2 ? span : -span;
      el.scrollLeft += shift;
      window.requestAnimationFrame(() => {
        el.style.scrollSnapType = snap;
        el.style.scrollBehavior = scroll;
        changing.current = false;
        sync();
      });
    } else { sync(); }
  };
  const stopScrubFrame = () => {
    if (scrubFrame.current !== null) {
      window.cancelAnimationFrame(scrubFrame.current);
      scrubFrame.current = null;
    }
  };
  // A single spring-style settling algorithm for both dragging cards and
  // dragging/keyboard-operating the separate accessible scrollbar.
  const settleToSnap = (projected, previousSnap) => {
    const el = ref.current;
    if (!el) return;
    stopRelease();
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const start = el.scrollLeft;
    const bounded = Math.max(0, Math.min(max, projected));
    const children = [...el.children];
    let target = bounded;
    if (children.length > 1 && children.some(node => node.offsetWidth > 0)) {
      const computed = window.getComputedStyle?.(el);
      const leftInset = parseFloat(computed?.paddingLeft) || 0;
      const snapInset = parseFloat(computed?.scrollPaddingLeft) || 0;
      const base = children[0].offsetLeft;
      const centered = window.getComputedStyle?.(children[0])?.scrollSnapAlign?.includes("center");
      const nearest = children.map(node => {
        const position = node.offsetLeft - base + leftInset - snapInset -
          (centered ? (el.clientWidth - node.offsetWidth) / 2 : 0);
        return Math.max(0, Math.min(max, position));
      });
      target = nearest.reduce((best, candidate) =>
        Math.abs(candidate - bounded) < Math.abs(best - bounded) ? candidate : best, nearest[0]);
    }
    if (!reduced && Math.abs(target - start) >= 1 && typeof window.requestAnimationFrame === "function") {
      releaseSnap.current = previousSnap;
      releaseScrollBehavior.current = el.style.scrollBehavior;
      el.style.scrollSnapType = "none";
      el.style.scrollBehavior = "auto";
      const started = performance.now();
      const duration = Math.min(590, 365 + Math.abs(target - start) * 0.45);
      const normalize = 1 - 8 * Math.exp(-7);
      const advance = stamp => {
        if (drag.current || scrub.current !== false) { stopRelease(); return; }
        const t = Math.min(1, (stamp - started) / duration);
        const spring = (1 - (1 + 7 * t) * Math.exp(-7 * t)) / normalize;
        el.scrollLeft = t === 1 ? target : start + (target - start) * spring;
        if (t < 1) releaseFrame.current = window.requestAnimationFrame(advance);
        else {
          releaseFrame.current = null;
          el.style.scrollSnapType = previousSnap;
          el.style.scrollBehavior = releaseScrollBehavior.current || "";
          releaseSnap.current = null;
          releaseScrollBehavior.current = null;
          sync();
        }
      };
      releaseFrame.current = window.requestAnimationFrame(advance);
    } else {
      el.scrollLeft = target;
      el.style.scrollSnapType = previousSnap;
      sync();
    }
  };
  const setProgress = value => {
    const el = ref.current;
    if (!el) return;
    pauseAutoplay();
    const percent = Math.max(0, Math.min(100, value));
    const span = loop && count > 1 ? groupSize(el) : 0;
    const max = span || Math.max(0, el.scrollWidth - el.clientWidth);
    const target = (span ? span : 0) + max * percent / 100;
    updateProgress(percent);
    if (scrub.current === false) {
      // Arrow keys and track clicks without pointer capture also settle smoothly.
      settleToSnap(target, el.style.scrollSnapType);
      return;
    }
    scrubTarget.current = target;
    if (scrubFrame.current !== null) return;
    const advance = () => {
      const rail = ref.current;
      if (!rail || scrub.current === false) { scrubFrame.current = null; return; }
      const delta = scrubTarget.current - rail.scrollLeft;
      rail.scrollLeft = Math.abs(delta) < 0.6 ? scrubTarget.current : rail.scrollLeft + delta * 0.34;
      if (Math.abs(delta) >= 0.6) scrubFrame.current = window.requestAnimationFrame(advance);
      else scrubFrame.current = null;
    };
    scrubFrame.current = window.requestAnimationFrame(advance);
  };
  const beginScrub = () => {
    pauseAutoplay();
    const el = ref.current;
    if (el && scrub.current === false) {
      stopRelease();
      stopScrubFrame();
      scrub.current = el.style.scrollSnapType || "";
      scrubTarget.current = el.scrollLeft;
      el.style.scrollSnapType = "none";
    }
  };
  const endScrub = () => {
    pauseAutoplay();
    const el = ref.current;
    if (el && scrub.current !== false) {
      const snap = scrub.current;
      const destination = scrubTarget.current ?? el.scrollLeft;
      scrub.current = false;
      scrubTarget.current = null;
      stopScrubFrame();
      settleToSnap(destination, snap);
    }
  };
  const stopRelease = () => {
    if (releaseFrame.current !== null) {
      window.cancelAnimationFrame(releaseFrame.current);
      releaseFrame.current = null;
    }
    if (releaseSnap.current !== null && ref.current) {
      ref.current.style.scrollSnapType = releaseSnap.current;
      if (releaseScrollBehavior.current !== null) {
        ref.current.style.scrollBehavior = releaseScrollBehavior.current;
        releaseScrollBehavior.current = null;
      }
      releaseSnap.current = null;
    }
  };
  useEffect(() => () => {
    if (releaseFrame.current !== null) window.cancelAnimationFrame(releaseFrame.current);
    if (scrubFrame.current !== null) window.cancelAnimationFrame(scrubFrame.current);
  }, []);
  const onPointerDown = event => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const el = ref.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    if (scrub.current !== false) return;
    pauseAutoplay();
    stopRelease();
    drag.current = { x: event.clientX, left: el.scrollLeft, lastX: event.clientX,
      lastAt: Date.now(), velocity: 0, snap: el.style.scrollSnapType,
      moved: false, id: event.pointerId };
    suppressNextClick.current = false;
    // Preserve native Link click until the pointer actually drags the rail.
  };
  const onPointerMove = event => {
    const dragState = drag.current, el = ref.current;
    if (!dragState || !el || event.pointerId !== dragState.id) return;
    const delta = event.clientX - dragState.x;
    if (Math.abs(delta) > 10 && !dragState.moved) {
      dragState.moved = true;
      el.setPointerCapture?.(event.pointerId);
    }
    if (!dragState.moved) return;
    el.style.scrollSnapType = "none";
    el.classList.add("is-dragging");
    el.scrollLeft = dragState.left - delta;
    const now = Date.now();
    const elapsed = now - dragState.lastAt;
    if (elapsed > 0 && elapsed < 150) {
      const instantaneous = (dragState.lastX - event.clientX) / elapsed;
      dragState.velocity = dragState.velocity * 0.35 + instantaneous * 0.65;
    }
    dragState.lastX = event.clientX;
    dragState.lastAt = now;
    suppressNextClick.current = true;
    event.preventDefault();
    sync();
  };
  const finishDrag = event => {
    const state = drag.current, el = ref.current;
    if (!state || !el || event.pointerId !== state.id) return;
    el.classList.remove("is-dragging");
    if (el.hasPointerCapture?.(state.id)) el.releasePointerCapture(state.id);
    drag.current = null;
    if (state.moved) {
      const recent = Date.now() - state.lastAt < 110;
      const speed = recent ? Math.max(-1.25, Math.min(1.25, state.velocity)) : 0;
      settleToSnap(el.scrollLeft + speed * 190, state.snap);
      // A click from pointer-up must never open a card after a swipe.
      window.setTimeout(() => { suppressNextClick.current = false; }, 100);
    } else {
      el.style.scrollSnapType = state.snap;
    }
    sync();
  };
  const onClickCapture = event => {
    if (!suppressNextClick.current) return;
    suppressNextClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  };
  return {
    railProps: {
      ref, onScroll, onPointerDown, onPointerMove, onPointerUp: finishDrag,
      onPointerCancel: finishDrag, onClickCapture,
      onDragStart: event => event.preventDefault(),
      onKeyDown: pauseAutoplay, onTouchStart: pauseAutoplay,
      onMouseEnter: pauseAutoplay,
    },
    progress, setProgress, beginScrub, endScrub, pauseAutoplay,
  };
}
