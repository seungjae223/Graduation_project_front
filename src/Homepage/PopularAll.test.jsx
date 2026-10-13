import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PopularAll from "./PopularAll";
import api from "../api/api";

let mockAccount = "account:A";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => mockAccount }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccount }) }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockToggle = jest.fn();
jest.mock("../utils/usePlaceSaving", () => ({ __esModule: true, default: () => ({ isSaved: () => false, toggle: mockToggle, folders: { status: "idle" }, open: false }) }));

const rows = (count, region = "도쿄", offset = 0) => Array.from({ length: count }, (_, index) => ({
  id: offset + index + 1, name: `${region} 장소 ${index + 1}`, region, theme: "HEALING", placeType: "ATTRACTION",
}));
const setup = () => render(<MemoryRouter><PopularAll /></MemoryRouter>);
const more = () => screen.getByRole("region", { name: "더 많은 장소" });
const moreLinks = () => within(more()).getAllByRole("link");
beforeEach(() => {
  jest.resetAllMocks(); mockAccount = "account:A";
  Element.prototype.scrollIntoView = jest.fn();
  window.matchMedia = jest.fn(() => ({ matches: false }));
});
afterEach(() => jest.restoreAllMocks());

test("23 more places paginate 5/5/5/5/3 without repeating featured cards or re-requesting", async () => {
  api.get.mockResolvedValue({ data: rows(27).reverse() });
  setup(); await screen.findByRole("heading", { name: "더 많은 장소" });
  expect(moreLinks().map(link => link.textContent)).toEqual(rows(27).slice(4, 9).map(place => place.name));
  expect(screen.getByRole("button", { name: "이전", exact: true })).toBeDisabled();
  expect(screen.getByRole("button", { name: "1페이지", exact: true })).toHaveAttribute("aria-current", "page");
  fireEvent.click(screen.getByRole("button", { name: "다음", exact: true }));
  expect(moreLinks().map(link => link.textContent)).toEqual(rows(27).slice(9, 14).map(place => place.name));
  expect(screen.getByRole("heading", { name: "더 많은 장소" })).toHaveFocus();
  expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  fireEvent.click(screen.getByRole("button", { name: "5페이지", exact: true }));
  expect(moreLinks().map(link => link.textContent)).toEqual(rows(27).slice(24, 27).map(place => place.name));
  expect(screen.getByRole("button", { name: "다음", exact: true })).toBeDisabled();
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith("/api/places", expect.objectContaining({ signal: expect.any(AbortSignal) }));
  expect(api.get.mock.calls[0][1].params).toBeUndefined();
});

test("countries come only from region data; text matches cannot fabricate countries", async () => {
  const places = [
    { id: 1, name: "일본 태국 한국 음식점 JP", region: "뉴욕", address: "서울 도쿄 방콕", description: "베트남 여행" },
    ...rows(2, "방콕", 1), ...rows(1, "마닐라", 3), ...rows(1, "다낭", 4), ...rows(1, "홍콩", 5),
  ];
  api.get.mockResolvedValue({ data: places });
  setup(); await screen.findByRole("button", { name: "미국", exact: true });
  const filters = within(screen.getByRole("group", { name: "국가별 장소 필터" }));
  expect(filters.queryByRole("button", { name: "일본", exact: true })).not.toBeInTheDocument();
  expect(filters.queryByRole("button", { name: "한국", exact: true })).not.toBeInTheDocument();
  expect(filters.queryByRole("button", { name: "동남아", exact: true })).not.toBeInTheDocument();
  expect(filters.getByRole("button", { name: "필리핀", exact: true })).toBeInTheDocument();
  expect(filters.getByRole("button", { name: "베트남", exact: true })).toBeInTheDocument();
  expect(filters.getByRole("button", { name: "중국(홍콩)", exact: true })).toBeInTheDocument();
  fireEvent.click(filters.getByRole("button", { name: "태국", exact: true }));
  expect(screen.getAllByRole("link").map(link => link.textContent)).toEqual(["방콕 장소 1", "방콕 장소 2"]);
  expect(api.get).toHaveBeenCalledTimes(1);
});

