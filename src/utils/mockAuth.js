const USERS_KEY = "mock_users";
const AUTH_KEY = "mock_current_user";

const ADMIN_ACCOUNT = {
  id: "admin001",
  name: "관리자",
  email: "admin@naver.com",
  password: "admin1234",
  role: "admin",
  phone: "",
};

const normalizeEmail = (email = "") => email.trim().toLowerCase();
const normalizeInput = (value = "") => String(value).trim().toLowerCase();

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

const saveAuthUser = (user, remember) => {
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);

  if (remember) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
  }
};

export const registerMockUser = (form) => {
  const users = readUsers();

  const email = normalizeEmail(form.email);
  const phone = (form.phone || "").trim();

  if (email === normalizeEmail(ADMIN_ACCOUNT.email)) {
    return {
      ok: false,
      message: "이 이메일은 사용할 수 없습니다.",
    };
  }

  const exists = users.some((user) => normalizeEmail(user.email) === email);

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
    role: "user",
    createdAt: new Date().toISOString(),
  };

  saveUsers([...users, newUser]);

  return {
    ok: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
    },
  };
};

export const loginMockUser = ({
  email,
  password,
  rememberMe,
  keepLogin,
}) => {
  const users = readUsers();
  const normalizedInput = normalizeInput(email);
  const remember = typeof rememberMe === "boolean" ? rememberMe : !!keepLogin;

  if (
    (normalizedInput === normalizeInput(ADMIN_ACCOUNT.email) ||
      normalizedInput === normalizeInput(ADMIN_ACCOUNT.id)) &&
    password === ADMIN_ACCOUNT.password
  ) {
    const safeAdmin = {
      id: ADMIN_ACCOUNT.id,
      name: ADMIN_ACCOUNT.name,
      email: ADMIN_ACCOUNT.email,
      phone: ADMIN_ACCOUNT.phone,
      role: ADMIN_ACCOUNT.role,
    };

    saveAuthUser(safeAdmin, remember);

    return {
      ok: true,
      user: safeAdmin,
    };
  }

  const matchedUser = users.find(
    (user) =>
      (normalizeInput(user.email) === normalizedInput ||
        normalizeInput(user.id) === normalizedInput) &&
      user.password === password
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
    phone: matchedUser.phone || "",
    role: matchedUser.role || "user",
  };

  saveAuthUser(safeUser, remember);

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

export const isAdminUser = () => {
  const currentUser = getMockCurrentUser();
  return currentUser?.role === "admin";
};

export const getAdminMockAccount = () => {
  return {
    id: ADMIN_ACCOUNT.id,
    email: ADMIN_ACCOUNT.email,
    password: ADMIN_ACCOUNT.password,
  };
};