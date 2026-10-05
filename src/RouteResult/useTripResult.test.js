import { act, renderHook, waitFor } from "@testing-library/react";
import useTripResult from "./useTripResult";
import { getTripByIdApi, getTripPlacesApi, getTripTimelineApi } from "../api/tripApi";
jest.mock("../api/tripApi", () => ({ getTripByIdApi: jest.fn(), getTripPlacesApi: jest.fn(), getTripTimelineApi: jest.fn() }));
const trip = { id: 1, title: "실제 여행", startDate: "2026-10-04", endDate: "2026-10-04" };
const places = [{ id: 91, placeId: 81, day: 1, visitOrder: 1, placeName: "저장 장소" }];
beforeEach(() => { jest.clearAllMocks(); getTripByIdApi.mockResolvedValue(trip); getTripPlacesApi.mockResolvedValue(places); getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:00" }]); });
test("missing/invalid ID does not fetch or use Mock", async () => {
  const { result } = renderHook(() => useTripResult("route-mock"));
  await waitFor(() => expect(result.current.status).toBe("invalid"));
  expect(getTripByIdApi).not.toHaveBeenCalled(); expect(result.current.places).toEqual([]);
});
test("detail failure is an error, not empty success; retry is only a read", async () => {
  getTripByIdApi.mockRejectedValueOnce(new Error("Network Error"));
  const { result } = renderHook(() => useTripResult("1"));
  await waitFor(() => expect(result.current.status).toBe("error"));
  expect(result.current.trip).toBeNull();
  await act(async () => result.current.retry());
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(getTripByIdApi).toHaveBeenCalledTimes(2);
});
test("empty successful trip remains empty and does not request timelines", async () => {
  getTripPlacesApi.mockResolvedValue([]);
  const { result } = renderHook(() => useTripResult("1"));
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(result.current.places).toEqual([]); expect(getTripTimelineApi).not.toHaveBeenCalled();
});
test("timeline failure preserves trip and places; retry duplicates are blocked", async () => {
  getTripTimelineApi.mockRejectedValueOnce(new Error("Network Error"));
  const { result } = renderHook(() => useTripResult("1"));
  await waitFor(() => expect(result.current.timelines[1]?.status).toBe("error"));
  expect(result.current.trip).toEqual(trip); expect(result.current.places).toEqual(places);
  let resolve; getTripTimelineApi.mockReturnValueOnce(new Promise(r => { resolve = r; }));
  act(() => { result.current.retryTimeline(1); result.current.retryTimeline(1); });
  expect(getTripTimelineApi).toHaveBeenCalledTimes(2);
  await act(async () => resolve([{ visitOrder: 1, arrivalTime: "11:00" }]));
  expect(result.current.timelines[1].status).toBe("success"); expect(getTripByIdApi).toHaveBeenCalledTimes(1);
});
test("old responses cannot replace a new trip even if transport ignores abort", async () => {
  let resolve; getTripByIdApi.mockReturnValueOnce(new Promise(r => { resolve = r; })).mockResolvedValueOnce({ ...trip, id: 2 });
  const { result, rerender } = renderHook(({ id }) => useTripResult(id), { initialProps: { id: "1" } });
  rerender({ id: "2" }); await waitFor(() => expect(result.current.trip?.id).toBe(2));
  await act(async () => resolve(trip)); expect(result.current.trip.id).toBe(2);
});
test("unmatched timeline order is an error, never attached by array index", async () => {
  getTripTimelineApi.mockResolvedValue([{ visitOrder: 9, arrivalTime: "13:00" }]);
  const { result } = renderHook(() => useTripResult("1"));
  await waitFor(() => expect(result.current.timelines[1]?.status).toBe("error"));
  expect(result.current.places[0].id).toBe(91);
});
