import { readOptimizedVersions, saveOptimizedDay, saveOptimizedDays } from "./tripOptimizationVersionStore";

const originals = [
  { tripPlaceId: 1, placeId: 18, placeName: "출발 장소", day: 1, visitOrder: 1, stayDuration: 60, memo: "출발" },
  { tripPlaceId: 2, placeId: 19, placeName: "도착 장소", day: 1, visitOrder: 2, stayDuration: 60, memo: "" },
];
const draft = {
  order: ["1", "2"], mode: "quick", warnings: [],
  rows: [{ type: "start", id: "1", name: "출발 장소", time: 540 },
    { type: "end", id: "2", name: "도착 장소", time: 720 }],
};

beforeEach(() => window.localStorage.clear());

test("an edited or deleted manual source cannot invalidate an independently saved optimization", () => {
  expect(saveOptimizedDay(12, "account:test", originals, 1, draft)).toBe(true);
  const changed = [{ ...originals[0], placeName: "원본 장소 수정", visitOrder: 2 }];
  const optimized = readOptimizedVersions(12, "account:test", changed)["1"];
  expect(optimized.stale).toBe(true);
  expect(optimized.sourcePlaces["1"].placeName).toBe("출발 장소");
  expect(optimized.sourcePlaces["2"].placeName).toBe("도착 장소");
  expect(saveOptimizedDay(12, "account:test", changed, 1,
    { ...optimized, manuallyEdited: true, memoOverrides: { "2": "독립적인 메모" } })).toBe(true);
  const after = readOptimizedVersions(12, "account:test", []);
  expect(after["1"].order).toEqual(["1", "2"]);
  expect(after["1"].memoOverrides["2"]).toBe("독립적인 메모");
  expect(after["1"].sourcePlaces["2"].placeName).toBe("도착 장소");
  expect(after["1"].stale).toBe(true);
});

test("saving optimized additions to two dates is all-or-nothing", () => {
  const dayTwo = originals.map(place => ({ ...place, tripPlaceId: place.tripPlaceId + 10, day: 2 }));
  const both = [...originals, ...dayTwo];
  const second = { ...draft, order: ["11", "12"],
    rows: [{ type: "start", id: "11", name: "출발 장소", time: 540 },
      { type: "end", id: "12", name: "도착 장소", time: 720 }] };
  expect(saveOptimizedDays(12, "account:test", both,
    { "1": draft, "2": { ...second, order: [] } })).toBe(false);
  expect(readOptimizedVersions(12, "account:test", both)).toEqual({});
  expect(saveOptimizedDays(12, "account:test", both, { "1": draft, "2": second })).toBe(true);
  expect(Object.keys(readOptimizedVersions(12, "account:test", both))).toEqual(["1","2"]);
});
