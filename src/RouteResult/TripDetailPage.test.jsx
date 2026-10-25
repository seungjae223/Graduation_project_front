import { queryByClass, getArticleByText } from "../testQueries";
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import TripDetailPage from "./TripDetailPage";
import getRouteBoundaryKey from "../utils/routeBoundaryKey";
import useTripResult from "./useTripResult";
import { getTripByIdApi, getTripPlacesApi, getTripsApi, deleteTripDayPlacesApi, optimizeTripDayApi, renameTripTitleApi, updateTripApi } from "../api/tripApi";
jest.mock("./useTripResult", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));
jest.mock("../api/tripApi", () => ({ getTripByIdApi: jest.fn(), getTripPlacesApi: jest.fn(), getTripsApi: jest.fn(), optimizeTripDayApi: jest.fn(), renameTripTitleApi: jest.fn(), updateTripApi: jest.fn(),
  addPlaceToTripApi: jest.fn(), updateTripPlaceManualOrderApi: jest.fn(), updateTripPlaceScheduleApi: jest.fn(),
  updateTripPlaceMemoApi: jest.fn(), deleteTripDayPlacesApi: jest.fn() }));
jest.mock("../api/placeApi", () => ({ searchPlacesApi: jest.fn(), getFoldersApi: jest.fn(), getFolderPlacesApi: jest.fn() }));

const shortTrip = { id: 12, title: "오사카 여행", destination: "오사카",
  startDate: "2026-11-12", endDate: "2026-11-15", latitude: null, longitude: null };
const places = [
  { tripPlaceId: 1, id: 1, day: 1, visitOrder: 1, placeName: "오사카성", address: "일본 오사카", memo: "" },
  { tripPlaceId: 2, id: 2, day: 1, visitOrder: 2, placeName: "도톤보리", address: "난바", memo: "야경 보기" },
];
let reload;
const data = (trip = shortTrip, entries = places, timelines = {}) => ({
  status: "success", trip, places: entries, timelines, retry: reload, refreshInPlace: reload,
});
const Locator = () => { const location = useLocation(); return <output>{location.pathname + location.search}</output>; };
// Match App's keyed route boundary; edit query changes must not remount TripDetailPage.
const ItineraryRoute = () => {
  const location = useLocation();
  return <React.Fragment key={getRouteBoundaryKey(location.pathname, location.search)}>
    <TripDetailPage/><Locator/>
  </React.Fragment>;
};
const itinerary = entry => <MemoryRouter initialEntries={[entry]}><Routes>
  <Route path="/route-result" element={<ItineraryRoute/>}/>
  <Route path="/route-optimize" element={<Locator/>}/>
  <Route path="/route-edit" element={<Locator/>}/>
  <Route path="/route-add-places" element={<Locator/>}/>
  <Route path="/detail" element={<Locator/>}/>
  <Route path="/detail/review" element={<Locator/>}/>
</Routes></MemoryRouter>;
const mount = (entry = "/route-result?id=12") => render(itinerary(entry));
beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  reload = jest.fn();
  getTripByIdApi.mockResolvedValue(shortTrip);
  getTripsApi.mockResolvedValue([shortTrip]);
  getTripPlacesApi.mockResolvedValue(places);
  updateTripApi.mockResolvedValue(shortTrip);
  useTripResult.mockImplementation(() => data());
});

test("approved detail has only list/button view switch, no redundant heading or day count", () => {
  mount();
  expect(screen.getByRole("heading", { name: "오사카 여행" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "false");
  expect(screen.queryByText("일정 보기")).not.toBeInTheDocument();
  expect(screen.queryByText("4일")).not.toBeInTheDocument();
  expect(screen.getByText("3박 4일")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "경로 최적화" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "지도 보기" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "편집하기" })).toBeInTheDocument();
  expect(screen.getAllByRole("heading", { name: /일차/ })).toHaveLength(4);
  expect(screen.getByText("도톤보리")).toBeInTheDocument();
});

