import { Suspense, useCallback, useLayoutEffect, useState } from "react";
import { RouteContentReady } from "../animations/PageTransition";
import EarthLoader from "./EarthLoader";
import { RouteLoadError } from "./RouteErrorBoundary";
import { RoutePendingContext } from "./routePending";

const INITIAL_READ_LIMIT_MS = 15000;
const IMAGE_WAIT_LIMIT_MS = 2000;

function isInViewport(image) {
  const { top, left, right, bottom, width, height } = image.getBoundingClientRect();
  return width > 0 && height > 0 && bottom > 0 && right > 0 &&
    top < window.innerHeight && left < window.innerWidth;
}

export default function RouteLoading({ children, text = "화면을 불러오는 중..." }) {
  const [content, setContent] = useState(null);
  const [reads, setReads] = useState(0);
  const [phase, setPhase] = useState("pending");
  const ready = phase === "ready";
  const hasPendingReads = reads > 0;
  const register = useCallback(() => {
    setReads(count => count + 1);
    return () => setReads(count => count - 1);
  }, []);

  useLayoutEffect(() => {
    if (phase !== "pending" || !content || !hasPendingReads) return;
    const deadline = window.setTimeout(() => setPhase("timeout"), INITIAL_READ_LIMIT_MS);
    return () => window.clearTimeout(deadline);
  }, [content, hasPendingReads, phase]);

  useLayoutEffect(() => {
    if (phase !== "pending" || !content || hasPendingReads) return;
    let active = true;
    let frame;
    const decoded = new WeakMap();

    function checkImages() {
      const images = Array.from(content.querySelectorAll("img[src], img[srcset]"));
      if (images.map(imageReady).every(Boolean)) setPhase("ready");
    }

    function imageReady(image) {
      if (!isInViewport(image)) return true;
      if (image.loading === "lazy") image.loading = "eager";
      if (!image.complete) return false;
      if (!image.naturalWidth || !image.decode) return true;

      const src = image.currentSrc || image.src;
      const previous = decoded.get(image);
      if (previous?.src === src) return previous.done;
      const entry = { src, done: false };
      decoded.set(image, entry);
      const finish = () => {
        entry.done = true;
        schedule();
      };
      image.decode().then(finish, finish);
      return false;
    }

    function schedule() {
      if (!active || frame !== undefined) return;
      frame = window.requestAnimationFrame(() => {
        frame = undefined;
        checkImages();
      });
    }

    // Check again after React swaps in an image fallback or another source.
    const observer = new MutationObserver(schedule);
    observer.observe(content, { subtree: true, childList: true, attributes: true, attributeFilter: ["src", "srcset"] });
    content.addEventListener("load", schedule, true);
    content.addEventListener("error", schedule, true);
    const deadline = window.setTimeout(() => setPhase("ready"), IMAGE_WAIT_LIMIT_MS);
    checkImages();

    return () => {
      active = false;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(deadline);
      observer.disconnect();
      content.removeEventListener("load", schedule, true);
      content.removeEventListener("error", schedule, true);
    };
  }, [content, hasPendingReads, phase]);

  if (phase === "timeout") {
    return <RouteContentReady><RouteLoadError timedOut /></RouteContentReady>;
  }

  const loader = <EarthLoader variant="page" text={text} />;
  return (
    <RoutePendingContext.Provider value={ready ? null : register}>
      {!ready && loader}
      <Suspense fallback={ready ? loader : null}>
        <div ref={setContent} className="route-content" data-loading={!ready || undefined}
          aria-hidden={!ready || undefined} inert={!ready}>
          {children}
        </div>
        {ready && <RouteContentReady />}
      </Suspense>
    </RoutePendingContext.Provider>
  );
}
