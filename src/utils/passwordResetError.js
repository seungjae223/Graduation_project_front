const FAILURES = new Map([
  ["이메일을 입력해주세요.", { reason: "email_required", message: "이메일 주소를 입력해주세요." }],
  ["이메일 인증을 먼저 완료해주세요.", {
    reason: "email_verification", message: "이메일 인증이 만료되었거나 이미 사용되었습니다. 인증번호를 다시 발송해 인증해주세요.",
  }],
  ["가입된 사용자를 찾을 수 없습니다.", { reason: "account_missing", message: "가입된 사용자를 찾을 수 없습니다. 이메일 주소를 확인해주세요." }],
  ["소셜 로그인 계정은 해당 로그인 제공자를 이용해주세요.", {
    reason: "social_account", message: "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다. 카카오 또는 구글로 로그인해주세요.",
  }],
  ["비밀번호는 10자리 이상, 대소문자, 특수기호를 포함해야 합니다.", {
    reason: "password_policy", message: "비밀번호는 10자 이상이며 영문 대문자·소문자와 특수문자(@$!%*?&#~)를 포함해야 합니다.",
  }],
]);

export function getPasswordResetFailure(error) {
  if (Number(error?.response?.status) !== 400) return null;
  return FAILURES.get(error?.response?.data?.message) || null;
}
