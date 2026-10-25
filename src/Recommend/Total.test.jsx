import { queryByClass, getArticleByText } from "../testQueries";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Total from "./Total";
import Recommend from "./Recommend";
import api from "../api/api";
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
let mockAccount = "account:A";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => mockAccount }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccount }) }));
const mockToggle = jest.fn();
const mockFavorite = jest.fn();
jest.mock("../utils/usePlaceSaving", () => ({ __esModule: true, default: () => ({ isSaved: () => false, isLiked: () => false, toggle: mockToggle, openFolderPicker: mockToggle, toggleFavorite: mockFavorite, folders: { account: mockAccount, status: "success" }, open: false }) }));
const places = [6, 5, 4, 3, 2, 1, 0, null].map((offset, index) => ({ id: index + 1, name: `장소 ${index + 1}`, region: "오사카", address: `실제 응답 주소 ${index + 1}`, latitude: offset === null ? null : 34.6 + offset / 10, longitude: 135.5, theme: "ACTIVITY" }));
const geoDescriptor = Object.getOwnPropertyDescriptor(navigator, "geolocation");
const titles = () => screen.getAllByRole("heading", { level: 3 }).map(h => h.textContent);
function Detail() { const location = useLocation(), navigate = useNavigate(); return <><p>상세 도착 {location.search}</p><button onClick={() => navigate(-1)}>돌아가기</button></>; }
function Destination() { const location = useLocation(); return <p>여행지 도착 {location.pathname}{location.search}</p>; }
const view = (entry = "/total?theme=activity") => <MemoryRouter initialEntries={[entry]}><Routes><Route path="/recommend" element={<Recommend />} /><Route path="/total" element={<Total />} /><Route path="/detail" element={<Detail />} /><Route path="/destinations/:code" element={<Destination />} /></Routes></MemoryRouter>;
const chooseOrigin = async () => {
  fireEvent.click(screen.getByRole("button", { name: /거리순/ }));
  userEvent.selectOptions(screen.getByLabelText("기준 장소", { exact: true }), "7");
  fireEvent.click(screen.getByRole("button", { name: "이 위치로 정렬" }));
  await screen.findByText("장소 7 기준 · 직선거리순");
};
beforeEach(() => {
  mockAccount = "account:A"; jest.clearAllMocks();
  mockToggle.mockImplementation(event => event.stopPropagation());
  mockFavorite.mockImplementation(event => event.stopPropagation());
  api.get.mockImplementation(url => Promise.resolve({ data: url.endsWith("/reviews") ? [{ rating: Number(url.split("/")[3]) / 2 }] : places }));
});
afterEach(() => { if (geoDescriptor) Object.defineProperty(navigator, "geolocation", geoDescriptor); else delete navigator.geolocation; });

test("the current recommend tab discovers destinations and preserves its origin in the city route", async () => {
  const destinations = [
    { code: "osaka", name: "오사카", countryName: "일본", countryCode: "jp", scope: "OVERSEAS" },
    { code: "seoul", name: "서울", countryName: "대한민국", countryCode: "kr", scope: "DOMESTIC" },
  ];
  api.get.mockImplementation(url => Promise.resolve({
    data: url === "/api/destinations" ? destinations : places,
  }));
  render(view("/recommend"));
  const osaka = await screen.findByRole("link", { name: "오사카 여행지 보기" });
  expect(screen.queryByRole("link", { name: "서울 여행지 보기" })).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledWith("/api/destinations", expect.objectContaining({ signal: expect.anything() }));
  expect(osaka).toHaveAttribute("href", "/destinations/osaka?from=recommend");
  fireEvent.click(screen.getByRole("button", { name: "국내" }));
  expect(screen.getByRole("link", { name: "서울 여행지 보기" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "해외" }));
  fireEvent.click(screen.getByRole("link", { name: "오사카 여행지 보기" }));
  expect(screen.getByText("여행지 도착 /destinations/osaka?from=recommend")).toBeInTheDocument();
});

