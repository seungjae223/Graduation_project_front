import api from "./api";
import { getReviewPageApi } from "./placeApi";

jest.mock("./api", () => ({ __esModule: true, default: { get: jest.fn() } }));
const oldPath = "/api/places/489/reviews";
const pagePath = `${oldPath}/paged`;
beforeEach(() => jest.clearAllMocks());

const missingPaged = () => Object.assign(new Error("Not Found"), { response: { status: 404 } });

test("404 on new pagination endpoint falls back to legacy review list and paginates five at a time", async () => {
  api.get.mockImplementation(async url => {
    if (url === pagePath) throw missingPaged();
    if (url === oldPath) return { data: Array.from({ length: 6 }, (_, i) => ({
      id: i + 1, rating: i + 1 <= 5 ? 5 : 3, comment: `리뷰 ${i + 1}`,
    })) };
    throw new Error(`Unexpected ${url}`);
  });
  const first = await getReviewPageApi(489, 0);
  expect(first).toMatchObject({ page: 0, totalPages: 2, totalElements: 6 });
  expect(first.content.map(row => row.id)).toEqual([6, 5, 4, 3, 2]);
  expect(first.averageRating).toBeCloseTo(4.66666666);
  const second = await getReviewPageApi(489, 1);
  expect(second.content.map(row => row.id)).toEqual([1]);
  expect(api.get).toHaveBeenCalledWith(pagePath, { params: { page: 0, size: 5 } });
  expect(api.get).toHaveBeenCalledWith(oldPath, {});
});

test("legacy endpoint with genuinely zero reviews returns zero without displaying a network error", async () => {
  api.get.mockRejectedValueOnce(missingPaged()).mockResolvedValueOnce({ data: [] });
  const result = await getReviewPageApi(489, 0);
  expect(result).toEqual({ content: [], page: 0, totalPages: 0, totalElements: 0, averageRating: null });
});

test.each([401, 403, 429, 500, 503])("%i API errors do not fall back or pretend the list is empty", async status => {
  api.get.mockRejectedValueOnce(Object.assign(new Error("API failed"), { response: { status } }));
  await expect(getReviewPageApi(489, 0)).rejects.toThrow("API failed");
  expect(api.get).toHaveBeenCalledTimes(1);
});

test("malformed legacy result is not reported as a successful empty list", async () => {
  api.get.mockRejectedValueOnce(missingPaged()).mockResolvedValueOnce({ data: "not a list" });
  await expect(getReviewPageApi(489, 0)).rejects.toThrow();
});