test("country changes atomically reset to page one and keep unsupported regions in All", async () => {
  api.get.mockResolvedValue({ data: [...rows(15), ...rows(10, "서울", 15), ...rows(1, "미분류 지역", 25)] });
  setup(); await screen.findByRole("button", { name: "3페이지", exact: true });
  fireEvent.click(screen.getByRole("button", { name: "3페이지", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "한국", exact: true }));
  expect(screen.getByRole("button", { name: "1페이지", exact: true })).toHaveAttribute("aria-current", "page");
  expect(moreLinks().map(link => link.textContent)).toEqual(rows(10, "서울", 15).slice(4, 9).map(place => place.name));
  fireEvent.click(screen.getByRole("button", { name: "전체", exact: true }));
  expect(screen.getByRole("button", { name: "1페이지", exact: true })).toHaveAttribute("aria-current", "page");
  fireEvent.click(screen.getByRole("button", { name: "5페이지", exact: true }));
  expect(screen.getByRole("link", { name: "미분류 지역 장소 1" })).toBeInTheDocument();
});

test.each([4, 5, 9])("%s total records show no unnecessary pagination controls", async count => {
  api.get.mockResolvedValue({ data: rows(count) });
  setup(); await screen.findByRole("link", { name: "도쿄 장소 1", exact: true });
  expect(screen.queryByRole("navigation", { name: "더 많은 장소 페이지" })).not.toBeInTheDocument();
  expect(screen.getAllByRole("link")).toHaveLength(count);
});

test("many pages are abbreviated and reduced motion is respected", async () => {
  api.get.mockResolvedValue({ data: rows(104) });
  window.matchMedia = jest.fn(() => ({ matches: true }));
  setup(); await screen.findByRole("button", { name: "20페이지", exact: true });
  const nav = within(screen.getByRole("navigation", { name: "더 많은 장소 페이지" }));
  expect(nav.getAllByRole("button")).toHaveLength(7);
  expect(nav.queryByRole("button", { name: "10페이지", exact: true })).not.toBeInTheDocument();
  fireEvent.click(nav.getByRole("button", { name: "20페이지", exact: true }));
  expect(moreLinks()).toHaveLength(5);
  expect(Element.prototype.scrollIntoView).toHaveBeenLastCalledWith({ behavior: "auto", block: "start" });
});

test("empty and failed API bodies have distinct feedback and retry does not invent data", async () => {
  api.get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ data: [] });
  setup(); await screen.findByRole("alert");
  expect(screen.queryByText("등록된 장소가 없어요.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "목록 다시 조회", exact: true }));
  await screen.findByText("등록된 장소가 없어요.");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByRole("navigation", { name: "더 많은 장소 페이지" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "일본", exact: true })).not.toBeInTheDocument();
});

test("late responses cannot restore another account's filters or page", async () => {
  let finishOld;
  api.get.mockReturnValueOnce(new Promise(resolve => { finishOld = resolve; })).mockResolvedValueOnce({ data: rows(10, "서울") });
  const view = setup(); mockAccount = "account:B";
  view.rerender(<MemoryRouter><PopularAll /></MemoryRouter>);
  await screen.findByRole("button", { name: "한국", exact: true });
  await act(async () => finishOld({ data: rows(27) }));
  expect(screen.queryByRole("button", { name: "일본", exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "1페이지", exact: true })).toHaveAttribute("aria-current", "page");
  expect(moreLinks().map(link => link.textContent)).toEqual(rows(10, "서울").slice(4, 9).map(place => place.name));
});

test("the saved-place button still uses the original ID on later pages", async () => {
  api.get.mockResolvedValue({ data: rows(14) });
  setup(); await screen.findByRole("button", { name: "2페이지", exact: true });
  fireEvent.click(screen.getByRole("button", { name: "2페이지", exact: true }));
  fireEvent.click(within(more()).getAllByRole("button", { name: "저장", exact: true })[0]);
  expect(mockToggle).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ id: "10", region: "도쿄" }), false);
});

test("country strip omits arrows and captions while keeping full accessible names and filtering", async () => {
  api.get.mockResolvedValue({ data: ["뉴욕", "다낭", "도쿄", "홍콩", "방콕", "마닐라", "서울"].flatMap((region, index) => rows(10, region, index * 10)) });
  setup(); await screen.findByRole("button", { name: "한국", exact: true });
  expect(screen.queryByRole("button", { name: "이전 국가 보기" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "다음 국가 보기" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "전체", exact: true })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "2페이지", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "중국(홍콩)", exact: true }));
  expect(screen.queryByText(/선택한 국가:/)).not.toBeInTheDocument();
  expect(screen.queryByText("마우스로 끌기 · 손가락으로 밀기")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "중국(홍콩)", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "중국(홍콩)", exact: true })).toHaveAttribute("title", "중국(홍콩)");
  expect(screen.getByRole("button", { name: "1페이지", exact: true })).toHaveAttribute("aria-current", "page");
  expect(moreLinks().map(link => link.textContent)).toEqual(rows(10, "홍콩", 30).slice(4, 9).map(place => place.name));
  expect(api.get).toHaveBeenCalledTimes(1);
});