test("distance sorts all API places before five-item pagination, retains basis and resets other sorts to page one without refetch", async () => {
  render(view()); await screen.findByText("총 8개 · 1/2 페이지");
  expect(titles()).toEqual(["장소 1", "장소 2", "장소 3", "장소 4", "장소 5"]);
  await chooseOrigin();
  expect(titles()).toEqual(["장소 7", "장소 6", "장소 5", "장소 4", "장소 3"]);
  expect(screen.getByText("직선거리 0m")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /거리순/ })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "2페이지" }));
  expect(titles()).toEqual(["장소 2", "장소 1", "장소 8"]);
  expect(screen.getByText("거리 정보 없음")).toBeInTheDocument();
  expect(screen.getByText("장소 7 기준 · 직선거리순")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /인기순/ }));
  expect(screen.getByText("총 8개 · 1/2 페이지")).toBeInTheDocument();
  expect(titles()).toEqual(["장소 1", "장소 2", "장소 3", "장소 4", "장소 5"]);
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith("/api/recommendations", expect.objectContaining({ params: { theme: "ACTIVITY" } }));
});

test("review sort uses all actual review scores, caches them across sorting and handles missing/zero scores", async () => {
  api.get.mockImplementation(url => Promise.resolve({ data: url.endsWith("/reviews") ? Number(url.split("/")[3]) === 8 ? [] : [{ rating: Number(url.split("/")[3]) === 1 ? 0 : Number(url.split("/")[3]) / 2 }] : places }));
  render(view()); await screen.findByText("총 8개 · 1/2 페이지");
  fireEvent.click(screen.getByRole("button", { name: /별점순/ }));
  await screen.findByText("등록된 리뷰의 평점순");
  expect(titles()).toEqual(["장소 7", "장소 6", "장소 5", "장소 4", "장소 3"]);
  expect(api.get.mock.calls.filter(([url]) => url.endsWith("/reviews"))).toHaveLength(8);
  fireEvent.click(screen.getByRole("button", { name: "2페이지" }));
  expect(titles()).toEqual(["장소 2", "장소 1", "장소 8"]);
  expect(screen.getByText("0")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /인기순/ }));
  fireEvent.click(screen.getByRole("button", { name: /별점순/ }));
  expect(screen.getByText("총 8개 · 1/2 페이지")).toBeInTheDocument();
  expect(api.get.mock.calls.filter(([url]) => url.endsWith("/reviews"))).toHaveLength(8);
});

test("save/detail preserve original IDs and detail/back restores page and distance state", async () => {
  render(view()); await screen.findByText("총 8개 · 1/2 페이지"); await chooseOrigin();
  const first = getArticleByText("장소 7");
  fireEvent.click(within(first).getByRole("button", { name: "장소 7 좋아요 추가" }));
  expect(mockFavorite).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 7, originalData: places[6] }));
  fireEvent.click(within(first).getByRole("button", { name: "폴더 저장" }));
  expect(mockToggle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 7, originalData: places[6] }));
  fireEvent.click(screen.getByRole("button", { name: "2페이지" }));
  fireEvent.click(within(getArticleByText("장소 2")).getByRole("button", { name: "상세보기" }));
  await screen.findByText("상세 도착 ?id=2");
  fireEvent.click(screen.getByRole("button", { name: "돌아가기" }));
  await screen.findByText("총 8개 · 2/2 페이지");
  expect(screen.getByText("장소 7 기준 · 직선거리순")).toBeInTheDocument();
  expect(titles()).toEqual(["장소 2", "장소 1", "장소 8"]);
});

test("GPS is requested only explicitly, denial preserves cards, and a late success after cancel cannot change sorting", async () => {
  const geolocation = { getCurrentPosition: jest.fn() };
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: geolocation });
  render(view()); await screen.findByText("총 8개 · 1/2 페이지");
  fireEvent.click(screen.getByRole("button", { name: /거리순/ })); expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "내 현재 위치 사용" }));
  act(() => geolocation.getCurrentPosition.mock.calls[0][1]({ code: 1 }));
  expect(screen.getByRole("alert")).toHaveTextContent("위치 권한이 거부되었어요");
  expect(titles()).toHaveLength(5);
  fireEvent.click(screen.getByRole("button", { name: "내 현재 위치 사용" }));
  const success = geolocation.getCurrentPosition.mock.calls[1][0];
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  act(() => success({ coords: { latitude: 34.6, longitude: 135.5 } }));
  expect(screen.getByRole("button", { name: /인기순/ })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByText(/현재 위치 기준/)).not.toBeInTheDocument();
});

