const DEFAULT_AFTER_LOGIN_PATH = "/home";

export const isSafeInternalPath = (value) => {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return false;
  }

  try {
    const resolvedUrl = new URL(value, window.location.origin);
    return resolvedUrl.origin === window.location.origin;
  } catch {
    return false;
  }
};

export const getCurrentReturnPath = () => {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  return isSafeInternalPath(currentPath) ? currentPath : DEFAULT_AFTER_LOGIN_PATH;
};

export const buildLoginPath = (returnPath = getCurrentReturnPath()) => {
  if (!isSafeInternalPath(returnPath) || returnPath.startsWith("/login")) {
    return "/login";
  }

  return `/login?returnTo=${encodeURIComponent(returnPath)}`;
};

export const getReturnPathFromSearch = (search) => {
  const returnPath = new URLSearchParams(search).get("returnTo");
  return isSafeInternalPath(returnPath) ? returnPath : DEFAULT_AFTER_LOGIN_PATH;
};

export const saveSocialLoginReturnPath = (returnPath) => {
  const safePath = isSafeInternalPath(returnPath)
    ? returnPath
    : DEFAULT_AFTER_LOGIN_PATH;

  try {
    sessionStorage.setItem("socialLoginReturnTo", safePath);
  } catch {
    // 저장소가 차단된 환경에서는 기본 로그인 완료 화면으로 이동한다.
  }
};

export const getSocialLoginReturnPath = ({ consume = false } = {}) => {
  try {
    const savedPath = sessionStorage.getItem("socialLoginReturnTo");

    if (consume) {
      sessionStorage.removeItem("socialLoginReturnTo");
    }

    return isSafeInternalPath(savedPath) ? savedPath : DEFAULT_AFTER_LOGIN_PATH;
  } catch {
    return DEFAULT_AFTER_LOGIN_PATH;
  }
};
