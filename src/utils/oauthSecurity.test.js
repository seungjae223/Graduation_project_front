import { beginOAuth, consumeOAuthState, getOAuthCallbackUri, readAndClearOAuthQuery } from "./oauthSecurity";

const authorizationUrl = (provider, state = "test") => {
  const host = provider === "google" ? "accounts.google.com" : "kauth.kakao.com";
  return `https://${host}/authorize?${new URLSearchParams({ state, redirect_uri: getOAuthCallbackUri(provider) })}`;
};

beforeEach(() => sessionStorage.clear());
test.each(["google", "kakao"])("%s context is provider-bound, single-use and expires", (provider) => {
  beginOAuth(provider, authorizationUrl(provider), "test");
  expect(consumeOAuthState(provider, "wrong")).toBe(false);
  expect(consumeOAuthState(provider, "test")).toBe(false);
  beginOAuth(provider, authorizationUrl(provider), "test");
  expect(consumeOAuthState(provider === "google" ? "kakao" : "google", "test")).toBe(false);
  expect(consumeOAuthState(provider, "test")).toBe(true);
  expect(consumeOAuthState(provider, "test")).toBe(false);
  sessionStorage.setItem(`oauth_state_${provider}`, JSON.stringify({state:"old",expiresAt:0}));
  expect(consumeOAuthState(provider, "old")).toBe(false);
});

test.each(["http://localhost:3000", "https://noman-go.netlify.app"])("callback follows initiating origin: %s", origin => {
  expect(getOAuthCallbackUri("kakao", origin)).toBe(`${origin}/oauth/kakao/callback`);
  const location = jest.spyOn(window, "location", "get").mockReturnValue({ origin });
  try {
    expect(() => beginOAuth("kakao", authorizationUrl("kakao"), "test")).not.toThrow();
    expect(consumeOAuthState("kakao", "test")).toBe(true);
  } finally { location.mockRestore(); }
});

test("accepts only the current Kakao callback and persists state after validation", () => {
  expect(beginOAuth("kakao", authorizationUrl("kakao"), "test")).toBe(authorizationUrl("kakao"));
  expect(consumeOAuthState("kakao", "test")).toBe(true);
});

test.each([
  "https://noman-go.netlify.app/oauth/kakao/callback",
  "https://outside.example/oauth/kakao/callback",
  "http://localhost:3000/oauth/kakao/callback",
  `${window.location.origin}/oauth/google/callback`,
  `${window.location.origin}/oauth/kakao/callback?next=outside`,
  `${window.location.origin}/oauth/kakao/callback/`,
  "",
])("rejects mismatched Kakao callback without storing state: %s", redirect => {
  const url = new URL(authorizationUrl("kakao"));
  url.searchParams.set("redirect_uri", redirect);
  expect(() => beginOAuth("kakao", url.href, "test")).toThrow("현재 환경과 로그인 복귀 주소가 일치하지 않습니다.");
  expect(sessionStorage.getItem("oauth_state_kakao")).toBeNull();
});

test("rejects missing and duplicate callback parameters", () => {
  const url = new URL(authorizationUrl("kakao"));
  url.searchParams.delete("redirect_uri");
  expect(() => beginOAuth("kakao", url.href, "test")).toThrow();
  url.searchParams.append("redirect_uri", getOAuthCallbackUri("kakao"));
  url.searchParams.append("redirect_uri", getOAuthCallbackUri("kakao"));
  expect(() => beginOAuth("kakao", url.href, "test")).toThrow();
});

test.each([null, "", "wrong"])("rejects absent or mismatched initiating state", state => {
  expect(() => beginOAuth("kakao", authorizationUrl("kakao"), state)).toThrow();
  expect(sessionStorage.getItem("oauth_state_kakao")).toBeNull();
});

test("missing callback state invalidates a pending attempt", () => {
  beginOAuth("kakao", authorizationUrl("kakao"), "test");
  expect(consumeOAuthState("kakao", null)).toBe(false);
  expect(consumeOAuthState("kakao", "test")).toBe(false);
});
test.each(["http://accounts.google.com/?state=x", "https://accounts.google.com.evil.example/?state=x",
  // eslint-disable-next-line no-script-url -- Malicious URL fixture must be rejected.
  "javascript:alert(1)", "https://user@accounts.google.com/?state=x"])("rejects %s", (url) => {
  expect(() => beginOAuth("google", url, "x")).toThrow();
  expect(sessionStorage.getItem("oauth_state_google")).toBeNull();
});
test("captures query before removing it and preserves router history state", () => {
  window.history.replaceState({idx:2}, "", "/oauth/google/callback?code=secret&state=x#fragment");
  expect(readAndClearOAuthQuery(new URLSearchParams(window.location.search))).toEqual({code:"secret",state:"x",error:null});
  expect(window.location.search).toBe("");
  expect(window.location.hash).toBe("");
  expect(window.history.state).toEqual({idx:2});
});
