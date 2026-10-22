import { getPlaceCategoryLabel } from "./placeCategory";

test.each([
  ["LANDMARK", "\uBA85\uC18C"],
  ["CULTURE", "\uBB38\uD654"],
  ["NATURE", "\uC790\uC5F0"],
  ["FOOD", "\uB9DB\uC9D1"],
  ["SHOPPING", "\uC1FC\uD551"],
  ["EXPERIENCE", "\uCCB4\uD5D8"],
  ["STAY", "\uC219\uBC15"],
  ["\uBA85\uC18C", "\uBA85\uC18C"],
  ["UNKNOWN", "\uC7A5\uC18C"],
  [undefined, "\uC7A5\uC18C"],
  ["", "\uC7A5\uC18C"],
])("%s has a user-facing category", (code, label) => {
  expect(getPlaceCategoryLabel(code)).toBe(label);
});