import { act, renderHook, waitFor } from "@testing-library/react";
import useReadQuery from "./useReadQuery";
import useMutationTask from "./useMutationTask";
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
test("A → B → A ignores the first A success and finally, and cancels on unmount", async () => {
  const a = deferred(), b = deferred(), fresh = deferred();
  const fetch = jest.fn().mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise).mockReturnValueOnce(fresh.promise);
  const { result, rerender, unmount } = renderHook(({ key }) => useReadQuery(key, fetch), { initialProps: { key: "A" } });
  const oldSignal = fetch.mock.calls[0][0]; rerender({ key: "B" }); rerender({ key: "A" });
  expect(oldSignal.aborted).toBe(true);
  await act(async () => a.resolve("old A")); expect(result.current.status).toBe("loading");
  await act(async () => b.reject(new Error("old B"))); expect(result.current.status).toBe("loading");
  await act(async () => fresh.resolve("new A")); expect(result.current.data).toBe("new A");
  unmount();
});
test("read retry deduplicates and keeps other independent regions intact", async () => {
  const pending = deferred(); const fetch = jest.fn().mockRejectedValueOnce(new Error("fail")).mockReturnValueOnce(pending.promise);
  const { result } = renderHook(() => useReadQuery("A", fetch)); await waitFor(() => expect(result.current.status).toBe("error"));
  act(() => { result.current.retry(); result.current.retry(); }); expect(fetch).toHaveBeenCalledTimes(2);
  await act(async () => pending.resolve([])); expect(result.current.status).toBe("success"); expect(result.current.data).toEqual([]);
});
const labels = { failure: "실패", success: "완료", refreshFailure: "저장됐지만 조회 실패" };
test("mutation double submit is locked; confirmed write is never repeated by read retry", async () => {
  const pending = deferred(); const write = jest.fn(() => pending.promise);
  const refresh = jest.fn().mockRejectedValueOnce(new Error("read fail")).mockResolvedValueOnce(undefined);
  const { result } = renderHook(() => useMutationTask("folder"));
  act(() => { result.current.run(write, refresh, labels); result.current.run(write, refresh, labels); });
  expect(write).toHaveBeenCalledTimes(1); await act(async () => pending.resolve());
  expect(result.current.status).toBe("refreshError"); expect(result.current.message).toBe(labels.refreshFailure);
  await act(async () => result.current.retryRead()); expect(write).toHaveBeenCalledTimes(1); expect(result.current.status).toBe("success");
});
test("timeout remains unknown even after list read; no automatic resend", async () => {
  const write = jest.fn().mockRejectedValue(new Error("timeout")), read = jest.fn().mockResolvedValue(undefined);
  const { result } = renderHook(() => useMutationTask("create"));
  await act(async () => result.current.run(write, read, labels)); expect(result.current.status).toBe("unknown");
  await act(async () => { await result.current.retryRead(); await result.current.run(write, read, labels); });
  expect(result.current.status).toBe("unknown"); expect(write).toHaveBeenCalledTimes(1);
});
test("explicit 400 failure can be retried; different targets keep separate operation states", async () => {
  const write = jest.fn().mockRejectedValue({ response: { status: 400 } });
  const { result, rerender } = renderHook(({ key }) => useMutationTask(key), { initialProps: { key: "A" } });
  await act(async () => result.current.run(write, jest.fn(), labels)); expect(result.current.status).toBe("error");
  rerender({ key: "B" }); expect(result.current.status).toBe("idle"); rerender({ key: "A" }); expect(result.current.status).toBe("error");
});
