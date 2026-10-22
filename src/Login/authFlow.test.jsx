import React, { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Login from "./Login";
import FindPassword from "./FindPassword";
import VerifyCode from "./VerifyCode";
import SignUp from "./SignUp";
import OAuthCallback from "./OAuthCallback";
import { beginOAuth } from "../utils/oauthSecurity";
import { saveSocialLoginReturnPath } from "../utils/authRedirect";
import { completeSocialLoginApi, getSocialAuthorizationApi, loginApi, resetPasswordApi, sendEmailCodeApi, signupApi, verifyEmailCodeApi } from "../api/authApi";

jest.mock("../api/authApi", () => ({
  loginApi: jest.fn(), getSocialAuthorizationApi: jest.fn(), completeSocialLoginApi: jest.fn(),
  sendEmailCodeApi: jest.fn(), signupApi: jest.fn(), verifyEmailCodeApi: jest.fn(),
  resetPasswordApi: jest.fn(),
}));
jest.mock("../utils/safeLog", () => ({ logSafeApiError: jest.fn() }));

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
function Location() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}{location.search}</output>
    <button onClick={() => navigate("/away")}>화면 떠나기</button>
    <button onClick={() => navigate("/verify-code?email=second%40example.com&returnTo=%2Fmypage")}>다른 이메일 인증</button></>;
}
function setup(path, strict = false) {
  const app = <MemoryRouter initialEntries={[path]}><Location /><Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<SignUp />} />
    <Route path="/find-password" element={<FindPassword />} />
    <Route path="/verify-code" element={<VerifyCode />} />
    <Route path="/oauth/:provider/callback" element={<OAuthCallback />} />
    <Route path="*" element={<p>목적지</p>} />
  </Routes></MemoryRouter>;
  return render(strict ? <StrictMode>{app}</StrictMode> : app);
}
const typeCode = (value = "123456") => [...value].forEach((digit, index) => {
  fireEvent.change(screen.getByLabelText(`${index + 1}번째 인증번호`), { target: { value: digit } });
});
let alert;
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear();
  alert = jest.spyOn(window, "alert").mockImplementation(() => {});
});
afterEach(() => alert.mockRestore());

test("a departed login aborts its request and cannot navigate on late success", async () => {
  const result = deferred(); loginApi.mockReturnValue(result.promise);
  setup("/login?returnTo=%2Fmypage", true);
  fireEvent.change(screen.getByLabelText("이메일"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "test-only" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인", exact: true }));
  fireEvent.submit(screen.getByRole("form", { name: "로그인" }));
  expect(loginApi).toHaveBeenCalledTimes(1);
  const options = loginApi.mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "화면 떠나기" }));
  expect(options.signal.aborted).toBe(true); expect(options.isCurrent()).toBe(false);
  await act(async () => result.resolve({}));
  expect(screen.getByTestId("location")).toHaveTextContent("/away");
});

test("late social authorization cannot initiate OAuth from another screen", async () => {
  const result = deferred(); getSocialAuthorizationApi.mockReturnValue(result.promise);
  setup("/login?returnTo=%2Fmypage");
  fireEvent.click(screen.getByRole("button", { name: "구글 로그인" }));
  const options = getSocialAuthorizationApi.mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "화면 떠나기" }));
  await act(async () => result.resolve({ authenticated: true }));
  expect(options.signal.aborted).toBe(true);
  expect(screen.getByTestId("location")).toHaveTextContent("/away");
});

