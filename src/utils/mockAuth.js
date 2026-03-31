const USERS_KEY = "mock_users";
const AUTH_KEY = "mock_current_user";

const readUsers = () => {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch (error) {
    return [];
  }
};

const saveUsers = (users) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const registerMockUser = (form) => {
  const users = readUsers();

  const email = form.email.trim().toLowerCase();
  const phone = form.phone.trim();

  const exists = users.some((user) => user.email === email);

  if (exists) {
    return {
      ok: false,
      message: "이미 가입된 이메일입니다.",
    };
  }

  const newUser = {
    id: Date.now().toString(),
    name: form.name.trim(),
    email,
    phone,
    password: form.password,
    createdAt: new Date().toISOString(),
  };

  saveUsers([...users, newUser]);

  return {
    ok: true,
    user: newUser,
  };
};

export const loginMockUser = ({ email, password, rememberMe }) => {
  const users = readUsers();
  const normalizedEmail = email.trim().toLowerCase();

  const matchedUser = users.find(
    (user) => user.email === normalizedEmail && user.password === password
  );

  if (!matchedUser) {
    return {
      ok: false,
      message: "이메일 또는 비밀번호가 올바르지 않습니다.",
    };
  }

  const safeUser = {
    id: matchedUser.id,
    name: matchedUser.name,
    email: matchedUser.email,
    phone: matchedUser.phone,
  };

  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);

  if (rememberMe) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
  } else {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
  }

  return {
    ok: true,
    user: safeUser,
  };
};

export const getMockCurrentUser = () => {
  try {
    const localUser = localStorage.getItem(AUTH_KEY);
    if (localUser) return JSON.parse(localUser);

    const sessionUser = sessionStorage.getItem(AUTH_KEY);
    if (sessionUser) return JSON.parse(sessionUser);

    return null;
  } catch (error) {
    return null;
  }
};

export const logoutMockUser = () => {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
};

export const getMockUsers = () => {
  return readUsers();
};