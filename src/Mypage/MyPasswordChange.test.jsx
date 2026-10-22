import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyPasswordChange from "./MyPasswordChange";
import { changeMyPasswordApi, getMyProfileApi } from "../api/profileApi";
import { clearAuthenticatedUserStorage } from "../utils/authStorage";

jest.mock("../api/profileApi", () => ({
  getMyProfileApi: jest.fn(), changeMyPasswordApi: jest.fn(),
}));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({
  getAuthSnapshot: () => ({ accountKey:"account:test", credentialVersion:1 }),
}));
jest.mock("../utils/authStorage", () => ({ clearAuthenticatedUserStorage: jest.fn() }));
const view = () => render(<MemoryRouter initialEntries={["/mypage/password"]}><MyPasswordChange /></MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks();
  getMyProfileApi.mockResolvedValue({
    nickname:"회원",email:"local@example.com",emailAvailable:true,provider:"LOCAL",
  });
});

test("local member verifies current password and changes password", async () => {
  changeMyPasswordApi.mockResolvedValue("비밀번호가 변경되었습니다.");
  view();
  await screen.findByLabelText("현재 비밀번호");
  fireEvent.change(screen.getByLabelText("현재 비밀번호"),{target:{value:"OldPassword!1"}});
  fireEvent.change(screen.getByLabelText("새 비밀번호",{exact:true}),{target:{value:"NewPassword!1"}});
  fireEvent.change(screen.getByLabelText("새 비밀번호 확인"),{target:{value:"NewPassword!1"}});
  fireEvent.click(screen.getByRole("button",{name:"비밀번호 변경"}));
  await waitFor(() => expect(changeMyPasswordApi).toHaveBeenCalledWith({
    currentPassword:"OldPassword!1",newPassword:"NewPassword!1",
  }));
  expect(await screen.findByText("비밀번호가 변경됐어요.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"다시 로그인"}));
  expect(clearAuthenticatedUserStorage).toHaveBeenCalledTimes(1);
});

test("social member cannot see or submit local password form", async () => {
  getMyProfileApi.mockResolvedValue({
    nickname:"카카오회원",email:null,emailAvailable:false,provider:"KAKAO",
  });
  view();
  expect(await screen.findByText(/소셜 계정은 별도 서비스 비밀번호가 없어요/)).toBeInTheDocument();
  expect(screen.queryByLabelText("현재 비밀번호")).not.toBeInTheDocument();
  expect(changeMyPasswordApi).not.toHaveBeenCalled();
});
