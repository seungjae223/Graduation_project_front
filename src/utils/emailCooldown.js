export const EMAIL_RESEND_SECONDS = 60;

// Accept only the public cooldown message defined by the email service.
export function getEmailRetrySeconds(error) {
  if (Number(error?.response?.status) !== 400) return 0;
  const message = error?.response?.data?.message;
  if (typeof message !== "string") return 0;
  const match = message.match(/^인증번호는 ([1-9]|[1-5][0-9]|60)초 후 다시 요청할 수 있습니다\.$/);
  return match ? Number(match[1]) : 0;
}
