import React from "react";
import fs from "fs";
import path from "path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import DestinationExplore from "./DestinationExplore";
import RouteErrorBoundary from "../Loading/RouteErrorBoundary";
import getRouteBoundaryKey from "../utils/routeBoundaryKey";
import { getDestinationApi, getDestinationPlacesApi } from "../api/destinationApi";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";
const mockOpenFolderPicker = jest.fn();
const mockFavoriteStatus = jest.fn(() => "idle");
const mockQuickTripAddModal = jest.fn(() => null);
jest.mock("./QuickTripAddModal", () => ({ __esModule: true,
  default: props => mockQuickTripAddModal(props),
}));
jest.mock("../utils/usePlaceSaving", () => ({ __esModule: true, default: () => ({
  openFolderPicker: mockOpenFolderPicker, folders: { account: "anonymous", status: "idle" },
  blocked: false, open: false, favoriteStatus: mockFavoriteStatus(),
}) }));
jest.mock("../components/PlaceSavingFeedback", () => ({ __esModule: true,
  default: () => "INLINE_FEEDBACK_SHOULD_NOT_RENDER", PlaceSaveModal: () => null,
}));

jest.mock("../api/destinationApi", () => ({ getDestinationApi: jest.fn(), getDestinationPlacesApi: jest.fn() }));
jest.mock("../api/placeEngagementApi", () => ({ getPlaceEngagementApi: jest.fn() }));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:A" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:A" }) }));

const destination = { code: "tokyo", name: "도쿄", countryName: "일본", scope: "OVERSEAS" };
const places = Array.from({ length: 14 }, (_, i) => ({
  id: i + 1, name: i ? `도쿄 장소 ${i}` : "센소지", region: "도쿄", address: "일본 도쿄",
  placeCategory: i < 3 ? "LANDMARK" : "FOOD", placeCategoryLabel: i < 3 ? "명소" : "맛집",
}));
function CurrentPath() { const location = useLocation(); return <output data-testid="current-path">{location.pathname + location.search}</output>; }
function DetailStub() { const navigate = useNavigate(); return <><p>장소 상세</p><button type="button" onClick={() => navigate(-1)}>상세에서 돌아가기</button></>; }
function TestRoutes() {
  const location = useLocation();
  // Mirror the real App boundary so query-driven remounts are caught here.
  return <RouteErrorBoundary key={getRouteBoundaryKey(location.pathname, location.search)}><Routes>
    <Route path="/destinations/:code" element={<DestinationExplore />} />
    <Route path="/detail" element={<DetailStub />} />
  </Routes></RouteErrorBoundary>;
}
function View({ initial = "/destinations/tokyo" }) {
  return <MemoryRouter initialEntries={[initial]}><CurrentPath /><TestRoutes /></MemoryRouter>;
}
beforeEach(() => {
  jest.resetAllMocks();
  mockFavoriteStatus.mockReturnValue("idle");
  getDestinationApi.mockResolvedValue(destination);
  getDestinationPlacesApi.mockResolvedValue(places);
  getPlaceEngagementApi.mockImplementation(async ids => ids.map(id => ({
    placeId: Number(id), likeCount: id === 2 ? 30 : id === 3 ? 20 : id === 1 ? 10 : 0,
    reviewCount: id === 3 ? 30 : id === 1 ? 20 : id === 2 ? 10 : 0,
  })));
});

test("도쿄 정보와 실제 소속 장소를 보여주고 최초에는 12개만 렌더링", async () => {
  render(<View />);
  expect(await screen.findByRole("heading", { name: "도쿄" })).toBeInTheDocument();
  expect(screen.queryByText("INLINE_FEEDBACK_SHOULD_NOT_RENDER")).not.toBeInTheDocument();
  expect(screen.queryByText("14곳의 장소를 둘러보세요")).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /상세 보기$/ })).toHaveLength(12);
  fireEvent.click(screen.getByRole("button", { name: /장소 더 보기/ }));
  expect(screen.getAllByRole("button", { name: /상세 보기$/ })).toHaveLength(14);
  expect(getDestinationApi).toHaveBeenCalledWith("tokyo", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(getDestinationPlacesApi).toHaveBeenCalledTimes(1);
  // 'shown' in the URL must not destroy/refetch the entire city view.
  expect(getDestinationApi).toHaveBeenCalledTimes(1);
});

test("카테고리는 서버에서 확인된 장소만 필터링하고 ID로 상세 이동", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.click(within(screen.getByRole("group", { name: "장소 카테고리" })).getByRole("button", { name: "명소" }));
  expect(screen.getByText("검색 결과 3곳")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /상세 보기$/ })).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", { name: "센소지 상세 보기" }));
  expect(screen.getByTestId("current-path")).toHaveTextContent("/detail?id=1&source=destination");
});

