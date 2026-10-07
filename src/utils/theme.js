export const THEME_STORAGE_KEY = "site-theme";

export const normalizeTheme = (value) =>
  value === "dark" || value === "light" ? value : "light";

export const getStoredTheme = () => {
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
  } catch (error) {
    return "light";
  }
};

export const applyTheme = (value) => {
  const theme = normalizeTheme(value);
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  return theme;
};

export const saveTheme = (value) => {
  const theme = applyTheme(value);

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // The selected theme still applies for this page when storage is blocked.
  }

  return theme;
};
