import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import Header from "./Header";

jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "anonymous" }));

test("home shows centered logo without a redundant portrait button", () => {
  render(<MemoryRouter initialEntries={["/home"]}><Header /></MemoryRouter>);
  expect(screen.getByText("너만 오면 go")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "마이페이지" })).not.toBeInTheDocument();
});

test("recommend has a clean header without search magnifier or old theme title", () => {
  render(<MemoryRouter initialEntries={["/recommend"]}><Header /></MemoryRouter>);
  expect(screen.getByText("너만 오면 go")).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "추천" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "검색" })).not.toBeInTheDocument();
  expect(screen.queryByText("테마 선택")).not.toBeInTheDocument();
});

function CurrentPath() {
  const location = useLocation();
  return <output aria-label="현재 주소">{location.pathname + location.search}</output>;
}

test("saved places root back goes to MyPage rather than arbitrary history", () => {
  render(<MemoryRouter initialEntries={["/home","/saved-places"]}>
    <Header /><CurrentPath />
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:"뒤로 가기"}));
  expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/mypage");
});

test("folder header back returns to saved list, not to a previous arbitrary tab", () => {
  render(<MemoryRouter initialEntries={["/home","/saved-places?folderId=23"]}>
    <Header /><CurrentPath />
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:"뒤로 가기"}));
  expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/saved-places");
  expect(screen.getByLabelText("현재 주소")).not.toHaveTextContent("folderId");
});

test("optimizer uses a single global route title and returns to the matching trip",()=>{
  render(<MemoryRouter initialEntries={["/home","/route-optimize?id=12&day=3"]}>
    <Header/><CurrentPath/>
  </MemoryRouter>);
  expect(screen.getByRole("heading",{name:"경로 최적화"})).toBeInTheDocument();
  expect(screen.queryByText("너만 오면 go")).not.toBeInTheDocument();
  expect(screen.getAllByRole("button",{name:"뒤로 가기"})).toHaveLength(1);
  fireEvent.click(screen.getByRole("button",{name:"뒤로 가기"}));
  expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/route-result?id=12");
});

test("itinerary editing returns to detail, then detail returns to all schedules",()=>{
  render(<MemoryRouter initialEntries={["/home","/route-result?id=12&edit=1&day=2&version=optimized"]}>
    <Header/><CurrentPath/>
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:"뒤로 가기"}));
  expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/route-result?id=12");
  fireEvent.click(screen.getByRole("button",{name:"뒤로 가기"}));
  expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/schedule");
});

test("optimized place picker Back returns to optimized editor on the same day", () => {
  render(<MemoryRouter initialEntries={["/route-add-places?id=12&day=3&version=optimized"]}>
    <Header/><CurrentPath/>
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:"뒤로 가기"}));
  expect(screen.getByLabelText("현재 주소"))
    .toHaveTextContent("/route-result?id=12&edit=1&day=3&version=optimized");
});

test("detail Back remembers the past-trips list even after editing", () => {
  render(<MemoryRouter initialEntries={["/route-result?id=12&edit=1&day=2&version=optimized&origin=past"]}>
    <Header/><CurrentPath/>
  </MemoryRouter>);
  fireEvent.click(screen.getByRole("button",{name:"뒤로 가기"}));
  expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/route-result?id=12&origin=past");
  fireEvent.click(screen.getByRole("button",{name:"뒤로 가기"}));
  expect(screen.getByLabelText("현재 주소")).toHaveTextContent("/mypage/past-trips");
});
