import { act, renderHook, waitFor } from "@testing-library/react";
import useGenerationTask from "./useGenerationTask";
import { saveRouteToServer } from "./RouteCreate";
import api from "../api/api";
jest.mock("../api/api", () => ({ __esModule: true, default: { post: jest.fn(), patch: jest.fn(), get: jest.fn() }, getApiErrorMessage: () => "오류" }));
const date = "2026-10-04";
const draft = { id: "route-local", title: "내 입력", selectedDates: [date], placesByDate: { [date]: [
  { id: "local-1", placeId: 11, name: "첫 장소", latitude: 37, longitude: 127 },
  { id: "local-2", placeId: 12, name: "시간 장소", latitude: 37.1, longitude: 127.1, isFixedTime: true, timeLabel: "12:30 PM" },
] } };
beforeEach(() => {
  jest.clearAllMocks();
  api.post.mockImplementation(async (url) => {
    if (url === "/api/trips") return { data: { id: 42, title: "내 입력", startDate: date, endDate: date } };
    if (url.includes("/optimize")) return { data: [] };
    return { data: { id: url.endsWith("/12") ? 102 : 101 } };
  });
  api.patch.mockResolvedValue({ data: { id: 102 } }); api.get.mockResolvedValue({ data: [] });
});
test("rapid calls start exactly one operation; uncertain create never retries", async () => {
  let reject; api.post.mockReturnValueOnce(new Promise((_, r) => { reject = r; }));
  const { result } = renderHook(() => useGenerationTask());
  let first;
  act(() => { first = result.current.run(update => saveRouteToServer(draft, {}, update)).catch(() => null); void result.current.run(update => saveRouteToServer(draft, {}, update)); });
  expect(api.post).toHaveBeenCalledTimes(1);
  await act(async () => { reject(new Error("timeout")); await first; });
  expect(result.current.status).toBe("failed"); expect(result.current.tripId).toBeNull();
  await act(async () => result.current.run(update => saveRouteToServer(draft, {}, update)));
  expect(api.post).toHaveBeenCalledTimes(1); expect(api.patch).not.toHaveBeenCalled();
});
test.each(["place", "schedule", "start", "optimize"])("%s failure keeps confirmed trip ID and input and stops later writes", async stage => {
  const before = JSON.stringify(draft);
  const original = api.post.getMockImplementation();
  api.post.mockImplementation(async (url, ...args) => {
    if ((stage === "place" && url.endsWith("/12")) || (stage === "start" && url.endsWith("/start")) || (stage === "optimize" && url.endsWith("/optimize"))) throw new Error("timeout");
    return original(url, ...args);
  });
  if (stage === "schedule") api.patch.mockRejectedValueOnce(new Error("timeout"));
  const { result } = renderHook(() => useGenerationTask());
  await act(async () => { await result.current.run(update => saveRouteToServer(draft, {}, update)).catch(() => {}); });
  expect(result.current.status).toBe("failed"); expect(result.current.tripId).toBe(42);
  expect(result.current.completed).toContain("여행 생성"); expect(JSON.stringify(draft)).toBe(before);
  const urls = api.post.mock.calls.map(call => call[0]);
  expect(["place", "schedule"].includes(stage) && urls.some(url => url.endsWith("/start"))).toBe(false);
  expect(stage !== "optimize" && urls.some(url => url.endsWith("/optimize"))).toBe(false);
  const calls = api.post.mock.calls.length;
  await act(async () => result.current.run(update => saveRouteToServer(draft, {}, update)));
  expect(api.post).toHaveBeenCalledTimes(calls);
});
test("mount/reset never auto-submits and complete work returns server ID", async () => {
  const { result } = renderHook(() => useGenerationTask());
  expect(api.post).not.toHaveBeenCalled(); act(() => result.current.reset()); expect(api.post).not.toHaveBeenCalled();
  let saved; await act(async () => { saved = await result.current.run(update => saveRouteToServer(draft, {}, update)); });
  await waitFor(() => expect(result.current.status).toBe("success")); expect(String(saved.id)).toBe("42");
});

test("obsolete time cache is neither read nor written; confirmed visit IDs preserve duplicate-place inputs", async () => {
  const oldCacheKey = "route_fixed_time_map_42";
  localStorage.setItem(oldCacheKey, JSON.stringify({ "같은 장소": "09:00" }));
  localStorage.setItem("accessToken", "fake-test-token");
  localStorage.setItem("other-page-draft", "keep-draft");
  const input = { ...draft, placesByDate: { [date]: [
    { id: "local-start", placeId: 12, name: "출발지" },
    { id: "local-a", placeId: 11, name: "같은 장소", isFixedTime: true, timeLabel: "12:30 PM", stayDuration: 45, isNextDay: true },
    { id: "local-b", placeId: 11, name: "같은 장소", isFixedTime: true, timeLabel: "03:00 PM", stayDuration: 90, isNextDay: false },
  ] } };
  let visitId = 100;
  const original = api.post.getMockImplementation();
  api.post.mockImplementation(async (url, ...args) => {
    if (/\/api\/trips\/42\/places\/\d+$/.test(url)) return { data: { id: ++visitId, placeId: Number(url.split("/").pop()) } };
    if (url.endsWith("/optimize")) return { data: [
      { id: 101, placeId: 12, visitOrder: 1, placeName: "출발지" },
      { id: 103, placeId: 11, visitOrder: 2, placeName: "같은 장소" },
      { id: 102, placeId: 11, visitOrder: 3, placeName: "같은 장소" },
    ] };
    return original(url, ...args);
  });
  const before = JSON.stringify(input);
  const saved = await saveRouteToServer(input);
  expect(saved.placesByDate[date].map(place => place.id)).toEqual(["local-start", "local-b", "local-a"]);
  expect(saved.placesByDate[date].slice(1).map(place => place.timeLabel)).toEqual(["03:00 PM", "12:30 PM"]);
  expect(api.patch.mock.calls.map(([, body]) => body)).toEqual([
    { fixed: true, arrivalTime: "12:30", stayDuration: 45, isNextDay: true },
    { fixed: true, arrivalTime: "15:00", stayDuration: 90, isNextDay: false },
  ]);
  expect(JSON.stringify(input)).toBe(before);
  expect(localStorage.getItem(oldCacheKey)).toBe(JSON.stringify({ "같은 장소": "09:00" }));
  expect(localStorage.getItem("accessToken")).toBe("fake-test-token");
  expect(localStorage.getItem("other-page-draft")).toBe("keep-draft");
  localStorage.removeItem(oldCacheKey); localStorage.removeItem("accessToken"); localStorage.removeItem("other-page-draft");
});

