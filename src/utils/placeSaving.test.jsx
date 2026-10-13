import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SavedPlacesProvider, useSavedPlaces } from "../Context/SavedPlacesContext";
import usePlaceSaving from "./usePlaceSaving";
import useFolderSavedPlaces, { readSavedFolderSnapshot } from "./useFolderSavedPlaces";
import { getFolderPlacesApi, getFoldersApi, removePlaceFromFolderApi, savePlaceToFolderApi } from "../api/placeApi";

let mockAccountKey = "account:A";
jest.mock("./useSessionKey", () => ({ __esModule: true, default: () => mockAccountKey }));
jest.mock("./authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccountKey }) }));
jest.mock("../api/placeApi", () => ({
  getFoldersApi: jest.fn(), getFolderPlacesApi: jest.fn(),
  removePlaceFromFolderApi: jest.fn(), savePlaceToFolderApi: jest.fn(),
}));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const first = { id: 1, name: "첫 장소" };
const second = { id: 2, name: "다른 장소" };
let server;
const folders = [{ id: "A", name: "첫 폴더" }, { id: "B", name: "둘째 폴더" }];
const wrapper = ({ children }) => <MemoryRouter><SavedPlacesProvider>{children}</SavedPlacesProvider></MemoryRouter>;
const setup = () => renderHook(() => ({ saving: usePlaceSaving(), context: useSavedPlaces() }), { wrapper });
const event = () => ({ stopPropagation: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks(); mockAccountKey = "account:A";
  server = { A: [first], B: [first] };
  getFoldersApi.mockImplementation(async () => folders.map(folder => ({ ...folder })));
  getFolderPlacesApi.mockImplementation(async id => (server[id] || []).map(place => ({ ...place })));
  removePlaceFromFolderApi.mockImplementation(async ({ folderId, placeId }) => {
    server[folderId] = server[folderId].filter(place => String(place.id) !== String(placeId));
  });
  savePlaceToFolderApi.mockImplementation(async ({ folderId, placeId }) => {
    server[folderId] = [...server[folderId], { id: Number(placeId), name: "새 장소" }];
  });
});

test("a place saved in two folders remains globally saved after removing one selected folder", async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  expect(result.current.saving.isSaved(1)).toBe(true);
  await act(async () => result.current.saving.toggle(event(), first));
  expect(result.current.saving.open).toBe(true);
  expect(result.current.saving.removing).toBe(true);
  expect(result.current.saving.modalFolders.map(folder => folder.id)).toEqual(["A", "B"]);
  await act(async () => result.current.saving.save(folders[0]));
  expect(removePlaceFromFolderApi).toHaveBeenCalledTimes(1);
  expect(removePlaceFromFolderApi).toHaveBeenCalledWith({ folderId: "A", placeId: "1" });
  expect(result.current.saving.folders.data.placeFolders["1"]).toEqual(["B"]);
  expect(result.current.saving.isSaved(1)).toBe(true);
  expect(result.current.context.isSaved(1)).toBe(true);
  expect(result.current.saving.open).toBe(false);
});

test("failed membership refresh never DELETEs an assumed folder and keeps known saved state", async () => {
  const { result } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  getFolderPlacesApi.mockRejectedValue({ response: { status: 503 } });
  await act(async () => result.current.saving.toggle(event(), first));
  expect(removePlaceFromFolderApi).not.toHaveBeenCalled();
  expect(savePlaceToFolderApi).not.toHaveBeenCalled();
  expect(result.current.saving.message).toMatch(/저장된 폴더를 확인하지 못/);
  expect(result.current.context.isSaved(1)).toBe(true);
  expect(result.current.saving.folders.data.complete).toBe(false);
});

