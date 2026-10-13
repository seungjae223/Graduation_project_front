import api from "../api/api";
import { createTripApi, addPlaceToTripApi, getTripDayPlacesApi, getTripTimelineApi,
  setTripStartPlaceApi, updateTripPlaceOrderApi, updateTripPlaceScheduleApi } from "../api/tripApi";
import { getRecommendationsApi } from "../api/placeApi";
import { resetMockData } from "./mockAdapter";
jest.mock("../config/mockConfig", () => ({ USE_MOCK: true }));
beforeEach(() => resetMockData());

test("real API helpers save order, recalculate midnight times and restore duplicate place visits by their own IDs", async () => {
  const trip = await createTripApi({ title: "연동 확인", startDate: "2026-10-13", endDate: "2026-10-13" });
  const visits = [];
  for (const [index, placeId] of [1, 4, 1].entries()) {
    visits.push(await addPlaceToTripApi({ tripId: trip.id, day: 1, placeId, visitOrder: index + 1 }));
  }
  expect(visits.every(visit => !visit.isStartPoint)).toBe(true);
  await setTripStartPlaceApi({ tripId: trip.id, day: 1, tripPlaceId: visits[0].id });
  await updateTripPlaceScheduleApi({ tripId: trip.id, day: 1, tripPlaceId: visits[2].id,
    schedule: { fixed: true, arrivalTime: "00:30", stayDuration: 30, isNextDay: true } });
  const ids = [visits[0].id, visits[2].id, visits[1].id];
  const saved = await updateTripPlaceOrderApi({ tripId: trip.id, day: 1, tripPlaceIds: ids, startTime: "10:00" });
  expect(saved.map(place => place.tripPlaceId)).toEqual(ids);
  expect(saved[1]).toMatchObject({ placeId: 1, arrivalTime: "00:30", departureTime: "01:00", isNextDay: true });
  const reloaded = await getTripDayPlacesApi({ tripId: trip.id, day: 1 });
  expect(reloaded.map(place => place.tripPlaceId)).toEqual(ids);
  expect(reloaded[2]).toMatchObject({ arrivalTime: "01:20", departureTime: "02:20" });
  const timeline = await getTripTimelineApi({ tripId: trip.id, day: 1, startTime: "10:00" });
  expect(timeline[1]).toMatchObject({ arrivalDateTime: "2026-10-14T00:30:00", arrivalDayOffset: 1 });
});

test("impossible fixed-time order rejects with 400 and rolls back every visit", async () => {
  await updateTripPlaceScheduleApi({ tripId: 1, day: 1, tripPlaceId: 2,
    schedule: { fixed: true, arrivalTime: "09:00" } });
  const before = await getTripDayPlacesApi({ tripId: 1, day: 1 });
  await expect(updateTripPlaceOrderApi({ tripId: 1, day: 1, tripPlaceIds: [1, 2] }))
    .rejects.toMatchObject({ response: { status: 400 } });
  expect(await getTripDayPlacesApi({ tripId: 1, day: 1 })).toEqual(before);
});

test("incomplete order and moving a designated start both leave storage intact", async () => {
  const before = await getTripDayPlacesApi({ tripId: 1, day: 1 });
  for (const ids of [[1], [2, 1]]) {
    await expect(updateTripPlaceOrderApi({ tripId: 1, day: 1, tripPlaceIds: ids }))
      .rejects.toMatchObject({ response: { status: 400 } });
  }
  expect(await getTripDayPlacesApi({ tripId: 1, day: 1 })).toEqual(before);
});

test("recommendations use the current exact region/theme filter and stats count trips and saved records", async () => {
  const places = await getRecommendationsApi({ region: "제주", theme: "healing" });
  expect(places.length).toBeGreaterThan(0);
  expect(places.every(place => place.region === "제주" && place.theme === "HEALING")).toBe(true);
  expect(await getRecommendationsApi({ region: "제", theme: "healing" })).toEqual([]);
  await api.post("/api/folders/2/places/1");
  expect((await api.get("/api/mypage/stats")).data).toMatchObject({ visitedPlacesCount: 3, savedPlacesCount: 5 });
});
