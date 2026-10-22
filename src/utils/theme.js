export const THEME_STORAGE_KEY = "site-theme";

// Compatibility for older callers: the application now only supports light.
export const normalizeTheme = () => "light";

export const getStoredTheme = () => "light";

export const applyTheme = () => {
  const theme = "light";
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  return theme;
};

export const saveTheme = () => {
  const theme = applyTheme();

  try {
    window.localStorage.removeItem(THEME_STORAGE_KEY);
  } catch (error) {
    // Light still applies when browser storage is blocked.
  }

  return theme;
};
