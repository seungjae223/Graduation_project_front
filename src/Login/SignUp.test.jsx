import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignUp from "./SignUp";
import { sendEmailCodeApi, verifyEmailCodeApi } from "../api/authApi";

jest.mock("../api/authApi", () => ({ sendEmailCodeApi: jest.fn(), verifyEmailCodeApi: jest.fn(), signupApi: jest.fn() }));
let alert;
beforeEach(() => {
  jest.clearAllMocks();
  alert = jest.spyOn(window, "alert").mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());
const setup = () => {
  render(<MemoryRouter><SignUp /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: "first@example.com" } });
};

test("late send response does not overwrite a newly entered email", async () => {
  let finish;
  sendEmailCodeApi.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  setup();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: "second@example.com" } });
  await act(async () => finish({}));
  expect(screen.getByLabelText("이메일 (아이디)")).toHaveValue("second@example.com");
  expect(screen.getByRole("button", { name: "인증 확인" })).toBeDisabled();
  expect(alert).not.toHaveBeenCalled();
});

test("late verification cannot verify a different email or code", async () => {
  sendEmailCodeApi.mockResolvedValue({});
  let finish;
  verifyEmailCodeApi.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  setup();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await screen.findByText("인증번호가 발송되었습니다. 이메일을 확인해주세요.");
  fireEvent.change(screen.getByLabelText("이메일 인증번호"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "인증 확인" }));
  expect(screen.getByRole("button", { name: "인증번호 발송" })).toBeDisabled();
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: "second@example.com" } });
  await act(async () => finish({ verified: true }));
  expect(screen.queryByText("이메일 인증이 완료되었습니다.")).not.toBeInTheDocument();
  expect(verifyEmailCodeApi).toHaveBeenCalledTimes(1);
});
