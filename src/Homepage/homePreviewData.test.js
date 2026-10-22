import { previewCities, previewHotPlaces } from "./homePreviewData";

test("development fixture offers exactly ten clearly separate ranked cities", () => {
  expect(previewCities).toHaveLength(10);
  expect(new Set(previewCities.map(city => city.code)).size).toBe(10);
  expect(previewCities.every(city => city.isPreview && city.tripCount > 0)).toBe(true);
  expect(previewCities.map(city => city.tripCount)).toEqual(
    [...previewCities.map(city => city.tripCount)].sort((a,b)=>b-a));
});

test("development hot scores use synthetic likes plus reviews and never claim real IDs", () => {
  expect(previewHotPlaces).toHaveLength(7);
  expect(previewHotPlaces.every(place =>
    place.isPreview && String(place.placeId).startsWith("demo-") &&
    place.engagementCount === place.likeCount + place.reviewCount)).toBe(true);
  expect(previewHotPlaces.map(place => place.engagementCount)).toEqual(
    [...previewHotPlaces.map(place => place.engagementCount)].sort((a,b)=>b-a));
});
