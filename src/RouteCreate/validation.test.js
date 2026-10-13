import { act, renderHook, waitFor } from "@testing-library/react";
import { saveRouteToServer } from "./RouteCreate";
import useGenerationTask from "./useGenerationTask";
import api from "../api/api";
import { notifyAuthChange } from "../utils/authState";
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() }, getApiErrorMessage: (_, message) => message }));
const date = "2026-10-12";
const makeDraft = places => ({ title: "검증 일정", selectedDates: [date], placesByDate: { [date]: places } });
const place = { id: "visit-1", placeId: 11, name: "실제 장소" };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
beforeEach(() => {
  jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); notifyAuthChange();
  api.get.mockResolvedValue({ data: { id: 11, name: "실제 장소" } });
  api.post.mockImplementation(async url => ({ data: url === "/api/trips" ? { id: 42 } : { id: 91 } }));
});
test.each([
  [{ id: "sample", name: "예시 장소" }],
  [{ ...place, isExample: true }],
  [{ ...place, name: "다른 예시 장소" }],
  [place, { id: "sample-2", name: "잘못된 두 번째 장소" }],
])("invalid or mismatched places prevent every write, including trip creation", async places => {
  await expect(saveRouteToServer(makeDraft(places))).rejects.toMatchObject({ beforeWrite: true });
  expect(api.post).not.toHaveBeenCalled(); expect(api.patch).not.toHaveBeenCalled();
});
test("a failed environment lookup does not create a trip", async () => {
  api.get.mockRejectedValue({ response: { status: 404 } });
  await expect(saveRouteToServer(makeDraft([place]))).rejects.toMatchObject({ beforeWrite: true });
  expect(api.post).not.toHaveBeenCalled();
});
test("unsupported fixed departure time is rejected before any write", async () => {
  await expect(saveRouteToServer(makeDraft([{ ...place, isFixedTime: true, timeLabel: "03:00 PM" }]))).rejects.toThrow("출발 시간은 오전 10시");
  expect(api.post).not.toHaveBeenCalled();
});
test("leaving during trip creation stops the next place write even if transport ignores abort", async () => {
  const pending = deferred(); api.post.mockReturnValueOnce(pending.promise);
  const { result, unmount } = renderHook(() => useGenerationTask());
  let work;
  act(() => { work = result.current.run((update, options) => saveRouteToServer(makeDraft([place]), {}, update, options)); });
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  unmount(); await act(async () => { pending.resolve({ data: { id: 42 } }); await work; });
  expect(api.post).toHaveBeenCalledTimes(1); expect(api.patch).not.toHaveBeenCalled();
});
test("a changed credential cannot continue an earlier task in the new session", async () => {
  const pending = deferred(); api.post.mockReturnValueOnce(pending.promise);
  const work = saveRouteToServer(makeDraft([place])).catch(error => error);
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(1));
  localStorage.setItem("accessToken", "new-test-session"); notifyAuthChange();
  pending.resolve({ data: { id: 42 } });
  expect(await work).toMatchObject({ code: "ERR_CANCELED" });
  expect(api.post).toHaveBeenCalledTimes(1); expect(api.patch).not.toHaveBeenCalled();
});
