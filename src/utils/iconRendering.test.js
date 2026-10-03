const fs = require("fs");
const path = require("path");

const read = (file) => fs.readFileSync(path.resolve(process.cwd(), "src", file), "utf8");
const rule = (file, selector) => read(file).split(`${selector} {`)[1].split("}")[0];

test("route search preserves the padded asset ratio without changing its anchor", () => {
  const css = rule("RouteCreate/RouteCreate.css", ".route-search-icon");
  expect(css).toMatch(/width:\s*auto;/);
  expect(css).toMatch(/height:\s*18px;/);
  expect(css).toMatch(/left:\s*16px;/);
  expect(css).toMatch(/object-fit:\s*contain;/);
  expect(css).toMatch(/max-width:\s*none;/);
});

test("password help preserves the original ratio inside the unchanged icon box", () => {
  const css = rule("Login/FindPassword.css", ".find-password-help img");
  expect(css).toMatch(/width:\s*13px;/);
  expect(css).toMatch(/height:\s*13px;/);
  expect(css).toMatch(/object-fit:\s*contain;/);
  expect(css).toMatch(/flex-shrink:\s*0;/);
});
