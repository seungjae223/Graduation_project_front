import fs from "fs";
import path from "path";
import { filterSearchPlaces, getSearchRegions, requireSearchPlaces } from "./searchCatalog";

test("duplicates share one displayed region while keeping exact server strings", () => {
  const regions = getSearchRegions([{ region: "서울" }, { region: " 서울 " }, { region: "서울" }, { region: null }, { region: " " }]);
  expect(regions).toEqual([{ name: "서울", values: ["서울", " 서울 "] }]);
  expect(filterSearchPlaces([{ region: "서울" }, { region: " 서울 " }, { region: "서울특별시" }], "한국", regions[0])).toHaveLength(2);
});

test.each([null, "<html>login</html>", [{ id: 1, name: "" }], [{ id: 1, name: "a" }, { id: 1, name: "b" }],
  [{ id: 1, name: "a", region: {} }], [{ id: 1, name: "a", address: [] }]])("invalid full results cannot produce a made-up page count", places => {
  expect(() => requireSearchPlaces(places)).toThrow("장소 조회 응답");
});

test("region names such as object prototype keys stay ordinary data", () => {
  expect(getSearchRegions([{ region: "constructor" }, { region: "__proto__" }])).toHaveLength(2);
  expect(getSearchRegions([{ region: "constructor" }], "한국")).toEqual([]);
});

test("responsive search cards keep two columns and allow long names/region labels to wrap", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src/Search/Search.css"), "utf8");
  expect(css).toMatch(/grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  expect(css).toMatch(/\.search-page \.search-result-card \.popular-text\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  expect(css).toMatch(/\.search-page \.region-card span\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  expect(css).toMatch(/\.search-country-filters\s*\{[^}]*overflow-x:\s*auto/s);
  expect(css).not.toMatch(/\.search-(?:country-button|result-card)[^{]*\{[^}]*#[0-9a-f]{3,8}/i);
});