test("여행지 코드와 장소 지역이 불일치하면 잘못된 목록을 표시하지 않음", async () => {
  getDestinationPlacesApi.mockResolvedValue([{ ...places[0], region: "서울" }]);
  render(<View />);
  expect(await screen.findByRole("alert")).toHaveTextContent("여행지 정보를 확인하지 못했어요");
  expect(screen.queryByRole("heading", { name: "도쿄" })).not.toBeInTheDocument();
});

test("유효하지 않은 코드에서는 네트워크 요청을 보내지 않음", async () => {
  render(<View initial="/destinations/INVALID_CODE" />);
  expect(screen.getByRole("alert")).toHaveTextContent("올바르지 않은 여행지 주소");
  await waitFor(() => expect(getDestinationApi).not.toHaveBeenCalled());
  expect(getDestinationPlacesApi).not.toHaveBeenCalled();
});

test("요청 실패 시 재조회 가능", async () => {
  getDestinationApi.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(destination);
  render(<View />);
  const retry = await screen.findByRole("button", { name: "다시 조회" });
  fireEvent.click(retry);
  expect(await screen.findByRole("heading", { name: "도쿄" })).toBeInTheDocument();
  expect(getDestinationApi).toHaveBeenCalledTimes(2);
});


test("여행지 내 검색은 실제 등록된 장소만 필터링하고 추가 서버 호출을 하지 않음", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.change(screen.getByRole("searchbox", { name: "이 여행지 안에서 장소 찾기" }), { target: { value: "센소지" } });
  expect(screen.getByText("검색 결과 1곳")).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /상세 보기$/ })).toHaveLength(1);
  expect(screen.getByRole("button", { name: "센소지 상세 보기" })).toBeInTheDocument();
  expect(getDestinationPlacesApi).toHaveBeenCalledTimes(1);
});

