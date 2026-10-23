import React, { StrictMode, Suspense, lazy } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import OAuthCallback from "./OAuthCallback";
import { completeSocialLoginApi } from "../api/authApi";
import EarthLoader from "../Loading/EarthLoader";
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
beforeEach(() => {
  sessionStorage.clear();
  jest.clearAllMocks();
  completeSocialLoginApi.mockResolvedValue({});
  mockSearchParams = new URLSearchParams("code=test-code&state=expected");
  window.history.replaceState({}, "", "/oauth/google/callback?code=test-code&state=expected");
});

test.each(["google", "kakao"])("%s: keeps page loading layout from the lazy chunk through pending login", async provider => {
  mockProvider = provider;
  sessionStorage.setItem(`oauth_state_${provider}`, JSON.stringify({ state: "expected", expiresAt: Date.now() + 60000 }));
  completeSocialLoginApi.mockReturnValue(new Promise(() => {}));
  let loadCallback;
  const Callback = lazy(() => new Promise(resolve => { loadCallback = resolve; }));
  render(<Suspense fallback={<EarthLoader variant="page" text="화면을 불러오는 중..." />}><Callback /></Suspense>);
  expect(screen.getByRole("status")).toHaveTextContent("화면을 불러오는 중...");
  expect(screen.getByRole("status")).toHaveClass("earth-loading-screen--page");
  await act(async () => loadCallback({ default: OAuthCallback }));
  expect(screen.getByRole("status")).toHaveTextContent("소셜 로그인을 완료하는 중...");
  expect(screen.getByRole("status")).toHaveClass("earth-loading-screen--page");
  expect(completeSocialLoginApi).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
});
test.each(["google", "kakao"])("%s: StrictMode에서도 일치한 state로 한 번만 완료", async (provider) => {
  mockProvider = provider;
  sessionStorage.setItem("socialLoginReturnTo", "/route-create");
  sessionStorage.setItem(`oauth_state_${provider}`, JSON.stringify({ state: "expected", expiresAt: Date.now() + 60000 }));
  const view = render(<StrictMode><OAuthCallback /></StrictMode>);
  await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
  expect(mockNavigate).toHaveBeenCalledWith("/home", { replace: true });
  expect(sessionStorage.getItem("socialLoginReturnTo")).toBeNull();
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