test("map action opens the itinerary map instead of the old placeholder and restores focus on close", () => {
  mount();
  const trigger = screen.getByRole("button", { name: "지도 보기" });
  trigger.focus();
  fireEvent.click(trigger);
  expect(screen.getByRole("dialog", { name: "여행 일정 지도" })).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "구글맵 일정 지도" })).toBeInTheDocument();
  expect(screen.queryByText("지도 전용 화면은 다음 단계에서 연결할 예정이에요.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "지도 닫기" }));
  expect(screen.queryByRole("dialog", { name: "여행 일정 지도" })).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
test("date pencil opens the animated calendar and updates the selected range only after confirmation",async()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"여행 날짜 수정"}));
  const dialog=screen.getByRole("dialog",{name:"여행 날짜 수정"});
  expect(dialog).toBeInTheDocument();
  expect(within(dialog).getByRole("button",{name:"2026-11-12"})).toHaveAttribute("aria-pressed","true");
  expect(screen.queryByRole("button",{name:"날짜 수정"})).not.toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button",{name:"2026-11-17"}));
  fireEvent.click(within(dialog).getByRole("button",{name:"2026-11-19"}));
  const updated={...shortTrip,startDate:"2026-11-17",endDate:"2026-11-19"};
  getTripByIdApi.mockResolvedValueOnce(shortTrip).mockResolvedValueOnce(updated);
  updateTripApi.mockResolvedValue(updated);
  fireEvent.click(screen.getByRole("button",{name:"날짜 수정"}));
  await waitFor(()=>expect(updateTripApi).toHaveBeenCalledWith("12",
    expect.objectContaining({title:shortTrip.title,destination:shortTrip.destination,
      startDate:"2026-11-17",endDate:"2026-11-19"})));
  await waitFor(()=>expect(reload).toHaveBeenCalled());
});
test("shortening a trip refuses to orphan visits on a removed day",async()=>{
  getTripPlacesApi.mockResolvedValue([...places,{...places[0],tripPlaceId:5,day:4,visitOrder:1}]);
  mount();
  fireEvent.click(screen.getByRole("button",{name:"여행 날짜 수정"}));
  const dialog=screen.getByRole("dialog",{name:"여행 날짜 수정"});
  fireEvent.click(within(dialog).getByRole("button",{name:"2026-11-17"}));
  fireEvent.click(within(dialog).getByRole("button",{name:"2026-11-17"}));
  fireEvent.click(screen.getByRole("button",{name:"날짜 수정"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("방문 장소가 있어요");
  expect(updateTripApi).not.toHaveBeenCalled();
});
test("button mode allows choosing days and displays no other day", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
  const tabs = screen.getByRole("group", { name: "일차 선택" });
  expect(within(tabs).getAllByRole("button")).toHaveLength(4);
  fireEvent.click(within(tabs).getByRole("button", { name: "2일차 11.13" }));
  expect(screen.getByRole("region", { name: "2일차 일정" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "1일차 일정" })).not.toBeInTheDocument();
  expect(screen.getByText("아직 추가된 장소가 없어요.")).toBeInTheDocument();
});

test.each(["/route-result?id=12", "/route-result?id=12&edit=1&day=4"])(
  "shortening dates keeps the selected day and optimization target valid: %s", entry => {
    const view = mount(entry);
    fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
    fireEvent.click(within(screen.getByRole("group", { name: "일차 선택" }))
      .getByRole("button", { name: "4일차 11.15" }));
    useTripResult.mockImplementation(() => data({ ...shortTrip, endDate: "2026-11-13" }));
    view.rerender(itinerary(entry));
    expect(within(screen.getByRole("group", { name: "일차 선택" }))
      .getByRole("button", { name: "2일차 11.13" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("region", { name: "2일차 일정" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "경로 최적화" }));
    expect(screen.getByText("/route-optimize?id=12&day=2")).toBeInTheDocument();
  }
);

test("temporarily unloaded days do not reset the selected day during a refresh", () => {
  const entry = "/route-result?id=12";
  const view = mount(entry);
  fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
  fireEvent.click(within(screen.getByRole("group", { name: "일차 선택" }))
    .getByRole("button", { name: "3일차 11.14" }));
  useTripResult.mockImplementation(() => ({ status: "loading", trip: null, places: [], timelines: {} }));
  view.rerender(itinerary(entry));
  useTripResult.mockImplementation(() => data());
  view.rerender(itinerary(entry));
  expect(within(screen.getByRole("group", { name: "일차 선택" }))
    .getByRole("button", { name: "3일차 11.14" })).toHaveAttribute("aria-pressed", "true");
});
test("user-selected list/button view and day survive edit entry and completion", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
  fireEvent.click(within(screen.getByRole("group", { name: "일차 선택" }))
    .getByRole("button", { name: "2일차 11.13" }));
  fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
  expect(screen.getByText("/route-result?id=12&edit=1&day=2")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("region", { name: "2일차 일정" })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "1일차 일정" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "편집 완료" }));
  expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
  expect(within(screen.getByRole("group", { name: "일차 선택" }))
    .getByRole("button", { name: "2일차 11.13" })).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(screen.getByRole("button", { name: "목록형" }));
  fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
  expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "편집 완료" }));
  expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
});
test("long trip also defaults to list unless the user previously chose buttons", () => {
  useTripResult.mockImplementation(() => data({ ...shortTrip,
    startDate: "2026-11-01", endDate: "2026-11-15" }, []));
  mount();
  expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getAllByRole("heading", { name: /일차/ })).toHaveLength(15);
  fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
  expect(within(screen.getByRole("group", { name: "일차 선택" })).getAllByRole("button")).toHaveLength(15);
  expect(screen.getAllByRole("heading", { name: /일차/ })).toHaveLength(1);
});
test("new empty trip keeps CTA and moves to optimization screen without writing", () => {
  useTripResult.mockImplementation(() => data(shortTrip, []));
  mount();
  expect(screen.getAllByText("아직 추가된 장소가 없어요.")).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "경로 최적화" }));
  expect(screen.getByText("/route-optimize?id=12&day=1")).toBeInTheDocument();
  expect(optimizeTripDayApi).not.toHaveBeenCalled();
});
test("optimization opens dedicated route without calling mutating backend optimize endpoint", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "경로 최적화" }));
  expect(screen.getByText("/route-optimize?id=12&day=1")).toBeInTheDocument();
  expect(optimizeTripDayApi).not.toHaveBeenCalled();
});
test("missing trip id does not reveal fake content", () => {
  useTripResult.mockImplementation(() => ({ status:"invalid", error:"유효한 일정 ID가 필요합니다.", places: [], trip:null, timelines:{} }));
  mount();
  expect(screen.getByRole("heading", { name:"일정을 확인할 수 없어요" })).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"경로 최적화"})).not.toBeInTheDocument();
});

