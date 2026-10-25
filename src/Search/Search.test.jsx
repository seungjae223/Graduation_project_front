import { queryByClass, getArticleByText, getByAttribute } from "../testQueries";
import userEvent from "@testing-library/user-event";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Search from "./Search";
import { getDestinationsApi } from "../api/destinationApi";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";
import { searchPlacesApi, getPlacesApi, getRecommendationsApi, getRecentSearchesApi, clearRecentSearchesApi, deleteRecentSearchApi } from "../api/placeApi";
jest.mock("../api/destinationApi", () => ({ getDestinationsApi: jest.fn() }));
jest.mock("../api/placeEngagementApi", () => ({ getPlaceEngagementApi: jest.fn() }));
const mockFavorite = jest.fn();
const mockPicker = jest.fn();
jest.mock("../utils/usePlaceSaving", () => ({ __esModule: true, default: () => ({
  isLiked: () => false, toggleFavorite: mockFavorite, openFolderPicker: mockPicker,
  folders: { account: "anonymous", status: "idle" }, open: false,
}) }));
jest.mock("../api/placeApi", () => ({ searchPlacesApi: jest.fn(), getPlacesApi: jest.fn(), getRecommendationsApi: jest.fn(), getRecentSearchesApi: jest.fn(), deleteRecentSearchApi: jest.fn(), clearRecentSearchesApi: jest.fn() }));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const place = { id: 781, name: "서버 장소", address: "서버 주소", latitude: 37, longitude: 127 };
function Destination() { const location = useLocation(); const navigate = useNavigate(); return <><button onClick={() => navigate(-1)}>상세에서 뒤로</button><p>{location.search} / {location.state.place.id}</p></>; }
function DestinationBrowse() { const location = useLocation(); const navigate = useNavigate(); return <><button onClick={() => navigate(-1)}>여행지에서 뒤로</button><p data-testid="destination-route">{location.pathname}</p></>; }
function setup() {
  render(<MemoryRouter initialEntries={["/search"]}><Routes><Route path="/search" element={<Search />} /><Route path="/detail" element={<Destination />} /><Route path="/destinations/:code" element={<DestinationBrowse />} /></Routes></MemoryRouter>);
  return screen.getByPlaceholderText("장소, 도시 또는 테마 검색");
}
beforeEach(() => { window.sessionStorage.clear(); window.scrollTo = jest.fn(); window.requestAnimationFrame = callback => { callback(); return 1; }; window.cancelAnimationFrame = () => {}; jest.clearAllMocks(); getDestinationsApi.mockResolvedValue([]); getPlaceEngagementApi.mockImplementation(async ids => ids.map(id => ({ placeId: Number(id), likeCount: Number(id) === 781 ? 7 : 0, reviewCount: 0 }))); mockFavorite.mockImplementation(event => event.stopPropagation()); mockPicker.mockImplementation(event => event.stopPropagation()); getRecentSearchesApi.mockResolvedValue([]); getPlacesApi.mockResolvedValue([{ ...place, region: "부산" }]); getRecommendationsApi.mockResolvedValue([{ ...place, region: "부산" }]); });

test("search from a saved folder offers explicit return to that folder", async () => {
  render(<MemoryRouter initialEntries={["/search?folderId=17"]}>
    <Routes>
      <Route path="/search" element={<Search />} />
      <Route path="/saved-places" element={<output aria-label="복귀한 폴더" />} />
    </Routes>
    <RouteLocation />
  </MemoryRouter>);
  const back = await screen.findByRole("button", { name: /폴더로 돌아가기/ });
  fireEvent.click(back);
  expect(screen.getByLabelText("현재 경로")).toHaveTextContent("/saved-places?folderId=17");
});

function RouteLocation() {
  const location = useLocation();
  return <output aria-label="현재 경로">{location.pathname + location.search}</output>;
}

test("plain search has no folder return action", async () => {
  setup();
  expect(screen.queryByRole("button", { name: /폴더로 돌아가기/ })).not.toBeInTheDocument();
});

