// Signup and password reset share the server's published password policy.
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[@$!%*?&#~]).{10,}$/;
export const PASSWORD_HELP = "10자 이상, 영문 대문자·소문자와 특수문자(@$!%*?&#~)를 각각 1개 이상 포함해 주세요.";

export function getPasswordIssues(value) {
  const issues = [];
  if (value.length < 10) issues.push("10자 이상 입력해 주세요.");
  if (!/[A-Z]/.test(value)) issues.push("영문 대문자를 포함해 주세요.");
  if (!/[a-z]/.test(value)) issues.push("영문 소문자를 포함해 주세요.");
  if (!/[@$!%*?&#~]/.test(value)) issues.push("특수문자(@$!%*?&#~) 중 하나를 포함해 주세요.");
  if (/[\r\n]/.test(value)) issues.push("줄바꿈을 제거해 주세요.");
  return issues;
}
