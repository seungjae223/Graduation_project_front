const fs = require("fs");
const path = require("path");
const vm = require("vm");
const publicDir = path.resolve(process.cwd(), "public");
test.each([
  ["dark", "light"],
  ["light", "light"],
  [null, "light"],
  ["", "light"],
  ["abc", "light"],
])("first paint stays light with legacy stored value %p", (saved, expected) => {
  const document = { documentElement: { dataset: {}, style: {} } };
  const removeItem = jest.fn();
  vm.runInNewContext(fs.readFileSync(path.join(publicDir, "theme-init.js"), "utf8"), {
    document,
    localStorage: { getItem: () => saved, removeItem },
    window: { matchMedia: () => { throw new Error("system theme must not be read"); } },
  });
  expect(document.documentElement.dataset.theme).toBe(expected);
  expect(document.documentElement.style.colorScheme).toBe(expected);
  expect(removeItem).toHaveBeenCalledWith("site-theme");
});

test("first paint stays light even when storage is blocked", () => {
  const document = { documentElement: { dataset: {}, style: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(publicDir, "theme-init.js"), "utf8"), {
    document,
    localStorage: { removeItem: () => { throw new Error("storage blocked"); } },
  });
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.documentElement.style.colorScheme).toBe("light");
});
test("security headers and original SPA fallback are retained", () => {
  const headers = fs.readFileSync(path.join(publicDir, "_headers"), "utf8");
  expect(headers).toContain("frame-ancestors 'none'");
  expect(headers).toContain("X-Content-Type-Options: nosniff");
  expect(headers).toContain("geolocation=(self)");
  expect(headers).not.toContain("unsafe-eval");
  expect(fs.readFileSync(path.join(publicDir, "_redirects"), "utf8")).toMatch(/\/\*\s+\/index.html\s+200/);
});
