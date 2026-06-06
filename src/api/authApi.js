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

export const loginApi = async ({ email, password }) => {
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

  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("userEmail", normalizedEmail);

  if (token) {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("token", token);
  }

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

  console.log("[authApi] 로그인 응답:", response.data);
  console.log("[authApi] 저장 확인:", {
    accessToken: localStorage.getItem("accessToken"),
    token: localStorage.getItem("token"),
    isLoggedIn: localStorage.getItem("isLoggedIn"),
    userEmail: localStorage.getItem("userEmail"),
    userNickname: localStorage.getItem("userNickname"),
    currentUser: localStorage.getItem("currentUser"),
  });

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