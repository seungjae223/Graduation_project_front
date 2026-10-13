import api from "./api";
import { getMyProfileApi } from "./profileApi";
import { loginApi, resetPasswordApi, sendEmailCodeApi, signupApi, verifyEmailCodeApi } from "./authApi";
import { resetMockData } from "../mocks/mockAdapter";
import { getPasswordResetFailure } from "../utils/passwordResetError";

jest.mock("../config/mockConfig", () => ({ USE_MOCK: true }));
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetMockData(); });

test("reset requires verification, consumes it once and permits login with only the new password", async () => {
  const email = "reset-flow@example.com";
  await signupApi({ email, nickname: "비밀번호 찾는 사용자", password: "OriginalPassword!" });
  await expect(resetPasswordApi({ email, newPassword: "NewPassword!" })).rejects.toMatchObject({ response: { status: 400 } });
  await sendEmailCodeApi(email);
  await verifyEmailCodeApi({ email, code: "012345" });
  await expect(resetPasswordApi({ email, newPassword: "NewPassword!" })).resolves.toBe("비밀번호가 변경되었습니다.");
  await expect(resetPasswordApi({ email, newPassword: "AnotherPassword!" })).rejects.toMatchObject({ response: { data: { message: "이메일 인증을 먼저 완료해주세요." } } });
  await expect(loginApi({ email, password: "OriginalPassword!" })).rejects.toMatchObject({ response: { status: 400 } });
  await loginApi({ email, password: "NewPassword!" });
  await expect(getMyProfileApi()).resolves.toEqual({ nickname: "비밀번호 찾는 사용자", email, emailAvailable: true, provider: "LOCAL" });
});

test("password policy failure does not consume email verification", async () => {
  const email = "reset-policy@example.com";
  await signupApi({ email, nickname: "사용자", password: "OriginalPassword!" });
  await verifyEmailCodeApi({ email, code: "123456" });
  await expect(resetPasswordApi({ email, newPassword: "short" })).rejects.toMatchObject({ response: { status: 400 } });
  await expect(resetPasswordApi({ email, newPassword: "ValidPassword!" })).resolves.toBe("비밀번호가 변경되었습니다.");
});

test("resending invalidates earlier verification", async () => {
  const email = "reset-resend@example.com";
  await verifyEmailCodeApi({ email, code: "123456" });
  await sendEmailCodeApi(email);
  await expect(api.patch("/api/auth/password/reset", { email, newPassword: "ValidPassword!" })).rejects.toMatchObject({ response: { data: { message: "이메일 인증을 먼저 완료해주세요." } } });
});

test("only documented reset messages are displayed", () => {
  const error = message => ({ response: { status: 400, data: { message } } });
  expect(getPasswordResetFailure(error("이메일 인증을 먼저 완료해주세요."))?.reason).toBe("email_verification");
  expect(getPasswordResetFailure(error("가입된 사용자를 찾을 수 없습니다."))?.reason).toBe("account_missing");
  expect(getPasswordResetFailure(error("소셜 로그인 계정은 해당 로그인 제공자를 이용해주세요."))?.reason).toBe("social_account");
  expect(getPasswordResetFailure(error("소셜 로그인 계정은 해당 로그인 제공자를 이용해주세요. SQL secret"))).toBeNull();
});