test("late email delivery cannot send a departed page to verification", async () => {
  const result = deferred(); sendEmailCodeApi.mockReturnValue(result.promise);
  setup("/find-password?returnTo=%2Fmypage");
  const input = screen.getByLabelText("이메일 주소");
  expect(input).toHaveAttribute("id", "find-password-email");
  fireEvent.change(input, { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 찾기 메일 보내기" }));
  fireEvent.click(screen.getByRole("button", { name: "화면 떠나기" }));
  expect(sendEmailCodeApi.mock.calls[0][1].signal.aborted).toBe(true);
  await act(async () => result.resolve({}));
  expect(screen.getByTestId("location")).toHaveTextContent("/away");
});

test("returnTo survives login, signup, recovery, verification and login again", async () => {
  sendEmailCodeApi.mockResolvedValue({});
  const destination = "/place/42?from=search#details";
  setup(`/login?returnTo=${encodeURIComponent(destination)}`);
  fireEvent.click(screen.getByRole("link", { name: "회원가입" }));
  expect(screen.getByRole("link", { name: "로그인으로 돌아가기" })).toHaveAttribute("href", `/login?returnTo=${encodeURIComponent(destination)}`);
  fireEvent.click(screen.getByRole("link", { name: "로그인으로 돌아가기" }));
  fireEvent.click(screen.getByRole("link", { name: "비밀번호 찾기" }));
  fireEvent.change(screen.getByLabelText("이메일 주소"), { target: { value: " Test@Example.com " } });
  fireEvent.submit(screen.getByRole("form", { name: "비밀번호 찾기" }));
  await screen.findByLabelText("1번째 인증번호");
  const path = screen.getByTestId("location").textContent;
  const query = new URLSearchParams(path.split("?")[1]);
  expect(query.get("email")).toBe("test@example.com");
  expect(query.get("returnTo")).toBe(destination);
  fireEvent.click(screen.getByRole("link", { name: "로그인으로 돌아가기" }));
  expect(screen.getByTestId("location")).toHaveTextContent(`/login?returnTo=${encodeURIComponent(destination)}`);
});

test.each(["https://outside.example/mypage", "//outside.example/mypage", "invalid"])("rejects unsafe returnTo %s throughout auth links", (destination) => {
  setup(`/signup?returnTo=${encodeURIComponent(destination)}`);
  expect(screen.getByRole("link", { name: "로그인으로 돌아가기" })).toHaveAttribute("href", "/login?returnTo=%2Fhome");
});

test("verification and resend share a lock; real failure allows retry and retains code", async () => {
  const first = deferred(); verifyEmailCodeApi.mockReturnValueOnce(first.promise).mockResolvedValueOnce({ verified: true });
  sendEmailCodeApi.mockResolvedValue({});
  setup("/verify-code?email=test%40example.com&returnTo=%2Fmypage");
  typeCode();
  fireEvent.click(screen.getByRole("button", { name: "확인", exact: true }));
  expect(screen.getByRole("button", { name: "인증번호 재발송" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 재발송" }));
  expect(sendEmailCodeApi).not.toHaveBeenCalled();
  await act(async () => first.reject({ response: { status: 400 } }));
  expect(screen.getByLabelText("1번째 인증번호")).toHaveValue("1");
  expect(screen.getByRole("button", { name: "확인", exact: true })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "확인", exact: true }));
  await screen.findByText("이메일 인증이 완료되었습니다.");
  expect(screen.getByRole("button", { name: "비밀번호 변경" })).toBeDisabled();
  expect(screen.getByLabelText("새 비밀번호", { exact: true })).toHaveFocus();
  expect(verifyEmailCodeApi).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId("location")).toHaveTextContent("/verify-code");
  expect(alert).not.toHaveBeenCalled();
});

const readyReset = async (path = "/verify-code?email=test%40example.com&returnTo=%2Fmypage") => {
  verifyEmailCodeApi.mockResolvedValue("인증 성공!");
  setup(path); typeCode("012345");
  fireEvent.click(screen.getByRole("button", { name: "확인", exact: true }));
  await screen.findByLabelText("새 비밀번호", { exact: true });
};
const typePassword = (password = "ValidPassword!") => {
  fireEvent.change(screen.getByLabelText("새 비밀번호", { exact: true }), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: password } });
};

