import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Detail from "./Detail";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";
import api from "../api/api";
import { SavedPlacesProvider, useSavedPlaces } from "../Context/SavedPlacesContext";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn().mockResolvedValue({}), put: jest.fn(), delete: jest.fn() }, getAccessToken: () => "test-session", getApiErrorMessage: (_, fallback) => fallback }));
jest.mock("../utils/recentPlaces", () => ({ saveRecentPlace: jest.fn() }));
jest.mock("../api/placeEngagementApi", () => ({ getPlaceEngagementApi: jest.fn() }));
const place = id => ({ id, name: "장소 " + id, address: "주소 " + id });
const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
beforeAll(() => { HTMLElement.prototype.scrollIntoView = jest.fn(); });
afterAll(() => { HTMLElement.prototype.scrollIntoView = originalScrollIntoView; });
beforeEach(() => { jest.clearAllMocks(); getPlaceEngagementApi.mockImplementation(async ids => ids.map(id => ({ placeId: Number(id), likeCount: 12, reviewCount: 0 }))); api.post.mockResolvedValue({}); api.put.mockResolvedValue({data:{}}); api.delete.mockResolvedValue({}); api.get.mockImplementation(async url => ({ data: url === "/api/folders" ? [] : isPagedReview(url) ? emptyReviewPage() : place(Number(url.split("/").pop())) })); });
function Nav() { const navigate = useNavigate(); return <><button onClick={() => navigate("/detail?id=2")}>B로 이동</button><Detail /></>; }
function SavedState() { const {isSaved}=useSavedPlaces(); return <p data-testid="shared-saved-state">{isSaved(1) ? "저장됨" : "미저장"}</p>; }
const setup = () => render(<MemoryRouter initialEntries={["/detail?id=1"]}><SavedPlacesProvider><Nav /><SavedState /></SavedPlacesProvider></MemoryRouter>);
const emptyReviewPage = (page = 0) => ({ content: [], page, totalPages: 0, totalElements: 0, averageRating: null });
const isPagedReview = url => url.includes("/reviews/paged");
test("reviews are fetched in pages, not as one unbounded list", async () => {
  api.get.mockImplementation(async (url, options) => ({ data: isPagedReview(url) ? {
    content: Array.from({ length: options.params.page === 0 ? 5 : 2 }, (_, i) => ({
      id: options.params.page * 5 + i + 1, rating: 4, comment: "리뷰 " + (options.params.page * 5 + i),
      photos: i === 0 ? ["https://cdn.example/review-photos/example.webp"] : [],
    })), page: options.params.page, totalPages: 2, totalElements: 7, averageRating: 4,
  } : url === "/api/folders" ? [] : place(1) }));
  setup(); await screen.findByText("리뷰 4");
  expect(screen.queryByText("리뷰 5")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "여행자 리뷰 사진 1 크게 보기" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  await screen.findByText("리뷰 6");
  expect(screen.queryByText("리뷰 0")).not.toBeInTheDocument();
  expect(api.get.mock.calls.filter(([url]) => isPagedReview(url))).toHaveLength(2);
  expect(api.get.mock.calls.some(([url]) => url.endsWith("/reviews"))).toBe(false);
});
test("review failure and saved-state failure do not erase detail or mean empty/not saved", async () => {
  api.get.mockImplementation(async url => { if (isPagedReview(url) || url === "/api/folders") throw new Error("fail"); return { data: place(1) }; });
  setup(); expect(await screen.findByRole("heading", { name: "장소 1" })).toBeInTheDocument();
  expect(await screen.findByText("리뷰를 잠시 불러올 수 없어요.")).toBeInTheDocument();
  expect(screen.queryByText("아직 리뷰가 없어요!")).not.toBeInTheDocument();
  const toggle = screen.getByRole("button", { name: "폴더 저장" }); expect(toggle).toBeDisabled();
  fireEvent.click(toggle); expect(api.delete).not.toHaveBeenCalled();
  const callsBefore = api.get.mock.calls.filter(([url]) => url === "/api/places/1").length;
  api.get.mockImplementation(async url => ({ data: isPagedReview(url) ? emptyReviewPage() : url === "/api/folders" ? [] : place(1) }));
  fireEvent.click(screen.getByRole("button", { name: "리뷰 다시 시도" }));
  expect(await screen.findByText("아직 리뷰가 없어요!")).toBeInTheDocument();
  expect(api.get.mock.calls.filter(([url]) => url === "/api/places/1")).toHaveLength(callsBefore);
});
test("zero reviews shows an unobtrusive empty message, never a failure/retry UI", async () => {
  setup();
  expect(await screen.findByText("아직 리뷰가 없어요!")).toBeInTheDocument();
  expect(screen.queryByText("리뷰를 잠시 불러올 수 없어요.")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "리뷰 다시 시도" })).not.toBeInTheDocument();
  expect(screen.getByText("평점 미제공")).toBeInTheDocument();
  expect(screen.getByText("(0)")).toBeInTheDocument();
  expect(screen.getByText("첫 리뷰를 남겨보세요.")).toBeInTheDocument();
});
test("late A detail never overwrites B", async () => {
  let resolveA; const pending = new Promise(resolve => { resolveA = resolve; });
  api.get.mockImplementation(async url => url === "/api/places/1" ? pending : { data: url === "/api/folders" ? [] : isPagedReview(url) ? emptyReviewPage() : place(2) });
  setup(); fireEvent.click(screen.getByRole("button", { name: "B로 이동" }));
  expect(await screen.findByRole("heading", { name: "장소 2" })).toBeInTheDocument();
  await act(async () => resolveA({ data: place(1) })); expect(screen.queryByRole("heading", { name: "장소 1" })).not.toBeInTheDocument();
});