test("카테고리와 검색어가 교집합으로 적용되고 조건을 초기화할 수 있음", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.click(within(screen.getByRole("group", { name: "장소 카테고리" })).getByRole("button", { name: "맛집" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "이 여행지 안에서 장소 찾기" }), { target: { value: "센소지" } });
  expect(screen.getByText("검색 결과 0곳")).toBeInTheDocument();
  expect(screen.getByText("조건에 맞는 장소가 없어요.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "조건 초기화" }));
  expect(screen.queryByText("14곳의 장소를 둘러보세요")).not.toBeInTheDocument();
  expect(screen.getByRole("searchbox", { name: "이 여행지 안에서 장소 찾기" })).toHaveValue("");
  expect(within(screen.getByRole("group", { name: "장소 카테고리" })).getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
});

test("가로형 한 열 카드와 하단 고정 메뉴 안전 여백을 사용", () => {
  const css = fs.readFileSync(path.join(process.cwd(), "src/Destinations/DestinationExplore.css"), "utf8");
  expect(css).toMatch(/\.destination-place-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  expect(css).toMatch(/\.destination-place-card\s*\{[^}]*display:\s*grid/s);
  expect(css).toMatch(/padding:\s*0 16px calc\(108px \+ env\(safe-area-inset-bottom, 0px\)\)/);
  expect(css).not.toMatch(/grid-template-columns:\s*repeat\(3,/);
});


test("도쿄 대표 배너는 장소 사진이 아니라 도시별 출처가 있는 가로형 이미지", async () => {
  render(<View />);
  const heroImage = await screen.findByRole("img", { name: "도쿄 도시 전경" });
  expect(heroImage.getAttribute("src")).toContain("Shinjuku_skyline");
  expect(heroImage.getAttribute("src")).toContain("1280px-Shinjuku");
  expect(screen.getByRole("link", { name: /Luke Ma/ })).toHaveAttribute("href", expect.stringContaining("commons.wikimedia.org"));
  fireEvent.error(heroImage);
  expect(screen.queryByRole("img", { name: "도쿄 도시 전경" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Luke Ma/ })).not.toBeInTheDocument();
  const css = fs.readFileSync(path.join(process.cwd(), "src/Destinations/DestinationExplore.css"), "utf8");
  expect(css).toMatch(/\.destination-explore-hero\s*\{[^}]*margin:\s*0 -16px/s);
  expect(css).toMatch(/\.destination-hero-media > img\s*\{[^}]*object-fit:\s*cover/s);
});

test("부산 도시 배너는 독립 대표사진을 사용하고 장소 사진으로 대체하지 않음", async () => {
  const { getDestinationHero } = require("./destinationHeroPhotos");
  const busanHero = getDestinationHero("busan");
  expect(busanHero?.source).toContain("commons.wikimedia.org");
  getDestinationApi.mockResolvedValue({ code: "busan", name: "부산", countryName: "대한민국", scope: "DOMESTIC" });
  getDestinationPlacesApi.mockResolvedValue([{ ...places[0], region: "부산", name: "해운대", imageUrl: "https://example.test/place-only.jpg" }]);
  render(<View initial="/destinations/busan" />);
  expect(await screen.findByRole("heading", { name: "부산" })).toBeInTheDocument();
  const hero = screen.getByRole("img", { name: "부산 도시 전경" });
  expect(hero).toHaveAttribute("src", busanHero.src);
  expect(hero).not.toHaveAttribute("src", "https://example.test/place-only.jpg");
  expect(screen.getByRole("link", { name: /사진: .* · / })).toHaveAttribute("href", busanHero.source);
  fireEvent.error(hero);
  expect(screen.queryByRole("img", { name: "부산 도시 전경" })).not.toBeInTheDocument();
});

test("홍콩·오사카 도시 대표사진은 각각 독립된 사진 및 출처를 가짐", () => {
  const { getDestinationHero } = require("./destinationHeroPhotos");
  const tokyo = getDestinationHero("tokyo");
  const hongKong = getDestinationHero("hong-kong");
  const osaka = getDestinationHero("osaka");
  expect([tokyo, hongKong, osaka].every(hero => hero.src.startsWith("https://upload.wikimedia.org/"))).toBe(true);
  expect(new Set([tokyo.src, hongKong.src, osaka.src]).size).toBe(3);
  expect([tokyo, hongKong, osaka].every(hero => hero.source.startsWith("https://commons.wikimedia.org/") && hero.author && hero.license)).toBe(true);
  expect(getDestinationHero("__proto__")).toBeNull();
});

test("카테고리 숫자·불필요한 제목·주소를 없애고 각 장소에서 폴더 저장을 선택할 수 있음", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  const group = screen.getByRole("group", { name: "장소 카테고리" });
  expect(within(group).getByRole("button", { name: "전체" })).toBeInTheDocument();
  expect(within(group).getByRole("button", { name: "명소" })).toBeInTheDocument();
  expect(within(group).queryByText("14")).not.toBeInTheDocument();
  expect(screen.queryByText("도시의 장소들")).not.toBeInTheDocument();
  expect(screen.queryByText("일본 도쿄")).not.toBeInTheDocument();
  const picker = screen.getByRole("button", { name: "센소지 폴더에 저장" });
  const card = picker.closest("article");
  expect(picker).toHaveTextContent("폴더 저장");
  expect(within(card).getByRole("button", { name: "센소지 일정에 추가" })).toHaveTextContent("일정 추가");
  expect(card.querySelector(".place-explore-divider")).toHaveTextContent("|");
  fireEvent.click(picker);
  expect(mockOpenFolderPicker).toHaveBeenCalledTimes(1);
  expect(mockOpenFolderPicker.mock.calls[0][1]).toMatchObject({ id: 1, name: "센소지" });
});

test("도시 탐색 카드에서 장소별 빠른 일정 추가 창을 열고 닫을 수 있음", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.click(screen.getByRole("button", { name: "센소지 일정에 추가" }));
  const call = mockQuickTripAddModal.mock.calls.findLast(([props]) => props.place?.id === 1);
  expect(call?.[0].place.name).toBe("센소지");
  act(() => call[0].onClose());
});


test("detail back restores the exact city position even with StrictMode effect cleanup", async () => {
  window.sessionStorage.clear();
  const beforeScroll = window.scrollTo;
  const beforeFrame = window.requestAnimationFrame;
  const beforeCancel = window.cancelAnimationFrame;
  const beforeY = Object.getOwnPropertyDescriptor(window, "scrollY");
  const scheduled = new Map();
  let nextFrame = 0;
  let currentY = 720;
  window.scrollTo = jest.fn((x, y) => { currentY = y; });
  Object.defineProperty(window, "scrollY", { configurable: true, get: () => currentY });
  window.requestAnimationFrame = callback => {
    const id = ++nextFrame;
    scheduled.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = id => scheduled.delete(id);
  const flushFrame = () => {
    const callbacks = Array.from(scheduled.values());
    scheduled.clear();
    callbacks.forEach(callback => callback());
  };
  try {
    render(<React.StrictMode><View /></React.StrictMode>);
    await screen.findByRole("heading", { name: "도쿄" });
    fireEvent.change(screen.getByRole("searchbox", { name: "이 여행지 안에서 장소 찾기" }), { target: { value: "장소" } });
    fireEvent.click(screen.getByRole("button", { name: "장소 더 보기 (12/13)" }));
    expect(screen.getByTestId("current-path")).toHaveTextContent("shown=24");
    fireEvent.click(screen.getByRole("button", { name: "도쿄 장소 13 상세 보기" }));
    expect(screen.getByText("장소 상세")).toBeInTheDocument();
    currentY = 0; // The shorter detail screen may have reset the document scroll.
    fireEvent.click(screen.getByRole("button", { name: "상세에서 돌아가기" }));
    await screen.findByRole("heading", { name: "도쿄" });
    expect(screen.getByRole("searchbox", { name: "이 여행지 안에서 장소 찾기" })).toHaveValue("장소");
    expect(screen.getByRole("button", { name: "도쿄 장소 13 상세 보기" })).toBeInTheDocument();
    expect(window.scrollTo).not.toHaveBeenCalled();
    act(flushFrame);
    act(flushFrame);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 720);
    expect(window.sessionStorage.length).toBe(0);
  } finally {
    window.scrollTo = beforeScroll;
    window.requestAnimationFrame = beforeFrame;
    window.cancelAnimationFrame = beforeCancel;
    if (beforeY) Object.defineProperty(window, "scrollY", beforeY);
    else delete window.scrollY;
    window.sessionStorage.clear();
  }
});


test("destination hero does not show redundant back-to-search links", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  expect(screen.queryByRole("link", { name: /검색으로 돌아가기/ })).not.toBeInTheDocument();
});

test("destination load/error states do not show redundant back-to-search links", async () => {
  getDestinationApi.mockRejectedValueOnce(new Error("offline"));
  render(<View />);
  await screen.findByRole("alert");
  expect(screen.queryByRole("link", { name: /검색으로 돌아가기/ })).not.toBeInTheDocument();
});

test("cycles icon and Korean sort labels within the selected category", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.click(within(screen.getByRole("group", { name: "장소 카테고리" })).getByRole("button", { name: "명소" }));
  const results = screen.getByRole("list");
  const names = () => within(results).getAllByRole("button", { name: /상세 보기$/ }).map(x => x.getAttribute("aria-label"));
  expect(names()[0]).toBe("센소지 상세 보기");
  fireEvent.click(screen.getByRole("button", { name: /기본순 정렬, 누르면 좋아요순/ }));
  await waitFor(() => expect(names()[0]).toBe("도쿄 장소 1 상세 보기"));
  fireEvent.click(screen.getByRole("button", { name: /좋아요순 정렬, 누르면 리뷰순/ }));
  expect(names()[0]).toBe("도쿄 장소 2 상세 보기");
  fireEvent.click(screen.getByRole("button", { name: /리뷰순 정렬, 누르면 기본순/ }));
  expect(names()[0]).toBe("센소지 상세 보기");
  expect(getPlaceEngagementApi).toHaveBeenCalledTimes(1);
});

