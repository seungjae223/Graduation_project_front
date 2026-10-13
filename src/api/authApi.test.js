import api, { getAccessToken } from "./api";
import { completeSocialLoginApi, getSocialAuthorizationApi, loginApi, logoutApi, resetPasswordApi, sendEmailCodeApi, signupApi, verifyEmailCodeApi } from "./authApi";
import { notifyAuthChange } from "../utils/authState";

jest.mock("./api", () => {
  const actual = jest.requireActual("./api");

  return {
    __esModule: true,
    ...actual,
    default: {
      post: jest.fn(),
      get: jest.fn(),
      patch: jest.fn(),
    },
  };
});

describe("new authentication contracts", () => {
  const profile = { nickname: "서버 닉네임", email: "user@example.com", emailAvailable: true, provider: "LOCAL" };
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear();
    api.get.mockReset(); api.post.mockReset(); api.patch.mockReset(); notifyAuthChange();
  });
  test.each([true, false])("login reads the server nickname with the new token and respects keepLogin=%s", async keepLogin => {
    localStorage.setItem("userNickname", "다른 계정");
    api.post.mockResolvedValue({ data: "header.payload.signature-long-enough-for-existing-contract", headers: {} });
    api.get.mockImplementation(async url => {
      expect(url).toBe("/api/mypage/profile");
      expect(getAccessToken()).toBe("header.payload.signature-long-enough-for-existing-contract");
      return { data: profile };
    });
    const result = await loginApi({ email: " User@Example.com ", password: "test", keepLogin });
    expect(result.nickname).toBe("서버 닉네임");
    const storage = keepLogin ? localStorage : sessionStorage;
    const other = keepLogin ? sessionStorage : localStorage;
    expect(JSON.parse(storage.getItem("currentUser"))).toEqual(profile);
    expect(other.getItem("currentUser")).toBeNull();
    expect(other.getItem("userNickname")).toBeNull();
  });
  test("social login clears the previous user's cache and uses the synchronized profile", async () => {
    localStorage.setItem("userEmail", "old@example.com");
    localStorage.setItem("userNickname", "이전 이름");
    api.post.mockResolvedValue({ data: { token: "new-social-token", newUser: false } });
    api.get.mockResolvedValue({ data: { nickname: "동기화 이름", email: null, emailAvailable: false, provider: "KAKAO" } });
    const result = await completeSocialLoginApi({ provider: "kakao", code: "code", state: "state" });
    expect(result.profile.nickname).toBe("동기화 이름");
    expect(localStorage.getItem("userEmail")).toBeNull();
    expect(JSON.parse(localStorage.getItem("currentUser")).email).toBeNull();
  });
  test("late profile from an older login cannot overwrite a newer account", async () => {
    const read = deferred();
    api.post.mockResolvedValue({ data: "header.payload.signature-long-enough-for-existing-contract", headers: {} });
    api.get.mockReturnValue(read.promise);
    const pending = loginApi({ email: "user@example.com", password: "test" });
    await Promise.resolve();
    localStorage.setItem("accessToken", "newer-login-token");
    localStorage.setItem("currentUser", JSON.stringify({ nickname: "새 계정" })); notifyAuthChange();
    read.resolve({ data: profile });
    await expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(JSON.parse(localStorage.getItem("currentUser")).nickname).toBe("새 계정");
  });
  test("profile failure preserves successful credentials and never restores an old nickname", async () => {
    localStorage.setItem("userNickname", "다른 계정");
    api.post.mockResolvedValue({ data: "header.payload.signature-long-enough-for-existing-contract", headers: {} });
    api.get.mockRejectedValue({ response: { status: 500 } });
    await expect(loginApi({ email: "user@example.com", password: "test" })).resolves.toMatchObject({ profile: null });
    expect(getAccessToken()).toBeTruthy();
    expect(localStorage.getItem("userNickname")).toBeNull();
  });
  test("reset sends only normalized email and unchanged newPassword without installing credentials", async () => {
    api.patch.mockResolvedValue({ data: "비밀번호가 변경되었습니다." });
    const controller = new AbortController();
    await expect(resetPasswordApi({ email: " User@Example.com ", newPassword: "ValidPassword!" }, { signal: controller.signal })).resolves.toBe("비밀번호가 변경되었습니다.");
    expect(api.patch).toHaveBeenCalledWith("/api/auth/password/reset", { email: "user@example.com", newPassword: "ValidPassword!" }, { signal: controller.signal });
    expect(getAccessToken()).toBeNull();
  });
  test.each(["<html>login</html>", {}, null])("ambiguous reset 200 cannot display success", async data => {
    api.patch.mockResolvedValue({ data });
    await expect(resetPasswordApi({ email: "user@example.com", newPassword: "ValidPassword!" })).rejects.toThrow("변경 결과");
  });
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
    }, undefined);
    expect(localStorage.getItem("accessToken")).toBe(token);
    expect(localStorage.getItem("token")).toBeNull();
    expect(getAccessToken()).toBe(token);
  });
});

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

