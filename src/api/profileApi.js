import api from "./api";

export function normalizeMyProfile(data) {
  if (!data || typeof data !== "object" || Array.isArray(data) ||
      typeof data.nickname !== "string" || typeof data.emailAvailable !== "boolean" ||
      !["LOCAL", "KAKAO", "GOOGLE"].includes(data.provider) ||
      (data.emailAvailable && (typeof data.email !== "string" || !data.email.trim()))) {
    throw new Error("프로필 응답을 확인할 수 없습니다.");
  }
  const email = typeof data.email === "string" ? data.email.trim() : "";
  const emailAvailable = data.emailAvailable && !/@nomango\.local$/i.test(email);
  return {
    nickname: data.nickname.trim(),
    email: emailAvailable ? email : null,
    emailAvailable,
    provider: data.provider,
  };
}

export async function getMyProfileApi({ signal } = {}) {
  const response = await api.get("/api/mypage/profile", signal ? { signal } : undefined);
  return normalizeMyProfile(response.data);
}
