import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyProfile from "./MyProfile";
import { getMyProfileApi, updateMyNicknameApi } from "../api/profileApi";

jest.mock("../api/profileApi", () => ({
  getMyProfileApi: jest.fn(), updateMyNicknameApi: jest.fn(),
}));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test", credentialVersion: 1 }) }));

const original = { nickname: "기존닉네임", email: "member@example.com", emailAvailable: true, provider: "LOCAL" };
beforeEach(() => { jest.clearAllMocks(); getMyProfileApi.mockResolvedValue(original); });
const view = () => render(<MemoryRouter><MyProfile /></MemoryRouter>);

test("local account can edit nickname and use real verified password-reset flow", async () => {
  updateMyNicknameApi.mockResolvedValue({ ...original, nickname: "변경한이름" });
  view();
  const input = await screen.findByLabelText("닉네임");
  fireEvent.change(input, { target: { value: "변경한이름" } });
  fireEvent.click(screen.getByRole("button", { name: "닉네임 저장" }));
  expect(await screen.findByText("닉네임이 변경됐어요.")).toBeInTheDocument();
  expect(updateMyNicknameApi).toHaveBeenCalledWith("변경한이름");
  expect(screen.getByRole("link", { name: /비밀번호 변경/ })).toHaveAttribute("href", "/mypage/password");
});

test("social accounts never receive email-password change controls", async () => {
  getMyProfileApi.mockResolvedValue({ nickname: "카카오사용자", email: null, emailAvailable: false, provider: "KAKAO" });
  view();
  expect(await screen.findByLabelText("닉네임")).toBeInTheDocument();
  expect(screen.queryByText("비밀번호 재설정")).not.toBeInTheDocument();
  expect(screen.queryByText(/nomango.local/)).not.toBeInTheDocument();
  expect(screen.queryByText("로그인 방식")).not.toBeInTheDocument();
  expect(screen.queryByText("이메일")).not.toBeInTheDocument();
});
