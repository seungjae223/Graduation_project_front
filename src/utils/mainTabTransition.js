// Shared five-tab ordering. Subpages inherit the active section when leaving
// via the fixed bottom navigation; query-only and within-section moves do not slide.
export const MAIN_TAB_ROUTES = ["/home", "/search", "/recommend", "/schedule", "/mypage"];

export function mainTabForRoute(pathname) {
  const path = (pathname || "").toLowerCase();
  if (MAIN_TAB_ROUTES.includes(path)) return path;
  if (path.startsWith("/destinations/")) return "/search";
  if (path === "/total") return "/recommend";
  if (path.startsWith("/route-create") || path.startsWith("/route-result") ||
      path.startsWith("/calendar")) return "/schedule";
  if (path.startsWith("/my-schedule")) return "/schedule";
  if (path.startsWith("/mypage/") || path.startsWith("/saved-places") ||
      path.startsWith("/inquiry")) return "/mypage";
  if (path === "/popular-all") return "/home";
  return null;
}

export default function getMainTabTransition(previousPath, nextPath) {
  // Only a destination that really is a bottom tab receives a tab slide;
  // detail/back navigation and ordinary subpage links keep their own motion.
  const destination = (nextPath || "").toLowerCase();
  const after = MAIN_TAB_ROUTES.indexOf(destination);
  if (previousPath === "/home" && (destination.startsWith("/route-create") ||
      destination === "/my-schedule")) return "route-transition--tab-from-right";
  const fromTab = mainTabForRoute(previousPath);
  const before = MAIN_TAB_ROUTES.indexOf(fromTab);
  if (before < 0 || after < 0 || before === after) return "";
  return after > before ? "route-transition--tab-from-right" : "route-transition--tab-from-left";
}