test("short country lists omit unnecessary navigation", async () => {
  api.get.mockResolvedValue({ data: rows(10) });
  setup(); await screen.findByRole("button", { name: "일본", exact: true });
  expect(screen.queryByRole("group", { name: "국가 필터 이동" })).not.toBeInTheDocument();
  expect(screen.queryByText("마우스로 끌기 · 손가락으로 밀기")).not.toBeInTheDocument();
});

const pointer = (target, type, options = {}) => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 250, clientY: 20, ...options });
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 1 },
    pointerType: { value: options.pointerType ?? "mouse" },
  });
  fireEvent(target, event);
  return event;
};
const dragSetup = async () => {
  api.get.mockResolvedValue({ data: ["뉴욕", "다낭", "도쿄", "홍콩", "방콕", "마닐라", "서울"].flatMap((region, index) => rows(10, region, index * 10)) });
  setup(); await screen.findByRole("button", { name: "한국", exact: true });
  const strip = screen.getByRole("group", { name: "국가별 장소 필터" });
  Object.defineProperties(strip, {
    clientWidth: { configurable: true, value: 288 },
    scrollWidth: { configurable: true, value: 584 },
    scrollLeft: { configurable: true, writable: true, value: 0 },
    setPointerCapture: { configurable: true, value: jest.fn() },
    hasPointerCapture: { configurable: true, value: () => true },
    releasePointerCapture: { configurable: true, value: jest.fn() },
  });
  return strip;
};

test("mouse dragging scrolls countries without selecting them; a subsequent click still filters and resets the page", async () => {
  const strip = await dragSetup();
  const japan = screen.getByRole("button", { name: "일본", exact: true });
  pointer(japan, "pointerdown");
  pointer(strip, "pointermove", { clientX: 100 });
  expect(strip.scrollLeft).toBe(150);
  expect(strip).toHaveClass("is-dragging");
  expect(strip.setPointerCapture).toHaveBeenCalledWith(1);
  pointer(strip, "pointerup", { clientX: 100 });
  expect(strip).not.toHaveClass("is-dragging");
  expect(strip.releasePointerCapture).toHaveBeenCalledWith(1);
  fireEvent.click(japan, { detail: 1 });
  expect(screen.getByRole("button", { name: "전체", exact: true })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "2페이지", exact: true }));
  pointer(japan, "pointerdown");
  pointer(strip, "pointermove", { clientX: 247 });
  pointer(japan, "pointerup", { clientX: 247 });
  fireEvent.click(japan, { detail: 1 });
  expect(japan).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "1페이지", exact: true })).toHaveAttribute("aria-current", "page");
  expect(moreLinks().map(link => link.textContent)).toEqual(rows(10, "도쿄", 20).slice(4, 9).map(place => place.name));
  expect(api.get).toHaveBeenCalledTimes(1);
});

test.each(["pointercancel", "lostpointercapture"])("%s ends a drag, scroll stays within bounds and keyboard activation works", async type => {
  const strip = await dragSetup();
  pointer(strip, "pointerdown");
  pointer(strip, "pointermove", { clientX: -300 });
  expect(strip.scrollLeft).toBe(296);
  pointer(strip, "pointermove", { clientX: 500 });
  expect(strip.scrollLeft).toBe(0);
  pointer(strip, type);
  expect(strip).not.toHaveClass("is-dragging");
  fireEvent.click(screen.getByRole("button", { name: "한국", exact: true }), { detail: 0 });
  expect(screen.getByRole("button", { name: "한국", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("native touch scrolling and vertical gestures are not captured or prevented", async () => {
  const strip = await dragSetup();
  pointer(strip, "pointerdown", { pointerType: "touch" });
  const touchMove = pointer(strip, "pointermove", { pointerType: "touch", clientX: 100 });
  pointer(strip, "pointerup", { pointerType: "touch", clientX: 100 });
  expect(touchMove.defaultPrevented).toBe(false);
  expect(strip.setPointerCapture).not.toHaveBeenCalled();
  expect(strip).not.toHaveClass("is-dragging");
  pointer(strip, "pointerdown");
  const verticalMove = pointer(strip, "pointermove", { clientX: 235, clientY: 100 });
  expect(verticalMove.defaultPrevented).toBe(false);
  expect(strip.scrollLeft).toBe(0);
  pointer(strip, "pointerout", { clientX: 235, clientY: 100 });
  pointer(strip, "pointermove", { clientX: 100 });
  expect(strip.setPointerCapture).not.toHaveBeenCalled();
});
