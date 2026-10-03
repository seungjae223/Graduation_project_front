// Check URLs from API data as strictly as locally generated map URLs.
export function isMapUrlForProvider(value, provider) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password ||
        (url.port && url.port !== "443")) return false;
    if (provider === "kakao") return url.hostname === "map.kakao.com";
    if (provider !== "google") return false;
    if (url.hostname === "maps.app.goo.gl") return true;
    if (url.hostname === "goo.gl") return url.pathname.startsWith("/maps/");
    return ["www.google.com", "maps.google.com"].includes(url.hostname) &&
      (url.pathname === "/maps" || url.pathname.startsWith("/maps/"));
  } catch { return false; }
}