test("lost save response is read back and confirmed without automatic resend", async () => {
  server = { A: [], B: [] };
  savePlaceToFolderApi.mockImplementation(async ({ folderId }) => {
    server[folderId] = [first];
    throw new Error("test-only lost response");
  });
  const { result } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  await act(async () => result.current.saving.toggle(event(), first));
  await act(async () => result.current.saving.save(folders[0]));
  expect(savePlaceToFolderApi).toHaveBeenCalledTimes(1);
  expect(result.current.saving.uncertain).toBe(true);
  expect(result.current.saving.blocked).toBe(true);
  expect(result.current.saving.isSaved(1)).toBe(false);
  await act(async () => result.current.saving.retryRead());
  expect(savePlaceToFolderApi).toHaveBeenCalledTimes(1);
  expect(result.current.saving.isSaved(1)).toBe(true);
  expect(result.current.context.isSaved(1)).toBe(true);
  expect(result.current.saving.uncertain).toBe(false);
  expect(result.current.saving.blocked).toBe(false);
});

test("lost remove response keeps the other folder and read-back never repeats DELETE", async () => {
  removePlaceFromFolderApi.mockImplementation(async ({ folderId }) => {
    server[folderId] = [];
    throw new Error("test-only lost response");
  });
  const { result } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  await act(async () => result.current.saving.toggle(event(), first));
  await act(async () => result.current.saving.save(folders[0]));
  expect(result.current.saving.uncertain).toBe(true);
  await act(async () => result.current.saving.retryRead());
  expect(removePlaceFromFolderApi).toHaveBeenCalledTimes(1);
  expect(result.current.saving.folders.data.placeFolders["1"]).toEqual(["B"]);
  expect(result.current.context.isSaved(1)).toBe(true);
  expect(result.current.saving.uncertain).toBe(false);
});

test("unconfirmed lost response remains locked after read-back and never reports completion", async () => {
  server = { A: [], B: [] };
  savePlaceToFolderApi.mockRejectedValue(new Error("test-only lost response"));
  const { result } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  await act(async () => result.current.saving.toggle(event(), first));
  await act(async () => result.current.saving.save(folders[0]));
  await act(async () => result.current.saving.retryRead());
  expect(result.current.saving.uncertain).toBe(true);
  expect(result.current.saving.blocked).toBe(true);
  expect(result.current.saving.message).not.toBe("선택한 폴더에 저장했습니다.");
  expect(result.current.context.isSaved(1)).toBe(false);
  await act(async () => result.current.saving.save(folders[0]));
  expect(savePlaceToFolderApi).toHaveBeenCalledTimes(1);
});

test("confirmed remove failure preserves both memberships and allows explicit retry", async () => {
  removePlaceFromFolderApi.mockRejectedValueOnce({ response: { status: 400 } });
  const { result } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  await act(async () => result.current.saving.toggle(event(), first));
  await act(async () => result.current.saving.save(folders[0]));
  expect(result.current.saving.blocked).toBe(false);
  expect(result.current.context.isSaved(1)).toBe(true);
  expect(result.current.saving.folders.data.placeFolders["1"]).toEqual(["A", "B"]);
  await act(async () => result.current.saving.save(folders[0]));
  expect(removePlaceFromFolderApi).toHaveBeenCalledTimes(2);
  expect(result.current.saving.folders.data.placeFolders["1"]).toEqual(["B"]);
});

test("parallel folder save clicks issue one mutation", async () => {
  server = { A: [], B: [] };
  const response = deferred(); savePlaceToFolderApi.mockImplementation(() => response.promise);
  const { result } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  await act(async () => result.current.saving.toggle(event(), first));
  let one, two;
  act(() => { one = result.current.saving.save(folders[0]); two = result.current.saving.save(folders[0]); });
  expect(savePlaceToFolderApi).toHaveBeenCalledTimes(1);
  server.A = [first];
  await act(async () => { response.resolve({}); await Promise.all([one, two]); });
  expect(result.current.context.isSaved(1)).toBe(true);
});