test("optimized preview stays separate from server itinerary and enables adjacent compact switches", () => {
  window.localStorage.clear();
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  const stored = saveOptimizedDay(12, "account:test", places, 1, {
    order: ["2","1"],
    rows: [{ type: "place", id: "2", name: "도톤보리", time: 660 },
      { type: "place", id: "1", name: "오사카성", time: 720 }],
    warnings: [],
  });
  expect(stored).toBe(true);
  try {
    mount();
    expect(screen.getByRole("group", { name: "일정 버전 전환" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "직접 만든 일정" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "최적화한 일정" }));
    const day = screen.getByRole("region", { name: "1일차 일정" });
    expect(within(day).getAllByText(/도톤보리|오사카성/)[0]).toHaveTextContent("도톤보리");
    fireEvent.click(screen.getByRole("button", { name: "직접 만든 일정" }));
    expect(within(day).getAllByText(/도톤보리|오사카성/)[0]).toHaveTextContent("오사카성");
  } finally { window.localStorage.clear(); }
});
test("an optimized editor respects list view and returning keeps the same switches", () => {
  window.localStorage.clear();
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12, "account:test", places, 1, {
    mode: "quick", order: ["1", "2"],
    rows: [{ type: "start", id: "1", name: "오사카성", time: 540 },
      { type: "end", id: "2", name: "도톤보리", time: 630 }],
    warnings: [],
  })).toBe(true);
  try {
    mount();
    expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "최적화한 일정" }));
    expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
    fireEvent.click(screen.getByRole("button", { name: "그래도 편집하기" }));
    expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "편집 완료" }));
    expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");

    // Even when this day has no optimized draft, editing must preserve the
    // explicitly selected optimized version instead of forcing manual.
    fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
    fireEvent.click(within(screen.getByRole("group", { name: "일차 선택" }))
      .getByRole("button", { name: "2일차 11.13" }));
    fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
    expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "편집 완료" }));
    expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
  } finally { window.localStorage.clear(); }
});
test("switching itinerary version inside the editor persists after Done; cancelling does not", () => {
  window.localStorage.clear();
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12, "account:test", places, 1, {
    mode: "quick", order: ["1", "2"],
    rows: [{ type: "start", id: "1", name: "오사카성", time: 540 },
      { type: "end", id: "2", name: "도톤보리", time: 630 }],
    warnings: [],
  })).toBe(true);
  try {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "직접 만든 일정" }));
    fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
    fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
    const switcher = screen.getByRole("group", { name: "편집 일정 버전 전환" });
    expect(within(switcher).getByRole("button", { name: "직접 만든 일정" }))
      .toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(switcher).getByRole("button", { name: "최적화한 일정" }));
    fireEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(within(switcher).getByRole("button", { name: "직접 만든 일정" }))
      .toHaveAttribute("aria-pressed", "true");
    fireEvent.click(within(switcher).getByRole("button", { name: "최적화한 일정" }));
    fireEvent.click(screen.getByRole("button", { name: "그래도 편집하기" }));
    expect(within(switcher).getByRole("button", { name: "최적화한 일정" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "편집 완료" }));
    expect(screen.getByRole("button", { name: "최적화한 일정" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
  } finally { window.localStorage.clear(); }
});
test("reopening the same trip restores its last selected view and itinerary version", () => {
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12, "account:test", places, 1, {
    mode: "quick", order: ["1", "2"],
    rows: [{ type: "start", id: "1", name: "오사카성", time: 540 },
      { type: "end", id: "2", name: "도톤보리", time: 630 }],
    warnings: [],
  })).toBe(true);
  const { unmount: firstUnmount } = mount();
  expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "직접 만든 일정" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
  fireEvent.click(screen.getByRole("button", { name: "최적화한 일정" }));
  firstUnmount();

  // The itinerary screen was completely unmounted, as after leaving for /schedule.
  const { unmount: secondUnmount } = mount();
  expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: "직접 만든 일정" }));
  secondUnmount();

  const { unmount: thirdUnmount } = mount();
  expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "직접 만든 일정" })).toHaveAttribute("aria-pressed", "true");
  thirdUnmount();
});

test("different trip without prior settings opens list and manual despite earlier trip choices", () => {
  const { saveTripDisplayPreferences } = require("./tripDetailPreferenceStore");
  expect(saveTripDisplayPreferences(12, "account:test", { view: "tabs", version: "optimized" })).toBe(true);
  mount("/route-result?id=13");
  expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
  // This trip has no local optimized snapshots; version preference remains manual.
  const { readTripDisplayPreferences } = require("./tripDetailPreferenceStore");
  expect(readTripDisplayPreferences(13, "account:test")).toEqual({ view: "list", version: "manual" });
});

test("clearing browser storage returns both defaults and does not invent an optimized draft", () => {
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  const { saveTripDisplayPreferences } = require("./tripDetailPreferenceStore");
  expect(saveOptimizedDay(12, "account:test", places, 1, {
    mode: "quick", order: ["1", "2"], rows: [], warnings: [],
  })).toBe(true);
  expect(saveTripDisplayPreferences(12, "account:test", { view: "tabs", version: "optimized" })).toBe(true);
  const { unmount: priorUnmount } = mount();
  expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");
  priorUnmount();
  window.localStorage.clear();
  mount();
  expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByRole("button", { name: "최적화한 일정" })).not.toBeInTheDocument();
});

test("an orphaned optimized preference falls back to manual without clearing the chosen layout", () => {
  const { saveTripDisplayPreferences, readTripDisplayPreferences } = require("./tripDetailPreferenceStore");
  expect(saveTripDisplayPreferences(12, "account:test", { view: "tabs", version: "optimized" })).toBe(true);
  mount();
  expect(screen.getByRole("button", { name: "버튼형" })).toHaveAttribute("aria-pressed", "true");
  expect(readTripDisplayPreferences(12, "account:test")).toEqual({ view: "tabs", version: "manual" });
});

test("optimizer warning cancellation does not overwrite a saved manual version", () => {
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  const { readTripDisplayPreferences } = require("./tripDetailPreferenceStore");
  expect(saveOptimizedDay(12, "account:test", places, 1, {
    mode: "careful", order: ["1", "2"], rows: [], warnings: [],
  })).toBe(true);
  mount("/route-result?id=12&edit=1&day=1");
  expect(readTripDisplayPreferences(12, "account:test").version).toBe("manual");
  fireEvent.click(screen.getByRole("button", { name: "최적화한 일정" }));
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(readTripDisplayPreferences(12, "account:test").version).toBe("manual");
  fireEvent.click(screen.getByRole("button", { name: "편집 완료" }));
  expect(screen.getByRole("button", { name: "직접 만든 일정" })).toHaveAttribute("aria-pressed", "true");
});

