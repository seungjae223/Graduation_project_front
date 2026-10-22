import { act, renderHook } from "@testing-library/react";
import useTripDeletion from "./useTripDeletion";
import { deleteTripApi, getTripsApi } from "../api/tripApi";
import { getAuthSnapshot } from "./authState";

jest.mock("../api/tripApi", () => ({ deleteTripApi: jest.fn(), getTripsApi: jest.fn() }));
jest.mock("./authState", () => ({ getAuthSnapshot: jest.fn() }));
const trip = { id: 28, title: "서울 일정" };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
let confirm;
beforeEach(() => {
  jest.resetAllMocks();
  getAuthSnapshot.mockReturnValue({ accountKey: "A" });
  confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
});
afterEach(() => confirm.mockRestore());
const setup = () => {
  const onDeleted = jest.fn();
  return { onDeleted, ...renderHook(({ account }) => useTripDeletion(account, onDeleted),
    { initialProps: { account: "A" } }) };
};

test("a lost delete response removes a ticket only after the server confirms its absence", async () => {
  deleteTripApi.mockRejectedValue({ response: { status: 500 } });
  getTripsApi.mockResolvedValue([]);
  const { result, onDeleted } = setup();
  let outcome;
  await act(async () => { outcome = await result.current.deleteTrips([trip]); });
  expect(outcome).toEqual({ complete: true, deleted: 1 });
  expect(onDeleted).toHaveBeenCalledWith("28");
  expect(deleteTripApi).toHaveBeenCalledTimes(1);
  expect(getTripsApi).toHaveBeenCalledTimes(1);
  expect(result.current.needsVerification).toBe(false);
});

test("a rejected delete keeps the ticket and stops a batch before touching the next trip", async () => {
  deleteTripApi.mockRejectedValue({ response: { status: 500 } });
  getTripsApi.mockResolvedValue([trip, { id: 29 }]);
  const { result, onDeleted } = setup();
  await act(async () => result.current.deleteTrips([trip, { id: 29 }]));
  expect(onDeleted).not.toHaveBeenCalled();
  expect(result.current.notice).toContain("일정이 아직 남아 있어요");
  expect(deleteTripApi.mock.calls).toEqual([[28]]);
  expect(result.current.busy).toBe(false);
});

test("unconfirmed deletion blocks another DELETE; the recovery action only reads", async () => {
  deleteTripApi.mockRejectedValue(new Error("timeout"));
  getTripsApi.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([]);
  const { result, onDeleted } = setup();
  await act(async () => result.current.deleteTrips([trip]));
  expect(result.current.needsVerification).toBe(true);
  await act(async () => result.current.deleteTrips([trip]));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(deleteTripApi).toHaveBeenCalledTimes(1);
  await act(async () => result.current.retryVerification());
  expect(deleteTripApi).toHaveBeenCalledTimes(1);
  expect(onDeleted).toHaveBeenCalledWith("28");
  expect(result.current.needsVerification).toBe(false);
  expect(result.current.notice).toBe("일정 삭제를 확인했어요.");
});

test("404 is reconciled with the server list; permission failures never hide tickets", async () => {
  deleteTripApi.mockRejectedValueOnce({ response: { status: 404 } })
    .mockRejectedValueOnce({ response: { status: 403 } });
  getTripsApi.mockResolvedValue([]);
  const { result, onDeleted } = setup();
  await act(async () => result.current.deleteTrips([trip]));
  await act(async () => result.current.deleteTrips([{ id: 29 }]));
  expect(onDeleted.mock.calls).toEqual([["28"]]);
  expect(getTripsApi).toHaveBeenCalledTimes(1);
  expect(result.current.notice).toContain("삭제하지 못했어요");
});

test("partial success is retained when the next trip fails", async () => {
  deleteTripApi.mockResolvedValueOnce({}).mockRejectedValueOnce({ response: { status: 500 } });
  getTripsApi.mockResolvedValue([{ id: 29 }]);
  const { result, onDeleted } = setup();
  let outcome;
  await act(async () => { outcome = await result.current.deleteTrips([trip, { id: 29 }]); });
  expect(outcome).toEqual({ complete: false, deleted: 1 });
  expect(onDeleted.mock.calls).toEqual([["28"]]);
  expect(result.current.notice).toMatch(/^1개 삭제 완료/);
});

test("a pending request locks double submission through the verification read", async () => {
  const write = deferred(), read = deferred();
  deleteTripApi.mockReturnValue(write.promise);
  getTripsApi.mockReturnValue(read.promise);
  const { result } = setup();
  let operation;
  act(() => { operation = result.current.deleteTrips([trip]); });
  await act(async () => { write.reject(new Error("timeout")); });
  expect(result.current.busy).toBe(true);
  await act(async () => result.current.deleteTrips([trip]));
  expect(deleteTripApi).toHaveBeenCalledTimes(1);
  await act(async () => { read.resolve([]); await operation; });
  expect(result.current.busy).toBe(false);
});

test("an old account's failed response cannot verify or remove another account's ticket", async () => {
  const request = deferred();
  deleteTripApi.mockReturnValue(request.promise);
  const { result, rerender, onDeleted } = setup();
  let operation;
  act(() => { operation = result.current.deleteTrips([trip]); });
  getAuthSnapshot.mockReturnValue({ accountKey: "B" });
  rerender({ account: "B" });
  await act(async () => { request.reject(new Error("timeout")); await operation; });
  expect(getTripsApi).not.toHaveBeenCalled();
  expect(onDeleted).not.toHaveBeenCalled();
  expect(result.current.notice).toBe("");
  expect(result.current.busy).toBe(false);
});

test("a verification response after unmount cannot update the list", async () => {
  const read = deferred();
  deleteTripApi.mockRejectedValue(new Error("timeout"));
  getTripsApi.mockReturnValue(read.promise);
  const { result, unmount, onDeleted } = setup();
  let operation;
  await act(async () => { operation = result.current.deleteTrips([trip]); });
  unmount();
  await act(async () => { read.resolve([]); await operation; });
  expect(onDeleted).not.toHaveBeenCalled();
});
