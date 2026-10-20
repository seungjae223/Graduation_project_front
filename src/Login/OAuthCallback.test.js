import React, { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import OAuthCallback from "./OAuthCallback";
import { completeSocialLoginApi } from "../api/authApi";
let mockProvider = "google";
let mockSearchParams;
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useParams: () => ({ provider: mockProvider }),
  useSearchParams: () => [mockSearchParams],
  useNavigate: () => mockNavigate,
  useLocation: () => ({ key: "oauth-test-entry", pathname: `/oauth/${mockProvider}/callback` }),
}), { virtual: true });
jest.mock("../api/authApi", () => ({ completeSocialLoginApi: jest.fn() }));
jest.mock("../Loading/EarthLoader", () => () => <div>Loading</div>);
beforeEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
  completeSocialLoginApi.mockResolvedValue({});
  mockSearchParams = new URLSearchParams("code=test-code&state=expected");
  window.history.replaceState({}, "", "/oauth/google/callback?code=test-code&state=expected");
});
test.each(["google", "kakao"])("%s: StrictMode에서도 일치한 state로 한 번만 완료", async (provider) => {
  mockProvider = provider;
  sessionStorage.setItem(`oauth_state_${provider}`, JSON.stringify({ state: "expected", expiresAt: Date.now() + 60000 }));
  const view = render(<StrictMode><OAuthCallback /></StrictMode>);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true });
  expect(completeSocialLoginApi).toHaveBeenCalledTimes(1);
  expect(completeSocialLoginApi).toHaveBeenCalledWith(
    { provider, code: "test-code", state: "expected" },
    expect.objectContaining({ signal: expect.any(AbortSignal), isCurrent: expect.any(Function) })
  );
  expect(sessionStorage.getItem(`oauth_state_${provider}`)).toBeNull();
  expect(window.location.search).toBe("");
  view.unmount();
  render(<OAuthCallback />);
  expect(completeSocialLoginApi).toHaveBeenCalledTimes(1);
});
test.each(["google", "kakao"])("%s: 불일치 시 완료 API 호출 금지", (provider) => {
  mockProvider = provider;
  sessionStorage.setItem(`oauth_state_${provider}`, JSON.stringify({ state: "different", expiresAt: Date.now() + 60000 }));
  render(<OAuthCallback />);
  expect(completeSocialLoginApi).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(`oauth_state_${provider}`)).toBeNull();
  expect(window.location.search).toBe("");
});

test.each(["missing", "expired", "unknown"])("Kakao rejects %s state before token exchange", kind => {
  mockProvider = "kakao";
  if (kind !== "unknown") sessionStorage.setItem("oauth_state_kakao", JSON.stringify({ state: "expected", expiresAt: kind === "expired" ? 0 : Date.now() + 60000 }));
  if (kind === "missing") mockSearchParams.delete("state");
  render(<OAuthCallback />);
  expect(screen.getByText("올바르지 않은 소셜 로그인 접근입니다. 다시 로그인해주세요.")).toBeInTheDocument();
  expect(completeSocialLoginApi).not.toHaveBeenCalled();
  expect(sessionStorage.getItem("oauth_state_kakao")).toBeNull();
});

test.each(["/place/42?from=search#details", "https://outside.example/", "//outside.example/"])("Kakao completion validates stored return path: %s", async destination => {
  mockProvider = "kakao";
  sessionStorage.setItem("oauth_state_kakao", JSON.stringify({ state: "expected", expiresAt: Date.now() + 60000 }));
  sessionStorage.setItem("socialLoginReturnTo", destination);
  render(<OAuthCallback />);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(destination.startsWith("/place/") ? destination : "/home", { replace: true }));
  expect(sessionStorage.getItem("socialLoginReturnTo")).toBeNull();
});
