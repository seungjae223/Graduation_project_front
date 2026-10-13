import api from "./api";
import { addPlaceToTripApi, createTripApi, getTripDayPlacesApi, getTripTimelineApi,
  mapTripToSavedRoute, optimizeTripDayApi, updateTripPlaceOrderApi, updateTripPlaceScheduleApi } from "./tripApi";
import { createReviewApi, getPlacesApi, getRecommendationsApi, getReviewsApi } from "./placeApi";
jest.mock("./api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() } }));
beforeEach(() => jest.resetAllMocks());

test("place listing forwards cancellation without inventing country or paging parameters", async () => {
  const places = [{ id: 1, name: "실제 장소", region: "뉴욕" }];
  api.get.mockResolvedValue({ data: places });
  const signal = new AbortController().signal;
  expect(await getPlacesApi({ signal })).toBe(places);
  expect(api.get).toHaveBeenCalledWith("/api/places", { signal });
});

test.each([
  { rows: [{ name: "ID 없는 장소" }] },
  { rows: [{ id: 1, name: "중복 1" }, { id: 1, name: "중복 2" }] },
  { rows: [{ id: 1 }] },
])("invalid place IDs or names cannot become fabricated cards", async ({ rows }) => {
  api.get.mockResolvedValue({ data: rows });
  await expect(getPlacesApi()).rejects.toThrow("장소 목록 응답");
});

test("order PATCH sends TripPlace IDs and HH:mm, preserving next-day fields", async () => {
  api.patch.mockResolvedValue({ data: [{ id: 92, placeId: 4, day: 1, visitOrder: 1, isFixed: true, isNextDay: true }, { id: 91, placeId: 4, day: 1, visitOrder: 2 }] });
  const places = await updateTripPlaceOrderApi({ tripId: 7, day: 1, tripPlaceIds: [92, 91], startTime: "10:00" });
  expect(api.patch).toHaveBeenCalledWith("/api/trips/7/days/1/places/order", { tripPlaceIds: [92, 91], startTime: "10:00" });
  expect(places[0]).toMatchObject({ tripPlaceId: 92, placeId: 4, isNextDay: true });
});

test.each([
  [{ id: 91, placeId: 4, day: 1, visitOrder: 1 }, { id: 92, placeId: 4, day: 1, visitOrder: 2 }],
  [{ id: 92, placeId: 4, day: 1, visitOrder: 1 }],
  [{ id: 92, placeId: 4, day: 2, visitOrder: 1 }, { id: 91, placeId: 4, day: 2, visitOrder: 2 }],
].map(rows => [rows]))("a mismatched order response is not reported as a confirmed save", async rows => {
  api.patch.mockResolvedValue({ data: rows });
  await expect(updateTripPlaceOrderApi({ tripId: 7, day: 1, tripPlaceIds: [92, 91] })).rejects.toThrow("저장 응답의 방문 순서");
});

test.each([
  { tripPlaceIds: [91, 91] }, { tripPlaceIds: [0] }, { tripPlaceIds: [91], startTime: "24:00" },
])("invalid order requests are rejected before sending", async options => {
  await expect(updateTripPlaceOrderApi({ tripId: 7, day: 1, ...options })).rejects.toThrow();
  expect(api.patch).not.toHaveBeenCalled();
});

test("schedule null fields preserve values; fixed and isNextDay names match the request contract", async () => {
  api.patch.mockResolvedValue({ data: { id: 91, day: 1, isFixed: true, isNextDay: true } });
  await updateTripPlaceScheduleApi({ tripId: 7, day: 1, tripPlaceId: 91,
    schedule: { fixed: null, arrivalTime: null, stayDuration: 90, isNextDay: null } });
  expect(api.patch).toHaveBeenLastCalledWith("/api/trips/7/days/1/places/91/schedule", { stayDuration: 90 });
  await updateTripPlaceScheduleApi({ tripId: 7, day: 1, tripPlaceId: 91,
    schedule: { fixed: true, arrivalTime: "00:30", isNextDay: true } });
  expect(api.patch).toHaveBeenLastCalledWith("/api/trips/7/days/1/places/91/schedule", { fixed: true, arrivalTime: "00:30", isNextDay: true });
});

test.each([0, 1441, 1.5])("invalid stay duration %s prevents a schedule write", async stayDuration => {
  await expect(updateTripPlaceScheduleApi({ tripId: 7, day: 1, tripPlaceId: 91, schedule: { stayDuration } })).rejects.toThrow();
  expect(api.patch).not.toHaveBeenCalled();
});

test.each([
  () => getTripDayPlacesApi({ tripId: 7, day: 1 }),
  () => optimizeTripDayApi({ tripId: 7, day: 1 }),
  () => updateTripPlaceOrderApi({ tripId: 7, day: 1, tripPlaceIds: [91] }),
  () => getReviewsApi(4),
])("malformed list bodies never appear as a successful empty schedule", async request => {
  for (const method of ["get", "post", "patch"]) api[method].mockResolvedValue({ data: "<html>error</html>" });
  await expect(request()).rejects.toThrow();
});

test.each([
  { startDate: "2026-10-14", endDate: "2026-10-13" },
  { startDate: "2026-02-30", endDate: "2026-03-03" },
  { latitude: 91 }, { longitude: 181 }, { latitude: "invalid" },
])("invalid trip dates or coordinates prevent creation", async changes => {
  await expect(createTripApi({ title: "여행", startDate: "2026-10-13", endDate: "2026-10-14", ...changes })).rejects.toThrow();
  expect(api.post).not.toHaveBeenCalled();
});

test("timeline uses the same 10:00 start as generation and order saving", async () => {
  api.get.mockResolvedValue({ data: [] });
  await getTripTimelineApi({ tripId: 7, day: 1 });
  expect(api.get).toHaveBeenCalledWith("/api/trips/7/days/1/timeline", expect.objectContaining({ params: { startTime: "10:00" } }));
});

test("known UI themes use seeded server values; unknown themes pass through", async () => {
  api.get.mockResolvedValue({ data: [] });
  for (const [ui, server] of [["healing", "HEALING"], ["food", "FOOD"], ["새 테마", "새 테마"]]) {
    await getRecommendationsApi({ region: "제주", theme: ui });
    expect(api.get).toHaveBeenLastCalledWith("/api/recommendations", expect.objectContaining({ params: { region: "제주", theme: server } }));
  }
});

test("saved route retains a next-day fixed arrival", () => {
  const route = mapTripToSavedRoute({ id: 7, startDate: "2026-10-13", endDate: "2026-10-13" },
    [{ id: 91, placeId: 4, day: 1, visitOrder: 1, isFixed: true, isNextDay: true, arrivalTime: "00:30" }]);
  expect(route.placesByDate["2026-10-13"][0]).toMatchObject({ tripPlaceId: 91, isNextDay: true, isFixed: true });
});

test.each([{ comment: "", rating: 4 }, { comment: "리뷰", rating: 6 }, { comment: "리뷰", rating: null }])("invalid reviews prevent a server write", async values => {
  await expect(createReviewApi({ placeId: 4, ...values })).rejects.toThrow();
  expect(api.post).not.toHaveBeenCalled();
});

test("place addition still uses placeId in the path and day/order query parameters", async () => {
  api.post.mockResolvedValue({ data: { id: 91, placeId: 4, day: 1, visitOrder: 1 } });
  expect(await addPlaceToTripApi({ tripId: 7, placeId: 4, day: 1, visitOrder: 1 })).toMatchObject({ tripPlaceId: 91, placeId: 4 });
  expect(api.post).toHaveBeenCalledWith("/api/trips/7/places/4", null, { params: { day: 1, visitOrder: 1 } });
});
