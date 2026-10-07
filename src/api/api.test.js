import api from "./api";

describe("JWT 인증 헤더", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test.each([
    "/api/mypage/stats",
    "/api/places",
    "/api/places/search",
    "/api/places/1",
  ])("Mock OFF: %s에도 저장된 JWT를 Bearer 헤더로 전달한다", async (path) => {
    localStorage.setItem("accessToken", "persisted-jwt-token");

    const response = await api.get(path, {
      adapter: async (config) => ({
        data: { authorization: config.headers.Authorization },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      }),
    });

    expect(response.data.authorization).toBe("Bearer persisted-jwt-token");
  });

  test("Mock OFF: 토큰이 없는 장소 요청에 임의의 인증을 추가하지 않는다", async () => {
    const adapter = jest.fn(async (config) => ({
      data: [], status: 200, statusText: "OK", headers: {}, config,
    }));
    const response = await api.get("/api/places", { adapter });
    expect(adapter).toHaveBeenCalledTimes(1);
    expect(response.config.headers.Authorization).toBeUndefined();
    expect(response.config.withCredentials).toBeUndefined();
  });
});
