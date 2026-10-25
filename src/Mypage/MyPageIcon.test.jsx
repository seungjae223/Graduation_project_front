import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import MyPageIcon from "./MyPageIcon";

test.each([
  "luggage", "bookmark", "folder", "history", "review", "message",
  "user-edit", "lock", "logout", "settings", "avatar", "chevron",
])("%s is a decorative, font-independent outlined SVG", name => {
  const view = renderToStaticMarkup(<MyPageIcon name={name} />);
  expect(view).toContain('data-mypage-icon="' + name + '"');
  expect(view).toContain('aria-hidden="true"');
  expect(view).toContain('fill="none"');
  expect(view).toContain('stroke="currentColor"');
  expect(view).toContain('viewBox="0 0 24 24"');
  expect(view).toMatch(/<(?:path|rect|circle)\b/);
});

test("unknown icon never renders a misleading placeholder", () => {
  expect(renderToStaticMarkup(<MyPageIcon name="does-not-exist" />)).toBe("");
});
