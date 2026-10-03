import api, { getApiErrorMessage } from "./api";
test("내부 오류 문자열은 표시하지 않는다", () => {
  for (const status of [400,401,403,404,409,413,429,500,503]) {
    expect(getApiErrorMessage({response:{status,data:{message:"SQL secret password"}}})).not.toMatch(/SQL|secret|password/);
  }
});
test("공개 API는 소문자 Authorization도 제거한다", async () => {
  localStorage.setItem("accessToken", "stored-secret");
  const response = await api.post("/api/auth/login", {}, {
    headers: { authorization: "Bearer stale-secret" },
    adapter: async (config) => ({ data: config.headers.toJSON(), status: 200, headers: {}, config }),
  });
  expect(JSON.stringify(response.data)).not.toMatch(/secret|[Aa]uthorization/);
});
test("다른 origin에는 토큰을 보내지 않는다", async () => {
  const adapter = jest.fn();
  const spy = jest.spyOn(console, "error").mockImplementation(() => {});
  await expect(api.get("https://untrusted.example/api/mypage", { adapter })).rejects.toThrow("Untrusted API origin");
  expect(adapter).not.toHaveBeenCalled();
  spy.mockRestore();
});
