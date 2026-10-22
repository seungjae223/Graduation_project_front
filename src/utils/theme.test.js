import {
  applyTheme,
  getStoredTheme,
  normalizeTheme,
  saveTheme,
  THEME_STORAGE_KEY,
} from "./theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.style.colorScheme = "";
});

test.each([
  ["light", "light"],
  ["dark", "light"],
  [null, "light"],
  ["", "light"],
  ["abc", "light"],
])("normalizes %p to %s", (value, expected) => {
  expect(normalizeTheme(value)).toBe(expected);
});

test("a missing saved theme always defaults to light without consulting the OS", () => {
  window.matchMedia = jest.fn(() => ({ matches: true }));
  expect(getStoredTheme()).toBe("light");
  expect(window.matchMedia).not.toHaveBeenCalled();
});

test("a legacy dark preference cannot reactivate the removed mode", () => {
  window.matchMedia = jest.fn(() => ({ matches: false }));
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  expect(getStoredTheme()).toBe("light");
  expect(window.matchMedia).not.toHaveBeenCalled();
});

test("older theme callers clear the legacy preference and keep light", () => {
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  expect(saveTheme("dark")).toBe("light");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.style.colorScheme).toBe("light");

  expect(applyTheme("invalid")).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.style.colorScheme).toBe("light");
});
