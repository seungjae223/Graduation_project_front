import api from "./api";
import { getTripsApi, getTripByIdApi, getTripPlacesApi } from "./tripApi";
import { searchPlacesApi } from "./placeApi";
jest.mock("./api", () => ({ __esModule: true, default: { get: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
test.each([getTripsApi, () => getTripByIdApi(1), () => getTripPlacesApi(1), () => searchPlacesApi("서울")])("HTML 200 is never an empty success", async load => {
  api.get.mockResolvedValue({ data: "<html>login</html>" }); await expect(load()).rejects.toThrow();
});
test("trip place 404 is not swallowed as an empty list", async () => {
  api.get.mockRejectedValue({ response: { status: 404 } }); await expect(getTripPlacesApi(1)).rejects.toMatchObject({ response: { status: 404 } });
});
test("different server ID in detail response is rejected", async () => {
  api.get.mockResolvedValue({ data: { id: 2, startDate: "2026-10-04", endDate: "2026-10-04" } });
  await expect(getTripByIdApi(1)).rejects.toThrow();
});
test("search preserves server ID and sends keyword only", async () => {
  api.get.mockResolvedValue({ data: [{ id: 91, name: "장소", latitude: 37, longitude: 127 }] });
  const results = await searchPlacesApi("  서울  "); expect(results[0].id).toBe(91);
  expect(api.get).toHaveBeenCalledWith("/api/places/search", expect.objectContaining({ params: { keyword: "서울" } }));
});
