import { findDestinationSearchMatches, requireSearchDestinations } from "./destinationSearch";

const destinations = [
  { code: "tokyo", name: "도쿄", countryCode: "JP", countryName: "일본" },
  { code: "osaka", name: "오사카", countryCode: "JP", countryName: "일본" },
  { code: "hong-kong", name: "홍콩", countryCode: "HK", countryName: "홍콩" },
  { code: "seoul", name: "서울", countryCode: "KR", countryName: "대한민국" },
  { code: "jeju", name: "제주", countryCode: "KR", countryName: "대한민국" },
];

test.each(["일본", "Japan", " JP "])("country query %s returns only actual destination codes", keyword => {
  const found = findDestinationSearchMatches(destinations, keyword);
  expect(found.isCountrySearch).toBe(true);
  expect(found.destinations.map(item => item.code)).toEqual(["tokyo", "osaka"]);
});

test.each(["한국", "대한민국", "South Korea"])("Korean country alias %s", keyword => {
  const found = findDestinationSearchMatches(destinations, keyword);
  expect(found.isCountrySearch).toBe(true);
  expect(found.destinations.map(item => item.code)).toEqual(["seoul", "jeju"]);
});

test("city name resolves one destination, not all places or similarly named country", () => {
  expect(findDestinationSearchMatches(destinations, "  도쿄 ")).toEqual({ isCountrySearch: false, destinations: [destinations[0]] });
  expect(findDestinationSearchMatches(destinations, "홍콩")).toEqual({ isCountrySearch: false, destinations: [destinations[2]] });
});

test("place keyword never fabricates a destination card", () => {
  expect(findDestinationSearchMatches(destinations, "센소지")).toEqual({ isCountrySearch: false, destinations: [] });
});

test("server catalog drives matches and invalid codes or duplicates fail closed", () => {
  expect(findDestinationSearchMatches(destinations.filter(item => item.code !== "osaka"), "일본").destinations.map(item => item.code)).toEqual(["tokyo"]);
  expect(() => requireSearchDestinations([{ code: "../admin", name: "도쿄", countryCode: "JP", countryName: "일본" }])).toThrow();
  expect(() => requireSearchDestinations([destinations[0], destinations[0]])).toThrow();
  expect(() => requireSearchDestinations({})).toThrow();
  expect(findDestinationSearchMatches([{ code: "safe", name: "안전", countryCode: "__proto__", countryName: "미상" }], "안전").destinations).toHaveLength(1);
});
