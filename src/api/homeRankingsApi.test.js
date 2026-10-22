import api from "./api";
import { getHomeRankingsApi } from "./homeRankingsApi";

jest.mock("./api", () => ({ __esModule: true, default: { get: jest.fn() } }));

const response = { windowDays: 30, cities: [{ code: "osaka", name: "오사카", tripCount: 2 }],
  hotPlaces: [{ placeId: 20, name: "오사카성", engagementCount: 3, likeCount: 2, reviewCount: 1 }] };

describe("public V12 rankings contract", () => {
  beforeEach(() => api.get.mockReset());
  test("reads verified server counts rather than hardcoding rankings", async () => {
    api.get.mockResolvedValue({ data: response });
    expect(await getHomeRankingsApi()).toEqual(response);
    expect(api.get).toHaveBeenCalledWith("/api/home/rankings", {});
  });
  test("rejects unverified server data", async () => {
    api.get.mockResolvedValue({ data: { ...response, hotPlaces: [{ placeId: 20, name: "오사카성", engagementCount: -1, likeCount: 2, reviewCount: 1 }] } });
    await expect(getHomeRankingsApi()).rejects.toThrow(/응답/);
  });
  test("never presents a network failure as an empty ranking", async () => {
    api.get.mockRejectedValue(new Error("network down"));
    await expect(getHomeRankingsApi()).rejects.toThrow("network down");
  });
});