test("verification then reset uses the same email, locks duplicate submits and returns to login", async () => {
  const result = deferred(); resetPasswordApi.mockReturnValue(result.promise);
  await readyReset(); typePassword();
  expect(verifyEmailCodeApi.mock.calls[0][0]).toEqual({ email: "test@example.com", code: "012345" });
  fireEvent.submit(screen.getByRole("form", { name: "비밀번호 재설정" }));
  fireEvent.submit(screen.getByRole("form", { name: "비밀번호 재설정" }));
  expect(resetPasswordApi).toHaveBeenCalledTimes(1);
  expect(resetPasswordApi.mock.calls[0][0]).toEqual({ email: "test@example.com", newPassword: "ValidPassword!" });
  expect(screen.getByRole("button", { name: "변경 중..." })).toBeDisabled();
  await act(async () => result.resolve("비밀번호가 변경되었습니다."));
  expect(screen.getByText("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.")).toBeInTheDocument();
  expect(screen.queryByLabelText("새 비밀번호", { exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("link", { name: "로그인으로 돌아가기" }));
  expect(screen.getByTestId("location")).toHaveTextContent("/login?returnTo=%2Fmypage");
  expect(loginApi).not.toHaveBeenCalled();
});

test("reset requires the shared policy and matching passwords, without requiring a digit", async () => {
  await readyReset(); typePassword("short");
  expect(screen.getByRole("button", { name: "비밀번호 변경" })).toBeDisabled();
  expect(screen.getByLabelText("새 비밀번호", { exact: true })).toHaveAttribute("aria-invalid", "true");
  typePassword("ValidPassword!");
  expect(screen.getByRole("button", { name: "비밀번호 변경" })).toBeEnabled();
  fireEvent.change(screen.getByLabelText("새 비밀번호 확인"), { target: { value: "different" } });
  expect(screen.getByRole("button", { name: "비밀번호 변경" })).toBeDisabled();
  expect(screen.getByLabelText("새 비밀번호 확인")).toHaveAccessibleDescription("비밀번호가 일치하지 않습니다.");
});

test("expired verification returns to email verification without claiming password success", async () => {
  resetPasswordApi.mockRejectedValue({ response: { status: 400, data: { message: "이메일 인증을 먼저 완료해주세요." } } });
  await readyReset(); typePassword();
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("인증번호를 다시 발송");
  expect(screen.getByLabelText("1번째 인증번호")).toHaveValue("");
  expect(screen.queryByLabelText("새 비밀번호", { exact: true })).not.toBeInTheDocument();
  expect(screen.queryByText("비밀번호가 변경되었습니다.")).not.toBeInTheDocument();
});

test("social account rejection explains the correct login method and keeps the password draft", async () => {
  resetPasswordApi.mockRejectedValue({ response: { status: 400, data: { message: "소셜 로그인 계정은 해당 로그인 제공자를 이용해주세요." } } });
  await readyReset(); typePassword();
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("카카오 또는 구글로 로그인");
  expect(screen.getByLabelText("새 비밀번호", { exact: true })).toHaveValue("ValidPassword!");
});

test("late reset completion cannot change another email's verification screen", async () => {
  const result = deferred(); resetPasswordApi.mockReturnValue(result.promise);
  await readyReset(); typePassword();
  fireEvent.click(screen.getByRole("button", { name: "비밀번호 변경" }));
  const options = resetPasswordApi.mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "다른 이메일 인증" }));
  await act(async () => result.resolve("비밀번호가 변경되었습니다."));
  expect(options.signal.aborted).toBe(true);
  expect(screen.getByLabelText("1번째 인증번호")).toHaveValue("");
  expect(screen.queryByText("비밀번호가 변경되었습니다.")).not.toBeInTheDocument();
});

test("resend failure retains code, success clears only its own current code", async () => {
  const first = deferred(); sendEmailCodeApi.mockReturnValueOnce(first.promise).mockResolvedValueOnce({});
  setup("/verify-code?email=test%40example.com"); typeCode();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 재발송" }));
  expect(screen.getByRole("button", { name: "확인", exact: true })).toBeDisabled();
  await act(async () => first.reject({ response: { status: 429 } }));
  expect(screen.getByLabelText("6번째 인증번호")).toHaveValue("6");
  fireEvent.click(screen.getByRole("button", { name: "인증번호 재발송" }));
  await screen.findByText("인증번호를 다시 발송했습니다.");
  expect(screen.getByLabelText("1번째 인증번호")).toHaveValue("");
  expect(screen.getByLabelText("1번째 인증번호")).toHaveFocus();
});

test.each(["verify", "resend"])("departed %s response cannot mutate a new verification entry", async (kind) => {
  const result = deferred();
  (kind === "verify" ? verifyEmailCodeApi : sendEmailCodeApi).mockReturnValue(result.promise);
  setup("/verify-code?email=test%40example.com"); typeCode();
  fireEvent.click(screen.getByRole("button", { name: kind === "verify" ? "확인" : "인증번호 재발송", exact: true }));
  const options = (kind === "verify" ? verifyEmailCodeApi : sendEmailCodeApi).mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "화면 떠나기" }));
  await act(async () => result.resolve({ verified: true }));
  expect(options.signal.aborted).toBe(true);
  expect(screen.getByTestId("location")).toHaveTextContent("/away");
  expect(alert).not.toHaveBeenCalled();
});

