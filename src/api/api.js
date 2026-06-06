import axios from "axios";

// Login.jsx의 API_BASE_URL과 반드시 같아야 합니다.
// 배포 서버를 쓸 거면 .env에 REACT_APP_API_BASE_URL=http://3.27.110.86:8080 로 넣는 걸 추천합니다.
const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/signup",
  "/api/email/verification-requests",
  "/api/email/verifications",
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

  return PUBLIC_API_PATHS.some((path) => pathname.startsWith(path));
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

export const clearAuthStorage = () => {
  localStorage.removeItem("petapp_session_v1");
  localStorage.removeItem("jakdang_access_token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("tokenType");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("keepLogin");
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userNickname");

  sessionStorage.removeItem("petapp_session_v1");
  sessionStorage.removeItem("jakdang_access_token");
  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("currentUser");
};

export const getAccessToken = () => {
  const candidates = [];

  // 마이페이지가 accessToken을 기준으로 보기 때문에 accessToken을 최우선으로 사용
  candidates.push(
    localStorage.getItem("accessToken"),
    sessionStorage.getItem("accessToken"),
    localStorage.getItem("token"),
    sessionStorage.getItem("token"),
    localStorage.getItem("jakdang_access_token"),
    sessionStorage.getItem("jakdang_access_token")
  );

  try {
    const localSessionRaw = localStorage.getItem("petapp_session_v1");

    if (localSessionRaw) {
      const session = JSON.parse(localSessionRaw);

      if (session?.token) {
        candidates.push(session.token);
      }

      if (session?.accessToken) {
        candidates.push(session.accessToken);
      }
    }
  } catch {
    localStorage.removeItem("petapp_session_v1");
  }

  try {
    const sessionRaw = sessionStorage.getItem("petapp_session_v1");

    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);

      if (session?.token) {
        candidates.push(session.token);
      }

      if (session?.accessToken) {
        candidates.push(session.accessToken);
      }
    }
  } catch {
    sessionStorage.removeItem("petapp_session_v1");
  }

  const validToken = candidates
    .map(normalizeToken)
    .find((token) => {
      return typeof token === "string" && token.trim() && !isExpiredToken(token);
    });

  return validToken || null;
};

api.interceptors.request.use(
  (config) => {
    const isPublicApi = isPublicApiPath(config);

    config.headers = config.headers || {};

    // 이전 요청에서 남은 Authorization 제거
    delete config.headers.Authorization;

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

    console.error("API 요청 실패:", error.response || error);

    // 401은 로그인 만료로 처리
    if (status === 401 && !isPublicApi) {
      console.warn("로그인이 만료되었거나 인증에 실패했습니다.");

      clearAuthStorage();

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // 403은 권한 없음이므로 토큰을 지우지 않음
    // 여기서 토큰을 지우면 마이페이지/관리자/권한 API에서 로그인 자체가 풀리는 문제가 생길 수 있음
    if (status === 403 && !isPublicApi) {
      console.warn("접근 권한이 없습니다.");
    }

    return Promise.reject(error);
  }
);

export default api;