test("API photo wins over the curated Mock photo and failed photos stay neutral", async () => {
  api.get.mockImplementation(async url => ({ data: url === "/api/folders" ? [] : isPagedReview(url) ? emptyReviewPage() : {
    id: 1, name: "서울숲", address: "서울", imageUrl: "/api-photo-fixture.jpg"
  } }));
  setup();
  const photo = await screen.findByRole("img", { name: "서울숲", exact: true });
  expect(photo).toHaveAttribute("src", "/api-photo-fixture.jpg");
  expect(screen.queryByRole("link", { name: "서울숲 사진 출처" })).not.toBeInTheDocument();
  fireEvent.error(photo);
  expect(screen.getByRole("img", { name: "서울숲 사진 정보 없음" })).toBeInTheDocument();
});

function mockFolders(server) {
  api.get.mockImplementation(async url => {
    if (url === "/api/folders") return {data:Object.keys(server).map(id => ({id,name:id === "3" ? "좋아하는 장소" : id === "1" ? "첫 폴더" : "둘째 폴더", systemType: id === "3" ? "FAVORITES" : null}))};
    const folder = url.match(/^\/api\/folders\/(\d+)\/places$/);
    if (folder) return {data:[...server[folder[1]]]};
    return {data:isPagedReview(url) ? emptyReviewPage() : place(Number(url.split("/").pop()))};
  });
}

test("detail top heart saves and removes only system FAVORITES, never opening the folder picker", async () => {
  const server = { 1: [place(1)], 3: [] }; mockFolders(server);
  api.put.mockImplementation(async url => { server[3] = [place(1)]; return { data: { placeId: 1, liked: true } }; });
  api.delete.mockImplementation(async url => { if (url === "/api/favorites/places/1") server[3] = []; return { data: { placeId: 1, liked: false } }; });
  setup();
  const heart = await screen.findByRole("button", { name: "장소 1 좋아요 추가" });
  await waitFor(() => expect(heart).toBeEnabled());
  fireEvent.click(heart);
  await waitFor(() => expect(screen.getByRole("button", { name: "장소 1 좋아요 해제" })).toBeEnabled());
  expect(api.put).toHaveBeenCalledWith("/api/favorites/places/1");
  expect(screen.queryByRole("dialog", { name: "폴더 선택" })).not.toBeInTheDocument();
  expect(server[1]).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "장소 1 좋아요 해제" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "장소 1 좋아요 추가" })).toBeEnabled());
  expect(api.delete).toHaveBeenCalledWith("/api/favorites/places/1");
  expect(server[1]).toHaveLength(1);
});

