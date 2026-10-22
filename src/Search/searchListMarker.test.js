import fs from "fs";
import path from "path";

// Regression for the native <ul>/<li> bullet that leaked into search cards.
// The selector must stand alone: DestinationExplore styles may not be loaded.
test("search result cards reset browser list bullets without relying on other routes", () => {
  const css = fs.readFileSync(path.join(__dirname, "Search.css"), "utf8");
  expect(css).toMatch(/\.search-page\s+\.search-results-list\s*\{[^}]*list-style:\s*none;[^}]*margin:\s*0;[^}]*padding:\s*0;/s);
  expect(css).toMatch(/\.search-page\s+\.search-results-list\s*>\s*li\s*\{[^}]*list-style:\s*none;/s);
});
