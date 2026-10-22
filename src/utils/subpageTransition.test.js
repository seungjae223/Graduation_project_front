import getSubpageTransition from "./subpageTransition";

test("MyPage child navigation uses rightward entry and leftward return", () => {
  expect(getSubpageTransition("/mypage", "/saved-places")).toBe("route-transition--subpage-from-right");
  expect(getSubpageTransition("/saved-places", "/mypage")).toBe("route-transition--subpage-from-left");
  expect(getSubpageTransition("/mypage", "/mypage/reviews")).toBe("route-transition--subpage-from-right");
  expect(getSubpageTransition("/mypage/profile", "/mypage")).toBe("route-transition--subpage-from-left");
  expect(getSubpageTransition("/mypage", "/inquiry")).toBe("route-transition--subpage-from-right");
  expect(getSubpageTransition("/inquiry/write", "/mypage")).toBe("route-transition--subpage-from-left");
  expect(getSubpageTransition("/mypage", "/mypage/past-trips")).toBe("route-transition--subpage-from-right");
});

test("SavedPlaces folderId changes have directional entry like bottom navigation", () => {
  expect(getSubpageTransition("/saved-places", "/saved-places", "", "?folderId=13"))
    .toBe("route-transition--subpage-from-right");
  expect(getSubpageTransition("/saved-places", "/saved-places", "?folderId=13", ""))
    .toBe("route-transition--subpage-from-left");
  expect(getSubpageTransition("/saved-places", "/saved-places", "?folderId=13", "?folderId=26"))
    .toBe("route-transition--subpage-from-right");
  expect(getSubpageTransition("/saved-places", "/saved-places", "?folderId=13", "?folderId=13"))
    .toBe("");
});

test("initial route, same page and unrelated query changes never invent a slide", () => {
  expect(getSubpageTransition(null, "/mypage")).toBe("");
  expect(getSubpageTransition("/mypage", "/mypage")).toBe("");
  expect(getSubpageTransition("/saved-places", "/saved-places", "?folderId=12&sort=likes", "?folderId=12&sort=default"))
    .toBe("");
  expect(getSubpageTransition("/detail", "/home")).toBe("");
  expect(getSubpageTransition("/home", "/search")).toBe("");
});

test("trip detail and day place picker slide right on entry, left on return", () => {
  expect(getSubpageTransition("/route-result", "/route-add-places"))
    .toBe("route-transition--subpage-from-right");
  expect(getSubpageTransition("/route-add-places", "/route-result"))
    .toBe("route-transition--subpage-from-left");
  expect(getSubpageTransition(null, "/route-add-places")).toBe("");
  expect(getSubpageTransition("/route-add-places", "/route-add-places")).toBe("");
});
