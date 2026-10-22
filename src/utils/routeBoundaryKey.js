// Keep search/destination filters and trip editor query changes within the
// same mounted route. A different trip ID must still reset the boundary.
export default function getRouteBoundaryKey(pathname, search = "") {
  const route = pathname.toLowerCase();
  if (route === "/route-result") {
    const tripId = new URLSearchParams(search).get("id") || "";
    return pathname + ":trip:" + tripId;
  }
  return pathname + (route === "/search" || route.startsWith("/destinations/") ? "" : search);
}
