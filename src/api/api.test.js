import api from "./api";

describe("JWT 인증 헤더", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  test("저장된 JWT를 마이페이지 API에 Bearer 헤더로 전달한다", async () => {
    localStorage.setItem("accessToken", "persisted-jwt-token");

    const response = await api.get("/api/mypage/stats", {
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
});
