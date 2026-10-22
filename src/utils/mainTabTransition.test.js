import getMainTabTransition from "./mainTabTransition";

test("main tab navigation animates in the correct direction", () => {
  expect(getMainTabTransition("/home", "/search")).toBe("route-transition--tab-from-right");
  expect(getMainTabTransition("/search", "/mypage")).toBe("route-transition--tab-from-right");
  expect(getMainTabTransition("/mypage", "/recommend")).toBe("route-transition--tab-from-left");
  expect(getMainTabTransition("/schedule", "/home")).toBe("route-transition--tab-from-left");
});

test("queries and nested screens do not become main tab transitions", () => {
  expect(getMainTabTransition("/search", "/search")).toBe("");
  expect(getMainTabTransition(null, "/home")).toBe("");
  expect(getMainTabTransition("/detail", "/search")).toBe("");
  expect(getMainTabTransition("/search", "/destinations/tokyo")).toBe("");
  expect(getMainTabTransition("/route-result", "/schedule")).toBe("");
});

test("bottom tab switches animate after leaving a nested page", () => {
  expect(getMainTabTransition("/mypage/reviews", "/home")).toBe("route-transition--tab-from-left");
  expect(getMainTabTransition("/saved-places", "/search")).toBe("route-transition--tab-from-left");
  expect(getMainTabTransition("/mypage/recent-places", "/schedule")).toBe("route-transition--tab-from-left");
  expect(getMainTabTransition("/inquiry/write", "/recommend")).toBe("route-transition--tab-from-left");
  expect(getMainTabTransition("/destinations/osaka", "/mypage")).toBe("route-transition--tab-from-right");
  expect(getMainTabTransition("/popular-all", "/recommend")).toBe("route-transition--tab-from-right");
  expect(getMainTabTransition("/route-create", "/home")).toBe("route-transition--tab-from-left");
  expect(getMainTabTransition("/mypage/profile", "/mypage")).toBe("");
  expect(getMainTabTransition("/inquiry", "/mypage")).toBe("");
});

test("home planning and schedule detail routes enter from the right",()=>{
  expect(getMainTabTransition("/home","/route-create")).toBe("route-transition--tab-from-right");
  expect(getMainTabTransition("/home","/schedule")).toBe("route-transition--tab-from-right");
  expect(getMainTabTransition("/home","/my-schedule")).toBe("route-transition--tab-from-right");
});
