import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SignUp from "./SignUp";
import VerifyCode from "./VerifyCode";
import FindPassword from "./FindPassword";
import { sendEmailCodeApi } from "../api/authApi";
import { getApiErrorMessage } from "../api/api";
import { getEmailRetrySeconds } from "../utils/emailCooldown";

jest.mock("../api/authApi", () => ({ sendEmailCodeApi: jest.fn(), verifyEmailCodeApi: jest.fn(), signupApi: jest.fn() }));
jest.mock("../utils/safeLog", () => ({ logSafeApiError: jest.fn() }));
const cooldownError = seconds => ({ response: { status: 400, data: { message: `인증번호는 ${seconds}초 후 다시 요청할 수 있습니다.` } } });
let alert;
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  sendEmailCodeApi.mockResolvedValue({});
  alert = jest.spyOn(window, "alert").mockImplementation(() => {});
});
afterEach(() => { jest.useRealTimers(); alert.mockRestore(); });

const signup = () => {
  render(<MemoryRouter><SignUp /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: "user@example.com" } });
};
const tick = milliseconds => act(() => { jest.advanceTimersByTime(milliseconds); });
const flushRequest = () => act(async () => { await Promise.resolve(); });

test("the reported 24-second 400 displays its reason, blocks retries and unlocks after the actual deadline", async () => {
  sendEmailCodeApi.mockRejectedValueOnce(cooldownError(24));
  signup();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await flushRequest();
  expect(alert).toHaveBeenCalledWith("인증번호는 24초 후 다시 요청할 수 있습니다.");
  const waiting = screen.getByRole("button", { name: "24초 후 재발송" });
  expect(waiting).toBeDisabled();
  fireEvent.click(waiting);
  expect(sendEmailCodeApi).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "인증 확인" })).toBeDisabled();
  tick(23000);
  expect(screen.getByRole("button", { name: "1초 후 재발송" })).toBeDisabled();
  tick(1000);
  expect(screen.getByRole("button", { name: "인증번호 발송" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await flushRequest();
  expect(sendEmailCodeApi).toHaveBeenCalledTimes(2);
});

test("successful signup delivery prevents a resend for 60 seconds while verification remains available", async () => {
  signup();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await flushRequest();
  expect(screen.getByRole("button", { name: "60초 후 재발송" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "인증 확인" })).toBeEnabled();
  tick(60000);
  expect(screen.getByRole("button", { name: "인증번호 발송" })).toBeEnabled();
  expect(sendEmailCodeApi).toHaveBeenCalledTimes(1);
});

test("a cooldown belongs to its email and does not block a corrected address", async () => {
  sendEmailCodeApi.mockRejectedValueOnce(cooldownError(24));
  signup();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await flushRequest();
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: "other@example.com" } });
  expect(screen.getByRole("button", { name: "인증번호 발송" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: " USER@EXAMPLE.COM " } });
  expect(screen.getByRole("button", { name: "24초 후 재발송" })).toBeDisabled();
});

test("verification resend uses the server delay and keeps the entered code", async () => {
  sendEmailCodeApi.mockRejectedValueOnce(cooldownError(24));
  render(<MemoryRouter initialEntries={["/verify-code?email=user%40example.com"]}><VerifyCode /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("1번째 인증번호"), { target: { value: "1" } });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 재발송" }));
  await flushRequest();
  expect(screen.getByRole("alert")).toHaveTextContent("인증번호는 24초 후 다시 요청할 수 있습니다.");
  expect(screen.getByRole("button", { name: "24초 후 재발송" })).toBeDisabled();
  expect(screen.getByLabelText("1번째 인증번호")).toHaveValue("1");
  tick(24000);
  expect(screen.getByRole("button", { name: "인증번호 재발송" })).toBeEnabled();
});

test("email recovery also blocks repeated sends and lets the address be corrected", async () => {
  sendEmailCodeApi.mockRejectedValueOnce(cooldownError(24));
  render(<MemoryRouter><FindPassword /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("이메일 주소"), { target: { value: "user@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 찾기 메일 보내기" }));
  await flushRequest();
  expect(screen.getByRole("alert")).toHaveTextContent("24초 후");
  expect(screen.getByRole("button", { name: "24초 후 재발송" })).toBeDisabled();
  expect(screen.getByLabelText("이메일 주소")).toBeEnabled();
  fireEvent.change(screen.getByLabelText("이메일 주소"), { target: { value: "other@example.com" } });
  expect(screen.getByRole("button", { name: "비밀번호 찾기 메일 보내기" })).toBeEnabled();
});

test.each([0, 61, -1, "SQL password", "24초 <script>"])("unknown email errors remain hidden (%s)", seconds => {
  const error = cooldownError(seconds);
  expect(getEmailRetrySeconds(error)).toBe(0);
  expect(getApiErrorMessage(error)).toBe("입력 정보를 확인해주세요.");
});
