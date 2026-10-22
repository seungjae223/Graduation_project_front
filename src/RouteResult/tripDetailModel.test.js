import { defaultDetailView, tripDays, formatTripDate, hasTripStart, mayOptimizeDay, tripStayLabel } from "./tripDetailModel";

test("both short and long trips use list as the no-preference default", () => {
  expect(defaultDetailView(4)).toBe("list");
  expect(defaultDetailView(8)).toBe("list");
  expect(defaultDetailView(15)).toBe("list");
});
test("day generation uses real date range, includes empty days, and preserves true server order", () => {
  const trip = { startDate: "2026-10-26", endDate: "2026-10-29" };
  const places = [
    { id: 2, day: 1, visitOrder: 2, placeName: "두 번째 장소" },
    { id: 1, day: 1, visitOrder: 1, placeName: "첫 번째 장소" },
    { id: 3, day: 3, visitOrder: 1, placeName: "세 번째 날 장소" },
  ];
  const days = tripDays(trip, places);
  expect(days).toHaveLength(4);
  expect(days.map(day => day.dateLabel)).toEqual(["10.26", "10.27", "10.28", "10.29"]);
  expect(days[0].places.map(place => place.id)).toEqual([1, 2]);
  expect(days[1].places).toHaveLength(0);
  expect(days[2].places).toHaveLength(1);
  expect(days[3].places).toHaveLength(0);
  expect(formatTripDate(trip.startDate)).toBe("2026.10.26");
  expect(tripStayLabel(4)).toBe("3박 4일");
});
test("invalid date ranges do not silently show mock places", () => {
  expect(tripDays({ startDate: "2026-02-30", endDate: "2026-03-01" })).toHaveLength(0);
  expect(tripDays({ startDate: "2026-11-20", endDate: "2026-11-19" })).toHaveLength(0);
  expect(tripDays({ startDate: "2026-01-01", endDate: "2028-01-01" })).toHaveLength(0);
});
test("optimization needs multiple stored places and either a known trip start or an assigned starting place", () => {
  const places = [{ id: 1 }, { id: 2 }];
  expect(hasTripStart({ latitude: null, longitude: null })).toBe(false);
  expect(mayOptimizeDay({ latitude: null, longitude: null }, { places })).toBe(false);
  expect(mayOptimizeDay({ latitude: null, longitude: null }, { places: [places[0], { id: 2, isStartPoint: true }] })).toBe(true);
  expect(mayOptimizeDay({ latitude: 37.5, longitude: 127.1 }, { places })).toBe(true);
  expect(mayOptimizeDay({ latitude: 37.5, longitude: 127.1 }, { places: [places[0]] })).toBe(false);
});
