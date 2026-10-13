import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyPage from "./MyPage";
import api from "../api/api";

let mockAccount = "account:first";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => mockAccount }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccount }) }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn() }, getAccessToken: () => "test-token" }));

const profile = { nickname: "서버에서 받은 이름", email: "user@example.com", emailAvailable: true, provider: "LOCAL" };
const stats = { visitedPlacesCount: 2, savedPlacesCount: 0, reviewsCount: 1 };
const view = () => <MemoryRouter><MyPage /></MemoryRouter>;
beforeEach(() => {
  mockAccount = "account:first"; localStorage.clear(); sessionStorage.clear(); api.get.mockReset();
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  api.get.mockImplementation(async url => ({ data: url === "/api/mypage/profile" ? profile : stats }));
});

test("MyPage reads profile separately from stats and replaces cached names with server values", async () => {
  localStorage.setItem("currentUser", JSON.stringify({ nickname: "오래된 이름", email: "wrong@example.com" }));
  render(view());
  expect(await screen.findByRole("heading", { name: profile.nickname })).toBeInTheDocument();
  expect(screen.getByText(profile.email)).toBeInTheDocument();
  expect(screen.getByText("이메일 로그인")).toBeInTheDocument();
  expect(screen.queryByText("오래된 이름")).not.toBeInTheDocument();
  expect(api.get.mock.calls.map(([url]) => url).sort()).toEqual(["/api/mypage/profile", "/api/mypage/stats"]);
});

test("emailAvailable=false never falls back to a JWT or cached internal address", async () => {
  localStorage.setItem("userEmail", "kakao123@nomango.local");
  api.get.mockImplementation(async url => ({ data: url.endsWith("profile") ? { nickname: "카카오 사용자", email: null, emailAvailable: false, provider: "KAKAO" } : stats }));
  render(view());
  await screen.findByRole("heading", { name: "카카오 사용자" });
  expect(screen.getByText("이메일 정보 없음")).toBeInTheDocument();
  expect(screen.getByText("카카오 로그인")).toBeInTheDocument();
  expect(document.body.textContent).not.toContain("nomango.local");
});

test("failed or malformed profile remains retryable while statistics still work", async () => {
  api.get.mockImplementation(async url => ({ data: url.endsWith("profile") ? "<html>login</html>" : stats }));
  render(view());
  const retry = await screen.findByRole("button", { name: "프로필 다시 불러오기" });
  expect(screen.getByText("2", { selector: "strong" })).toBeInTheDocument();
  api.get.mockImplementation(async url => ({ data: url.endsWith("profile") ? profile : stats }));
  fireEvent.click(retry);
  expect(await screen.findByRole("heading", { name: profile.nickname })).toBeInTheDocument();
});

test("a departed account's late profile never replaces the current user's profile", async () => {
  let finish;
  const oldRead = new Promise(resolve => { finish = resolve; });
  api.get.mockImplementation(url => url.endsWith("profile") ? oldRead : Promise.resolve({ data: stats }));
  const rendered = render(view());
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/mypage/profile", expect.any(Object)));
  const oldSignal = api.get.mock.calls.find(([url]) => url.endsWith("profile"))[1].signal;
  mockAccount = "account:second";
  api.get.mockImplementation(async url => ({ data: url.endsWith("profile") ? { ...profile, nickname: "새 계정 이름" } : stats }));
  rendered.rerender(view());
  await screen.findByRole("heading", { name: "새 계정 이름" });
  await act(async () => finish({ data: profile }));
  expect(oldSignal.aborted).toBe(true);
  expect(screen.queryByRole("heading", { name: profile.nickname })).not.toBeInTheDocument();
});