test("partial paginated wrappers are rejected instead of claiming a complete distance sort", async () => {
  api.get.mockResolvedValue({ data: { content: places.slice(0, 5), totalElements: 8 } });
  render(view()); await screen.findByText("장소 목록을 불러오지 못했어요.");
  expect(screen.queryByText(/총 5개/)).not.toBeInTheDocument();
});

test("a review failure keeps the prior distance order; retry can recover without inventing stars", async () => {
  api.get.mockImplementation(url => url.endsWith("/reviews") ? Promise.reject(new Error("503")) : Promise.resolve({ data: places }));
  render(view()); await screen.findByText("총 8개 · 1/2 페이지"); await chooseOrigin();
  fireEvent.click(screen.getByRole("button", { name: /별점순/ }));
  await screen.findByRole("button", { name: "별점 다시 조회" });
  expect(titles()).toEqual(["장소 7", "장소 6", "장소 5", "장소 4", "장소 3"]);
  api.get.mockResolvedValue({ data: [] });
  fireEvent.click(screen.getByRole("button", { name: "별점 다시 조회" }));
  await screen.findByText("등록된 리뷰 평점이 없어 기본 순서로 표시해요.");
  expect(screen.queryByText("★")).not.toBeInTheDocument();
});

test("changing the reference resets page one and canceling leaves the selected reference intact", async () => {
  render(view()); await screen.findByText("총 8개 · 1/2 페이지"); await chooseOrigin();
  fireEvent.click(screen.getByRole("button", { name: "2페이지" }));
  fireEvent.click(screen.getByRole("button", { name: "변경" }));
  userEvent.selectOptions(screen.getByLabelText("기준 장소", { exact: true }), "1");
  fireEvent.click(screen.getByRole("button", { name: "이 위치로 정렬" }));
  expect(screen.getByText("장소 1 기준 · 직선거리순")).toBeInTheDocument();
  expect(screen.getByText("총 8개 · 1/2 페이지")).toBeInTheDocument();
  expect(titles()[0]).toBe("장소 1");
  fireEvent.click(screen.getByRole("button", { name: "변경" }));
  fireEvent.keyDown(screen.getByLabelText("기준 장소의 지역"), { key: "Escape" });
  expect(screen.queryByRole("heading", { name: "거리 기준 선택" })).not.toBeInTheDocument();
  expect(screen.getByText("장소 1 기준 · 직선거리순")).toBeInTheDocument();
});

test("a successful GPS selection stays in browser entry state, and changing accounts resets the private reference", async () => {
  const geolocation = { getCurrentPosition: jest.fn() };
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: geolocation });
  const { rerender: renderedRerender }=render(view()); await screen.findByText("총 8개 · 1/2 페이지");
  fireEvent.click(screen.getByRole("button", { name: /거리순/ }));
  fireEvent.click(screen.getByRole("button", { name: "내 현재 위치 사용" }));
  act(() => geolocation.getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 34.6, longitude: 135.5 } }));
  expect(screen.getByRole("dialog", { name: "거리 기준 선택" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /인기순/ })).toHaveAttribute("aria-pressed", "true");
  expect(titles()[0]).toBe("장소 1");
  expect(screen.getByRole("button", { name: "내 현재 위치 사용" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "이 위치로 정렬" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText("현재 위치 기준 · 직선거리순")).toBeInTheDocument();
  expect(titles()[0]).toBe("장소 7");
  expect(api.get).toHaveBeenCalledWith("/api/recommendations", expect.objectContaining({ params: { theme: "ACTIVITY" } }));
  mockAccount="account:B"; renderedRerender(view());
  await screen.findByText("총 8개 · 1/2 페이지");
  expect(screen.queryByText(/현재 위치 기준/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /인기순/ })).toHaveAttribute("aria-pressed", "true");
});

