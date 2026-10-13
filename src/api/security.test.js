import api, { getApiErrorMessage } from "./api";
test("내부 오류 문자열은 표시하지 않는다", () => {
  for (const status of [400,401,403,404,409,413,429,500,503]) {
    expect(getApiErrorMessage({response:{status,data:{message:"SQL secret password"}}})).not.toMatch(/SQL|secret|password/);
  }
});

test("Google configuration 503 displays only the documented public message", () => {
  expect(getApiErrorMessage({ response: { status: 503, data: { message: "소셜 로그인 서비스 설정이 완료되지 않았습니다." } } }))
    .toBe("소셜 로그인 서비스 설정이 완료되지 않았습니다.");
});

test.each([
  ["이미 존재하는 이메일입니다.", "이미 가입된 이메일"],
  ["이메일 인증(6자리)을 먼저 완료해주세요.", "인증번호를 다시 발송"],
  ["비밀번호는 10자리 이상, 대소문자, 특수기호를 포함해야 합니다.", "영문 대문자·소문자"],
])("known signup rejection gives an actionable public message", (message, expected) => {
  expect(getApiErrorMessage({ response: { status: 400, data: { message } } })).toContain(expected);
});

test("a known signup message with injected details is still hidden", () => {
  expect(getApiErrorMessage({ response: { status: 400, data: { message: "이미 존재하는 이메일입니다. SQL password" } } }))
    .toBe("입력 정보를 확인해주세요.");
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