test("empty search shows recent searches only, without region recommendations or a place catalog", async () => {
  setup();
  await screen.findByRole("heading", { name: "최근 검색어" });
  expect(screen.queryByRole("heading", { name: "지역별 추천" })).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "장소 둘러보기" })).not.toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "장소 둘러보기" })).not.toBeInTheDocument();
  expect(getPlacesApi).not.toHaveBeenCalled();
  expect(getRecommendationsApi).not.toHaveBeenCalled();
  expect(searchPlacesApi).not.toHaveBeenCalled();
});
test("clear uses the existing API and only removes records after success", async () => {
  getRecentSearchesApi.mockResolvedValue([{ id: 1, keyword: "테스트 검색" }]);
  const pending = deferred(); clearRecentSearchesApi.mockReturnValue(pending.promise); setup();
  await screen.findByRole("button", { name: "테스트 검색", exact: true });
  fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }));
  expect(clearRecentSearchesApi).toHaveBeenCalledTimes(1);
  expect(screen.getByText("테스트 검색")).toBeInTheDocument();
  getRecentSearchesApi.mockResolvedValueOnce([]);
  await act(async () => pending.resolve({}));
  expect(await screen.findByText("최근 검색어가 없어요.")).toBeInTheDocument();
});
test("typing does not search; blank and long submissions are rejected", async () => {
  const input = setup();
  fireEvent.change(input, { target: { value: "   " } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  expect(await screen.findByText("검색어를 입력해주세요.")).toBeInTheDocument();
  fireEvent.change(input, { target: { value: "가".repeat(101) } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  expect(await screen.findByText("검색어는 100자 이하로 입력해주세요.")).toBeInTheDocument();
  expect(searchPlacesApi).not.toHaveBeenCalled();
});
test("Enter/form and button cannot duplicate an in-flight query; server ID reaches detail", async () => {
  const pending = deferred(); searchPlacesApi.mockReturnValue(pending.promise);
  const input = setup(); fireEvent.change(input, { target: { value: "  서울  " } });
  userEvent.click(input); userEvent.keyboard("{Enter}"); fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  expect(searchPlacesApi).toHaveBeenCalledTimes(1);
  expect(searchPlacesApi.mock.calls[0][0]).toBe("서울");
  await act(async () => pending.resolve([place]));
  fireEvent.click(screen.getByRole("button", { name: "서버 장소 상세 보기", exact: true }));
  expect(screen.getByText(/id=781.*781/)).toBeInTheDocument();
});
test("late previous response is ignored; failure stays distinct from empty and can retry", async () => {
  const old = deferred(); searchPlacesApi.mockReturnValueOnce(old.promise).mockResolvedValueOnce([place]);
  const input = setup(); fireEvent.change(input, { target: { value: "이전" } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  fireEvent.change(input, { target: { value: "최신" } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  expect(await screen.findByText("서버 장소")).toBeInTheDocument();
  await act(async () => old.resolve([{ id: 2, name: "이전 결과" }]));
  expect(screen.queryByText("이전 결과")).not.toBeInTheDocument();
  searchPlacesApi.mockRejectedValueOnce(new Error("Network Error"));
  fireEvent.change(input, { target: { value: "실패" } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  await screen.findByRole("alert"); expect(input).toHaveValue("실패");
  expect(screen.queryByText("검색 결과가 없어요.")).not.toBeInTheDocument();
  searchPlacesApi.mockResolvedValueOnce([]); fireEvent.click(screen.getByRole("button", { name: "다시 검색" }));
  await screen.findByText("검색 결과가 없어요.");
});

function HistoryControls() {
  const navigate = useNavigate(); const location = useLocation();
  return <><output aria-label="현재 검색 URL">{location.search}</output><button onClick={() => navigate(-1)}>이전 기록</button><button onClick={() => navigate(1)}>다음 기록</button></>;
}
function setupUrl(initial = "/search?keyword=서울") {
  render(<MemoryRouter initialEntries={[initial]}><HistoryControls /><Search /></MemoryRouter>);
  return screen.getByLabelText("장소, 도시 또는 테마 검색");
}
test("direct URL searches once without Enter and restores URL, input and results on history", async () => {
  searchPlacesApi.mockImplementation(async keyword => [{ ...place, name: keyword + " 결과" }]);
  const input = setupUrl();
  await screen.findByText("서울 결과"); expect(input).toHaveValue("서울"); expect(searchPlacesApi).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: "부산" } }); fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  await screen.findByText("부산 결과"); expect(screen.getByLabelText("현재 검색 URL")).toHaveTextContent("keyword=%EB%B6%80%EC%82%B0");
  expect(searchPlacesApi).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "이전 기록" })); await screen.findByText("서울 결과"); expect(input).toHaveValue("서울");
  fireEvent.click(screen.getByRole("button", { name: "다음 기록" })); await screen.findByText("부산 결과"); expect(input).toHaveValue("부산");
});
test("delete is an independent keyboard button; failed writes preserve recent list and current query", async () => {
  searchPlacesApi.mockResolvedValue([place]); getRecentSearchesApi.mockResolvedValue([{ id: 9, keyword: "최근" }]);
  const failure = { response: { status: 400 } }; deleteRecentSearchApi.mockRejectedValue(failure);
  const input = setupUrl(); await screen.findByText("서버 장소");
  const remove = await screen.findByRole("button", { name: "최근 최근 검색어 삭제" });
  userEvent.click(remove); await screen.findByText(/최근 검색어를 삭제하지/);
  expect(screen.getByRole("button", { name: "최근", exact: true })).toBeInTheDocument();
  expect(searchPlacesApi).toHaveBeenCalledTimes(1); expect(input).toHaveValue("서울");
  deleteRecentSearchApi.mockResolvedValue({}); getRecentSearchesApi.mockResolvedValue([]);
  userEvent.click(remove); await screen.findByText("최근 검색어가 없어요.");
  expect(deleteRecentSearchApi).toHaveBeenCalledTimes(2);
});
test("successful search refreshes recents and failed recent reads remain distinct from an empty list", async () => {
  getRecentSearchesApi.mockRejectedValue(new Error("read failure")); searchPlacesApi.mockResolvedValue([place]);
  const input = setupUrl(); await screen.findByText("서버 장소"); await screen.findByText("최근 검색어를 불러오지 못했어요.");
  expect(screen.queryByText("최근 검색어가 없어요.")).not.toBeInTheDocument();
  getRecentSearchesApi.mockResolvedValue([{ id: 4, keyword: "서울" }]); fireEvent.click(screen.getByRole("button", { name: "최근 검색어 다시 조회" }));
  await screen.findByRole("button", { name: "서울", exact: true }); expect(input).toHaveValue("서울"); expect(searchPlacesApi).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: "제주" } }); getRecentSearchesApi.mockResolvedValue([{ id: 5, keyword: "제주" }]);
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true })); await screen.findByRole("button", { name: "제주", exact: true });
  await waitFor(() => expect(input).toHaveValue("제주"));
});