test("detail day edit button opens first stop editor with unchanged detail layout", () => {
  mount();
  const day = screen.getByRole("region", { name: "1일차 일정" });
  expect(within(day).getByText("2곳")).toBeInTheDocument();
  fireEvent.click(within(day).getByRole("button", { name: "1일차 편집" }));
  expect(screen.getByText("/route-result?id=12&edit=1&day=1&open=first")).toBeInTheDocument();
  expect(within(day).getByRole("button", { name: "오사카성 수정 닫기" })).toBeInTheDocument();
  expect(within(day).getByRole("button", { name: "1일차에 장소 추가" })).toBeInTheDocument();
  expect(within(day).getByRole("button", { name: "1일차 장소 삭제 선택" })).toBeInTheDocument();
});
test("empty detail day opens edit mode without inventing a place", () => {
  useTripResult.mockImplementation(() => data(shortTrip, []));
  mount();
  const day = screen.getByRole("region", { name: "3일차 일정" });
  expect(within(day).getByText("0곳")).toBeInTheDocument();
  fireEvent.click(within(day).getByRole("button", { name: "3일차 편집" }));
  expect(screen.getByText("/route-result?id=12&edit=1&day=3&open=first")).toBeInTheDocument();
  expect(within(day).getByRole("button", { name: "3일차에 장소 추가" })).toBeInTheDocument();
});
test("detail place name navigates to the existing place detail route", () => {
  useTripResult.mockImplementation(() => data(shortTrip, places.map((p,i) => ({ ...p, placeId: 100 + i }))));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "오사카성 장소 상세 보기" }));
  expect(screen.getByText("/detail?id=100")).toBeInTheDocument();
});
test("timeline clock is left of number, and star goes directly to review writer", () => {
  useTripResult.mockImplementation(() => data(shortTrip, places.map((p,i) => ({
    ...p, placeId: 100+i, arrivalTime: i ? "11:20" : "09:00" }))));
  mount();
  const day = screen.getByRole("region", { name: "1일차 일정" });
  const row = getArticleByText("오사카성", day);
  expect(queryByClass(row, "v16-detail-time-left")).toHaveTextContent("09:00");
  expect(queryByClass(row, "v16-detail-sequence")).toHaveTextContent("1");
  fireEvent.click(within(day).getByRole("button", { name: "오사카성 리뷰 작성" }));
  expect(screen.getByText("/detail/review?id=100")).toBeInTheDocument();
});
test("per-day clock toggle slides order column forward without changing stored visit times", () => {
  useTripResult.mockImplementation(() => data(shortTrip, places.map((p,i) => ({
    ...p, placeId:100+i, arrivalTime:i ? "11:20" : "09:00" }))));
  mount();
  const first = screen.getByRole("region",{name:"1일차 일정"});
  const second = screen.getByRole("region",{name:"2일차 일정"});
  const toggle = within(first).getByRole("button",{name:"1일차 방문 시간 숨기기"});
  expect(toggle).toHaveAttribute("aria-pressed","true");
  expect(within(first).getByText("09:00")).toHaveAttribute("aria-hidden","false");
  fireEvent.click(toggle);
  expect(within(first).getByRole("button",{name:"1일차 방문 시간 표시하기"}))
    .toHaveAttribute("aria-pressed","false");
  expect(within(first).getByText("09:00")).toHaveAttribute("aria-hidden","true");
  expect(queryByClass(first, "v16-detail-timeline")).toHaveClass("is-time-hidden");
  expect(within(second).getByRole("button",{name:"2일차 방문 시간 숨기기"})).toHaveAttribute("aria-pressed","true");
  const help = within(first).getByRole("button",{name:"1일차 시간 표시 도움말"});
  expect(help).toHaveAttribute("aria-describedby","v16-time-help-1");
  expect(queryByClass(first, "v16-detail-time-help")).toHaveTextContent("실제 방문 시간은 변경되지 않아요");
  fireEvent.click(screen.getByRole("button",{name:"버튼형"}));
  fireEvent.click(screen.getByRole("button",{name:"목록형"}));
  expect(queryByClass(screen.getByRole("region",{name:"1일차 일정"}), "v16-detail-timeline")).toHaveClass("is-time-hidden");
  expect(reload).not.toHaveBeenCalled();
});
test("review shortcut has star and a small Review caption with no bordered card", () => {
  useTripResult.mockImplementation(() => data(shortTrip, places.map((p,i) => ({
    ...p, placeId:100+i }))));
  mount();
  const button = screen.getByRole("button", { name:"오사카성 리뷰 작성" });
  expect(button).toHaveClass("v16-detail-review-link");
  expect(within(button).getByText("리뷰").tagName).toBe("SMALL");
});
test("edit button keeps the same title, day card and toolbar while switching controls", () => {
  useTripResult.mockImplementation(() => data(shortTrip, places.map((p,i) => ({ ...p, placeId: 100 + i }))));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
  expect(screen.getByRole("heading", { name: "오사카 여행" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "목록형" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("region", { name: "1일차 일정" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "편집 완료" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "경로 최적화" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "지도 보기" })).toBeInTheDocument();
  expect(screen.getByText("편집 중")).toBeInTheDocument();
  expect(queryByClass(document, "v16-detail-page")).toHaveClass("is-editing");
  expect(screen.queryByText(/장소를 드래그해 순서를 바꾸거나/)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(/마지막 도착 시간|출발 시간/)).not.toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: /순서 이동/ })).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "오사카성 방문 정보 수정" }));
  expect(screen.getByLabelText("메모")).toHaveAttribute("rows", "2");
  expect(screen.getByRole("button", { name: "오사카성 장소 상세 보기" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "편집 완료" }));
  expect(screen.getByRole("button", { name: "경로 최적화" })).toBeInTheDocument();
});
test("plus inside edit mode also navigates to the dedicated day-scoped picker", () => {
  useTripResult.mockImplementation(() => data(shortTrip, places));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
  const day = screen.getByRole("region", { name: "1일차 일정" });
  fireEvent.click(within(day).getByRole("button", { name: "＋ 장소 추가" }));
  expect(screen.getByText("/route-add-places?id=12&day=1")).toBeInTheDocument();
});
test("tap the title to rename only it and confirm the persisted title via GET", async () => {
  const title = "가을 오사카 여행";
  renameTripTitleApi.mockResolvedValue({ ...shortTrip, title });
  getTripByIdApi.mockResolvedValue({ ...shortTrip, title });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "일정명 수정" }));
  fireEvent.change(screen.getByRole("textbox", { name: "일정명" }), { target: { value: "  " + title + "  " } });
  fireEvent.blur(screen.getByRole("textbox", { name: "일정명" }));
  await waitFor(() => expect(renameTripTitleApi).toHaveBeenCalledWith({ tripId: "12", title }));
  expect(renameTripTitleApi).toHaveBeenCalledTimes(1);
  await waitFor(() => expect(getTripByIdApi).toHaveBeenCalledWith("12"));
  await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
});
test("blank or cancelled edits never write", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "일정명 수정" }));
  fireEvent.change(screen.getByRole("textbox", { name: "일정명" }), { target: { value: " " } });
  fireEvent.blur(screen.getByRole("textbox", { name: "일정명" }));
  expect(screen.getByText("일정명은 1~100자로 입력해 주세요.")).toBeInTheDocument();
  expect(renameTripTitleApi).not.toHaveBeenCalled();
  fireEvent.keyDown(screen.getByRole("textbox", { name: "일정명" }), { key: "Escape" });
  expect(screen.getByRole("heading", { name: "오사카 여행" })).toBeInTheDocument();
});
test("ambiguous rename never writes twice and requires read-only refresh", async () => {
  renameTripTitleApi.mockRejectedValueOnce({ response: { status: 500 } });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "일정명 수정" }));
  fireEvent.change(screen.getByRole("textbox", { name: "일정명" }), { target: { value: "새 제목" } });
  fireEvent.blur(screen.getByRole("textbox", { name: "일정명" }));
  expect(await screen.findByText(/일정명 변경 여부를 확인하지 못했어요/)).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "일정명" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "일정 다시 조회" }));
  expect(reload).toHaveBeenCalledTimes(1);
  expect(renameTripTitleApi).toHaveBeenCalledTimes(1);
});

