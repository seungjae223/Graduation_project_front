import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Search from "./Search";
import { getDestinationsApi } from "../api/destinationApi";
import { getPlacesApi, getRecommendationsApi, getRecentSearchesApi, searchPlacesApi } from "../api/placeApi";

let mockAccount = "account:A";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => mockAccount }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccount }) }));
jest.mock("../utils/usePlaceSaving", () => ({ __esModule: true, default: () => ({
  folders: { account: "anonymous", status: "idle" }, open: false,
  isLiked: () => false, favoriteBlocked: false,
  toggleFavorite: jest.fn(), openFolderPicker: jest.fn(),
}) }));
jest.mock("../api/destinationApi", () => ({ getDestinationsApi: jest.fn() }));
jest.mock("../api/placeApi", () => ({
  getPlacesApi: jest.fn(), getRecommendationsApi: jest.fn(),
  getRecentSearchesApi: jest.fn(), searchPlacesApi: jest.fn(),
  clearRecentSearchesApi: jest.fn(), deleteRecentSearchApi: jest.fn(),
}));

const rows = (count, region, offset = 0) => Array.from({ length: count }, (_, i) => ({
  id: offset + i + 1, name: `${region} 장소 ${i + 1}`, region, address: `${region} 주소 ${i + 1}`,
}));
const data = [...rows(12, "서울"), ...rows(8, "도쿄", 12), ...rows(4, "제주", 20)];
const deferred = () => { let resolve; const promise = new Promise(yes => { resolve = yes; }); return { promise, resolve }; };
function Detail() { const location = useLocation(); return <output aria-label="상세 ID">{location.state.place.id}</output>; }
function Destination() { const location = useLocation(); return <output aria-label="여행지 주소">{location.pathname}</output>; }
function RouteInfo() { const location = useLocation(); return <output aria-label="검색 URL">{location.pathname + location.search}</output>; }
const view = (path = "/search") => <MemoryRouter initialEntries={[path]}>
  <RouteInfo />
  <Routes>
    <Route path="/search" element={<Search />} />
    <Route path="/detail" element={<Detail />} />
    <Route path="/destinations/:code" element={<Destination />} />
  </Routes>
</MemoryRouter>;
const placeButtons = () => screen.queryAllByRole("button", { name: /장소 \d+ 상세 보기$/ });

beforeEach(() => {
  window.sessionStorage.clear(); jest.resetAllMocks(); mockAccount = "account:A";
  getDestinationsApi.mockResolvedValue([]);
  getRecentSearchesApi.mockResolvedValue([]);
  getPlacesApi.mockResolvedValue(data);
  getRecommendationsApi.mockResolvedValue([]);
  searchPlacesApi.mockImplementation(async keyword => data.filter(item =>
    [item.name, item.region, item.address].some(value => value.includes(keyword))));
  Element.prototype.scrollIntoView = jest.fn();
  window.matchMedia = jest.fn(() => ({ matches: false }));
});

test("initial screen contains search and recents, not region recommendations or a full place catalog", async () => {
  render(view());
  await screen.findByRole("heading", { name: "최근 검색어" });
  expect(screen.queryByRole("heading", { name: "지역별 추천" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "장소 둘러보기" })).not.toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "장소 목록 페이지" })).not.toBeInTheDocument();
  expect(searchPlacesApi).not.toHaveBeenCalled();
  expect(getPlacesApi).not.toHaveBeenCalled();
  expect(getRecommendationsApi).not.toHaveBeenCalled();
});

test("direct search shows five full-width place cards per page and keeps original server IDs", async () => {
  render(view("/search?keyword=서울"));
  await screen.findByText("총 12개 · 1/3 페이지");
  expect(placeButtons()).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "3페이지" }));
  expect(screen.getByText("총 12개 · 3/3 페이지")).toBeInTheDocument();
  expect(placeButtons()).toHaveLength(2);
  expect(screen.getByLabelText("검색 URL")).toHaveTextContent("page=3");
  fireEvent.click(screen.getByRole("button", { name: "서울 장소 12 상세 보기" }));
  expect(screen.getByLabelText("상세 ID")).toHaveTextContent("12");
  expect(getPlacesApi).not.toHaveBeenCalled();
});