test("reference edits are drafts: GPS success and cancel preserve the applied place, order and page", async () => {
  const geolocation = { getCurrentPosition: jest.fn() };
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: geolocation });
  render(view()); await screen.findByText("총 8개 · 1/2 페이지"); await chooseOrigin();
  fireEvent.click(screen.getByRole("button", { name: "2페이지" }));
  const previousTitles = titles();
  fireEvent.click(screen.getByRole("button", { name: "변경" }));
  expect(screen.getByLabelText("기준 장소", { exact: true })).toHaveValue("7");
  expect(screen.getByLabelText("기준 장소의 지역")).toHaveValue("오사카");
  expect(queryByClass(document.body, "total-distance-summary")).toHaveAttribute("aria-hidden", "true");
  fireEvent.click(screen.getByRole("button", { name: "내 현재 위치 사용" }));
  expect(screen.getByRole("button", { name: "이 위치로 정렬" })).toBeDisabled();
  act(() => geolocation.getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 35.2, longitude: 135.5 } }));
  expect(titles()).toEqual(previousTitles);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(screen.getByText("장소 7 기준 · 직선거리순")).toBeVisible();
  expect(screen.getByText("총 8개 · 2/2 페이지")).toBeInTheDocument();
  expect(titles()).toEqual(previousTitles);
  expect(screen.getAllByText(/ 기준 · 직선거리순/)).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: /인기순/ }));
  fireEvent.click(screen.getByRole("button", { name: /거리순/ }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(titles()[0]).toBe("장소 7");
  expect(api.get).toHaveBeenCalledTimes(1);
});

test("the picker traps keyboard focus, closes with ESC/backdrop and releases background scroll", async () => {
  render(view()); await screen.findByText("총 8개 · 1/2 페이지");
  const distance = screen.getByRole("button", { name: /거리순/ });
  distance.focus(); fireEvent.click(distance);
  const region = screen.getByLabelText("기준 장소의 지역");
  expect(region).toHaveFocus();
  const scroller = document.scrollingElement || document.documentElement;
  expect(scroller.style.overflowY).toBe("hidden");
  const close = screen.getByRole("button", { name: "거리 기준 선택 닫기" });
  close.focus(); userEvent.tab({ shift: true });
  expect(screen.getByRole("button", { name: "취소" })).toHaveFocus();
  fireEvent.keyDown(screen.getByRole("button", { name: "취소" }), { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(distance).toHaveFocus();
  expect(scroller.style.overflowY).not.toBe("hidden");
  fireEvent.click(distance);
  fireEvent.click(queryByClass(document.body, "total-origin-layer"));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(distance).toHaveAttribute("aria-pressed", "false");
});

test("a saved GPS reference is preselected on change and changing to a place ignores a pending GPS result", async () => {
  const geolocation = { getCurrentPosition: jest.fn() };
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: geolocation });
  render(view()); await screen.findByText("총 8개 · 1/2 페이지");
  fireEvent.click(screen.getByRole("button", { name: /거리순/ }));
  fireEvent.click(screen.getByRole("button", { name: "내 현재 위치 사용" }));
  act(() => geolocation.getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 34.6, longitude: 135.5 } }));
  fireEvent.click(screen.getByRole("button", { name: "이 위치로 정렬" }));
  fireEvent.click(screen.getByRole("button", { name: "변경" }));
  expect(screen.getByRole("button", { name: "내 현재 위치 사용" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "이 위치로 정렬" })).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "내 현재 위치 사용" }));
  userEvent.selectOptions(screen.getByLabelText("기준 장소", { exact: true }), "1");
  act(() => geolocation.getCurrentPosition.mock.calls[1][0]({ coords: { latitude: 0, longitude: 0 } }));
  expect(screen.getByRole("button", { name: "내 현재 위치 사용" })).toHaveAttribute("aria-pressed", "false");
  fireEvent.click(screen.getByRole("button", { name: "이 위치로 정렬" }));
  expect(screen.getByText("장소 1 기준 · 직선거리순")).toBeVisible();
  expect(titles()[0]).toBe("장소 1");
});