describe("authentication response ownership", () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); api.post.mockReset(); api.get.mockReset();
    notifyAuthChange();
  });

  test.each(["login", "signup", "oauth"])("aborted %s does not persist late credentials or nickname", async (kind) => {
    const request = deferred(); api.post.mockReturnValue(request.promise);
    const controller = new AbortController();
    const action = kind === "login"
      ? loginApi({ email: "old@example.com", password: "test-only" }, { signal: controller.signal })
      : kind === "signup"
        ? signupApi({ email: "old@example.com", nickname: "Old", password: "test-only" }, { signal: controller.signal })
        : completeSocialLoginApi({ provider: "google", code: "test-code", state: "test-state" }, { signal: controller.signal });
    expect(api.post.mock.calls[0][2].signal).toBe(controller.signal);
    controller.abort();
    request.resolve({ data: { token: "test-only-token" }, headers: {} });
    await expect(action).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("nickname:old@example.com")).toBeNull();
    expect(localStorage.getItem("currentUser")).toBeNull();
  });

  test("late login cannot replace credentials established by a newer login", async () => {
    const old = deferred(); api.post.mockReturnValue(old.promise);
    const pending = loginApi({ email: "old@example.com", password: "test-only" });
    localStorage.setItem("accessToken", "newer-test-only-token");
    localStorage.setItem("userEmail", "new@example.com"); notifyAuthChange();
    old.resolve({ data: { token: "old-test-only-token" }, headers: {} });
    await expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(localStorage.getItem("accessToken")).toBe("newer-test-only-token");
    expect(localStorage.getItem("userEmail")).toBe("new@example.com");
  });

  test("isCurrent denies stale OAuth before any auth storage mutation", async () => {
    const response = deferred(); api.post.mockReturnValue(response.promise);
    let current = true;
    const pending = completeSocialLoginApi({ provider: "kakao", code: "test-code", state: "test-state" }, { isCurrent: () => current });
    current = false; response.resolve({ data: { token: "test-only-token" } });
    await expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" });
    expect(localStorage.getItem("accessToken")).toBeNull();
  });

  test.each(["send", "verify", "authorize"])("departed %s response is cancelled rather than delivered to the old screen", async (kind) => {
    const response = deferred(); api.post.mockReturnValue(response.promise); api.get.mockReturnValue(response.promise);
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const pending = kind === "send" ? sendEmailCodeApi("test@example.com", options)
      : kind === "verify" ? verifyEmailCodeApi({ email: "test@example.com", code: "123456" }, options)
        : getSocialAuthorizationApi("google", options);
    controller.abort(); response.resolve({ data: { authorizationUrl: "https://accounts.google.com", state: "test-state", verified: true } });
    await expect(pending).rejects.toMatchObject({ code: "ERR_CANCELED" });
  });
});

describe("email verification response contract", () => {
  beforeEach(() => {
    localStorage.clear(); sessionStorage.clear(); api.post.mockReset(); notifyAuthChange();
  });
  test.each(["인증 성공!", { verified: true }])("only an explicit verification success is accepted", async data => {
    api.post.mockResolvedValue({ data });
    await expect(verifyEmailCodeApi({ email: " User@Example.com ", code: "012345" })).resolves.toEqual(data);
    expect(api.post).toHaveBeenCalledWith("/api/email/verify", { email: "user@example.com", code: "012345" }, undefined);
  });
  test.each(["<html>login</html>", "인증번호가 틀렸습니다.", {}, { verified: false }, null])("an ambiguous HTTP 200 cannot verify an email", async data => {
    api.post.mockResolvedValue({ data });
    await expect(verifyEmailCodeApi({ email: "user@example.com", code: "012345" })).rejects.toThrow("이메일 인증 결과");
  });
});
