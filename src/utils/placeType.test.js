import { getPlaceTypeLabel } from "./placeType";
test.each([["ATTRACTION", "관광지"], ["RESTAURANT", "음식점"], ["관광지", "관광지"], ["UNKNOWN", "장소"], [undefined, "장소"], ["", "장소"]])("%s has a user-facing category", (code, label) => {
  expect(getPlaceTypeLabel(code)).toBe(label);
});
