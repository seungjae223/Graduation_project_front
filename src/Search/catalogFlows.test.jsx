import React from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Search from "./Search";
import { getPlacesApi, getRecommendationsApi, getRecentSearchesApi, searchPlacesApi } from "../api/placeApi";

let mockAccount = "account:A";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => mockAccount }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccount }) }));
jest.mock("../api/placeApi", () => ({
  getPlacesApi: jest.fn(), getRecommendationsApi: jest.fn(), getRecentSearchesApi: jest.fn(), searchPlacesApi: jest.fn(),
  clearRecentSearchesApi: jest.fn(), deleteRecentSearchApi: jest.fn(),
}));
const rows = (count, region, offset = 0) => Array.from({ length: count }, (_, i) => ({
  id: offset + i + 1, name: `${region} 장소 ${i + 1}`, region, address: `${region} 주소 ${i + 1}`,
}));
const data = [...rows(12, "서울"), ...rows(8, "도쿄", 12), ...rows(2, "부산", 20), ...rows(1, "오사카", 22), ...rows(1, "제주", 23)];
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function Location() { const location = useLocation(); return <output aria-label="검색 URL">{location.pathname + location.search}</output>; }
function Destination() { const location = useLocation(); return <output aria-label="상세 ID">{location.state.place.id}</output>; }
const view = (path = "/search") => <MemoryRouter initialEntries={[path]}><Location /><Routes>
  <Route path="/search" element={<Search />} /><Route path="/detail" element={<Destination />} />
</Routes></MemoryRouter>;
const results = () => within(screen.getByRole("region", { name: "장소 둘러보기" }));
const regionButtons = () => within(screen.getByRole("region", { name: "지역별 추천" })).queryAllByRole("button").filter(button => button.hasAttribute("aria-pressed"));
beforeEach(() => {
  jest.resetAllMocks(); mockAccount = "account:A";
  getPlacesApi.mockResolvedValue(data); getRecentSearchesApi.mockResolvedValue([]);
  getRecommendationsApi.mockImplementation(async ({ region }) => data.filter(place => place.region === region));
  searchPlacesApi.mockImplementation(async keyword => data.filter(place => [place.name, place.region, place.address].some(value => value.includes(keyword))));
  Element.prototype.scrollIntoView = jest.fn(); window.matchMedia = jest.fn(() => ({ matches: false }));
});

test("no hardcoded rankings, trending cards or unsupported regions remain", async () => {
  render(view()); await screen.findByRole("button", { name: "한국", exact: true });
  expect(screen.queryByRole("heading", { name: "인기 검색어" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "지금 가장 핫한 곳" })).not.toBeInTheDocument();
  expect(screen.queryByText("TRENDING")).not.toBeInTheDocument();
  for (const name of ["강원", "여수", "거제", "경주 불국사", "남해 독일마을"]) expect(screen.queryByRole("button", { name, exact: true })).not.toBeInTheDocument();
  expect(regionButtons().map(button => button.textContent)).toEqual(["도쿄", "부산", "서울", "오사카", "제주"]);
  expect(within(screen.getByRole("group", { name: "국가별 장소 필터" })).getAllByRole("button").map(button => button.textContent)).toEqual(["전체", "일본", "한국"]);
  expect(getPlacesApi).toHaveBeenCalledWith(expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(getRecommendationsApi).not.toHaveBeenCalled();
});

test("the complete API list paginates 5/5/5/5/4 and preserves original IDs on later pages", async () => {
  render(view()); await screen.findByText("총 24개 · 1/5 페이지");
  expect(results().getAllByRole("button", { name: /장소 \d/ })).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "5페이지", exact: true }));
  expect(results().getAllByRole("button", { name: /장소 \d/ })).toHaveLength(4);
  expect(screen.getByRole("button", { name: "다음", exact: true })).toBeDisabled();
  fireEvent.click(results().getByRole("button", { name: /제주 장소 1/ }));
  expect(screen.getByLabelText("상세 ID")).toHaveTextContent("24");
  expect(getPlacesApi).toHaveBeenCalledTimes(1);
});

