import { act, renderHook, waitFor } from "@testing-library/react";
import useRoutePlaceSearch from "./useRoutePlaceSearch";
import useFavoriteFolders from "./useFavoriteFolders";
import { searchPlacesApi, getFoldersApi, getFolderPlacesApi } from "../api/placeApi";
jest.mock("../api/placeApi", () => ({ searchPlacesApi: jest.fn(), getFoldersApi: jest.fn(), getFolderPlacesApi: jest.fn() }));
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
beforeEach(() => jest.clearAllMocks());
test.each(["success", "error"])("late A %s cannot overwrite B or its loading/error state", async completion => {
  const a = deferred(), b = deferred(); searchPlacesApi.mockReturnValueOnce(a.promise).mockReturnValueOnce(b.promise);
  const { result, rerender } = renderHook(({ keyword }) => useRoutePlaceSearch(true, keyword), { initialProps: { keyword: "A" } });
  await waitFor(() => expect(searchPlacesApi).toHaveBeenCalledTimes(1));
  const signal = searchPlacesApi.mock.calls[0][1].signal;
  rerender({ keyword: "B" }); await waitFor(() => expect(searchPlacesApi).toHaveBeenCalledTimes(2)); expect(signal.aborted).toBe(true);
  await act(async () => b.resolve([{ id: 2, name: "B 결과" }]));
  await act(async () => completion === "success" ? a.resolve([{ id: 1, name: "A 결과" }]) : a.reject(new Error("A 실패")));
  expect(result.current.status).toBe("success"); expect(result.current.data[0].name).toBe("B 결과"); expect(result.current.error).toBe("");
});
test("closing and reopening search rejects the previous response", async () => {
  const old = deferred(); searchPlacesApi.mockReturnValueOnce(old.promise).mockResolvedValueOnce([{ id: 2, name: "재조회" }]);
  const { result, rerender } = renderHook(({ open }) => useRoutePlaceSearch(open, "서울"), { initialProps: { open: true } });
  await waitFor(() => expect(searchPlacesApi).toHaveBeenCalledTimes(1)); rerender({ open: false }); rerender({ open: true });
  await waitFor(() => expect(result.current.data?.[0]?.name).toBe("재조회"));
  await act(async () => old.resolve([{ id: 1, name: "이전 결과" }])); expect(result.current.data[0].name).toBe("재조회");
});
test("actual folder names and all nine places survive a failed refresh", async () => {
  const places = Array.from({ length: 9 }, (_, i) => ({ id: i + 1, name: `장소 ${i + 1}` }));
  getFoldersApi.mockResolvedValue([{ id: 4, name: "내 실제 폴더" }]); getFolderPlacesApi.mockResolvedValueOnce(places).mockRejectedValueOnce(new Error("재조회 실패"));
  const { result } = renderHook(() => useFavoriteFolders(true));
  await waitFor(() => expect(result.current.status).toBe("success"));
  expect(result.current.data[0]).toMatchObject({ id: 4, title: "내 실제 폴더", status: "success" }); expect(result.current.data[0].places).toHaveLength(9);
  await act(async () => result.current.retry()); expect(result.current.data[0].status).toBe("error"); expect(result.current.data[0].places).toHaveLength(9);
});
test("an empty folder response stays empty", async () => {
  getFoldersApi.mockResolvedValue([]);
  const { result } = renderHook(() => useFavoriteFolders(true)); await waitFor(() => expect(result.current.status).toBe("success")); expect(result.current.data).toEqual([]);
});
