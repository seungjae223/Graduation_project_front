/* eslint-disable testing-library/no-node-access, testing-library/no-container -- Verify the route shell and decorative SVG structure. */
import { StrictMode, lazy } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import PageTransition from "../animations/PageTransition";
import useReadQuery from "../utils/useReadQuery";
import EarthLoader from "./EarthLoader";
import PageSkeleton from "./LoadingSkeleton";
import RouteLoading from "./RouteLoading";

afterEach(() => jest.restoreAllMocks());

test.each([
  ["globe", undefined, "earth-loading-screen--page"],
  ["search skeleton", <PageSkeleton page="search" />, "page-skeleton--search"],
])("the %s covers the page chunk, first read and visible photo", async (_name, fallback, className) => {
  let completeChunk;
  let completeRead;
  let completePhoto = false;
  let finishDecode;
  const data = new Promise(resolve => { completeRead = resolve; });
  const decode = new Promise(resolve => { finishDecode = resolve; });
  jest.spyOn(HTMLImageElement.prototype, "getBoundingClientRect").mockImplementation(function () {
    const top = this.alt === "아래 사진" ? window.innerHeight + 100 : 100;
    return { top, left: 0, bottom: top + 100, right: 100, width: 100, height: 100 };
  });
  jest.spyOn(HTMLImageElement.prototype, "complete", "get").mockImplementation(function () {
    return this.alt === "여행 사진" && completePhoto;
  });
  jest.spyOn(HTMLImageElement.prototype, "naturalWidth", "get").mockReturnValue(100);
  function Content() {
    const query = useReadQuery("trip", () => data);
    return query.data ? <>
      <h1>{query.data}</h1>
      <img src="/trip.jpg" alt="여행 사진" ref={image => { if (image) image.decode = () => decode; }} />
      <img src="/below.jpg" alt="아래 사진" loading="lazy" />
    </> : <p role="status">내 여행을 불러오는 중...</p>;
  }
  const Page = lazy(() => new Promise(resolve => { completeChunk = resolve; }));
  render(<StrictMode><header>헤더</header>
    <main><PageTransition className="route-transition">
      <RouteLoading fallback={fallback}><Page /></RouteLoading>
    </PageTransition></main>
    <footer>하단 메뉴</footer></StrictMode>);
  const placeholder = screen.getByRole("status");
  expect(placeholder).toHaveClass(className);
  expect(screen.getByRole("banner")).toBeVisible();
  expect(screen.getByRole("contentinfo")).toBeVisible();
  await act(async () => completeChunk({ default: Content }));
  expect(screen.getByRole("status")).toBe(placeholder);

  await act(async () => completeRead("내 여행"));
  expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toBe(placeholder);
  completePhoto = true;
  fireEvent.load(screen.getByAltText("여행 사진"));
  expect(screen.getByRole("status")).toBe(placeholder);

  await act(async () => finishDecode());
  expect(await screen.findByRole("heading", { name: "내 여행" })).toBeVisible();
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("a failed initial read reveals the page's retry action and later reads stay inline", async () => {
  const fetcher = jest.fn().mockRejectedValueOnce(new Error("오프라인"));
  let completeRetry;
  fetcher.mockReturnValueOnce(new Promise(resolve => { completeRetry = resolve; }));
  function Content() {
    const query = useReadQuery("recent", fetcher);
    return <>
      {query.status === "error" && <button onClick={query.retry}>다시 조회</button>}
      {query.status === "loading" && <p role="status">최근 검색어를 불러오는 중...</p>}
      {query.data && <h1>{query.data}</h1>}
    </>;
  }
  render(<RouteLoading><Content /></RouteLoading>);
  const retry = await screen.findByRole("button", { name: "다시 조회" });
  fireEvent.click(retry);
  expect(screen.getByRole("status")).toHaveTextContent("최근 검색어를 불러오는 중...");
  await act(async () => completeRetry("최근 검색어"));
  await waitFor(() => expect(screen.getByRole("heading", { name: "최근 검색어" })).toBeVisible());
});

test("a stalled initial read offers recovery and aborts the request", () => {
  jest.useFakeTimers();
  const fetcher = jest.fn(() => new Promise(() => {}));
  function Content() {
    useReadQuery("trip", fetcher);
    return <p role="status">내 여행을 불러오는 중...</p>;
  }
  try {
    render(<RouteLoading><Content /></RouteLoading>);
    expect(screen.getByRole("status")).toHaveClass("earth-loading-screen--page");
    act(() => jest.advanceTimersByTime(15000));
    expect(screen.getByRole("alert")).toHaveTextContent("화면을 불러오는 데 시간이 오래 걸려요");
    expect(screen.getByRole("button", { name: "화면 다시 불러오기" })).toBeEnabled();
    expect(fetcher.mock.calls[0][0].aborted).toBe(true);
  } finally {
    jest.useRealTimers();
  }
});

test("existing API/region loaders keep their original sizing mode and globe", () => {
  const { container } = render(<EarthLoader text="장소 정보를 불러오는 중..." />);
  expect(screen.getByRole("status")).not.toHaveClass("earth-loading-screen--page");
  expect(screen.getByText("장소 정보를 불러오는 중...")).toBeVisible();
  expect(container.querySelectorAll(".earth-loader svg")).toHaveLength(4);
});
