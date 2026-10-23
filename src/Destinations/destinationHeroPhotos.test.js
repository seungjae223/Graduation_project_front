import { getDestinationHero } from "./destinationHeroPhotos";

test("Wikimedia city cards supply smaller responsive options without changing attribution", () => {
  const tokyo = getDestinationHero("tokyo");
  expect(tokyo.srcSet).toContain("/640px-");
  expect(tokyo.srcSet).toContain("1280w");
  expect(tokyo.source).toContain("commons.wikimedia.org/wiki/File:");

  const daNang = getDestinationHero("da-nang");
  expect(daNang.srcSet).toContain("?width=640");
  expect(daNang.srcSet).toContain("960w");

  const locallyHosted = getDestinationHero("new-york");
  expect(locallyHosted.src).toBe("/destination-photos/new-york.jpg");
  expect(locallyHosted.srcSet).toBeUndefined();
  expect(locallyHosted.source).toContain("commons.wikimedia.org");
});
