import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Footer from "./Footer";
function Path() { return <output data-testid="path">{useLocation().pathname}</output>; }
const tabs = [["홈", "/home"], ["검색", "/search"], ["추천", "/recommend"], ["일정", "/schedule"], ["마이페이지", "/mypage"]];
test.each(tabs)("직접 URL/새 마운트에서 %s active", (label, path) => {
  render(<MemoryRouter initialEntries={[path]}><Footer /></MemoryRouter>);
  expect(screen.getByRole("button", { name: label })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("button")).toHaveLength(5);
});
test("모든 GNB 클릭 시 경로 변경, 동일 SVG DOM 유지", () => {
  render(<MemoryRouter initialEntries={["/home"]}><Footer /><Path /></MemoryRouter>);
  const icons = screen.getAllByRole("button").map(button => button.querySelector("svg"));
  for (const [label, path] of tabs) {
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getByTestId("path")).toHaveTextContent(path);
    expect(screen.getAllByRole("button").filter(button => button.getAttribute("aria-pressed") === "true")).toHaveLength(1);
    screen.getAllByRole("button").forEach((button, index) => expect(button.querySelector("svg")).toBe(icons[index]));
  }
});
