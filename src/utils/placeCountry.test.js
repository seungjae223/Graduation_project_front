import { getAvailableCountries, getPlaceCountry } from "./placeCountry";
import { getPaginationItems } from "./pagination";

test("all 15 seed regions resolve to the supported seven country groups", () => {
  const regions = ["서울", "경주", "부산", "제주", "도쿄", "오사카", "마닐라", "세부", "방콕", "치앙마이", "푸꾸옥", "다낭", "로스앤젤레스", "뉴욕", "홍콩"];
  expect(regions.map(region => getPlaceCountry({ region }))).not.toContain(null);
  expect(new Set(getAvailableCountries(regions.map(region => ({ region })))))
    .toEqual(new Set(["한국", "일본", "필리핀", "태국", "베트남", "미국", "중국(홍콩)"]));
});

test("unknown regions and country words in descriptive fields are never guessed", () => {
  expect(getPlaceCountry({ region: "동남아", name: "일본", address: "서울", countryCode: "JP" })).toBeNull();
  expect(getPlaceCountry({ region: "jp" })).toBeNull();
  expect(getPlaceCountry({ region: "constructor" })).toBeNull();
  expect(getPlaceCountry({ region: "__proto__" })).toBeNull();
  expect(getPlaceCountry({ region: " 서울 " })).toBe("한국");
});

test.each([1, 2, 10, 19, 20])("page %s is always visible with bounded, ordered page controls", page => {
  const items = getPaginationItems(page, 20);
  const numbers = items.filter(item => typeof item === "number");
  expect(numbers).toContain(page);
  expect(numbers[0]).toBe(1); expect(numbers.at(-1)).toBe(20);
  expect(numbers).toHaveLength(5);
  expect([...numbers].sort((a, b) => a-b)).toEqual(numbers);
  expect(new Set(items).size).toBe(items.length);
});
