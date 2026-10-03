const fs = require("fs");
const path = require("path");
const css = (file) => fs.readFileSync(path.resolve(process.cwd(), "src", file), "utf8");
const rule = (file, selector) => css(file).split(`${selector} {`)[1].split("}")[0];

test("search dialog lets its input shrink while preserving the original SVG size", () => {
  expect(rule("SearchPopup/SearchPop.css", ".search-pop-input")).toMatch(/min-width:\s*0;/);
  expect(rule("SearchPopup/SearchPop.css", ".search-pop-search-box > svg")).toMatch(/flex-shrink:\s*0;/);
});

test("verification email wraps and the submit action retains a minimum gap", () => {
  expect(rule("Login/VerifyCode.css", ".verify-code-desc span")).toMatch(/overflow-wrap:\s*anywhere;/);
  expect(rule("Login/VerifyCode.css", ".verify-code-bottom")).toMatch(/padding-top:\s*24px;/);
});

test("service feature icons keep their box while adjacent copy can reflow", () => {
  expect(rule("Landingpage/Landing.css", ".landing .feature .icon-box")).toMatch(/flex-shrink:\s*0;/);
  expect(rule("Landingpage/Landing.css", ".landing .feature .card > div:not(.icon-box)")).toMatch(/min-width:\s*0;/);
});
