// Query-driven list controls and the trip editor stay within the mounted route.
// A different trip ID must still reset the boundary.
const LIST_ROUTES = new Set(["/search", "/recommend", "/popular-all", "/mypage/reviews"]);
export default function getRouteBoundaryKey(pathname, search = "") {
  const route = pathname.toLowerCase();
  if (route === "/route-result") {
    const tripId = new URLSearchParams(search).get("id") || "";
    return pathname + ":trip:" + tripId;
  }
  return pathname + (LIST_ROUTES.has(route) || route.startsWith("/destinations/") ? "" : search);
}
