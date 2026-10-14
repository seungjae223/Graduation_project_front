import { distanceBetweenKm, fetchReviewRatings, readCoordinates, sortPlacesByDistance, sortPlacesByRating, summarizeReviews } from "./recommendationSort";

test("Haversine measures zero, a known equatorial arc and antipodes, while invalid coordinates stay unknown", () => {
  expect(distanceBetweenKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 0 })).toBe(0);
  expect(distanceBetweenKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.1949266, 5);
  expect(distanceBetweenKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 180 })).toBeCloseTo(20015.0868, 3);
  for (const latitude of [null, undefined, "", " ", false, [], NaN, Infinity, -91, 91]) expect(readCoordinates({ latitude, longitude: 0 })).toBeNull();
  expect(readCoordinates({ latitude: "0", longitude: "135.3" })).toEqual({ latitude: 0, longitude: 135.3 });
  expect(distanceBetweenKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 181 })).toBeNull();
});

test("the complete list is sorted before slicing, ties and missing coordinates remain stable and inputs are immutable", () => {
  const places = Object.freeze([5, 4, 3, 2, 1, 0, null, null].map((longitude, index) => Object.freeze({ id: index + 1, latitude: 0, longitude })));
  const sorted = sortPlacesByDistance(places, { latitude: 0, longitude: 0 });
  expect(sorted.map(place => place.id)).toEqual([6, 5, 4, 3, 2, 1, 7, 8]);
  expect(sorted.slice(0, 5).map(place => place.id)).toEqual([6, 5, 4, 3, 2]);
  expect(sorted.slice(5).map(place => place.id)).toEqual([1, 7, 8]);
  expect(places[0]).not.toHaveProperty("distanceKm");
  expect(sorted[6].distanceKm).toBeNull();
});

test("review averages use only actual valid values including zero; missing values never become default stars", () => {
  expect(summarizeReviews([{ rating: 0 }, { rating: 4 }, { rating: null }, { rating: 8 }, { rating: "" }])).toEqual({ rating: 2, reviewCount: 2 });
  expect(summarizeReviews([])).toEqual({ rating: null, reviewCount: 0 });
  expect(() => summarizeReviews({ content: [{ rating: 5 }], totalPages: 2 })).toThrow();
  expect(sortPlacesByRating([{ id: 1 }, { id: 2 }, { id: 3 }], { 1: { rating: null }, 2: { rating: 0 }, 3: { rating: 4 } }).map(place => place.id)).toEqual([3, 2, 1]);
});

test("per-place review reads honor cancellation, bounded concurrency and real supplied ratings", async () => {
  let active = 0, peak = 0;
  const getReviews = jest.fn(async () => { active++; peak = Math.max(peak, active); await Promise.resolve(); active--; return [{ rating: 4 }]; });
  const controller = new AbortController();
  const result = await fetchReviewRatings(Array.from({ length: 10 }, (_, index) => ({ id: index + 1 })), getReviews, controller.signal);
  expect(Object.keys(result)).toHaveLength(10); expect(peak).toBeLessThanOrEqual(4);
  expect(getReviews).toHaveBeenCalledTimes(10);
  getReviews.mockClear();
  expect(await fetchReviewRatings([{ id: 1, rating: 0 }], getReviews, controller.signal)).toEqual({ 1: { rating: 0 } });
  expect(getReviews).not.toHaveBeenCalled();
  controller.abort();
  await expect(fetchReviewRatings([{ id: 1 }], getReviews, controller.signal)).rejects.toHaveProperty("name", "AbortError");
  expect(getReviews).not.toHaveBeenCalled();
});
