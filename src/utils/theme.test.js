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
  ["dark", "dark"],
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

test("saved app theme wins regardless of the mocked OS theme", () => {
  window.matchMedia = jest.fn(() => ({ matches: false }));
  localStorage.setItem(THEME_STORAGE_KEY, "dark");
  expect(getStoredTheme()).toBe("dark");
  expect(window.matchMedia).not.toHaveBeenCalled();
});

test("saveTheme persists and applies one normalized theme", () => {
  expect(saveTheme("dark")).toBe("dark");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(document.documentElement.style.colorScheme).toBe("dark");

  expect(applyTheme("invalid")).toBe("light");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.style.colorScheme).toBe("light");
});
