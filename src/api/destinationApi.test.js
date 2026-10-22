import api from "./api";
import {
  getDestinationsApi,
  getDestinationApi,
  getDestinationPlacesApi,
} from "./destinationApi";

jest.mock("./api", () => ({
  __esModule: true,
  default: { get: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

test("여행지 목록은 서버 계약을 따른다", async () => {
  api.get.mockResolvedValue({ data: [{ code: "tokyo", name: "도쿄" }] });
  await expect(getDestinationsApi()).resolves.toEqual([{ code: "tokyo", name: "도쿄" }]);
  expect(api.get).toHaveBeenCalledWith("/api/destinations", {});
});

test("여행지 상세 및 장소 목록은 안정적인 code로 조회한다", async () => {
  api.get.mockResolvedValueOnce({ data: { code: "tokyo" } })
    .mockResolvedValueOnce({ data: [{ id: 1, name: "센소지" }] });
  await expect(getDestinationApi(" TOKYO ")).resolves.toEqual({ code: "tokyo" });
  await expect(getDestinationPlacesApi("tokyo")).resolves.toHaveLength(1);
  expect(api.get).toHaveBeenNthCalledWith(1, "/api/destinations/tokyo", {});
  expect(api.get).toHaveBeenNthCalledWith(2, "/api/destinations/tokyo/places", {});
});

test("잘못된 여행지 코드에서는 API 요청을 보내지 않는다", async () => {
  await expect(getDestinationPlacesApi("../../places")).rejects.toThrow("여행지 코드");
  expect(api.get).not.toHaveBeenCalled();
});
