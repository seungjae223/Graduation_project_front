import { queryByClass, queryAllByClass, getByClass } from "../testQueries";
import fs from "fs";
import path from "path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";

jest.mock("../api/homeRankingsApi", () => ({ getHomeRankingsApi: jest.fn() }));
jest.mock("../api/tripApi", () => ({ getTripsApi: jest.fn() }));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: jest.fn(() => "anonymous") }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: jest.fn(() => ({ accountKey: "anonymous" })) }));
const { getHomeRankingsApi } = require("../api/homeRankingsApi");
const { getTripsApi } = require("../api/tripApi");
const useSessionKey = require("../utils/useSessionKey").default;
const { getAuthSnapshot } = require("../utils/authState");

const rankingFixture = {
  windowDays: 30,
  cities: [
    { code: "osaka", name: "오사카", countryName: "일본", tripCount: 6 },
    { code: "tokyo", name: "도쿄", countryName: "일본", tripCount: 3 },
  ],
  hotPlaces: [
    { placeId: 61, name: "오사카성", region: "오사카", engagementCount: 4, likeCount: 3, reviewCount: 1 },
    { placeId: 62, name: "도톤보리", region: "오사카", engagementCount: 2, likeCount: 2, reviewCount: 0 },
  ],
};
const mount = () => render(<MemoryRouter><Home /></MemoryRouter>);

