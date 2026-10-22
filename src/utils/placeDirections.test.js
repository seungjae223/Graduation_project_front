import { getPlaceDirections } from "./placeDirections";
import { isMapUrlForProvider } from "./mapUrl";

test("domestic places open Kakao directions by coordinates or safe search", () => {
  const mapped = getPlaceDirections({ name: "서울숲", region: "서울", latitude: 37.54, longitude: 127.04 });
  expect(mapped.provider).toBe("kakao");
  expect(mapped.url).toContain("/link/to/");
  expect(isMapUrlForProvider(mapped.url, "kakao")).toBe(true);
  const searched = getPlaceDirections({ name: "서울숲", region: "서울", address: "서울 성동구", latitude: 0, longitude: 0 });
  expect(decodeURIComponent(searched.url)).toContain("서울숲 서울 성동구");
  expect(searched.url).toContain("/link/search/");
});

test("overseas places open Google directions, and unsupported regions are never guessed", () => {
  const mapped = getPlaceDirections({ name: "빅토리아 피크", region: "홍콩", latitude: 22.27, longitude: 114.15 });
  expect(mapped.provider).toBe("google");
  expect(mapped.url).toContain("destination=22.27%2C114.15");
  expect(isMapUrlForProvider(mapped.url, "google")).toBe(true);
  expect(getPlaceDirections({ name: "알 수 없는 곳", region: "미등록도시" })).toBeNull();
  expect(getPlaceDirections({ name: "", region: "서울" })).toBeNull();
});
