import { PASSWORD_PATTERN } from "../Login/passwordValidation";

export const MOCK_SESSION_KEY = "mock_auth_session";
const accounts = new Map();
const resetPasswords = new Map();
const testUser = { id: 1, name: "테스트 사용자", nickname: "테스트 사용자", username: "테스트 사용자", email: "test@example.com", role: "USER", provider: "LOCAL" };

export function readMockSession() {
  for (const storage of [localStorage, sessionStorage]) {
    try {
      const session = JSON.parse(storage.getItem(MOCK_SESSION_KEY));
      if (session?.token && session?.user?.email) return session;
    } catch { /* Ignore invalid demo sessions. */ }
  }
  return null;
}

export const getMockUser = () => readMockSession()?.user || null;
export function clearMockSession() {
  localStorage.removeItem(MOCK_SESSION_KEY);
  sessionStorage.removeItem(MOCK_SESSION_KEY);
}
export function saveMockUser(user) {
  const session = readMockSession();
  if (!session) return;
  const storage = localStorage.getItem(MOCK_SESSION_KEY) ? localStorage : sessionStorage;
  storage.setItem(MOCK_SESSION_KEY, JSON.stringify({ ...session, user }));
}
export function signupMock({ email, nickname }) {
  const user = { ...testUser, email, name: nickname, nickname, username: nickname };
  accounts.set(email, user);
  return { message: "회원가입이 완료되었습니다." };
}
export function loginMock({ email = testUser.email, password, keepLogin = true, provider = "LOCAL" } = {}) {
  if (resetPasswords.has(email) && resetPasswords.get(email) !== password) {
    const error = new Error("비밀번호가 일치하지 않습니다.");
    error.response = { status: 400, data: { message: error.message } };
    throw error;
  }
  const user = accounts.get(email) || { ...testUser, email, provider };
  // A demo credential is only read in Mock mode, never stored in accessToken.
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ ...user, sub: `mock:${email}`, nonce: `${Date.now()}-${Math.random()}` }))));
  const token = `mock.${payload}.demo`;
  clearMockSession();
  (keepLogin ? localStorage : sessionStorage).setItem(MOCK_SESSION_KEY, JSON.stringify({ token, user }));
  return { token, message: "로그인되었습니다.", email, nickname: user.nickname, user };
}

export function resetPasswordMock({ email, newPassword }) {
  const user = accounts.get(email) || (email === testUser.email ? testUser : null);
  const reject = message => { throw Object.assign(new Error(message), { status: 400 }); };
  if (!user) reject("가입된 사용자를 찾을 수 없습니다.");
  if ((user.provider || "LOCAL") !== "LOCAL") reject("소셜 로그인 계정은 해당 로그인 제공자를 이용해주세요.");
  if (typeof newPassword !== "string" || !PASSWORD_PATTERN.test(newPassword)) reject("비밀번호는 10자리 이상, 대소문자, 특수기호를 포함해야 합니다.");
  resetPasswords.set(email, newPassword);
  return "비밀번호가 변경되었습니다.";
}
