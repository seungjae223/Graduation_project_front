import React, { StrictMode } from "react";
import { render, waitFor } from "@testing-library/react";
import OAuthCallback from "./OAuthCallback";
import { completeSocialLoginApi } from "../api/authApi";
let mockProvider = "google";
let mockSearchParams;
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  useParams: () => ({ provider: mockProvider }),
  useSearchParams: () => [mockSearchParams],
  useNavigate: () => mockNavigate,
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
  expect(completeSocialLoginApi).toHaveBeenCalledTimes(1);
  expect(completeSocialLoginApi).toHaveBeenCalledWith({ provider, code: "test-code", state: "expected" });
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
