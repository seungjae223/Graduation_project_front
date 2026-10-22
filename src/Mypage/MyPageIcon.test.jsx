import React from "react";
import { render } from "@testing-library/react";
import MyPageIcon from "./MyPageIcon";

test.each([
  "luggage", "bookmark", "folder", "history", "review", "message",
  "user-edit", "lock", "logout", "settings", "avatar", "chevron",
])("%s is a decorative, font-independent outlined SVG", name => {
  const { container } = render(<MyPageIcon name={name} />);
  const icon = container.querySelector(`svg[data-mypage-icon="${name}"]`);
  expect(icon).not.toBeNull();
  expect(icon).toHaveAttribute("aria-hidden", "true");
  expect(icon).toHaveAttribute("fill", "none");
  expect(icon).toHaveAttribute("stroke", "currentColor");
  expect(icon).toHaveAttribute("viewBox", "0 0 24 24");
  expect(icon.querySelectorAll("path,rect,circle").length).toBeGreaterThan(0);
});

test("unknown icon never renders a misleading placeholder", () => {
  const { container } = render(<MyPageIcon name="does-not-exist" />);
  expect(container.firstChild).toBeNull();
});
