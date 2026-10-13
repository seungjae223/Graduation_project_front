const SIGNUP_FAILURES = new Map([
  ["이메일 인증(6자리)을 먼저 완료해주세요.", {
    reason: "email_verification", message: "이메일 인증을 서버에서 확인하지 못했습니다. 인증번호를 다시 발송해 인증해주세요.",
  }],
  ["이미 존재하는 이메일입니다.", {
    reason: "email_exists", message: "이미 가입된 이메일입니다. 로그인하거나 다른 이메일을 사용해주세요.",
  }],
  ["비밀번호는 10자리 이상, 대소문자, 특수기호를 포함해야 합니다.", {
    reason: "password_policy", message: "비밀번호는 10자 이상이며 영문 대문자·소문자와 특수문자(@$!%*?&#~)를 포함해야 합니다.",
  }],
  ["이메일을 입력해주세요.", {
    reason: "email_required", message: "이메일 주소를 입력해주세요.",
  }],
]);

// Only known public validation messages are displayed; other server details stay hidden.
export function getSignupFailure(error) {
  if (Number(error?.response?.status) !== 400) return null;
  return SIGNUP_FAILURES.get(error?.response?.data?.message) || null;
}
