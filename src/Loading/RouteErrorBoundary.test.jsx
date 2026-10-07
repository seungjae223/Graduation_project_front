import { lazy, Suspense } from "react";
import { render, screen } from "@testing-library/react";
import RouteErrorBoundary from "./RouteErrorBoundary";

test("rejected page chunk displays recovery while the shell remains visible", async () => {
  const error = new Error("ChunkLoadError");
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  const Page = lazy(() => Promise.reject(error));
  render(<><header>헤더</header><RouteErrorBoundary><Suspense fallback="로딩"><Page /></Suspense></RouteErrorBoundary></>);
  expect(await screen.findByRole("alert")).toHaveTextContent("화면을 불러오지 못했어요");
  expect(screen.getByText("헤더")).toBeVisible();
  expect(screen.getByRole("button", { name: "화면 다시 불러오기" })).toBeEnabled();
  expect(log).toHaveBeenCalled();
  log.mockRestore();
});
