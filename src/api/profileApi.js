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

export async function updateMyNicknameApi(nickname) {
  if (typeof nickname !== "string" || nickname.trim().length < 2 ||
      nickname.trim().length > 20) {
    throw new Error("닉네임은 2~20자로 입력해 주세요.");
  }
  const response = await api.patch("/api/mypage/profile", { nickname: nickname.trim() });
  return normalizeMyProfile(response.data);
}

export async function changeMyPasswordApi({ currentPassword, newPassword }) {
  if (!currentPassword || typeof currentPassword !== "string" ||
      typeof newPassword !== "string") {
    throw new Error("현재 비밀번호와 새 비밀번호를 입력해 주세요.");
  }
  const response = await api.patch("/api/mypage/password", { currentPassword, newPassword });
  if (response.data !== "비밀번호가 변경되었습니다.") {
    throw new Error("비밀번호 변경 결과를 확인하지 못했어요. 다시 요청하기 전에 재로그인을 확인해 주세요.");
  }
  return response.data;
}
