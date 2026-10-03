const fs = require("fs");
const path = require("path");
const vm = require("vm");
const publicDir = path.resolve(process.cwd(), "public");
test.each(["dark", "light", null])("theme initializes synchronously: %s", (saved) => {
  const document = { documentElement: { dataset: {}, style: {} } };
  vm.runInNewContext(fs.readFileSync(path.join(publicDir, "theme-init.js"), "utf8"), {
    document, localStorage: { getItem: () => saved }, window: { matchMedia: () => ({matches:true}) },
  });
  expect(document.documentElement.dataset.theme).toBe(saved || "dark");
  expect(document.documentElement.style.colorScheme).toBe(saved || "dark");
});
test("security headers and original SPA fallback are retained", () => {
  const headers = fs.readFileSync(path.join(publicDir, "_headers"), "utf8");
  expect(headers).toContain("frame-ancestors 'none'");
  expect(headers).toContain("X-Content-Type-Options: nosniff");
  expect(headers).toContain("geolocation=(self)");
  expect(headers).not.toContain("unsafe-eval");
  expect(fs.readFileSync(path.join(publicDir, "_redirects"), "utf8")).toMatch(/\/\*\s+\/index.html\s+200/);
});
