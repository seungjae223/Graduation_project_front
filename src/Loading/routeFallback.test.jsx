import React, { Suspense, lazy } from "react";
import { act, render, screen } from "@testing-library/react";
import EarthLoader from "./EarthLoader";

test("page fallback leaves the shell intact and disappears after the lazy page resolves", async () => {
  let complete;
  const Page = lazy(() => new Promise(resolve => { complete = resolve; }));
  const { container } = render(<div className="app"><header>헤더</header>
    <main className="app-content"><div className="route-transition">
      <Suspense fallback={<EarthLoader variant="page" text="화면을 불러오는 중..." />}><Page /></Suspense>
    </div></main><footer>하단 메뉴</footer></div>);
  expect(screen.getByRole("status")).toHaveClass("earth-loading-screen--page");
  expect(screen.getByText("헤더")).toBeVisible(); expect(screen.getByText("하단 메뉴")).toBeVisible();
  await act(async () => complete({ default: () => <h1>정상 화면</h1> }));
  expect(screen.getByText("정상 화면")).toBeVisible(); expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(container.querySelector(".route-transition").children).toHaveLength(1);
});

test("existing API/region loaders keep their original sizing mode and globe", () => {
  const { container } = render(<EarthLoader text="장소 정보를 불러오는 중..." />);
  expect(screen.getByRole("status")).not.toHaveClass("earth-loading-screen--page");
  expect(screen.getByText("장소 정보를 불러오는 중...")).toBeVisible();
  expect(container.querySelectorAll(".earth-loader svg")).toHaveLength(4);
});
