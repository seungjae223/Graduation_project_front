import api from "./api";
import { renameTripTitleApi } from "./tripApi";
jest.mock("./api", () => ({ __esModule: true, default: { patch: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());
test("rename PATCH carries only the title and preserves null origin fields", async () => {
  api.patch.mockResolvedValue({ data: { id: 12, title: "새로운 여행", destination: "오사카",
    startDate: "2026-11-12", endDate: "2026-11-15", latitude: null, longitude: null } });
  const result = await renameTripTitleApi({ tripId: 12, title: "  새로운 여행  " });
  expect(api.patch).toHaveBeenCalledWith("/api/trips/12/title", { title: "새로운 여행" });
  expect(result.latitude).toBeNull();
  expect(result.longitude).toBeNull();
});
test("empty or oversized title never calls PATCH", async () => {
  await expect(renameTripTitleApi({ tripId: 12, title: " " })).rejects.toThrow(/일정명/);
  await expect(renameTripTitleApi({ tripId: 12, title: "가".repeat(101) })).rejects.toThrow(/일정명/);
  expect(api.patch).not.toHaveBeenCalled();
});
