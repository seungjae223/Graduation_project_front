import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyPage from "./MyPage";
import api from "../api/api";

let mockAccount = "account:first";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => mockAccount }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccount }) }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn() }, getAccessToken: () => "test-token" }));

const profile = { nickname: "서버에서 받은 이름", email: "user@example.com", emailAvailable: true, provider: "LOCAL" };
const view = () => <MemoryRouter><MyPage /></MemoryRouter>;
beforeEach(() => {
  mockAccount = "account:first"; localStorage.clear(); sessionStorage.clear(); api.get.mockReset();
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  api.get.mockImplementation(async () => ({ data: profile }));
});

test("MyPage reads only profile and replaces cached names with server values", async () => {
  localStorage.setItem("currentUser", JSON.stringify({ nickname: "오래된 이름", email: "wrong@example.com" }));
  render(view());
  expect(await screen.findByRole("heading", { name: profile.nickname })).toBeInTheDocument();
  expect(screen.queryByText(profile.email)).not.toBeInTheDocument();
  expect(screen.queryByText("이메일 로그인")).not.toBeInTheDocument();
  expect(screen.queryByText("오래된 이름")).not.toBeInTheDocument();
  expect(api.get.mock.calls.map(([url]) => url)).toEqual(["/api/mypage/profile"]);
  expect(screen.queryByText("여행 일정")).not.toBeInTheDocument();
  expect(screen.queryByText("위치 사용")).not.toBeInTheDocument();
});


test("MyPage uses consistent outline icons for every supported menu action", async () => {
  render(view());
  await screen.findByRole("heading", { name: profile.nickname });
  const expected = [
    ["계정", "내 정보 수정", "user-edit"],
    ["계정", "비밀번호 변경", "lock"],
    ["계정", "로그아웃", "logout"],
    ["고객지원", "1:1 문의", "message"],
  ];
  expected.forEach(([section, label, icon]) => {
    const scope = within(screen.getByRole("navigation", { name: section }));
    const target = scope.getByRole(label === "로그아웃" ? "button" : "link", { name: new RegExp(label) });
    const decorativeIcon = target.querySelector(`svg[data-mypage-icon="${icon}"]`);
    expect(decorativeIcon).not.toBeNull();
    expect(decorativeIcon).toHaveAttribute("aria-hidden", "true");
    expect(target.querySelector('svg[data-mypage-icon="chevron"]')).not.toBeNull();
  });
  expect(document.querySelector('.mypage-v14-avatar svg[data-mypage-icon="avatar"]')).not.toBeNull();
  const shortcuts = within(screen.getByRole("navigation", { name: "여행 바로가기" }));
  [
    ["지난 여행", "luggage"], ["저장한 장소", "bookmark"],
    ["최근 본 장소", "history"], ["작성한 리뷰", "review"],
  ].forEach(([label, icon]) => {
    expect(shortcuts.getByRole("link", { name: label })
      .querySelector(`svg[data-mypage-icon="${icon}"]`)).not.toBeNull();
  });
  expect(screen.queryByText("나의 여행 기록")).not.toBeInTheDocument();
});

test("emailAvailable=false never falls back to a JWT or cached internal address", async () => {
  localStorage.setItem("userEmail", "kakao123@nomango.local");
  api.get.mockImplementation(async () => ({ data: { nickname: "카카오 사용자", email: null, emailAvailable: false, provider: "KAKAO" } }));
  render(view());
  await screen.findByRole("heading", { name: "카카오 사용자" });
  expect(screen.queryByText("이메일 정보 없음")).not.toBeInTheDocument();
  expect(screen.queryByText("카카오 로그인")).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /비밀번호 변경/ })).not.toBeInTheDocument();
  expect(document.body.textContent).not.toContain("nomango.local");
});

test("failed or malformed profile remains retryable without requesting statistics", async () => {
  api.get.mockImplementation(async () => ({ data: "<html>login</html>" }));
  render(view());
  const retry = await screen.findByRole("button", { name: "프로필 다시 불러오기" });
  expect(screen.queryByText("활동 통계")).not.toBeInTheDocument();
  api.get.mockImplementation(async () => ({ data: profile }));
  fireEvent.click(retry);
  expect(await screen.findByRole("heading", { name: profile.nickname })).toBeInTheDocument();
});

test("a departed account's late profile never replaces the current user's profile", async () => {
  let finish;
  const oldRead = new Promise(resolve => { finish = resolve; });
  api.get.mockImplementation(() => oldRead);
  const rendered = render(view());
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/mypage/profile", expect.any(Object)));
  const oldSignal = api.get.mock.calls.find(([url]) => url.endsWith("profile"))[1].signal;
  mockAccount = "account:second";
  api.get.mockImplementation(async () => ({ data: { ...profile, nickname: "새 계정 이름" } }));
  rendered.rerender(view());
  await screen.findByRole("heading", { name: "새 계정 이름" });
  await act(async () => finish({ data: profile }));
  expect(oldSignal.aborted).toBe(true);
  expect(screen.queryByRole("heading", { name: profile.nickname })).not.toBeInTheDocument();
});
