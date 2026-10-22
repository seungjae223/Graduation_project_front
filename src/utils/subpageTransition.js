// Distinguish MyPage subpage navigation from main-tab switches.
// Queries are ignored except for /saved-places?folderId=... which is a full view.
const isMyPageChild = path =>
  path.startsWith("/mypage/") || path === "/saved-places" ||
  path.startsWith("/inquiry") || path === "/my-schedule";

export default function getSubpageTransition(previousPath, nextPath, previousSearch = "", nextSearch = "") {
  const before = (previousPath || "").toLowerCase();
  const after = (nextPath || "").toLowerCase();
  if (!before || !after) return "";

  // Trip detail -> day picker slides in, returning slides the body back.
  // Keep the global header and bottom navigation fixed.
  if (before === "/route-result" && after === "/route-add-places") {
    return "route-transition--subpage-from-right";
  }
  if (before === "/route-add-places" && after === "/route-result") {
    return "route-transition--subpage-from-left";
  }

  if (before === "/saved-places" && after === "/saved-places") {
    const previousFolder = new URLSearchParams(previousSearch).get("folderId");
    const nextFolder = new URLSearchParams(nextSearch).get("folderId");
    if (previousFolder === nextFolder) return "";
    return nextFolder ? "route-transition--subpage-from-right"
      : "route-transition--subpage-from-left";
  }

  if (before === "/mypage" && isMyPageChild(after)) return "route-transition--subpage-from-right";
  if (after === "/mypage" && isMyPageChild(before)) return "route-transition--subpage-from-left";
  return "";
}