test("one trash action exposes deletion checks across all days; any Done ends selection mode",()=>{
  const entries=[{...places[0],placeId:101},{...places[1],day:2,visitOrder:1,placeId:102}];
  useTripResult.mockImplementation(()=>data(shortTrip,entries));
  mount();
  fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
  fireEvent.click(within(screen.getByRole("region",{name:"1일차 일정"}))
    .getByRole("button",{name:"1일차 장소 삭제 선택"}));
  expect(within(screen.getByRole("region",{name:"1일차 일정"}))
    .getByRole("button",{name:"오사카성 삭제 선택"})).toBeInTheDocument();
  expect(within(screen.getByRole("region",{name:"2일차 일정"}))
    .getByRole("button",{name:"도톤보리 삭제 선택"})).toBeInTheDocument();
  expect(screen.getAllByRole("button",{name:/삭제 선택 완료/})).toHaveLength(4);
  fireEvent.click(within(screen.getByRole("region",{name:"2일차 일정"}))
    .getByRole("button",{name:"2일차 삭제 선택 완료"}));
  expect(screen.queryByRole("button",{name:"오사카성 삭제 선택"})).not.toBeInTheDocument();
  expect(deleteTripDayPlacesApi).not.toHaveBeenCalled();
});
test("cross-day visits are confirmed and deleted using the original day-scoped API",async()=>{
  const entries=[{...places[0],placeId:101},{...places[1],day:2,visitOrder:1,placeId:102}];
  useTripResult.mockImplementation(()=>data(shortTrip,entries));
  getTripPlacesApi.mockResolvedValueOnce(entries).mockResolvedValueOnce([]);
  deleteTripDayPlacesApi.mockResolvedValue([]);
  mount();
  fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
  fireEvent.click(within(screen.getByRole("region",{name:"1일차 일정"}))
    .getByRole("button",{name:"1일차 장소 삭제 선택"}));
  fireEvent.click(within(screen.getByRole("region",{name:"1일차 일정"}))
    .getByRole("button",{name:"오사카성 삭제 선택"}));
  fireEvent.click(within(screen.getByRole("region",{name:"2일차 일정"}))
    .getByRole("button",{name:"도톤보리 삭제 선택"}));
  const dock=screen.getByRole("region",{name:"전체 일차 선택한 장소 삭제"});
  expect(within(dock).getByRole("button",{name:"전체 일차에서 선택한 장소 2개 삭제하기"})).toBeInTheDocument();
  fireEvent.click(within(dock).getByRole("button"));
  const dialog=screen.getByRole("alertdialog",{name:"전체 일차 선택한 장소 삭제 확인"});
  expect(within(dialog).getByText("1일차")).toBeInTheDocument();
  expect(within(dialog).getByText("2일차")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button",{name:"취소"}));
  expect(deleteTripDayPlacesApi).not.toHaveBeenCalled();
  fireEvent.click(within(dock).getByRole("button"));
  fireEvent.click(screen.getByRole("button",{name:"삭제 확인"}));
  await waitFor(()=>expect(deleteTripDayPlacesApi).toHaveBeenCalledTimes(2));
  expect(deleteTripDayPlacesApi.mock.calls.map(([arg])=>[arg.day,arg.tripPlaceIds]))
    .toEqual([[1,[1]],[2,[2]]]);
  await waitFor(()=>expect(reload).toHaveBeenCalledTimes(1));
  expect(screen.queryByRole("alertdialog",{name:"전체 일차 선택한 장소 삭제 확인"})).not.toBeInTheDocument();
});
test("stale global selections never delete a place without rechecking its day",async()=>{
  useTripResult.mockImplementation(()=>data(shortTrip,places));
  getTripPlacesApi.mockResolvedValue([]);
  mount();
  fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
  fireEvent.click(within(screen.getByRole("region",{name:"1일차 일정"}))
    .getByRole("button",{name:"1일차 장소 삭제 선택"}));
  fireEvent.click(within(screen.getByRole("region",{name:"1일차 일정"}))
    .getByRole("button",{name:"오사카성 삭제 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"전체 일차에서 선택한 장소 1개 삭제하기"}));
  fireEvent.click(screen.getByRole("button",{name:"삭제 확인"}));
  expect(await screen.findByText(/일정이 변경되었어요/)).toBeInTheDocument();
  expect(deleteTripDayPlacesApi).not.toHaveBeenCalled();
});
test("global delete mode keeps the selected button layout and supports cross-day selection",()=>{
  const entries=[{...places[0],placeId:101},{...places[1],day:2,visitOrder:1,placeId:102}];
  useTripResult.mockImplementation(()=>data(shortTrip,entries));
  mount();
  fireEvent.click(screen.getByRole("button",{name:"버튼형"}));
  expect(screen.queryByRole("region",{name:"2일차 일정"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
  fireEvent.click(screen.getByRole("button",{name:"1일차 장소 삭제 선택"}));
  expect(screen.getByRole("button",{name:"버튼형"})).toHaveAttribute("aria-pressed","true");
  fireEvent.click(screen.getByRole("button",{name:"오사카성 삭제 선택"}));
  fireEvent.click(within(screen.getByRole("group",{name:"일차 선택"}))
    .getByRole("button",{name:"2일차 11.13"}));
  expect(screen.getByRole("region",{name:"2일차 일정"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"도톤보리 삭제 선택"}));
  expect(screen.getByRole("button",{name:"전체 일차에서 선택한 장소 2개 삭제하기"})).toBeInTheDocument();
});

test("partial cross-day deletion failure blocks accidental repeated writes",async()=>{
  const entries=[{...places[0],placeId:101},{...places[1],day:2,visitOrder:1,placeId:102}];
  useTripResult.mockImplementation(()=>data(shortTrip,entries));
  getTripPlacesApi.mockResolvedValue(entries);
  deleteTripDayPlacesApi.mockResolvedValueOnce([])
    .mockRejectedValueOnce({response:{status:500}});
  mount();
  fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
  fireEvent.click(screen.getByRole("button",{name:"1일차 장소 삭제 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"오사카성 삭제 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"도톤보리 삭제 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"전체 일차에서 선택한 장소 2개 삭제하기"}));
  fireEvent.click(screen.getByRole("button",{name:"삭제 확인"}));
  expect(await screen.findByText(/일부 삭제 결과를 확인하지 못했어요/)).toBeInTheDocument();
  expect(deleteTripDayPlacesApi).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button",{name:"전체 일차에서 선택한 장소 2개 삭제하기"})).toBeDisabled();
  expect(screen.getByRole("button",{name:"1일차 삭제 선택 완료"})).toBeDisabled();
});

test("optimized departure time displays on the first visit while manual version stays untouched",()=>{
  window.localStorage.clear();
  const {saveOptimizedDay}=require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12,"account:test",places,1,{
    order:["1","2"],
    rows:[{type:"start",id:"1",name:"오사카성",time:570},
      {type:"place",id:"2",name:"도톤보리",time:705}],
    warnings:[],
  })).toBe(true);
  try{
    mount();
    fireEvent.click(screen.getByRole("button",{name:"최적화한 일정"}));
    const day=screen.getByRole("region",{name:"1일차 일정"});
    const first=getArticleByText("오사카성", day);
    expect(queryByClass(first, "v16-detail-time-left")).toHaveTextContent("09:30");
    fireEvent.click(screen.getByRole("button",{name:"직접 만든 일정"}));
    expect(queryByClass(getArticleByText("오사카성", day), "v16-detail-time-left")).toHaveTextContent("—");
  }finally{window.localStorage.clear();}
});
test("booking deep link opens only the targeted visit's schedule editor",()=>{
  mount("/route-result?id=12&edit=1&day=1&place=2");
  const day=screen.getByRole("region",{name:"1일차 일정"});
  expect(within(day).getByRole("button",{name:"도톤보리 수정 닫기"})).toBeInTheDocument();
  expect(within(day).getByRole("button",{name:"오사카성 방문 정보 수정"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"목록형"})).toHaveAttribute("aria-pressed","true");
});

test("source changes never replace or lock a separately saved optimized itinerary", () => {
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12, "account:test", places, 1, {
    mode: "quick", order: ["1","2"], warnings: [],
    rows: [{type:"start",id:"1",name:"오사카성",time:540},
      {type:"end",id:"2",name:"도톤보리",time:720}],
  })).toBe(true);
  const changed = [{ ...places[0], placeName: "원본에서 이름 변경" }];
  useTripResult.mockImplementation(() => data(shortTrip, changed));
  mount();
  fireEvent.click(screen.getByRole("button", { name: "최적화한 일정" }));
  expect(screen.getByText("오사카성")).toBeInTheDocument();
  expect(screen.getByText("도톤보리")).toBeInTheDocument();
  expect(screen.queryByText("원본에서 이름 변경")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
  fireEvent.click(screen.getByRole("button", { name: "그래도 편집하기" }));
  expect(screen.getByText("/route-result?id=12&edit=1&day=1&version=optimized")).toBeInTheDocument();
  expect(screen.getByText(/독립적으로 편집할 수 있어요/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");
});

test("an unoptimized day does not force the chosen optimized version back to manual", () => {
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12, "account:test", places, 1, {
    mode: "quick", order: ["1","2"], warnings: [],
    rows: [{type:"start",id:"1",name:"오사카성",time:540},
      {type:"end",id:"2",name:"도톤보리",time:720}],
  })).toBe(true);
  mount();
  fireEvent.click(screen.getByRole("button", { name: "최적화한 일정" }));
  fireEvent.click(screen.getByRole("button", { name: "버튼형" }));
  fireEvent.click(within(screen.getByRole("group", { name: "일차 선택" }))
    .getByRole("button", { name: "2일차 11.13" }));
  fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
  expect(screen.getByText("/route-result?id=12&edit=1&day=2&version=optimized")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "최적화한 일정" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText(/이 일차에는 아직 최적화한 일정이 없어요/)).toBeInTheDocument();
});

test("quick optimized itinerary asks before editing and cancellation leaves it unchanged",()=>{
  window.localStorage.clear();
  const {saveOptimizedDay}=require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12,"account:test",places,1,{
    mode:"quick",order:["1","2"],rows:[
      {type:"start",id:"1",name:"오사카성",time:540},
      {type:"end",id:"2",name:"도톤보리",time:600}],
    warnings:[],
  })).toBe(true);
  try {
    mount();
    fireEvent.click(screen.getByRole("button",{name:"최적화한 일정"}));
    fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
    const dialog=screen.getByRole("alertdialog",{name:"최적화한 일정 편집 경고"});
    expect(queryByClass(document.body, "v16-detail-edit-guard-overlay")).toHaveClass("is-quick");
    expect(dialog).toHaveTextContent("최적화한 동선이 달라질 수 있어요");
    fireEvent.click(within(dialog).getByRole("button",{name:"취소"}));
    expect(screen.queryByRole("alertdialog",{name:"최적화한 일정 편집 경고"})).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"최적화한 일정"})).toHaveAttribute("aria-pressed","true");
    fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
    fireEvent.click(screen.getByRole("button",{name:"그래도 편집하기"}));
    expect(screen.getByText("/route-result?id=12&edit=1&day=1&version=optimized")).toBeInTheDocument();
    expect(screen.getByRole("group",{name:"편집 일정 버전 전환"})).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"최적화한 일정"})).toHaveAttribute("aria-pressed","true");
    expect(screen.getByRole("button",{name:"편집 완료"})).toBeInTheDocument();
  }finally{window.localStorage.clear();}
});
test("optimized day shows its method beside the heading and its plus uses the optimized-only picker", () => {
  const { saveOptimizedDay } = require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12, "account:test", places, 1, {
    mode: "quick", order: ["1","2"],
    rows: [{ type: "start", id: "1", name: "오사카성", time: 540 },
      { type: "end", id: "2", name: "도톤보리", time: 630 }],
    warnings: [],
  })).toBe(true);
  mount();
  fireEvent.click(screen.getByRole("button", { name: "최적화한 일정" }));
  fireEvent.click(screen.getByRole("button", { name: "편집하기" }));
  fireEvent.click(screen.getByRole("button", { name: "그래도 편집하기" }));
  const day = screen.getByRole("region", { name: "1일차 일정" });
  expect(within(day).getByText("빠른 정렬")).toHaveClass("is-quick");
  expect(within(day).getByRole("button", { name: "1일차 최적화 장소 삭제 선택" })).toBeInTheDocument();
  fireEvent.click(within(day).getByRole("button", { name: "1일차 최적화 장소 삭제 선택" }));
  expect(within(day).getByRole("button", { name: "1일차 최적화 삭제 선택 완료" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.queryByText(/삭제할 중간 장소를 선택해 주세요/)).not.toBeInTheDocument();
  fireEvent.click(within(day).getByRole("button", { name: "1일차 최적화 삭제 선택 완료" }));
  fireEvent.click(within(day).getByRole("button", { name: "1일차에 최적화 장소 추가" }));
  expect(screen.getByText("/route-add-places?id=12&day=1&version=optimized")).toBeInTheDocument();
});