test("a late resend for the old email cannot clear code entered for the new email", async () => {
  const response = deferred(); sendEmailCodeApi.mockReturnValue(response.promise);
  setup("/verify-code?email=first%40example.com"); typeCode();
  fireEvent.click(screen.getByRole("button", { name: "인증번호 재발송" }));
  const options = sendEmailCodeApi.mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "다른 이메일 인증" }));
  expect(screen.getByLabelText("1번째 인증번호")).toHaveValue("");
  typeCode("654321");
  await act(async () => response.resolve({}));
  expect(options.signal.aborted).toBe(true);
  expect(screen.getByLabelText("1번째 인증번호")).toHaveValue("6");
  expect(screen.getByLabelText("6번째 인증번호")).toHaveValue("1");
  expect(screen.queryByText("인증번호를 다시 발송했습니다.")).not.toBeInTheDocument();
});

test("unprovided expiry is not reset to a fabricated five minutes on a revisit", () => {
  const { unmount } = setup("/verify-code?email=test%40example.com");
  expect(screen.queryByText("05:00")).not.toBeInTheDocument();
  unmount(); setup("/verify-code?email=test%40example.com");
  expect(screen.queryByText("05:00")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "인증번호 재발송" })).toBeEnabled();
});

test("signup consent toggles both ways; opening and closing unavailable documents leaves it unchanged", async () => {
  sendEmailCodeApi.mockResolvedValue({}); verifyEmailCodeApi.mockResolvedValue({ verified: true });
  setup("/signup?returnTo=%2Fmypage");
  fireEvent.change(screen.getByLabelText("이름"), { target: { value: "Tester" } });
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await screen.findByText("인증번호가 발송되었습니다. 이메일을 확인해주세요.");
  fireEvent.change(screen.getByLabelText("이메일 인증번호"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "인증 확인" }));
  await screen.findByText("이메일 인증이 완료되었습니다.");
  fireEvent.change(screen.getByLabelText("비밀번호", { exact: true }), { target: { value: "ValidPass!10" } });
  fireEvent.change(screen.getByLabelText("비밀번호 확인", { exact: true }), { target: { value: "ValidPass!10" } });
  const checkbox = screen.getByRole("checkbox", { name: "이용약관 및 개인정보 처리방침에 동의합니다." });
  fireEvent.click(checkbox); expect(checkbox).toBeChecked();
  expect(screen.getByRole("button", { name: "회원가입 하기" })).toBeEnabled();
  screen.getByRole("button", { name: "문서 보기" }).focus();
  fireEvent.click(screen.getByRole("button", { name: "문서 보기" }));
  expect(screen.getByRole("dialog")).toHaveAccessibleName("이용약관 및 개인정보 처리방침");
  expect(screen.queryByText(/공시일자/)).not.toBeInTheDocument();
  expect(screen.queryByText(/위치기반서비스/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "닫기", exact: true }));
  expect(checkbox).toBeChecked();
  await waitFor(() => expect(screen.getByRole("button", { name: "문서 보기" })).toHaveFocus());
  fireEvent.click(checkbox); expect(checkbox).not.toBeChecked();
  expect(screen.getByRole("button", { name: "회원가입 하기" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "문서 보기" }));
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(checkbox).not.toBeChecked();
});

test("signup completion returns to login with the original destination", async () => {
  sendEmailCodeApi.mockResolvedValue({}); verifyEmailCodeApi.mockResolvedValue({ verified: true }); signupApi.mockResolvedValue({});
  setup("/signup?returnTo=%2Fmypage");
  fireEvent.change(screen.getByLabelText("이름"), { target: { value: "Tester" } });
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await screen.findByText("인증번호가 발송되었습니다. 이메일을 확인해주세요.");
  fireEvent.change(screen.getByLabelText("이메일 인증번호"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "인증 확인" }));
  await screen.findByText("이메일 인증이 완료되었습니다.");
  fireEvent.change(screen.getByLabelText("비밀번호", { exact: true }), { target: { value: "ValidPass!10" } });
  fireEvent.change(screen.getByLabelText("비밀번호 확인", { exact: true }), { target: { value: "ValidPass!10" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "이용약관 및 개인정보 처리방침에 동의합니다." }));
  fireEvent.click(screen.getByRole("button", { name: "회원가입 하기" }));
  fireEvent.click(await screen.findByRole("button", { name: /로그인하러 가기/ }));
  expect(screen.getByTestId("location")).toHaveTextContent("/login?returnTo=%2Fmypage");
});