test("retains category, keyword, sort and more count after detail navigation", async () => {
  getDestinationPlacesApi.mockResolvedValue(Array.from({ length: 27 }, (_, i) => ({
    id: i + 1, name: `도쿄 장소 ${i}`, region: "도쿄", address: "도쿄",
    placeCategory: "LANDMARK", placeCategoryLabel: "명소",
  })));
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.click(within(screen.getByRole("group", { name: "장소 카테고리" })).getByRole("button", { name: "명소" }));
  fireEvent.change(screen.getByRole("searchbox", { name: "이 여행지 안에서 장소 찾기" }), { target: { value: "도쿄" } });
  fireEvent.click(screen.getByRole("button", { name: /기본순 정렬, 누르면 좋아요순/ }));
  await waitFor(() => expect(screen.queryByText("좋아요순 정렬 중...")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /장소 더 보기/ }));
  expect(screen.getByTestId("current-path")).toHaveTextContent("shown=24");
  fireEvent.click(screen.getByRole("button", { name: "도쿄 장소 13 상세 보기" }));
  expect(screen.getByText("장소 상세")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "상세에서 돌아가기" }));
  await screen.findByRole("heading", { name: "도쿄" });
  expect(screen.getByTestId("current-path")).toHaveTextContent("category=LANDMARK");
  expect(screen.getByTestId("current-path")).toHaveTextContent("q=%EB%8F%84%EC%BF%84");
  expect(screen.getByTestId("current-path")).toHaveTextContent("sort=likes");
  expect(screen.getByTestId("current-path")).toHaveTextContent("shown=24");
  expect(screen.getByRole("searchbox", { name: "이 여행지 안에서 장소 찾기" })).toHaveValue("도쿄");
  await screen.findByRole("button", { name: "도쿄 장소 13 상세 보기" });
  expect(screen.getAllByRole("button", { name: /상세 보기$/ })).toHaveLength(24);
});

