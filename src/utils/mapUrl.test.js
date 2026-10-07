import { isMapUrlForProvider } from "./mapUrl";

test.each([
  ["google", "https://www.google.com/maps/dir/?api=1&destination=Tokyo"],
  ["google", "https://maps.app.goo.gl/example"],
  ["google", "https://goo.gl/maps/example"],
  ["kakao", "https://map.kakao.com/link/search/Seoul"],
])("valid %s map URL is preserved", (provider, url) => {
  expect(isMapUrlForProvider(url, provider)).toBe(true);
});
test.each([
  // eslint-disable-next-line no-script-url -- Malicious URL fixture must be rejected.
  "javascript:alert('google.com kakao.com')", "https://evil.example/google.com/kakao.com",
  "https://www.google.com.evil.example/maps", "https://map.kakao.com@evil.example/",
  "http://map.kakao.com/link/map/test", "https://www.google.com/url?q=https://evil.example",
  "https://map.kakao.com:8443/", "data:text/html,google.com", "//map.kakao.com/",
])("rejects deceptive external link: %s", url => {
  expect(isMapUrlForProvider(url, "google")).toBe(false);
  expect(isMapUrlForProvider(url, "kakao")).toBe(false);
});
test("unknown provider and malformed URL fail closed", () => {
  expect(isMapUrlForProvider("https://www.google.com/maps", "unknown")).toBe(false);
  expect(isMapUrlForProvider({}, "google")).toBe(false);
  expect(isMapUrlForProvider("invalid", "google")).toBe(false);
});
