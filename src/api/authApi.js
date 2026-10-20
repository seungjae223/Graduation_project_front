import api from "./api";
import { USE_MOCK } from "../config/mockConfig";
import { loginMock, signupMock } from "../mocks/authMock";
import { ACCESS_TOKEN_KEY, clearAuthenticatedUserStorage } from "../utils/authStorage";
import { getAuthSnapshot, notifyAuthChange } from "../utils/authState";
import { getMyProfileApi } from "./profileApi";
import { getOAuthCallbackUri } from "../utils/oauthSecurity";

const createResponseGuard = ({ signal, isCurrent } = {}) => {
  notifyAuthChange();
  const version = getAuthSnapshot().credentialVersion;
  return () => {
    notifyAuthChange();
    if (signal?.aborted || (isCurrent && !isCurrent()) ||
        getAuthSnapshot().credentialVersion !== version) {
      const error = new Error("인증 요청이 취소되었습니다.");
      error.code = "ERR_CANCELED";
      throw error;
    }
  };
};

const requestConfig = (options = {}) => options.signal ? { signal: options.signal } : undefined;

const extractToken = (response) => {
  const headers = response.headers || {};

  const authHeader =
    headers.authorization ||
    headers.Authorization ||
    headers.get?.("authorization") ||
    headers.get?.("Authorization");

  if (authHeader) {
    return authHeader.replace(/^Bearer\s+/i, "").trim();
  }

  const data = response.data;

  if (!data) return "";

  if (typeof data === "string") {
    const text = data.trim();

    try {
      const parsed = JSON.parse(text);

      const token =
        parsed.accessToken ||
        parsed.token ||
        parsed.jwt ||
        parsed.access_token ||
        "";

      return typeof token === "string"
        ? token.replace(/^Bearer\s+/i, "").trim()
        : "";
    } catch {
      if (text.startsWith("Bearer ")) {
        return text.replace(/^Bearer\s+/i, "").trim();
      }

      if (text.includes(".") && text.length > 30) {
        return text;
      }

      return "";
    }
  }

  const token =
    data.accessToken ||
    data.token ||
    data.jwt ||
    data.access_token ||
    "";

  return typeof token === "string"
    ? token.replace(/^Bearer\s+/i, "").trim()
    : "";
};

const normalizeEmail = (email) => {
  return String(email || "").trim().toLowerCase();
};

const normalizeNickname = (nickname) => {
  return String(nickname || "").trim();
};

const getNicknameKey = (email) => {
  return `nickname:${normalizeEmail(email)}`;
};

const saveUserCache = ({ email, nickname }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedNickname = normalizeNickname(nickname);

  if (normalizedEmail) {
    localStorage.setItem("userEmail", normalizedEmail);
  }

  if (normalizedEmail && normalizedNickname) {
    localStorage.setItem(getNicknameKey(normalizedEmail), normalizedNickname);
    localStorage.setItem("userNickname", normalizedNickname);
    localStorage.setItem("userName", normalizedNickname);

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        email: normalizedEmail,
        nickname: normalizedNickname,
        name: normalizedNickname,
        username: normalizedNickname,
      })
    );
  }
};

const clearCurrentUserCache = () => {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userNickname");
  localStorage.removeItem("userName");

  sessionStorage.removeItem("currentUser");
  sessionStorage.removeItem("userNickname");
  sessionStorage.removeItem("userName");
  localStorage.removeItem("userEmail");
  sessionStorage.removeItem("userEmail");
};

// The login token is already installed, so this read owns the new credential version.
const refreshLoginProfile = async (options) => {
  const assertCurrent = createResponseGuard(options);
  let profile;
  try {
    profile = await getMyProfileApi(options);
  } catch (error) {
    assertCurrent();
    if (error?.code === "ERR_CANCELED" || error?.name === "AbortError") throw error;
    // A profile outage must not undo a successful login. MyPage offers a read retry.
    return null;
  }
  assertCurrent();
  if (!USE_MOCK) {
    const storage = localStorage.getItem(ACCESS_TOKEN_KEY) ? localStorage : sessionStorage;
    storage.setItem("currentUser", JSON.stringify(profile));
    storage.setItem("userNickname", profile.nickname);
    storage.setItem("userName", profile.nickname);
    if (profile.emailAvailable) storage.setItem("userEmail", profile.email);
    else storage.removeItem("userEmail");
  }
  return profile;
};

const saveToken = (token, { persistent = true } = {}) => {
  const normalizedToken = String(token || "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  if (!normalizedToken) {
    throw new Error("서버에서 로그인 토큰을 받지 못했습니다.");
  }

  const storage = persistent ? localStorage : sessionStorage;
  const otherStorage = persistent ? sessionStorage : localStorage;

  storage.setItem(ACCESS_TOKEN_KEY, normalizedToken);
  storage.removeItem("token");
  storage.removeItem("jakdang_access_token");
  storage.removeItem("petapp_session_v1");
  storage.setItem("isLoggedIn", "true");
  otherStorage.removeItem("accessToken");
  otherStorage.removeItem("token");
  otherStorage.removeItem("jakdang_access_token");
  otherStorage.removeItem("petapp_session_v1");
  notifyAuthChange();

  return normalizedToken;
};