test("failed counts cannot be presented as a valid popularity sort", async () => {
  getPlaceEngagementApi.mockRejectedValueOnce(new Error("offline"));
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.click(screen.getByRole("button", { name: /기본순 정렬, 누르면 좋아요순/ }));
  expect(await screen.findByRole("alert")).toHaveTextContent("정렬 정보를 불러오지 못했어요");
  expect(screen.queryByRole("button", { name: "센소지 상세 보기" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(await screen.findByRole("button", { name: "센소지 상세 보기" })).toBeInTheDocument();
});

test("displays verified like totals beneath destination cards, including true zero", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  expect(await screen.findByLabelText("센소지 좋아요 10개")).toHaveTextContent("10");
  expect(screen.getByLabelText("도쿄 장소 3 좋아요 0개")).toHaveTextContent("0");
  expect(getPlaceEngagementApi).toHaveBeenCalledTimes(1);
});

test("hides unknown like totals rather than claiming they are zero", async () => {
  getPlaceEngagementApi.mockRejectedValueOnce(new Error("offline"));
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  await waitFor(() => expect(getPlaceEngagementApi).toHaveBeenCalledTimes(1));
  expect(screen.queryByLabelText("센소지 좋아요 10개")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("센소지 좋아요 0개")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "센소지 좋아요 추가" })).toBeInTheDocument();
});

test("recommend-origin destination URL survives category and sort changes", async () => {
  render(<View initial="/destinations/tokyo?from=recommend" />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.click(within(screen.getByRole("group", { name: "장소 카테고리" })).getByRole("button", { name: "명소" }));
  expect(screen.getByTestId("current-path")).toHaveTextContent("from=recommend");
  fireEvent.click(screen.getByRole("button", { name: /기본순 정렬, 누르면 좋아요순/ }));
  expect(screen.getByTestId("current-path")).toHaveTextContent("from=recommend");
  expect(screen.getByTestId("current-path")).toHaveTextContent("sort=likes");
});

test("like totals are grouped under the clickable heart, not at the card bottom", async () => {
  render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  const heart = screen.getByRole("button", { name: "센소지 좋아요 추가" });
  const stack = heart.closest(".place-explore-favorite-stack");
  expect(stack).not.toBeNull();
  expect(stack).toContainElement(await screen.findByLabelText("센소지 좋아요 10개"));
  expect(stack.parentElement).toHaveClass("place-explore-topline");
});

test("a favorite refresh preserves sorted card titles and categories until new counts arrive", async () => {
  const originalCounts = ids => ids.map(id => ({
    placeId: Number(id), likeCount: id === 2 ? 30 : id === 1 ? 10 : 0, reviewCount: 0,
  }));
  let completeRefresh;
  const refreshPending = new Promise(resolve => { completeRefresh = resolve; });
  getPlaceEngagementApi
    .mockImplementationOnce(async ids => originalCounts(ids))
    .mockImplementationOnce(() => refreshPending);
  const { rerender } = render(<View />);
  await screen.findByRole("heading", { name: "도쿄" });
  fireEvent.click(screen.getByRole("button", { name: /기본순 정렬, 누르면 좋아요순/ }));
  expect(await screen.findByRole("button", { name: "도쿄 장소 1 상세 보기" })).toBeInTheDocument();
  const firstCard = screen.getByRole("button", { name: "도쿄 장소 1 상세 보기" }).closest(".place-explore-card");
  const category = firstCard.querySelector(".destination-place-kind");
  expect(category).toHaveTextContent("명소");

  mockFavoriteStatus.mockReturnValue("success");
  rerender(<View />);
  await waitFor(() => expect(getPlaceEngagementApi).toHaveBeenCalledTimes(2));
  expect(screen.getByRole("button", { name: "도쿄 장소 1 상세 보기" }).closest(".place-explore-card")).toBe(firstCard);
  expect(category).toHaveTextContent("명소");
  expect(screen.queryByText("좋아요순 정렬 중...")).not.toBeInTheDocument();

  await act(async () => { completeRefresh(originalCounts(places)); });
  expect(screen.getByRole("button", { name: "도쿄 장소 1 상세 보기" })).toBeInTheDocument();
});