describe("V12 personalized home and real rankings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSessionKey.mockReturnValue("anonymous");
    getAuthSnapshot.mockReturnValue({ accountKey: "anonymous" });
    getTripsApi.mockResolvedValue([]);
    getHomeRankingsApi.mockResolvedValue(rankingFixture);
  });

  it("keeps search, shows start planning for guests and never reads private trips", async () => {
    mount();
    expect(screen.getByRole("searchbox", { name: "목적지 또는 테마 검색" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /여행 계획 시작하기/ })).toBeInTheDocument();
    expect(getTripsApi).not.toHaveBeenCalled();
    expect(await screen.findByRole("link", { name: "1위 오사카 여행지" })).toHaveAttribute("href", "/destinations/osaka");
    expect(screen.getByText("지금 가볼 만한 장소")).toBeInTheDocument();
    expect(screen.getByText("PLAN YOUR TRIP")).toBeInTheDocument();
    expect(screen.getByText("MY NEXT TRIP")).toBeInTheDocument();
    expect(screen.queryByText("여행지 둘러보기")).not.toBeInTheDocument();
  });

  it("shows multiple authenticated trips as a horizontally scrollable list", async () => {
    useSessionKey.mockReturnValue("account:tester");
    getAuthSnapshot.mockReturnValue({ accountKey: "account:tester" });
    getTripsApi.mockResolvedValue([
      { id: 5, title: "부산 가족여행", destination: "부산", startDate: "2026-12-12", endDate: "2026-12-14" },
      { id: 2, title: "오사카 여행", destination: "오사카", startDate: "2026-11-12", endDate: "2026-11-15" },
    ]);
    mount();
    expect(await screen.findByText("오사카 여행")).toBeInTheDocument();
    expect(screen.getByText("부산 가족여행")).toBeInTheDocument();
    const rail = screen.getByLabelText("내 여행 일정 목록");
    expect(within(rail).getAllByRole("link", { name: /계속하기/ })).toHaveLength(2);
    expect(within(rail).getAllByRole("link", { name: /계속하기/ })[0]).toHaveAttribute("href", "/route-result?id=2");
    expect(screen.queryByRole("button", { name: /여행 계획 시작하기/ })).not.toBeInTheDocument();
    expect(screen.getByText("이어서 계획하기")).toBeInTheDocument();
    expect(screen.getAllByText("BOARDING PASS")).toHaveLength(2);
    const tickets = within(rail).getAllByRole("article");
    const firstTicket = queryByClass(tickets[0], "home-boarding-pass");
    expect(getByClass(firstTicket, "home-ticket-perforation")).toBeInTheDocument();
    expect(tickets[0]).toHaveClass("home-boarding-pass-shadow");
    expect(within(rail).getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("slider", { name: "내 여행 목록 가로 이동" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "전체 일정" })).toHaveAttribute("href", "/schedule");
  });

  it("never offers an already-ended trip as continue planning", async () => {
    useSessionKey.mockReturnValue("account:tester");
    getAuthSnapshot.mockReturnValue({accountKey:"account:tester"});
    getTripsApi.mockResolvedValue([
      {id:1,title:"종료된 여행",destination:"서울",startDate:"2000-01-01",endDate:"2000-01-05"},
      {id:2,title:"예정된 여행",destination:"도쿄",startDate:"2999-01-01",endDate:"2999-01-05"},
    ]);
    mount();
    expect(await screen.findByText("예정된 여행")).toBeInTheDocument();
    expect(screen.queryByText("종료된 여행")).not.toBeInTheDocument();
    expect(queryAllByClass(screen.getByLabelText("내 여행 일정 목록"), "home-boarding-pass-shadow")).toHaveLength(1);
  });

  it("allows mouse dragging of ticket cards without accidentally opening a trip", async () => {
    useSessionKey.mockReturnValue("account:tester");
    getAuthSnapshot.mockReturnValue({accountKey:"account:tester"});
    getTripsApi.mockResolvedValue([
      {id:1,title:"여행 A",destination:"서울",startDate:"2999-01-01",endDate:"2999-01-05"},
      {id:2,title:"여행 B",destination:"도쿄",startDate:"2999-02-01",endDate:"2999-02-05"},
    ]);
    mount();
    await screen.findByText("여행 A");
    const rail = screen.getByLabelText("내 여행 일정 목록");
    Object.defineProperties(rail,{
      scrollWidth:{configurable:true,value:800},
      clientWidth:{configurable:true,value:350},
      scrollLeft:{configurable:true,writable:true,value:0},
      setPointerCapture:{configurable:true,value:jest.fn()},
      hasPointerCapture:{configurable:true,value:()=>true},
      releasePointerCapture:{configurable:true,value:jest.fn()},
    });
    const pointer = (type,x) => {
      const event = new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,button:0});
      Object.defineProperties(event,{pointerId:{value:1},pointerType:{value:"mouse"}});
      fireEvent(rail,event);
    };
    pointer("pointerdown",300);
    pointer("pointermove",210);
    expect(rail.scrollLeft).toBe(90);
    pointer("pointerup",210);
    expect(rail.releasePointerCapture).toHaveBeenCalledWith(1);
    expect(rail).not.toHaveClass("is-dragging");
  });

  it("shows all ten city numbers and clean recommendation rails without demo overlays", async () => {
    getHomeRankingsApi.mockResolvedValue({ windowDays: 30, cities: [], hotPlaces: [] });
    mount();
    expect(await screen.findByRole("link", { name: "1위 오사카 여행지" })).toHaveAttribute("href", "/destinations/osaka");
    expect(screen.getAllByText(/^\d+위$/)).toHaveLength(10);
    expect(screen.queryByText("샘플")).not.toBeInTheDocument();
    expect(screen.queryByText("샘플 포함")).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("인기 도시 순위 가로 스크롤")).getAllByRole("article")).toHaveLength(10);
    expect(queryAllByClass(screen.getByLabelText("최근 인기 장소 자동 순환 가로 스크롤"), "home-hot-card")).toHaveLength(21);
    expect(screen.getByRole("button", { name: "1위 오사카성 검색 결과 보기" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "인기 도시 가로 이동" })).toBeInTheDocument();
    expect(screen.getByText("1위")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "지금 뜨는 장소 가로 이동" })).toBeInTheDocument();
    expect(screen.queryByText("디자인 미리보기 · 예시 순서")).not.toBeInTheDocument();
  });

  it("renders hot places as auto-looping rail with real IDs and the scrollbar control", async () => {
    mount();
    const rail = await screen.findByLabelText("최근 인기 장소 자동 순환 가로 스크롤");
    expect(within(rail).getAllByRole("button", { name: "1위 오사카성 상세 보기" })).toHaveLength(1);
    expect(within(rail).getAllByRole("button", { name: "2위 도톤보리 상세 보기" })).toHaveLength(1);
    expect(queryAllByClass(rail, "home-hot-card")).toHaveLength(21);
    expect(queryAllByClass(rail, "home-hot-demo-card")).toHaveLength(15);
    expect(within(rail).queryByText("샘플 · 실제 순위 아님")).not.toBeInTheDocument();
    expect(queryByClass(rail, "home-hot-rank")).toBeNull();
    expect(rail).toHaveAttribute("aria-label", "최근 인기 장소 자동 순환 가로 스크롤");
  });

  it("preserves real ranked destinations while filling spare city slots with editorial suggestions", async () => {
    mount();
    const cityRail = await screen.findByLabelText("인기 도시 순위 가로 스크롤");
    expect(within(cityRail).getAllByRole("article")).toHaveLength(10);
    expect(within(cityRail).getByRole("link", { name: "1위 오사카 여행지" })).toBeInTheDocument();
    expect(queryAllByClass(cityRail, "home-city-demo-tile")).toHaveLength(8);
    expect(screen.queryByText("샘플 포함")).not.toBeInTheDocument();
  });

  it("keeps the fallback rails while allowing retry after network failure", async () => {
    getHomeRankingsApi.mockRejectedValueOnce(new Error("unavailable"));
    mount();
    expect(await screen.findByRole("link", { name: "1위 오사카 여행지" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "다시 조회" })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole("button", { name: "다시 조회" })[0]);
    await waitFor(() => expect(getHomeRankingsApi).toHaveBeenCalledTimes(2));
  });
  it("scrubbed scrollbar follows elastically and settles with the same spring at both ends", async () => {
    mount();
    const rail = await screen.findByLabelText("최근 인기 장소 자동 순환 가로 스크롤");
    const slider = screen.getByRole("slider", { name: "지금 뜨는 장소 가로 이동" });
    const cards = within(rail).getAllByRole("article", { hidden: true });
    cards.forEach((card, index) => {
      Object.defineProperties(card, {
        offsetLeft: { configurable: true, value: index * 100 },
        offsetWidth: { configurable: true, value: 89 },
      });
    });
    const groupSpan = cards[cards.length / 3].offsetLeft - cards[0].offsetLeft;
    Object.defineProperty(rail, "scrollWidth", { configurable: true, value: groupSpan * 3 });
    Object.defineProperty(rail, "clientWidth", { configurable: true, value: 100 });
    rail.scrollLeft = groupSpan;

    // Control frames rather than relying on layout or real timers in jsdom.
    const nativeRaf = window.requestAnimationFrame, nativeCancel = window.cancelAnimationFrame;
    const frames = new Map();
    let nextId = 0;
    window.requestAnimationFrame = callback => { frames.set(++nextId, callback); return nextId; };
    window.cancelAnimationFrame = id => { frames.delete(id); };
    const tick = stamp => {
      const pending = [...frames.values()];
      frames.clear();
      act(() => pending.forEach(callback => callback(stamp)));
    };
    try {
      fireEvent.pointerDown(slider);
      fireEvent.change(slider, { target: { value: "100" } });
      expect(slider.value).toBe("100");
      expect(rail.scrollLeft).toBe(groupSpan); // Thumb leads the smoothly-following photos.
      tick(performance.now() + 16);
      expect(rail.scrollLeft).toBeGreaterThan(groupSpan);
      expect(rail.scrollLeft).toBeLessThan(groupSpan * 2);
      fireEvent.pointerUp(slider);
      tick(performance.now() + 1000);
      expect(rail.scrollLeft).toBe(groupSpan * 2);

      fireEvent.pointerDown(slider);
      fireEvent.change(slider, { target: { value: "0" } });
      tick(performance.now() + 16);
      expect(rail.scrollLeft).toBeLessThan(groupSpan * 2);
      fireEvent.pointerUp(slider);
      tick(performance.now() + 1000);
      expect(rail.scrollLeft).toBe(groupSpan);
    } finally {
      window.requestAnimationFrame = nativeRaf;
      window.cancelAnimationFrame = nativeCancel;
    }
  });

});

