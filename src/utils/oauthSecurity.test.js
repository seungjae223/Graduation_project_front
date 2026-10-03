import { beginOAuth, consumeOAuthState, readAndClearOAuthQuery } from "./oauthSecurity";

beforeEach(() => sessionStorage.clear());
test.each(["google", "kakao"])("%s context is provider-bound, single-use and expires", (provider) => {
  const host = provider === "google" ? "accounts.google.com" : "kauth.kakao.com";
  beginOAuth(provider, `https://${host}/authorize?state=test`, "test");
  expect(consumeOAuthState(provider, "wrong")).toBe(false);
  expect(consumeOAuthState(provider, "test")).toBe(false);
  beginOAuth(provider, `https://${host}/authorize?state=test`, "test");
  expect(consumeOAuthState(provider === "google" ? "kakao" : "google", "test")).toBe(false);
  expect(consumeOAuthState(provider, "test")).toBe(true);
  expect(consumeOAuthState(provider, "test")).toBe(false);
  sessionStorage.setItem(`oauth_state_${provider}`, JSON.stringify({state:"old",expiresAt:0}));
  expect(consumeOAuthState(provider, "old")).toBe(false);
});
test.each(["http://accounts.google.com/?state=x", "https://accounts.google.com.evil.example/?state=x",
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
