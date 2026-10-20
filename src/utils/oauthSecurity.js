const HOSTS = { google: "accounts.google.com", kakao: "kauth.kakao.com" };
const TTL = 10 * 60 * 1000;
const key = (provider) => `oauth_state_${provider}`;

export const OAUTH_REDIRECT_MISMATCH_MESSAGE = "현재 환경과 로그인 복귀 주소가 일치하지 않습니다.";

export function getOAuthCallbackUri(provider, origin = window.location.origin) {
  if (!Object.hasOwn(HOSTS, provider)) throw new Error("지원하지 않는 로그인입니다.");
  return `${origin}/oauth/${provider}/callback`;
}

export function beginOAuth(provider, authorizationUrl, state) {
  if (!Object.hasOwn(HOSTS, provider)) throw new Error("지원하지 않는 로그인입니다.");
  sessionStorage.removeItem(key(provider));
  const url = new URL(authorizationUrl);
  if (url.protocol !== "https:" || url.hostname !== HOSTS[provider] ||
      url.username || url.password || (url.port && url.port !== "443") ||
      typeof state !== "string" || !state || url.searchParams.getAll("state").length !== 1 ||
      url.searchParams.get("state") !== state) {
    throw new Error("올바르지 않은 인증 주소입니다.");
  }
  if (provider === "kakao") {
    const redirects = url.searchParams.getAll("redirect_uri");
    if (redirects.length !== 1 || redirects[0] !== getOAuthCallbackUri(provider)) {
      const error = new Error(OAUTH_REDIRECT_MISMATCH_MESSAGE);
      error.code = "OAUTH_REDIRECT_MISMATCH";
      throw error;
    }
  }
  // Failure to persist the initiating context must abort the navigation.
  sessionStorage.setItem(key(provider), JSON.stringify({ state, expiresAt: Date.now() + TTL }));
  return url.href;
}

export function consumeOAuthState(provider, state) {
  if (!Object.hasOwn(HOSTS, provider)) return false;
  try {
    const raw = sessionStorage.getItem(key(provider));
    sessionStorage.removeItem(key(provider));
    const saved = JSON.parse(raw);
    return typeof state === "string" && !!state && saved?.state === state &&
      Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now();
  } catch {
    return false;
  }
}

export function readAndClearOAuthQuery(searchParams) {
  const result = { code: searchParams.get("code"), state: searchParams.get("state"),
    error: searchParams.get("error") };
  // Preserve the router's history state; remove all provider query/fragment data.
  window.history.replaceState(window.history.state, "", window.location.pathname);
  return result;
}
