/* eslint-disable testing-library/no-node-access -- Verify that navigation retains the same SVG nodes. */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Footer from "./Footer";
import { DetailFooterProvider, useDetailFooter } from "../components/DetailFooterContext";
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
test("검색이나 직접 진입한 Destination Explore는 검색 탭을 유지한다", () => {
  render(<MemoryRouter initialEntries={["/destinations/tokyo"]}><Footer /></MemoryRouter>);
  expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "true");
});

test("detail route swaps to three neutral actions and hides the five primary tabs", () => {
  render(<MemoryRouter initialEntries={["/detail?id=6"]}><Footer /></MemoryRouter>);
  expect(screen.getByRole("navigation", { name: "장소 상세 빠른 메뉴" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "홈" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "길찾기 이용 불가" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "폴더 저장" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "일정 추가" })).toBeDisabled();
});

function RegisterDetailActions({ onTrip, onFolder }) {
  const { setActions } = useDetailFooter();
  React.useEffect(() => {
    setActions({ placeId: 6, directions: { provider: "google", url: "https://www.google.com/maps/dir/?api=1&destination=test" },
      folderDisabled: false, saving: false, openFolder: onFolder, openTrip: onTrip });
    return () => setActions(null);
  }, [setActions, onTrip, onFolder]);
  return null;
}
test("shared shell routes detail quick actions to the current place", async () => {
  const onTrip = jest.fn(); const onFolder = jest.fn();
  render(<MemoryRouter initialEntries={["/detail?id=6"]}><DetailFooterProvider>
    <RegisterDetailActions onTrip={onTrip} onFolder={onFolder} /><Footer />
  </DetailFooterProvider></MemoryRouter>);
  expect(await screen.findByRole("link", { name: "구글맵 길찾기" })).toHaveAttribute("target", "_blank");
  fireEvent.click(screen.getByRole("button", { name: "폴더 저장" }));
  fireEvent.click(screen.getByRole("button", { name: "일정 추가" }));
  expect(onFolder).toHaveBeenCalledTimes(1);
  expect(onTrip).toHaveBeenCalledTimes(1);
});

// Save/favorite changes may re-register actions; the fixed navigation must not blink.
test("folder action keeps its label and icon through an in-flight save", () => {
  function SaveState() {
    const { setActions } = useDetailFooter();
    React.useEffect(() => {
      setActions({ placeId: 6, directions: null, folderDisabled: false,
        saving: false, openFolder: jest.fn(), openTrip: jest.fn() });
      return () => setActions(null);
    }, [setActions]);
    return <>
      <button type="button" onClick={() => setActions(current => ({ ...current, saving: true, folderDisabled: true }))}>저장 시작</button>
      <button type="button" onClick={() => setActions(current => ({ ...current, saving: false, folderDisabled: false }))}>저장 종료</button>
    </>;
  }

  render(<MemoryRouter initialEntries={["/detail?id=6"]}><DetailFooterProvider>
    <SaveState /><Footer />
  </DetailFooterProvider></MemoryRouter>);
  const folder = screen.getByRole("button", { name: "폴더 저장" });
  const icon = folder.querySelector("svg");
  expect(folder).toHaveTextContent("폴더 저장");

  fireEvent.click(screen.getByRole("button", { name: "저장 시작" }));
  expect(screen.getByRole("button", { name: "폴더 저장" })).toBe(folder);
  expect(folder.querySelector("svg")).toBe(icon);
  expect(folder).toHaveTextContent("폴더 저장");
  expect(folder).toHaveAttribute("aria-busy", "true");
  expect(folder).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "저장 종료" }));
  expect(screen.getByRole("button", { name: "폴더 저장" })).toBe(folder);
  expect(folder.querySelector("svg")).toBe(icon);
  expect(folder).toHaveAttribute("aria-busy", "false");
  expect(folder).toBeEnabled();
});

test("추천을 통해 열린 여행지는 상세 필터를 바꿔도 추천 탭으로 표시된다", () => {
  render(<MemoryRouter initialEntries={["/destinations/hong-kong?from=recommend&category=CULTURE&sort=likes"]}>
    <Footer />
  </MemoryRouter>);
  expect(screen.getByRole("button", { name: "추천" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "검색" })).toHaveAttribute("aria-pressed", "false");
});