test("careful optimized itinerary uses a red warning but still allows user edits",()=>{
  window.localStorage.clear();
  const {saveOptimizedDay}=require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12,"account:test",places,1,{
    mode:"careful",order:["1","2"],rows:[
      {type:"start",id:"1",name:"오사카성",time:540},
      {type:"end",id:"2",name:"도톤보리",time:600}],
    warnings:[],
  })).toBe(true);
  try {
    mount();
    fireEvent.click(screen.getByRole("button",{name:"최적화한 일정"}));
    fireEvent.click(screen.getByRole("button",{name:"1일차 편집"}));
    const dialog=screen.getByRole("alertdialog",{name:"최적화한 일정 편집 경고"});
    expect(queryByClass(document.body, "v16-detail-edit-guard-overlay")).toHaveClass("is-careful");
    expect(dialog).toHaveTextContent("예약과 동선의 최적화 결과가 달라질 수 있어요");
    fireEvent.keyDown(dialog,{key:"Escape"});
    expect(screen.queryByRole("alertdialog",{name:"최적화한 일정 편집 경고"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
    fireEvent.click(screen.getByRole("button",{name:"그래도 편집하기"}));
    expect(screen.getByRole("button",{name:"편집 완료"})).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"최적화한 일정"})).toHaveAttribute("aria-pressed","true");
  }finally{window.localStorage.clear();}
});
test("a manually selected itinerary can be edited without an optimizer consent modal",()=>{
  window.localStorage.clear();
  const {saveOptimizedDay}=require("./tripOptimizationVersionStore");
  saveOptimizedDay(12,"account:test",places,1,{
    mode:"careful",order:["1","2"],rows:[],warnings:[],
  });
  try{
    mount();
    fireEvent.click(screen.getByRole("button",{name:"직접 만든 일정"}));
    fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
    expect(screen.queryByRole("alertdialog",{name:"최적화한 일정 편집 경고"})).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"편집 완료"})).toBeInTheDocument();
  }finally{window.localStorage.clear();}
});