test("deep-linked pages restore the same search results, page and pagination group", async () => {
  searchPlacesApi.mockResolvedValue(rows(375, "서울"));
  render(view("/search?keyword=서울&page=6"));
  await screen.findByText("총 375개 · 6/75 페이지");
  const nav = screen.getByRole("navigation", { name: "장소 목록 페이지" });
  expect(nav).toHaveTextContent("678910");
  expect(screen.getByRole("button", { name: "6페이지" })).toHaveAttribute("aria-current", "page");
  expect(placeButtons()).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "이전", exact: true }));
  expect(screen.getByLabelText("검색 URL")).toHaveTextContent("page=5");
  expect(screen.getByText("총 375개 · 5/75 페이지")).toBeInTheDocument();
});

test("country keyword lists actual server destinations only, not invented cities", async () => {
  getDestinationsApi.mockResolvedValue([
    { code: "tokyo", name: "도쿄", countryCode: "JP", countryName: "일본" },
    { code: "osaka", name: "오사카", countryCode: "JP", countryName: "일본" },
    { code: "seoul", name: "서울", countryCode: "KR", countryName: "대한민국" },
  ]);
  render(view("/search?keyword=일본"));
  fireEvent.click(await screen.findByRole("button", { name: "도쿄 여행지 보기" }));
  expect(screen.getByLabelText("여행지 주소")).toHaveTextContent("/destinations/tokyo");
  expect(getPlacesApi).not.toHaveBeenCalled();
});

test("legacy region URLs migrate into a keyword without showing removed region controls", async () => {
  render(view("/search?region=서울&country=한국"));
  await screen.findByText("총 12개 · 1/3 페이지");
  expect(screen.getByLabelText("검색 URL")).toHaveTextContent("keyword=");
  expect(screen.getByLabelText("검색 URL")).not.toHaveTextContent("region=");
  expect(screen.getByLabelText("검색 URL")).not.toHaveTextContent("country=");
  expect(screen.queryByRole("heading", { name: "지역별 추천" })).not.toBeInTheDocument();
});

test("malformed place response remains an error rather than silently showing mock results", async () => {
  searchPlacesApi.mockResolvedValue("<html>login</html>");
  render(view("/search?keyword=검색"));
  expect(await screen.findByRole("button", { name: "다시 검색" })).toBeInTheDocument();
  expect(screen.queryByText("검색 결과가 없어요.")).not.toBeInTheDocument();
  searchPlacesApi.mockResolvedValue(rows(1, "검색"));
  fireEvent.click(screen.getByRole("button", { name: "다시 검색" }));
  await screen.findByText("검색 장소 1");
});

test("late response for prior query cannot replace latest results", async () => {
  const old = deferred();
  searchPlacesApi.mockImplementation(keyword => keyword === "서울" ? old.promise : Promise.resolve(rows(1, "도쿄")));
  const rendered = render(view("/search?keyword=서울"));
  fireEvent.change(screen.getByLabelText("장소, 도시 또는 테마 검색"), { target: { value: "도쿄" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  await screen.findByText("도쿄 장소 1");
  await act(async () => old.resolve(rows(1, "서울")));
  expect(screen.queryByText("서울 장소 1")).not.toBeInTheDocument();
  rendered.unmount();
});

test("no results stays distinct from a failed search", async () => {
  searchPlacesApi.mockResolvedValue([]);
  render(view("/search?keyword=아무것도없음"));
  expect(await screen.findByText("검색 결과가 없어요.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "다시 검색" })).not.toBeInTheDocument();
});