test("detail bottom folder picker removes one checked folder without touching another or favorites", async () => {
  const server = { 1: [place(1)], 2: [place(1)], 3: [place(1)] }; mockFolders(server);
  api.delete.mockImplementation(async url => { if (url === "/api/folders/2/places/1") server[2] = []; return { data: {} }; });
  setup(); const picker = await screen.findByRole("button", { name: "폴더 저장", exact: true });
  await waitFor(() => expect(picker).toBeEnabled()); fireEvent.click(picker);
  const modal = await screen.findByRole("dialog", { name: "폴더 선택" });
  fireEvent.click(await within(modal).findByRole("checkbox", { name: "둘째 폴더 저장 해제" }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/api/folders/2/places/1"));
  await waitFor(() => expect(within(modal).getByRole("checkbox", { name: "둘째 폴더 저장" })).toBeInTheDocument());
  expect(server[1]).toHaveLength(1); expect(server[3]).toHaveLength(1);
  expect(screen.getByTestId("shared-saved-state")).toHaveTextContent("저장됨");
  expect(screen.getByRole("button", { name: "장소 1 좋아요 해제" })).toHaveAttribute("aria-pressed", "true");
});

test("uncertain checkbox response never automatically repeats DELETE and keeps shared saved state until read", async () => {
  const server = { 1: [place(1)], 2: [place(1)], 3: [] }; mockFolders(server);
  api.delete.mockImplementation(async () => { server[2] = []; throw new Error("response lost"); });
  setup(); const picker = await screen.findByRole("button", { name: "폴더 저장", exact: true });
  await waitFor(() => expect(picker).toBeEnabled()); fireEvent.click(picker);
  const modal = await screen.findByRole("dialog", { name: "폴더 선택" });
  fireEvent.click(await within(modal).findByRole("checkbox", { name: "둘째 폴더 저장 해제" }));
  const retry = await screen.findByRole("button", { name: "변경 결과 확인" });
  expect(api.delete).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("shared-saved-state")).toHaveTextContent("저장됨");
  fireEvent.click(retry);
  await waitFor(() => expect(within(modal).getByRole("checkbox", { name: "둘째 폴더 저장" })).toBeInTheDocument());
  expect(api.delete).toHaveBeenCalledTimes(1);
});

test("partial folder membership read disables all checkbox writes", async () => {
  const server = { 1: [place(1)], 2: [place(1)], 3: [] }; mockFolders(server);
  const existing = api.get.getMockImplementation();
  api.get.mockImplementation(async url => { if (url === "/api/folders/2/places") throw new Error("failed"); return existing(url); });
  setup(); const picker = await screen.findByRole("button", { name: "폴더 저장", exact: true });
  await waitFor(() => expect(picker).toBeEnabled()); fireEvent.click(picker);
  const modal = await screen.findByRole("dialog", { name: "폴더 선택" });
  const checkbox = await within(modal).findByRole("checkbox", { name: "첫 폴더 저장 해제" });
  expect(checkbox).toBeDisabled(); fireEvent.click(checkbox);
  expect(api.delete).not.toHaveBeenCalled();
  expect(screen.getByTestId("shared-saved-state")).toHaveTextContent("저장됨");
});


test("detail opens directions and quick trip modal without changing folder and heart controls", async () => {
  api.get.mockImplementation(async url => ({ data: url === "/api/folders" ? [] : isPagedReview(url) ? emptyReviewPage() :
    { ...place(1), region: "홍콩", latitude: 22.27, longitude: 114.15 } }));
  setup();
  await screen.findByRole("heading", { name: "장소 1" });
  const maps = screen.getByRole("link", { name: "구글맵 길찾기" });
  expect(maps).toHaveAttribute("target", "_blank");
  expect(maps.getAttribute("href")).toContain("www.google.com/maps/dir/");
  fireEvent.click(screen.getByRole("button", { name: "일정 추가" }));
  expect(await screen.findByRole("dialog", { name: "일정에 추가" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "폴더 저장", exact: true })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "장소 1 좋아요 추가" })).toBeInTheDocument();
});

test("detail presents review reading view and routes review writing out of the page", async () => {
  setup();
  await screen.findByRole("heading", { name: "장소 1" });
  expect(screen.getByRole("heading", { name: "리뷰" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "기본 정보" })).toBeInTheDocument();
  expect(screen.queryByRole("combobox", { name: "별점" })).not.toBeInTheDocument();
  expect(screen.queryByRole("textbox", { name: "후기" })).not.toBeInTheDocument();
  expect(screen.queryByText("#추천")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /리뷰 작성하기/ })).toBeInTheDocument();
});

test("detail shows the verified count directly beneath its heart", async () => {
  setup();
  const title = await screen.findByRole("heading", { name: "장소 1" });
  expect(title).toBeInTheDocument();
  const stack = screen.getByRole("button", { name: "장소 1 좋아요 추가" }).closest(".detail-favorite-stack");
  expect(stack).not.toBeNull();
  expect(stack).toContainElement(await screen.findByLabelText("장소 1 좋아요 12개"));
  expect(getPlaceEngagementApi).toHaveBeenCalledWith([1], expect.objectContaining({ signal: expect.any(AbortSignal) }));
});

test("detail does not claim zero likes if the count lookup failed", async () => {
  getPlaceEngagementApi.mockRejectedValueOnce(new Error("offline"));
  setup();
  expect(await screen.findByRole("heading", { name: "장소 1" })).toBeInTheDocument();
  await waitFor(() => expect(getPlaceEngagementApi).toHaveBeenCalledTimes(1));
  expect(screen.queryByLabelText("장소 1 좋아요 0개")).not.toBeInTheDocument();
});
