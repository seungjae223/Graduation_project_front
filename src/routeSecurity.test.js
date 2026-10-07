import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";
import { isSafeInternalPath, getReturnPathFromSearch } from "./utils/authRedirect";

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear();
  window.matchMedia = jest.fn().mockReturnValue({matches:false,addEventListener:jest.fn(),removeEventListener:jest.fn()});
});
test.each(["/mypage", "/inquiry/write", "/admin"])("protected direct route %s requires login", async path => {
  window.history.replaceState({}, "", path);
  render(<App />);
  await screen.findByLabelText("이메일");
  expect(window.location.pathname).toBe("/login");
  expect(new URLSearchParams(window.location.search).get("returnTo")).toBe(path);
});
test("unknown direct route preserves the existing 404 UI", async () => {
  window.history.replaceState({}, "", "/unknown-security-test-route");
  render(<App />);
  expect(await screen.findByRole("heading", {name:"페이지를 찾을 수 없습니다"})).toBeInTheDocument();
});
  // eslint-disable-next-line no-script-url -- Malicious URL fixture must be rejected.
test.each(["https://evil.example", "//evil.example", "/\\evil.example", "/\n/evil.example", "javascript:alert(1)"])("unsafe returnTo is rejected: %s", value => {
  expect(isSafeInternalPath(value)).toBe(false);
  expect(getReturnPathFromSearch(`?returnTo=${encodeURIComponent(value)}`)).toBe("/home");
});
