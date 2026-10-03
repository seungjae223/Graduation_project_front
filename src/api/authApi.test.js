import api, { getAccessToken } from "./api";
import { completeSocialLoginApi, loginApi, logoutApi } from "./authApi";

jest.mock("./api", () => {
  const actual = jest.requireActual("./api");

  return {
    __esModule: true,
    ...actual,
    default: {
      post: jest.fn(),
    },
  };
});

test.each([true, false])("일반 로그인 저장 기간 유지: keepLogin=%s", async (keepLogin) => {
  localStorage.clear(); sessionStorage.clear(); api.post.mockReset();
  const token = "header.payload.signature-long-enough-for-existing-contract";
  api.post.mockResolvedValue({ data: token, headers: {} });
  await loginApi({ email: "tester@example.com", password: "test-only", keepLogin });
  const storage = keepLogin ? localStorage : sessionStorage;
  const other = keepLogin ? sessionStorage : localStorage;
  expect(storage.getItem("accessToken")).toBe(token);
  expect(storage.getItem("token")).toBeNull();
  expect(other.getItem("accessToken")).toBeNull();
  expect(getAccessToken()).toBe(token);
  localStorage.setItem("site-theme", "dark");
  await logoutApi();
  expect(getAccessToken()).toBeNull();
  expect(localStorage.getItem("site-theme")).toBe("dark");
});

describe.each(["google", "kakao"])("%s OAuth JWT 유지", (provider) => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    api.post.mockReset();
  });

  test("백엔드가 반환한 JWT를 동일 origin의 영구 저장소에 보존한다", async () => {
    const token = `${provider}-jwt-token`;
    api.post.mockResolvedValue({
      data: { token, tokenType: "Bearer", newUser: false },
    });

    await expect(
      completeSocialLoginApi({ provider, code: "oauth-code", state: "state" })
    ).resolves.toMatchObject({ token });

    expect(api.post).toHaveBeenCalledWith(`/api/auth/${provider}/login`, {
      code: "oauth-code",
      state: "state",
    });
    expect(localStorage.getItem("accessToken")).toBe(token);
    expect(localStorage.getItem("token")).toBeNull();
    expect(getAccessToken()).toBe(token);
  });
});