test("boarding passes have real centered half notches with tear line on the color boundary", () => {
  const css = fs.readFileSync(path.join(__dirname, "Home.css"), "utf8");
  expect(css).toContain("width:calc(100% + 2 * var(--home-rail-gutter))");
  expect(css).toContain("margin-inline:calc(-1 * var(--home-rail-gutter))");
  expect(css).toContain("padding-inline:var(--home-rail-gutter)");
  expect(css).toContain("scroll-padding-inline:var(--home-rail-gutter)");
  expect(css).toContain("padding:7px 16px 12px;scroll-padding-inline:16px");
  expect(css).toContain(".home-v12 .home-trip-rail>.home-boarding-pass-shadow{flex:0 0 calc(100% - 32px)");
  expect(css).toContain("--home-notch-center:calc(100% - 49px)");
  expect(css).toContain("radial-gradient(circle at 0 var(--home-notch-center)");
  expect(css).toContain("radial-gradient(circle at 100% var(--home-notch-center)");
  expect(css).toContain("flex:0 0 0;height:0;margin:0;border:0;position:relative");
  expect(css).toContain("top:-1px;left:14px;right:14px;height:2px");
  expect(css).toContain("background:repeating-linear-gradient(90deg,#a8c5d8");
  expect(css).toContain("scroll-snap-align:center");
});

it("click-only interaction does not steal the ticket Link pointer before drag",async()=>{
  useSessionKey.mockReturnValue("account:tester");
  getAuthSnapshot.mockReturnValue({accountKey:"account:tester"});
  getTripsApi.mockResolvedValue([{id:21,title:"예정 여행",destination:"홍콩",startDate:"2999-01-01",endDate:"2999-01-05"}]);
  mount();
  const rail=await screen.findByLabelText("내 여행 일정 목록");
  Object.defineProperties(rail,{
    scrollWidth:{configurable:true,value:900},clientWidth:{configurable:true,value:350},
    setPointerCapture:{configurable:true,value:jest.fn()}
  });
  fireEvent.pointerDown(rail,{pointerType:"mouse",button:0,pointerId:1,clientX:220});
  expect(rail.setPointerCapture).not.toHaveBeenCalled();
  expect(within(rail).getByRole("link",{name:"계속하기"})).toHaveAttribute("href","/route-result?id=21");
});