export const loginApi = async ({ email, password, keepLogin = true }, options = {}) => {
  const assertCurrent = createResponseGuard(options);
  assertCurrent();
  const normalizedEmail = normalizeEmail(email);
  if (USE_MOCK) {
    const result = loginMock({ email: normalizedEmail, password, keepLogin });
    notifyAuthChange();
    return { ...result, profile: await refreshLoginProfile(options) };
  }

  const response = await api.post(
    "/api/auth/login",
    {
      email: normalizedEmail,
      password,
    },
    {
      responseType: "text",
      ...requestConfig(options),
    }
  );

  assertCurrent();

  const token = extractToken(response);
  clearCurrentUserCache();
  const storage = keepLogin ? localStorage : sessionStorage;
  storage.setItem("userEmail", normalizedEmail);
  saveToken(token, { persistent: keepLogin });
  localStorage.setItem("keepLogin", String(keepLogin));

  const profile = await refreshLoginProfile(options);

  return {
    token,
    message: response.data,
    email: normalizedEmail,
    nickname: profile?.nickname || "",
    profile,
  };
};

export const logoutApi = clearAuthenticatedUserStorage;

export const signupApi = async ({ email, password, nickname }, options = {}) => {
  const assertCurrent = createResponseGuard(options);
  assertCurrent();
  const normalizedEmail = normalizeEmail(email);
  const normalizedNickname = normalizeNickname(nickname);
  if (USE_MOCK) return signupMock({ email: normalizedEmail, nickname: normalizedNickname });

  const response = await api.post("/api/auth/signup", {
    email: normalizedEmail,
    password,
    nickname: normalizedNickname,
  }, requestConfig(options));

  assertCurrent();

  // 회원가입 성공 후 nickname을 저장해야 로그인 후 마이페이지에서 바로 표시 가능
  saveUserCache({
    email: normalizedEmail,
    nickname: normalizedNickname,
  });

  return response.data;
};

export const getSocialAuthorizationApi = async (provider, options = {}) => {
  const assertCurrent = createResponseGuard(options);
  assertCurrent();
  if (!['kakao', 'google'].includes(provider)) {
    throw new Error("지원하지 않는 소셜 로그인입니다.");
  }

  if (USE_MOCK) {
    const result = loginMock({ provider: provider.toUpperCase() });
    notifyAuthChange();
    return { ...result, profile: await refreshLoginProfile(options), authenticated: true };
  }

  const config = provider === "kakao"
    ? { ...requestConfig(options), params: { redirectUri: getOAuthCallbackUri(provider) } }
    : requestConfig(options);
  const response = await api.get(`/api/auth/${provider}/authorize`, config);
  assertCurrent();
  const authorizationUrl = response.data?.authorizationUrl;
  const state = response.data?.state;

  if (!authorizationUrl || !state) {
    throw new Error("소셜 로그인 인증 정보를 받지 못했습니다.");
  }

  return response.data;
};

export const completeSocialLoginApi = async ({ provider, code, state }, options = {}) => {
  const assertCurrent = createResponseGuard(options);
  assertCurrent();
  if (!['kakao', 'google'].includes(provider)) {
    throw new Error("지원하지 않는 소셜 로그인입니다.");
  }

  if (!code || !state) {
    throw new Error("소셜 로그인 인증 정보가 없습니다.");
  }

  if (USE_MOCK) {
    const result = loginMock({ provider: provider.toUpperCase() });
    notifyAuthChange();
    return { ...result, profile: await refreshLoginProfile(options) };
  }

  const response = await api.post(`/api/auth/${provider}/login`, {
    code,
    state,
  }, requestConfig(options));

  assertCurrent();

  clearCurrentUserCache();
  const token = saveToken(response.data?.token, { persistent: true });
  localStorage.setItem("tokenType", response.data?.tokenType || "Bearer");
  localStorage.setItem("keepLogin", "true");

  const profile = await refreshLoginProfile(options);
  return { ...response.data, token, profile };
};

export const resetPasswordApi = async ({ email, newPassword }, options = {}) => {
  const assertCurrent = createResponseGuard(options);
  assertCurrent();
  const response = await api.patch("/api/auth/password/reset", {
    email: normalizeEmail(email),
    newPassword,
  }, requestConfig(options));
  assertCurrent();
  if (typeof response.data !== "string" || response.data.trim() !== "비밀번호가 변경되었습니다.") {
    throw new Error("비밀번호 변경 결과를 확인하지 못했습니다. 로그인 화면에서 새 비밀번호를 확인해주세요.");
  }
  return response.data;
};

export const sendEmailCodeApi = async (email, options = {}) => {
  const assertCurrent = createResponseGuard(options);
  assertCurrent();
  const response = await api.post("/api/email/send", {
    email: normalizeEmail(email),
  }, requestConfig(options));

  assertCurrent();

  return response.data;
};

export const verifyEmailCodeApi = async ({ email, code }, options = {}) => {
  const assertCurrent = createResponseGuard(options);
  assertCurrent();
  const response = await api.post("/api/email/verify", {
    email: normalizeEmail(email),
    code,
  }, requestConfig(options));

  assertCurrent();

  const data = response.data;
  if (!(typeof data === "string" && data.trim() === "인증 성공!") && data?.verified !== true) {
    throw new Error("이메일 인증 결과를 확인하지 못했습니다. 인증번호를 다시 확인해주세요.");
  }
  return response.data;
};

export default loginApi;
