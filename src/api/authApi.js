import api from "./api";

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

const getCachedNickname = (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) return "";

  return normalizeNickname(localStorage.getItem(getNicknameKey(normalizedEmail)));
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

  storage.setItem("accessToken", normalizedToken);
  storage.setItem("token", normalizedToken);
  storage.setItem("isLoggedIn", "true");
  otherStorage.removeItem("accessToken");
  otherStorage.removeItem("token");

  return normalizedToken;
};

export const loginApi = async ({ email, password, keepLogin = true }) => {
  const normalizedEmail = normalizeEmail(email);

  const response = await api.post(
    "/api/auth/login",
    {
      email: normalizedEmail,
      password,
    },
    {
      responseType: "text",
    }
  );

  const token = extractToken(response);
  const cachedNickname = getCachedNickname(normalizedEmail);

  const storage = keepLogin ? localStorage : sessionStorage;
  storage.setItem("userEmail", normalizedEmail);
  saveToken(token, { persistent: keepLogin });
  localStorage.setItem("keepLogin", String(keepLogin));

  // 같은 브라우저에서 회원가입했던 계정이면 저장해둔 nickname을 마이페이지에서 바로 사용
  if (cachedNickname) {
    saveUserCache({
      email: normalizedEmail,
      nickname: cachedNickname,
    });
  } else {
    // 다른 계정의 이전 닉네임이 남아있으면 잘못 표시될 수 있으므로 제거
    clearCurrentUserCache();

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        email: normalizedEmail,
        nickname: "",
        name: "",
        username: "",
      })
    );
  }

  return {
    token,
    message: response.data,
    email: normalizedEmail,
    nickname: cachedNickname,
  };
};

export const logoutApi = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("keepLogin");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userNickname");
  localStorage.removeItem("userName");
  localStorage.removeItem("currentUser");

  sessionStorage.removeItem("accessToken");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("userEmail");
  sessionStorage.removeItem("userNickname");
  sessionStorage.removeItem("userName");
  sessionStorage.removeItem("currentUser");

  // nickname:${email} 캐시는 일부러 지우지 않음.
  // /api/users/me가 403일 때 같은 브라우저에서 닉네임을 다시 보여주기 위함.
};

export const signupApi = async ({ email, password, nickname }) => {
  const normalizedEmail = normalizeEmail(email);
  const normalizedNickname = normalizeNickname(nickname);

  const response = await api.post("/api/auth/signup", {
    email: normalizedEmail,
    password,
    nickname: normalizedNickname,
  });

  // 회원가입 성공 후 nickname을 저장해야 로그인 후 마이페이지에서 바로 표시 가능
  saveUserCache({
    email: normalizedEmail,
    nickname: normalizedNickname,
  });

  return response.data;
};

export const getSocialAuthorizationApi = async (provider) => {
  if (!['kakao', 'google'].includes(provider)) {
    throw new Error("지원하지 않는 소셜 로그인입니다.");
  }

  const response = await api.get(`/api/auth/${provider}/authorize`);
  const authorizationUrl = response.data?.authorizationUrl;
  const state = response.data?.state;

  if (!authorizationUrl || !state) {
    throw new Error("소셜 로그인 인증 정보를 받지 못했습니다.");
  }

  return response.data;
};

export const completeSocialLoginApi = async ({ provider, code, state }) => {
  if (!['kakao', 'google'].includes(provider)) {
    throw new Error("지원하지 않는 소셜 로그인입니다.");
  }

  if (!code || !state) {
    throw new Error("소셜 로그인 인증 정보가 없습니다.");
  }

  const response = await api.post(`/api/auth/${provider}/login`, {
    code,
    state,
  });

  const token = saveToken(response.data?.token, { persistent: true });
  localStorage.setItem("tokenType", response.data?.tokenType || "Bearer");
  localStorage.setItem("keepLogin", "true");

  return { ...response.data, token };
};

export const sendEmailCodeApi = async (email) => {
  const response = await api.post("/api/email/send", {
    email: normalizeEmail(email),
  });

  return response.data;
};

export const verifyEmailCodeApi = async ({ email, code }) => {
  const response = await api.post("/api/email/verify", {
    email: normalizeEmail(email),
    code,
  });

  return response.data;
};

export default loginApi;
