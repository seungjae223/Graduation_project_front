import getRouteBoundaryKey from "./routeBoundaryKey";

test("destination filter and load-more updates keep the same route boundary", () => {
  const base = getRouteBoundaryKey("/destinations/hong-kong", "");
  expect(getRouteBoundaryKey("/destinations/hong-kong", "?shown=24")).toBe(base);
  expect(getRouteBoundaryKey("/destinations/hong-kong", "?q=park&category=NATURE&shown=36")).toBe(base);
  expect(getRouteBoundaryKey("/destinations/tokyo", "?shown=24")).not.toBe(base);
});

test("search keyword, recent keyword and page changes preserve the mounted route", () => {
  const base = getRouteBoundaryKey("/search", "");
  expect(getRouteBoundaryKey("/search", "?keyword=park")).toBe(base);
  expect(getRouteBoundaryKey("/search", "?keyword=hotel&page=2")).toBe(base);
  expect(getRouteBoundaryKey("/recommend", "?keyword=hotel")).not.toBe(base);
});

test("detail identity still resets when its query changes", () => {
  expect(getRouteBoundaryKey("/detail", "?id=1")).not.toBe(getRouteBoundaryKey("/detail", "?id=2"));
});

test("itinerary detail and editor share the same boundary for one trip", () => {
  const detail = getRouteBoundaryKey("/route-result", "?id=12");
  expect(getRouteBoundaryKey("/route-result", "?id=12&edit=1&day=2")).toBe(detail);
  expect(getRouteBoundaryKey("/route-result", "?id=12&edit=1&day=2&version=optimized")).toBe(detail);
  expect(getRouteBoundaryKey("/route-result", "?id=12&edit=1&day=1&open=first")).toBe(detail);
  expect(getRouteBoundaryKey("/route-result", "?id=12&edit=1&day=1&place=123")).toBe(detail);
  expect(getRouteBoundaryKey("/route-result", "?id=13")).not.toBe(detail);
});