const readySignup = async () => {
  sendEmailCodeApi.mockResolvedValue({}); verifyEmailCodeApi.mockResolvedValue({ verified: true });
  setup("/signup");
  fireEvent.change(screen.getByLabelText("이름"), { target: { value: "Tester" } });
  fireEvent.change(screen.getByLabelText("이메일 (아이디)"), { target: { value: "test@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await screen.findByText("인증번호가 발송되었습니다. 이메일을 확인해주세요.");
  fireEvent.change(screen.getByLabelText("이메일 인증번호"), { target: { value: "123456" } });
  fireEvent.click(screen.getByRole("button", { name: "인증 확인" }));
  await screen.findByText("이메일 인증이 완료되었습니다.");
  fireEvent.change(screen.getByLabelText("비밀번호", { exact: true }), { target: { value: "ValidPass!10" } });
  fireEvent.change(screen.getByLabelText("비밀번호 확인", { exact: true }), { target: { value: "ValidPass!10" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "이용약관 및 개인정보 처리방침에 동의합니다." }));
};

test("already registered email is explained without losing entered values", async () => {
  signupApi.mockRejectedValue({ response: { status: 400, data: { message: "이미 존재하는 이메일입니다." } } });
  await readySignup();
  fireEvent.click(screen.getByRole("button", { name: "회원가입 하기" }));
  await waitFor(() => expect(alert).toHaveBeenLastCalledWith("이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용해주세요."));
  expect(screen.getByLabelText("이메일 (아이디)")).toHaveValue("test@example.com");
  expect(screen.getByLabelText("비밀번호", { exact: true })).toHaveValue("ValidPass!10");
  expect(screen.getByRole("button", { name: "회원가입 하기" })).toBeEnabled();
  expect(screen.queryByText("회원가입이 완료되었습니다!")).not.toBeInTheDocument();
});

test("server rejection of verification clears stale success and requires a new email challenge", async () => {
  signupApi.mockRejectedValue({ response: { status: 400, data: { message: "이메일 인증(6자리)을 먼저 완료해주세요." } } });
  await readySignup();
  fireEvent.click(screen.getByRole("button", { name: "회원가입 하기" }));
  await waitFor(() => expect(alert).toHaveBeenLastCalledWith("이메일 인증을 서버에서 확인하지 못했습니다. 인증번호를 다시 발송해 인증해주세요."));
  expect(screen.queryByText("이메일 인증이 완료되었습니다.")).not.toBeInTheDocument();
  expect(screen.getByLabelText("이메일 인증번호")).toHaveValue("");
  expect(screen.getByRole("button", { name: "인증 확인" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "회원가입 하기" })).toBeDisabled();
  expect(screen.getByLabelText("이메일 (아이디)")).toHaveValue("test@example.com");
});

test("password failures are explained next to the input without weakening existing policy", () => {
  setup("/signup");
  const input = screen.getByLabelText("비밀번호", { exact: true });
  fireEvent.change(input, { target: { value: "short" } });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription(/10자 이상 입력해 주세요.*영문 대문자.*특수문자/);
  fireEvent.change(input, { target: { value: "ValidPass!10" } });
  expect(input).toHaveAttribute("aria-invalid", "false");
  fireEvent.change(screen.getByLabelText("비밀번호 확인", { exact: true }), { target: { value: "different" } });
  expect(screen.getByLabelText("비밀번호 확인", { exact: true })).toHaveAccessibleDescription("비밀번호가 일치하지 않습니다.");
});

test("StrictMode OAuth uses single-use state once, sends once and aborts departed completion", async () => {
  beginOAuth("google", "https://accounts.google.com/authorize?state=test-state", "test-state");
  saveSocialLoginReturnPath("/mypage");
  const result = deferred(); completeSocialLoginApi.mockReturnValue(result.promise);
  setup("/oauth/google/callback?code=test-code&state=test-state", true);
  await waitFor(() => expect(completeSocialLoginApi).toHaveBeenCalledTimes(1));
  const options = completeSocialLoginApi.mock.calls[0][1];
  fireEvent.click(screen.getByRole("button", { name: "화면 떠나기" }));
  await act(async () => result.resolve({}));
  expect(options.signal.aborted).toBe(true);
  expect(screen.getByTestId("location")).toHaveTextContent("/away");
});

test("current StrictMode OAuth completion honors safe original destination", async () => {
  beginOAuth("kakao", "https://kauth.kakao.com/authorize?state=test-state", "test-state");
  saveSocialLoginReturnPath("/mypage"); completeSocialLoginApi.mockResolvedValue({});
  setup("/oauth/kakao/callback?code=test-code&state=test-state", true);
  await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/mypage"));
  expect(completeSocialLoginApi).toHaveBeenCalledTimes(1);
});