test("optimized edit shows saved planned visit time and dwell rather than original values",()=>{
  window.localStorage.clear();
  const {saveOptimizedDay,readOptimizedVersions}=require("./tripOptimizationVersionStore");
  const original=places.map(p=>({...p,stayDuration:60}));
  useTripResult.mockImplementation(()=>data(shortTrip,original));
  expect(saveOptimizedDay(12,"account:test",original,1,{
    mode:"careful",order:["2","1"],
    rows:[{type:"place",id:"2",name:"도톤보리",time:665,end:785,minutes:120},
      {type:"end",id:"1",name:"오사카성",time:830,end:830,minutes:0}],
    stayOverrides:{"2":120},warnings:[],
  })).toBe(true);
  try {
    mount();
    fireEvent.click(screen.getByRole("button",{name:"최적화한 일정"}));
    fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
    fireEvent.click(screen.getByRole("button",{name:"그래도 편집하기"}));
    const day=screen.getByRole("region",{name:"1일차 일정"});
    expect(within(day).getByText(/방문 11:05 · 머무르기 120분/)).toBeInTheDocument();
    fireEvent.click(within(day).getByRole("button",{name:"도톤보리 최적화 방문 정보 수정"}));
    expect(within(day).getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","11");
    expect(within(day).getByRole("spinbutton",{name:"최적화 머무르기 (분)"})).toHaveValue(120);
    fireEvent.change(within(day).getByRole("spinbutton",{name:"최적화 머무르기 (분)"}),
      {target:{value:"90"}});
    fireEvent.click(within(day).getByRole("button",{name:"저장"}));
    expect(readOptimizedVersions(12,"account:test",original)["1"].stayOverrides["2"]).toBe(90);
    expect(within(day).getByText(/방문 11:05 · 머무르기 90분/)).toBeInTheDocument();
    expect(original[1].stayDuration).toBe(60);
    expect(getTripPlacesApi).not.toHaveBeenCalled();
  }finally{window.localStorage.clear();}
});
test("edit-mode version switch changes workspaces, with confirmation only on optimized entry",()=>{
  window.localStorage.clear();
  const {saveOptimizedDay}=require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12,"account:test",places,1,{
    mode:"quick",order:["2","1"],rows:[
      {type:"place",id:"2",name:"도톤보리",time:660,minutes:90},
      {type:"end",id:"1",name:"오사카성",time:735,minutes:0}],warnings:[],
  })).toBe(true);
  try {
    mount("/route-result?id=12&edit=1&day=1");
    const switcher=screen.getByRole("group",{name:"편집 일정 버전 전환"});
    expect(within(switcher).getByRole("button",{name:"직접 만든 일정"})).toHaveAttribute("aria-pressed","true");
    expect(screen.getByRole("button",{name:"오사카성 방문 정보 수정"})).toBeInTheDocument();
    fireEvent.click(within(switcher).getByRole("button",{name:"최적화한 일정"}));
    const dialog=screen.getByRole("alertdialog",{name:"최적화한 일정 편집 경고"});
    expect(dialog).toHaveTextContent("최적화한 동선이 달라질 수 있어요");
    fireEvent.click(within(dialog).getByRole("button",{name:"취소"}));
    expect(screen.getByRole("button",{name:"오사카성 방문 정보 수정"})).toBeInTheDocument();
    fireEvent.click(within(switcher).getByRole("button",{name:"최적화한 일정"}));
    fireEvent.click(screen.getByRole("button",{name:"그래도 편집하기"}));
    expect(screen.getByText("/route-result?id=12&edit=1&day=1&version=optimized")).toBeInTheDocument();
    expect(within(switcher).getByRole("button",{name:"최적화한 일정"})).toHaveAttribute("aria-pressed","true");
    expect(screen.getByRole("button",{name:"도톤보리 최적화 방문 정보 수정"})).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"오사카성 방문 정보 수정"})).not.toBeInTheDocument();
    fireEvent.click(within(switcher).getByRole("button",{name:"직접 만든 일정"}));
    expect(screen.getByText("/route-result?id=12&edit=1&day=1")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"오사카성 방문 정보 수정"})).toBeInTheDocument();
  }finally{window.localStorage.clear();}
});

