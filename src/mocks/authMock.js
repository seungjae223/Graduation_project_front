export const MOCK_SESSION_KEY = "mock_auth_session";
const accounts = new Map();
const testUser = { id: 1, name: "테스트 사용자", nickname: "테스트 사용자", username: "테스트 사용자", email: "test@example.com", role: "USER" };

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
export function loginMock({ email = testUser.email, keepLogin = true } = {}) {
  const user = accounts.get(email) || { ...testUser, email };
  // A demo credential is only read in Mock mode, never stored in accessToken.
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ ...user, sub: `mock:${email}`, nonce: `${Date.now()}-${Math.random()}` }))));
  const token = `mock.${payload}.demo`;
  clearMockSession();
  (keepLogin ? localStorage : sessionStorage).setItem(MOCK_SESSION_KEY, JSON.stringify({ token, user }));
  return { token, message: "로그인되었습니다.", email, nickname: user.nickname, user };
}