test("a pending membership lookup owns the target and rejects competing clicks", async () => {
  server = { A: [first], B: [second] };
  const { result } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  const response = deferred(); getFoldersApi.mockReturnValueOnce(response.promise);
  let pending;
  act(() => {
    pending = result.current.saving.toggle(event(), first);
    void result.current.saving.toggle(event(), second);
  });
  expect(result.current.saving.target).toEqual(first);
  expect(result.current.saving.busy).toBe(true);
  expect(removePlaceFromFolderApi).not.toHaveBeenCalled();
  await act(async () => { response.resolve(folders); await pending; });
  expect(removePlaceFromFolderApi.mock.calls).toEqual([[{ folderId: "A", placeId: "1" }]]);
  expect(result.current.context.isSaved(2)).toBe(true);
  expect(result.current.saving.message).toBe("선택한 폴더에서 제거했습니다.");
});

test("a late previous-account write does not refresh or close the new account selection", async () => {
  server = { A: [], B: [] };
  const response = deferred(); savePlaceToFolderApi.mockReturnValue(response.promise);
  const { result, rerender } = setup();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  await act(async () => result.current.saving.toggle(event(), first));
  let pending; act(() => { pending = result.current.saving.save(folders[0]); });
  mockAccountKey = "account:B"; rerender();
  await waitFor(() => expect(result.current.saving.folders.status).toBe("success"));
  await act(async () => result.current.saving.toggle(event(), second));
  expect(result.current.saving.open).toBe(true);
  const reads = getFoldersApi.mock.calls.length;
  await act(async () => { response.resolve({}); await pending; });
  expect(getFoldersApi).toHaveBeenCalledTimes(reads);
  expect(result.current.saving.target).toEqual(second);
  expect(result.current.saving.open).toBe(true);
  expect(result.current.context.isSaved(1)).toBe(false);
});

test("folder membership partial failure preserves only the failed folder's known records", async () => {
  const previous = await readSavedFolderSnapshot();
  server.A = [];
  getFolderPlacesApi.mockImplementation(async id => {
    if (id === "B") throw new Error("test-only failure");
    return server[id];
  });
  const partial = await readSavedFolderSnapshot(undefined, previous);
  expect(partial.complete).toBe(false); expect(partial.failedFolderIds).toEqual(["B"]);
  expect(partial.folders.find(folder => folder.id === "A").places).toEqual([]);
  expect(partial.placeFolders["1"]).toEqual(["B"]);
});

test("a confirmed successful empty folder list clears older global records", async () => {
  const { result } = renderHook(() => ({ folders: useFolderSavedPlaces(), context: useSavedPlaces() }), { wrapper });
  await waitFor(() => expect(result.current.context.isSaved(1)).toBe(true));
  getFoldersApi.mockResolvedValue([]);
  await act(async () => result.current.folders.read());
  expect(result.current.folders.data.complete).toBe(true);
  expect(result.current.folders.data.folders).toEqual([]);
  expect(result.current.context.savedPlaces).toEqual([]);
});

test("an aborted old-account folder response does not start dependent reads or replace new data", async () => {
  const old = deferred();
  getFoldersApi.mockReturnValueOnce(old.promise).mockResolvedValueOnce([{ id: "new", name: "새 계정" }]);
  getFolderPlacesApi.mockImplementation(async id => id === "new" ? [second] : [first]);
  const { result, rerender } = renderHook(() => ({ folders: useFolderSavedPlaces(), context: useSavedPlaces() }), { wrapper });
  const signal = getFoldersApi.mock.calls[0][0].signal;
  mockAccountKey = "account:B"; rerender();
  await waitFor(() => expect(result.current.folders.status).toBe("success"));
  expect(signal.aborted).toBe(true);
  await act(async () => old.resolve([{ id: "old", name: "이전 계정" }]));
  expect(getFolderPlacesApi.mock.calls.map(call => call[0])).toEqual(["new"]);
  expect(result.current.context.savedPlaces.map(place => place.id)).toEqual([2]);
  expect(result.current.folders.data.folders.map(folder => folder.id)).toEqual(["new"]);
});
