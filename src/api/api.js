import axios from "axios";
import { clearAuthenticatedUserStorage, tokenCandidates } from "../utils/authStorage";
import { getAuthSnapshot, notifyAuthChange } from "../utils/authState";
import { logSafeApiError } from "../utils/safeLog";
import { buildLoginPath, getCurrentReturnPath } from "../utils/authRedirect";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL ||
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:8080");

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/auth/kakao/authorize",
  "/api/auth/kakao/login",
  "/api/auth/google/authorize",
  "/api/auth/google/login",
  "/api/email/send",
  "/api/email/verify",
];

const getRequestPath = (config) => {
  try {
    return new URL(config.url || "", config.baseURL || api.defaults.baseURL)
      .pathname;
  } catch {
    return config.url || "";
  }
};

const isPublicApiPath = (config) => {
  const pathname = getRequestPath(config);

  return PUBLIC_API_PATHS.includes(pathname);
};

const normalizeToken = (value) => {
  if (!value || typeof value !== "string") return null;

  const trimmedValue = value.trim();

  if (!trimmedValue) return null;

  // 혹시 로그인 응답 JSON 전체가 문자열로 저장된 경우 처리
  try {
    const parsed = JSON.parse(trimmedValue);

    const parsedToken =
      parsed?.accessToken ||
      parsed?.token ||
      parsed?.data?.accessToken ||
      parsed?.data?.token;

    if (typeof parsedToken === "string" && parsedToken.trim()) {
      return parsedToken.replace(/^Bearer\s+/i, "").trim();
    }
  } catch {
    // JSON 문자열이 아니면 일반 토큰으로 처리
  }

  // localStorage에 "Bearer eyJ..." 형태로 저장된 경우 Bearer 제거
  return trimmedValue.replace(/^Bearer\s+/i, "").trim();
};

const decodeJwtPayload = (token) => {
  try {
    const normalizedToken = normalizeToken(token);

    if (!normalizedToken) return null;

    const base64Url = normalizedToken.split(".")[1];

    if (!base64Url) return null;

    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "="
    );

    const json = decodeURIComponent(
      atob(paddedBase64)
        .split("")
        .map((char) => {
          return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join("")
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
};

const isExpiredToken = (token) => {
  const payload = decodeJwtPayload(token);

  // exp가 없는 토큰이면 일단 만료로 판단하지 않음
  if (!payload?.exp) return false;

  return Date.now() >= payload.exp * 1000;
};

export const clearAuthStorage = clearAuthenticatedUserStorage;

export const getAccessToken = () => tokenCandidates().map(normalizeToken)
  .find((token) => typeof token === "string" && token.trim() && !isExpiredToken(token)) || null;

api.interceptors.request.use(
  (config) => {
    const isPublicApi = isPublicApiPath(config);

    config.headers = config.headers || {};
    notifyAuthChange();
    config._authCredentialVersion = getAuthSnapshot().credentialVersion;

    // Clear every casing, including caller-supplied public-request headers.
    Object.keys(config.headers).forEach((key) => {
      if (key.toLowerCase() === "authorization") delete config.headers[key];
    });

    // Never send this application's credentials to an arbitrary URL/baseURL.
    const trustedOrigin = new URL(API_BASE_URL).origin;
    const requestOrigin = new URL(config.url || "", config.baseURL || API_BASE_URL).origin;
    if (requestOrigin !== trustedOrigin) {
      throw new Error("Untrusted API origin");
    }

    if (!isPublicApi) {
      const token = getAccessToken();

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isPublicApi = error.config ? isPublicApiPath(error.config) : false;

    logSafeApiError(error, "api");
    const sentVersion = error.config?._authCredentialVersion;
    if (sentVersion !== undefined && sentVersion !== getAuthSnapshot().credentialVersion) return Promise.reject(error);

    // 401은 로그인 만료로 처리
    if (status === 401 && !isPublicApi) {
      clearAuthStorage();

      if (window.location.pathname !== "/login") {
        window.location.replace(buildLoginPath(getCurrentReturnPath()));
      }
    }

    // 이 백엔드는 토큰 누락/만료도 403을 반환합니다. 요청에 토큰이 없었던
    // 경우만 로그인 만료로 처리하고, ADMIN 역할 부족 같은 정상적인 403은 보존합니다.
    if (status === 403 && !isPublicApi) {
      const authorization = error.config?.headers?.Authorization;

      if (!authorization) {
        clearAuthStorage();

        if (window.location.pathname !== "/login") {
          window.location.replace(buildLoginPath(getCurrentReturnPath()));
        }
      }
    }

    return Promise.reject(error);
  }
);

export const getApiErrorMessage = (
  error,
  fallbackMessage = "요청을 처리하지 못했습니다."
) => {
  const messages = {
    400: "입력 정보를 확인해주세요.",
    401: "인증에 실패했습니다. 다시 로그인해주세요.",
    403: "요청을 처리할 권한이 없습니다.",
    404: "요청한 정보를 찾을 수 없습니다.",
    409: "요청이 현재 상태와 충돌합니다. 입력 정보를 확인해주세요.",
    413: "입력한 내용이 너무 깁니다.",
    429: "요청이 많습니다. 잠시 후 다시 시도해주세요.",
  };
  const status = Number(error?.response?.status);
  if (messages[status]) return messages[status];
  if (status >= 500) return "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  if (error?.request && !error?.response) return "네트워크 연결을 확인해주세요.";
  return fallbackMessage;
};

export default api;
