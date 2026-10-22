import api from "./api";
import { getPlaceEngagementApi, likePlaceApi, unlikePlaceApi } from "./favoritesApi";

jest.mock("./api", () => ({ __esModule: true, default: { get: jest.fn(), put: jest.fn(), delete: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());

test("engagement uses a single public bulk request and validates the response", async () => {
  api.get.mockResolvedValue({ data: [{ placeId: 56, likeCount: 1, reviewCount: 2 }] });
  expect(await getPlaceEngagementApi([56, "56"])).toEqual([{ placeId: 56, likeCount: 1, reviewCount: 2 }]);
  expect(api.get).toHaveBeenCalledWith("/api/places/engagement", expect.objectContaining({ params: { ids: "56" } }));
});

test("invalid ids and missing counts do not silently look like zero", async () => {
  await expect(getPlaceEngagementApi([0])).rejects.toThrow();
  expect(api.get).not.toHaveBeenCalled();
  api.get.mockResolvedValue({ data: [{ placeId: 56, likeCount: 0 }] });
  await expect(getPlaceEngagementApi([56])).rejects.toThrow();
});

test("favorite writes call only the dedicated system-folder endpoints", async () => {
  api.put.mockResolvedValue({ data: { placeId: 56, liked: true, likeCount: 1 } });
  api.delete.mockResolvedValue({ data: { placeId: 56, liked: false, likeCount: 0 } });
  expect((await likePlaceApi(56)).liked).toBe(true);
  expect((await unlikePlaceApi(56)).liked).toBe(false);
  expect(api.put).toHaveBeenCalledWith("/api/favorites/places/56");
  expect(api.delete).toHaveBeenCalledWith("/api/favorites/places/56");
});

test("large destination lists are split into backend-safe requests of at most 100 IDs", async () => {
  api.get.mockImplementation((_, options) => Promise.resolve({ data: options.params.ids.split(",").map(id => ({
    placeId: Number(id), likeCount: 0, reviewCount: 0,
  })) }));
  const ids = Array.from({ length: 201 }, (_, index) => index + 1);
  expect((await getPlaceEngagementApi(ids)).length).toBe(201);
  expect(api.get).toHaveBeenCalledTimes(3);
  expect(api.get.mock.calls.map(([, options]) => options.params.ids.split(",").length)).toEqual([100, 100, 1]);
});