test("search result heart and folder picker do not trigger detail navigation", async () => {
  searchPlacesApi.mockResolvedValue([place]);
  setupUrl(); await screen.findByText("서버 장소");
  const heart = screen.getByRole("button", { name: "서버 장소 좋아요 추가" });
  fireEvent.click(heart);
  expect(mockFavorite).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 781 }));
  const picker = screen.getByRole("button", { name: "서버 장소 폴더에 저장" });
  const card = getArticleByText("서버 장소");
  expect(picker).toHaveTextContent("폴더 저장");
  expect(queryByClass(card, "place-explore-divider")).toHaveTextContent("|");
  expect(queryByClass(card, "place-explore-schedule")).toHaveTextContent("일정 추가");
  fireEvent.click(picker);
  expect(mockPicker).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: 781 }));
  expect(screen.queryByText(/id=781/)).not.toBeInTheDocument();
});

const destination = (code, name, countryCode, countryName) => ({ code, name, countryCode, countryName });

test("country keyword returns destination cards with server codes and navigates to destination", async () => {
  getDestinationsApi.mockResolvedValue([
    destination("tokyo", "도쿄", "JP", "일본"),
    destination("osaka", "오사카", "JP", "일본"),
    destination("seoul", "서울", "KR", "대한민국"),
  ]);
  searchPlacesApi.mockResolvedValue([]);
  const input = setup();
  fireEvent.change(input, { target: { value: "일본" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  expect(await screen.findByRole("button", { name: "도쿄 여행지 보기" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "오사카 여행지 보기" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "서울 여행지 보기" })).not.toBeInTheDocument();
  expect(screen.queryByText("검색 결과가 없어요.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "도쿄 여행지 보기" }));
  expect(screen.getByTestId("destination-route")).toHaveTextContent("/destinations/tokyo");
});

test("city keyword shows destination before related place, and place keyword keeps detail route", async () => {
  getDestinationsApi.mockResolvedValue([destination("tokyo", "도쿄", "JP", "일본")]);
  searchPlacesApi.mockResolvedValue([place]);
  const input = setup();
  fireEvent.change(input, { target: { value: "도쿄" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  const destinationCard = await screen.findByRole("button", { name: "도쿄 여행지 보기" });
  const placeCard = await screen.findByRole("button", { name: "서버 장소 상세 보기" });
  expect(destinationCard.compareDocumentPosition(placeCard) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.change(input, { target: { value: "센소지" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  await screen.findByText("서버 장소");
  expect(screen.queryByRole("button", { name: "도쿄 여행지 보기" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "서버 장소 상세 보기" }));
  expect(screen.getByText(/id=781.*781/)).toBeInTheDocument();
});


test("search results and selected page survive detail navigation and back", async () => {
  const places = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `서울 장소 ${i + 1}`, region: "서울", address: `서울 주소 ${i + 1}` }));
  searchPlacesApi.mockResolvedValue(places);
  const input = setup();
  fireEvent.change(input, { target: { value: "서울" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  await screen.findByText("총 12개 · 1/3 페이지");
  fireEvent.click(screen.getByRole("button", { name: "2페이지" }));
  expect(screen.getByText("총 12개 · 2/3 페이지")).toBeInTheDocument();
  Object.defineProperty(window, "scrollY", { configurable: true, value: 380 });
  fireEvent.click(screen.getByRole("button", { name: "서울 장소 6 상세 보기" }));
  expect(screen.getByText(/id=6/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "상세에서 뒤로" }));
  await screen.findByText("총 12개 · 2/3 페이지");
  expect(screen.getByRole("button", { name: "2페이지" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByText("서울 장소 6")).toBeInTheDocument();
  expect(input).toHaveValue("서울");
  await waitFor(() => expect(window.scrollTo).toHaveBeenCalledWith(0, 380));
});

test("returning from a destination preserves its search keyword", async () => {
  getDestinationsApi.mockResolvedValue([{ code: "tokyo", name: "도쿄", countryCode: "JP", countryName: "일본" }]);
  searchPlacesApi.mockResolvedValue([]);
  const input = setup();
  fireEvent.change(input, { target: { value: "일본" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  fireEvent.click(await screen.findByRole("button", { name: "도쿄 여행지 보기" }));
  expect(screen.getByTestId("destination-route")).toHaveTextContent("/destinations/tokyo");
  fireEvent.click(screen.getByRole("button", { name: "여행지에서 뒤로" }));
  expect(await screen.findByRole("button", { name: "도쿄 여행지 보기" })).toBeInTheDocument();
  expect(input).toHaveValue("일본");
});


test("switching from a typed query to a recent keyword keeps the old cards mounted while fetching", async () => {
  const pending = deferred();
  const nextPlace = { ...place, id: 782, name: "부산 새 결과" };
  getRecentSearchesApi.mockResolvedValue([{ id: 7, keyword: "부산" }]);
  searchPlacesApi.mockImplementation(keyword => keyword === "부산" ? pending.promise : Promise.resolve([place]));
  const input = setupUrl();
  const oldCard = await screen.findByRole("button", { name: "서버 장소 상세 보기" });
  const recentButton = await screen.findByRole("button", { name: "부산", exact: true });
  fireEvent.click(recentButton);
  expect(input).toBe(screen.getByLabelText("장소, 도시 또는 테마 검색"));
  expect(screen.getByRole("button", { name: "서버 장소 상세 보기" })).toBe(oldCard);
  expect(screen.getByRole("button", { name: "부산", exact: true })).toBe(recentButton);
  expect(screen.getByText('"서울" 검색 결과')).toBeInTheDocument();
  expect(screen.getByText("장소를 검색하는 중이에요...")).toBeInTheDocument();
  await act(async () => pending.resolve([nextPlace]));
  expect(await screen.findByRole("button", { name: "부산 새 결과 상세 보기" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "서버 장소 상세 보기" })).not.toBeInTheDocument();
  expect(screen.getByText('"부산" 검색 결과')).toBeInTheDocument();
});

test("refreshing recent keywords does not show a new loading placeholder over existing chips", async () => {
  const pendingRefresh = deferred();
  getRecentSearchesApi
    .mockResolvedValueOnce([{ id: 7, keyword: "부산" }])
    .mockImplementation(() => pendingRefresh.promise);
  searchPlacesApi.mockResolvedValue([place]);
  setupUrl();
  const recentButton = await screen.findByRole("button", { name: "부산", exact: true });
  await waitFor(() => expect(getRecentSearchesApi.mock.calls.length).toBeGreaterThan(1));
  expect(screen.getByRole("button", { name: "부산", exact: true })).toBe(recentButton);
  expect(screen.queryByText("최근 검색어를 불러오는 중...")).not.toBeInTheDocument();
  await act(async () => pendingRefresh.resolve([{ id: 8, keyword: "서울" }]));
  expect(await screen.findByRole("button", { name: "서울", exact: true })).toBeInTheDocument();
});

test("search shares the destination card heart/count placement", async () => {
  searchPlacesApi.mockResolvedValue([place]);
  const input = setup();
  fireEvent.change(input, { target: { value: "서버" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  expect(await screen.findByRole("button", { name: "서버 장소 상세 보기" })).toBeInTheDocument();
  const card = getArticleByText("서버 장소");
  expect(card).not.toBeNull();
  const stack = queryByClass(card, "place-explore-favorite-stack");
  expect(stack).toContainElement(screen.getByRole("button", { name: "서버 장소 좋아요 추가" }));
  expect(stack).toContainElement(await screen.findByLabelText("서버 장소 좋아요 7개"));
});

test("search never displays a fake zero when likes are unavailable", async () => {
  getPlaceEngagementApi.mockRejectedValueOnce(new Error("offline"));
  searchPlacesApi.mockResolvedValue([place]);
  const input = setup();
  fireEvent.change(input, { target: { value: "서버" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  expect(await screen.findByRole("button", { name: "서버 장소 상세 보기" })).toBeInTheDocument();
  await waitFor(() => expect(getPlaceEngagementApi).toHaveBeenCalledTimes(1));
  expect(screen.queryByLabelText("서버 장소 좋아요 0개")).not.toBeInTheDocument();
});

test("search does not push the heading down with successful like feedback", async () => {
  searchPlacesApi.mockResolvedValue([place]);
  const input = setup();
  fireEvent.change(input, { target: { value: "서버" } });
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  await screen.findByRole("button", { name: "서버 장소 상세 보기" });
  const feedback = queryByClass(queryByClass(document.body, "search-page"), "place-saving-feedback");
  expect(feedback).not.toBeNull();
  expect(feedback).toHaveClass("place-saving-feedback");
  expect(screen.getByRole("heading", { name: "무엇을 검색할까요?" })).toBeInTheDocument();
});


test("icon-only search sort orders ALL results before pagination and retains URL state", async () => {
  searchPlacesApi.mockResolvedValue([
    { id: 781, name: "A 장소", address: "서울 A" },
    { id: 782, name: "B 장소", address: "서울 B" },
    { id: 783, name: "C 장소", address: "서울 C" },
  ]);
  getPlaceEngagementApi.mockImplementation(async ids => ids.map(id => ({
    placeId: Number(id),
    likeCount: id === 782 ? 9 : id === 783 ? 4 : 1,
    reviewCount: id === 783 ? 8 : id === 781 ? 5 : 0,
  })));
  setupUrl("/search?keyword=서울");
  await screen.findByText("A 장소");
  const names = () => within(queryByClass(document.body, "search-results-list")).getAllByRole("heading", { level: 3 }).map(el => el.textContent);
  expect(names()).toEqual(["A 장소", "B 장소", "C 장소"]);
  const likes = screen.getByRole("button", {name:"기본순 정렬, 누르면 좋아요순"});
  expect(screen.getByText("기본순", { selector: ".search-sort-current" })).toBeInTheDocument();
  expect(getByAttribute("viewBox", likes, "0 0 24 24")).not.toBeNull();
  expect(likes.innerHTML).not.toMatch(/<span\b/);
  fireEvent.click(likes);
  await waitFor(() => expect(names()).toEqual(["B 장소", "C 장소", "A 장소"]));
  expect(screen.getByLabelText("현재 검색 URL")).toHaveTextContent("sort=likes");
  expect(screen.getByText("좋아요순", { selector: ".search-sort-current" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"좋아요순 정렬, 누르면 리뷰순"}));
  await waitFor(() => expect(names()).toEqual(["C 장소", "A 장소", "B 장소"]));
  fireEvent.click(screen.getByRole("button", {name:"리뷰순 정렬, 누르면 기본순"}));
  await waitFor(() => expect(names()).toEqual(["A 장소", "B 장소", "C 장소"]));
});