test("once optimized visit data has actually changed, re-entering its editor skips the warning",()=>{
  window.localStorage.clear();
  const {saveOptimizedDay}=require("./tripOptimizationVersionStore");
  expect(saveOptimizedDay(12,"account:test",places,1,{
    mode:"careful",order:["1","2"],
    rows:[{type:"start",id:"1",name:"오사카성",time:540},
      {type:"end",id:"2",name:"도톤보리",time:600}],warnings:[],
    manuallyEdited:true
  })).toBe(true);
  try {
    mount();
    fireEvent.click(screen.getByRole("button",{name:"최적화한 일정"}));
    fireEvent.click(screen.getByRole("button",{name:"편집하기"}));
    expect(screen.queryByRole("alertdialog",{name:"최적화한 일정 편집 경고"})).not.toBeInTheDocument();
    expect(screen.getByRole("group",{name:"편집 일정 버전 전환"})).toBeInTheDocument();
  }finally{window.localStorage.clear();}
});
test("trip title blur automatically adds a free suffix when another owned trip has the same title",async()=>{
  getTripsApi.mockResolvedValue([
    shortTrip,{id:17,title:"홍콩"},{id:18,title:"홍콩 (1)"}
  ]);
  const requested="홍콩 (2)";
  renameTripTitleApi.mockResolvedValue({...shortTrip,title:requested});
  getTripByIdApi.mockResolvedValue({...shortTrip,title:requested});
  mount();
  fireEvent.click(screen.getByRole("button",{name:"일정명 수정"}));
  fireEvent.change(screen.getByRole("textbox",{name:"일정명"}),{target:{value:"홍콩"}});
  fireEvent.blur(screen.getByRole("textbox",{name:"일정명"}));
  await waitFor(()=>expect(renameTripTitleApi).toHaveBeenCalledWith({tripId:"12",title:requested}));
  expect(screen.queryByText("일정명을 변경했어요.")).not.toBeInTheDocument();
});