test("country changes reset paging, narrow regions and use no invented country API parameter", async () => {
  render(view()); await screen.findByText("총 24개 · 1/5 페이지");
  fireEvent.click(screen.getByRole("button", { name: "5페이지", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "일본", exact: true }));
  expect(regionButtons().map(button => button.textContent)).toEqual(["도쿄", "오사카"]);
  expect(screen.getByText("총 9개 · 1/2 페이지")).toBeInTheDocument();
  expect(results().getAllByRole("button", { name: /장소 \d/ }).every(button => button.textContent.includes("도쿄"))).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "한국", exact: true }));
  expect(regionButtons().map(button => button.textContent)).toEqual(["부산", "서울", "제주"]);
  expect(screen.getByText("총 15개 · 1/3 페이지")).toBeInTheDocument();
  expect(getPlacesApi).toHaveBeenCalledTimes(1);
});

test("region buttons query only their exact raw value and reset the previous keyword/page", async () => {
  render(view("/search?keyword=서울")); await screen.findByText("총 12개 · 1/3 페이지");
  fireEvent.click(screen.getByRole("button", { name: "3페이지", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "도쿄", exact: true }));
  await screen.findByText("총 8개 · 1/2 페이지");
  expect(getRecommendationsApi).toHaveBeenCalledWith({ region: "도쿄" }, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(screen.getByRole("button", { name: "도쿄", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByLabelText("장소, 도시 또는 테마 검색")).toHaveValue("");
  expect(screen.getByLabelText("검색 URL")).not.toHaveTextContent("keyword=");
  expect(screen.getByRole("button", { name: "1페이지", exact: true })).toHaveAttribute("aria-current", "page");
});

test("a keyword search respects the selected country and region and resets page one", async () => {
  render(view()); await screen.findByText("총 24개 · 1/5 페이지");
  fireEvent.click(screen.getByRole("button", { name: "한국", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "서울", exact: true }));
  await screen.findByText("총 12개 · 1/3 페이지");
  fireEvent.click(screen.getByRole("button", { name: "3페이지", exact: true }));
  fireEvent.change(screen.getByLabelText("장소, 도시 또는 테마 검색"), { target: { value: "장소" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  await screen.findByText("총 12개 · 1/3 페이지");
  expect(searchPlacesApi).toHaveBeenCalledWith("장소", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  const section = within(screen.getByRole("region", { name: '"장소" 검색 결과' }));
  expect(section.getAllByRole("button").filter(button => button.classList.contains("search-result-card")).every(button => button.textContent.includes("서울"))).toBe(true);
});

test("region keyboard activation works without inventing a search statistic", async () => {
  render(view()); const button = await screen.findByRole("button", { name: "제주", exact: true });
  button.focus(); userEvent.keyboard("{Enter}");
  await screen.findByText("총 1개 · 1/1 페이지");
  expect(getRecommendationsApi).toHaveBeenCalledWith({ region: "제주" }, expect.any(Object));
  expect(searchPlacesApi).not.toHaveBeenCalled();
});

test("unknown regions are visible only in All and are never guessed into Korea", async () => {
  getPlacesApi.mockResolvedValue([...data, ...rows(1, "미분류 지역", 24)]);
  render(view()); await screen.findByRole("button", { name: "미분류 지역", exact: true });
  expect(screen.getByText(/국가를 확인할 수 없는 장소와 지역은 전체/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "한국", exact: true }));
  expect(screen.queryByRole("button", { name: "미분류 지역", exact: true })).not.toBeInTheDocument();
});

test.each(["/search?country=지원하지않는국가", "/search?region=등록되지않은지역", "/search?country=일본&region=서울"])("invalid selectors never silently become all places (%s)", async path => {
  render(view(path)); await screen.findByText(/선택한 .*등록된 장소를 확인할 수 없습니다/);
  expect(getRecommendationsApi).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: /서울 장소 1 서울 주소/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/총 24개/)).not.toBeInTheDocument();
});

test("late response from region A cannot replace B, even when cancellation is ignored", async () => {
  const old = deferred();
  getRecommendationsApi.mockImplementation(({ region }) => region === "서울" ? old.promise : Promise.resolve(data.filter(place => place.region === region)));
  render(view()); fireEvent.click(await screen.findByRole("button", { name: "서울", exact: true }));
  await waitFor(() => expect(getRecommendationsApi).toHaveBeenCalledTimes(1));
  const oldSignal = getRecommendationsApi.mock.calls[0][1].signal;
  fireEvent.click(screen.getByRole("button", { name: "도쿄", exact: true }));
  await screen.findByText("총 8개 · 1/2 페이지");
  await act(async () => old.resolve(data.filter(place => place.region === "서울")));
  expect(oldSignal.aborted).toBe(true);
  expect(screen.queryByText("서울 장소 1", { exact: true })).not.toBeInTheDocument();
});

test("changing country cancels the old region read and cannot restore Korean regions", async () => {
  const old = deferred(); getRecommendationsApi.mockReturnValue(old.promise);
  render(view()); fireEvent.click(await screen.findByRole("button", { name: "서울", exact: true }));
  await waitFor(() => expect(getRecommendationsApi).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "일본", exact: true }));
  await act(async () => old.resolve(data.filter(place => place.region === "서울")));
  expect(regionButtons().map(button => button.textContent)).toEqual(["도쿄", "오사카"]);
  expect(screen.getByText("총 9개 · 1/2 페이지")).toBeInTheDocument();
});

test("late catalog from a prior account cannot restore its country or region options", async () => {
  const old = deferred(); getPlacesApi.mockReturnValueOnce(old.promise).mockResolvedValueOnce(rows(2, "뉴욕"));
  const rendered = render(view()); mockAccount = "account:B"; rendered.rerender(view());
  await screen.findByRole("button", { name: "미국", exact: true });
  await act(async () => old.resolve(data));
  expect(regionButtons().map(button => button.textContent)).toEqual(["뉴욕"]);
  expect(screen.queryByRole("button", { name: "한국", exact: true })).not.toBeInTheDocument();
});

test("empty catalog has no fake countries, regions, place cards or pagination", async () => {
  getPlacesApi.mockResolvedValue([]); render(view());
  await screen.findByText("등록된 장소가 없어요.");
  expect(screen.getByText("등록된 장소가 있는 지역이 없어요.")).toBeInTheDocument();
  expect(regionButtons()).toHaveLength(0);
  expect(screen.queryByRole("navigation", { name: "장소 목록 페이지" })).not.toBeInTheDocument();
});

test.each(["<html>login</html>", [{ id: 1 }]])("malformed catalog is an error, never a mock or empty success", async body => {
  getPlacesApi.mockResolvedValue(body); render(view());
  await screen.findByText("지역 목록을 불러오지 못했어요.");
  expect(screen.queryByText("등록된 장소가 없어요.")).not.toBeInTheDocument();
  getPlacesApi.mockResolvedValue(data); fireEvent.click(screen.getByRole("button", { name: "지역 목록 다시 조회" }));
  await screen.findByRole("button", { name: "서울", exact: true });
});

test("region response for a different region is rejected instead of showing the same places everywhere", async () => {
  getRecommendationsApi.mockResolvedValue(rows(1, "도쿄")); render(view());
  fireEvent.click(await screen.findByRole("button", { name: "서울", exact: true }));
  await screen.findByRole("button", { name: "장소 다시 조회" });
  expect(screen.queryByText("도쿄 장소 1", { exact: true })).not.toBeInTheDocument();
});

test("one display label retains and queries all exact server region values", async () => {
  const rawPlaces = [{ id: 1, name: "서울 A", region: "서울" }, { id: 2, name: "서울 B", region: " 서울 " }];
  getPlacesApi.mockResolvedValue(rawPlaces);
  getRecommendationsApi.mockImplementation(async ({ region }) => rawPlaces.filter(place => place.region === region));
  render(view()); fireEvent.click(await screen.findByRole("button", { name: "서울", exact: true }));
  await screen.findByText("총 2개 · 1/1 페이지");
  expect(regionButtons()).toHaveLength(1);
  expect(getRecommendationsApi.mock.calls.map(([params]) => params)).toEqual([{ region: "서울" }, { region: " 서울 " }]);
});

test("a malformed keyword response remains an error without fallback records", async () => {
  searchPlacesApi.mockResolvedValue("<html>login</html>"); render(view("/search?keyword=검색"));
  await screen.findByRole("button", { name: "다시 검색" });
  expect(screen.queryByText("검색 결과가 없어요.")).not.toBeInTheDocument();
  expect(screen.queryByText(/총 24개/)).not.toBeInTheDocument();
});

test("region API failure and empty result stay distinct and retry only the requested region", async () => {
  getRecommendationsApi.mockRejectedValueOnce({ response: { status: 403 } }).mockResolvedValueOnce([]);
  render(view()); fireEvent.click(await screen.findByRole("button", { name: "서울", exact: true }));
  await screen.findByText("요청을 처리할 권한이 없습니다.");
  expect(screen.queryByText("등록된 장소가 없어요.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "장소 다시 조회" }));
  await screen.findByText("등록된 장소가 없어요.");
  expect(getRecommendationsApi.mock.calls.map(([params]) => params)).toEqual([{ region: "서울" }, { region: "서울" }]);
});
