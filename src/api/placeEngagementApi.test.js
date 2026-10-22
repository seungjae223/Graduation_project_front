import api from "./api";
import { getPlaceEngagementApi } from "./placeEngagementApi";

jest.mock("./api", () => ({ __esModule: true, default: { get: jest.fn() } }));
beforeEach(() => jest.clearAllMocks());

test("counts all places in batches of at most 100", async () => {
  api.get.mockImplementation(async (url, options) => ({
    data: options.params.ids.split(",").map(id => ({
      placeId: Number(id), likeCount: Number(id), reviewCount: 0,
    })),
  }));
  const rows = await getPlaceEngagementApi(Array.from({ length: 205 }, (_, i) => i + 1));
  expect(rows).toHaveLength(205);
  expect(api.get).toHaveBeenCalledTimes(3);
  expect(api.get.mock.calls.map(([, options]) => options.params.ids.split(",").length)).toEqual([100, 100, 5]);
});

test("rejects incomplete and mismatched engagement counts", async () => {
  api.get.mockResolvedValueOnce({ data: [{ placeId: 1, likeCount: 2, reviewCount: 3 }] });
  await expect(getPlaceEngagementApi([1, 2])).rejects.toThrow("누락");
  api.get.mockResolvedValueOnce({ data: [{ placeId: 999, likeCount: 2, reviewCount: 3 }] });
  await expect(getPlaceEngagementApi([1])).rejects.toThrow("확인");
});

test("rejects invalid IDs without sending requests", async () => {
  expect(await getPlaceEngagementApi([])).toEqual([]);
  await expect(getPlaceEngagementApi([0])).rejects.toThrow("ID");
  expect(api.get).not.toHaveBeenCalled();
});
