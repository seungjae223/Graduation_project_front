import { queryAllByClass, getByClass } from "../testQueries";
import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import TripOptimizationPage from "./TripOptimizationPage";
import useTripResult from "./useTripResult";
import { optimizeTripDayApi } from "../api/tripApi";
import { readOptimizedVersions } from "./tripOptimizationVersionStore";
import { readTripDisplayPreferences } from "./tripDetailPreferenceStore";

jest.mock("./useTripResult", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../api/tripApi", () => ({ optimizeTripDayApi: jest.fn() }));
const trip = { id: 12, title: "오사카 여행", startDate: "2026-11-12", endDate: "2026-11-13" };
const places = [
  { tripPlaceId: 1, day: 1, visitOrder: 1, placeName: "숙소", latitude: 34.69, longitude: 135.50, isStartPoint: true, stayDuration: 60 },
  { tripPlaceId: 2, day: 1, visitOrder: 2, placeName: "오사카성", latitude: 34.685, longitude: 135.524, stayDuration: 60 },
  { tripPlaceId: 3, day: 1, visitOrder: 3, placeName: "점심 식당", latitude: 34.67, longitude: 135.50, isFixed: true, arrivalTime: "12:00", stayDuration: 60 },
  { tripPlaceId: 4, day: 1, visitOrder: 4, placeName: "도톤보리", latitude: 34.67, longitude: 135.503, stayDuration: 60 },
  { tripPlaceId: 5, day: 1, visitOrder: 5, placeName: "숙소 도착", latitude: 34.69, longitude: 135.5, stayDuration: 60 },
];
const Locator = () => { const location = useLocation(); return <output>{location.pathname + location.search}</output>; };
const mount = () => render(<MemoryRouter initialEntries={["/route-optimize?id=12&day=1"]}>
  <Routes>
    <Route path="/route-optimize" element={<TripOptimizationPage/>}/>
    <Route path="/route-result" element={<Locator/>}/>
  </Routes>
</MemoryRouter>);
beforeEach(() => {
  window.localStorage.clear();
  jest.clearAllMocks();
  useTripResult.mockImplementation(() => ({ status: "success", trip, places, timelines: {}, account: "account:test" }));
});
afterEach(() => window.localStorage.clear());

test("quick and careful modes do not call the mutating POST API", () => {
  mount();
  expect(screen.getByRole("button", { name: /빠르게 정렬/ })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByRole("button", { name: /꼼꼼한 최적화/ }));
  expect(screen.getByText("시간 기준 구간")).toBeInTheDocument();
  expect(screen.getByRole("region", { name: "구간 1" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "구간 A" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "오사카성 드래그하여 순서 또는 구간 이동" })).toBeInTheDocument();
  expect(optimizeTripDayApi).not.toHaveBeenCalled();
});
test("stay time edit and travel input lead to detailed After and simple Before switch", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: /꼼꼼한 최적화/ }));
  fireEvent.click(screen.getAllByRole("button", { name: "수정" })[0]);
  expect(screen.getByText(/기본 60분/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "90분" }));
  expect(screen.getByText("예상 머무르기 90분")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "이동 시간 수정" })[0]);
  expect(screen.getByText(/장소 사이의 예상 이동 시간을 직접 바꿀 수 있어요/)).toBeInTheDocument();
  const input = screen.getAllByRole("spinbutton").find(e => /이동 시간/.test(e.getAttribute("aria-label")));
  fireEvent.change(input, { target: { value: "34" } }); fireEvent.blur(input);
  fireEvent.click(screen.getByRole("button", { name: "상세 일정 미리보기 →" }));
  expect(screen.getByRole("heading", { name: "최적화한 상세 시간표" })).toBeInTheDocument();
  expect(screen.getAllByText(/이동 \d+분/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button", { name: "Before · 직접 만든 일정" }));
  expect(screen.getByRole("heading", { name: "직접 만든 일정" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "최적화한 상세 시간표" })).not.toBeInTheDocument();
  expect(optimizeTripDayApi).not.toHaveBeenCalled();
});
test("applies only to browser-local optimized version, never writes original trip", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "상세 일정 미리보기 →" }));
  fireEvent.click(screen.getByRole("button", { name: "최적화안 적용" }));
  expect(screen.getByRole("alertdialog",{name:"최적화 경고 확인"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"경고 확인 후 적용"}));
  expect(screen.getByText("/route-result?id=12")).toBeInTheDocument();
  expect(readTripDisplayPreferences(12, "account:test")).toEqual({ view: "list", version: "optimized" });
  expect(optimizeTripDayApi).not.toHaveBeenCalled();
});
test("quick mode ignores fixed booking holds while careful mode considers reservations",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"상세 일정 미리보기 →"}));
  expect(screen.getByText(/빠르게 정렬은 예약 시각을 반영하지 않아요/)).toBeInTheDocument();
  expect(screen.queryByText(/예약 전 대기/)).not.toBeInTheDocument();
});
test("route comparison shows estimates before applying any changes",()=>{
  mount();
  const comparison=screen.getByRole("group",{name:"동선 거리 비교"});
  expect(within(comparison).getByText("원본 동선 예상 거리")).toBeInTheDocument();
  expect(within(comparison).getByText("최적화안 예상 거리")).toBeInTheDocument();
  expect(screen.queryByRole("group",{name:"최적화 효과 요약"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"상세 일정 미리보기 →"}));
  expect(screen.getByRole("group",{name:"최적화 효과 요약"})).toBeInTheDocument();
});
test("careful place can be reassigned to another pinned segment without drag",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:/꼼꼼한 최적화/}));
  fireEvent.click(screen.getAllByRole("button",{name:"수정"})[0]);
  const groupSelect=screen.getByRole("combobox",{name:/배치 구간/});
  const options=within(groupSelect).getAllByRole("option");
  expect(options.length).toBeGreaterThan(1);
  const previous=groupSelect.value;
  const next=previous==="0"?"1":"0";
  fireEvent.change(groupSelect,{target:{value:next}});
  expect(screen.getByRole("combobox",{name:/배치 구간/})).toHaveValue(next);
  fireEvent.click(screen.getByRole("button",{name:/빠르게 정렬/}));
  fireEvent.click(screen.getByRole("button",{name:/꼼꼼한 최적화/}));
  expect(screen.getByRole("combobox",{name:/배치 구간/})).toHaveValue(next);
});
test("booking delay warnings require a second explicit confirmation",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:/꼼꼼한 최적화/}));
  const departing = screen.getByRole("group",{name:"출발하고 싶은 시간"});
  for(let i=0;i<23;i++)fireEvent.click(within(departing).getByRole("button",{name:"시 아래 화살표"}));
  fireEvent.click(screen.getByRole("button",{name:"상세 일정 미리보기 →"}));
  expect(screen.getAllByText(/예약보다/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("button",{name:"최적화안 적용"}));
  expect(screen.getByRole("alertdialog",{name:"최적화 경고 확인"})).toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("alertdialog",{name:"최적화 경고 확인"}),{key:"Escape"});
  expect(screen.queryByRole("alertdialog",{name:"최적화 경고 확인"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"최적화안 적용"}));
  fireEvent.click(screen.getByRole("button",{name:"경고 확인 후 적용"}));
  expect(screen.getByText("/route-result?id=12")).toBeInTheDocument();
});
test("the before preview does not allow accidental after-plan application",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"상세 일정 미리보기 →"}));
  fireEvent.click(screen.getByRole("button",{name:"Before · 직접 만든 일정"}));
  expect(screen.getByRole("button",{name:"최적화안 적용"})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"After · 최적화한 일정"}));
  expect(screen.getByRole("button",{name:"최적화안 적용"})).toBeEnabled();
});
test("missing coordinates block estimation instead of synthesizing a location", () => {
  useTripResult.mockImplementation(() => ({ status: "success", trip,
    places: places.map(p => p.tripPlaceId === 2 ? { ...p, longitude: null } : p), timelines: {}, account:"account:test" }));
  mount();
  expect(screen.getByText(/좌표가 없는 장소/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "상세 일정 미리보기 →" })).toBeDisabled();
});

test("quick mode with pinned reservations requires explicit acknowledgment before apply",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"상세 일정 미리보기 →"}));
  fireEvent.click(screen.getByRole("button",{name:"최적화안 적용"}));
  expect(screen.getByRole("alertdialog",{name:"최적화 경고 확인"})).toBeInTheDocument();
  expect(screen.getByText(/고정 방문·예약 시간을 고려하지 않아요/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"취소"}));
  expect(screen.queryByText("/route-result?id=12")).not.toBeInTheDocument();
  expect(readTripDisplayPreferences(12, "account:test")).toEqual({ view: "list", version: "manual" });
});

test("optimizer owns no second back arrow or redundant page title",()=>{
  mount();
  expect(screen.queryByRole("button",{name:"←"})).not.toBeInTheDocument();
  expect(screen.queryByRole("heading",{name:"경로 최적화"})).not.toBeInTheDocument();
  expect(screen.queryByText("최적화할 여행")).not.toBeInTheDocument();
  expect(screen.getByText("오사카 여행")).toBeInTheDocument();
  expect(screen.queryByText("일차 선택")).not.toBeInTheDocument();
  expect(screen.queryByText(/선택한 하루의 동선/)).not.toBeInTheDocument();
});
test("mode descriptions, distinct icons, reservation warning and equal clock panels",()=>{
  mount();
  const quick=screen.getByRole("button",{name:/빠르게 정렬/});
  const careful=screen.getByRole("button",{name:/꼼꼼한 최적화/});
  expect(quick).toHaveTextContent("출발·도착만 고정하고 빠르게 정렬");
  expect(careful).toHaveTextContent("예약 기준점과 시간까지 세세하게 고려하여 최적화");
  expect(getByClass(quick, "is-quick")).toBeInTheDocument();
  expect(getByClass(careful, "is-careful")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("예약 시간이 있는 장소가 있어요.");
  expect(screen.getByText("출발지 · 숙소")).toBeInTheDocument();
  expect(screen.getByText("도착지 · 숙소 도착")).toBeInTheDocument();
  const fields=queryAllByClass(document, "v165-time-field");
  expect(fields).toHaveLength(2);
  expect(getByClass(fields[0], "v16-inline-clock-stepper")).toBeInTheDocument();
  expect(getByClass(fields[1], "v16-inline-clock-stepper")).toBeInTheDocument();
  expect(screen.queryByText("마지막 도착 희망 시각")).not.toBeInTheDocument();
});
test("optimizer clocks share the visit stepper and show a full midnight default",()=>{
  mount();
  const departure=screen.getByRole("group",{name:"출발하고 싶은 시간"});
  const arrival=screen.getByRole("group",{name:"도착하고 싶은 시간"});
  expect(within(departure).getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","12");
  expect(within(arrival).getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","12");
  fireEvent.click(within(arrival).getByRole("button",{name:"분 아래 화살표"}));
  expect(within(arrival).getByRole("spinbutton",{name:"분"})).toHaveAttribute("aria-valuetext","01");
  expect(screen.queryByRole("button",{name:"도착 시간 지우기"})).not.toBeInTheDocument();
  fireEvent.click(within(departure).getByRole("button",{name:"시 아래 화살표"}));
  expect(within(departure).getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","01");
});
test("careful segments reuse previous arrival and stay, not duplicate time inputs",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:/꼼꼼한 최적화/}));
  const a=screen.getByRole("region",{name:"구간 1"});
  expect(within(a).getByRole("group",{name:"구간 A 예상 시간"})).toBeInTheDocument();
  expect(within(a).queryByRole("group",{name:"구간 A 출발 시간"})).not.toBeInTheDocument();
  const end=within(a).getByRole("spinbutton",{name:/도착점 머무르기/});
  fireEvent.change(end,{target:{value:"90"}});fireEvent.blur(end);
  const next=screen.getByRole("region",{name:"구간 2"});
  expect(within(next).getByRole("group",{name:"구간 B 예상 시간"})).toBeInTheDocument();
  expect(screen.queryByText(/예상 필요/)).not.toBeInTheDocument();
  expect(screen.queryByText(/사용 가능 -/)).not.toBeInTheDocument();
  expect(optimizeTripDayApi).not.toHaveBeenCalled();
});

test("booking edit deep links to the exact trip-place editor without changing bookings",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:/꼼꼼한 최적화/}));
  const day=screen.getByRole("region",{name:"구간 1"});
  const booking=within(day).getByRole("button",{name:"점심 식당 예약 시간 수정하러 가기"});
  expect(booking).toHaveTextContent("수정하러 가기");
  fireEvent.click(booking);
  expect(screen.getByText("/route-result?id=12&edit=1&day=1&place=3")).toBeInTheDocument();
  expect(optimizeTripDayApi).not.toHaveBeenCalled();
});
test("estimated travel help is readable from the question-mark control",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:/꼼꼼한 최적화/}));
  const section=screen.getByRole("region",{name:"구간 1"});
  const trigger=within(section).getByRole("button",{name:"구간 A 예상 이동시간 안내"});
  trigger.focus();
  const tooltip=within(section).getByRole("tooltip",{hidden:true});
  expect(trigger).toHaveAttribute("aria-describedby",tooltip.id);
  expect(tooltip).toHaveTextContent("실제 이동 시간과 다를 수 있으니, 직접 찾아서 넣으면 더 완벽한 계획을 짤 수 있어요");
});

test("quick setup without bookings shows trip ends, middle count and a link to edit stay durations",()=>{
  const noBookings=places.map(p=>({...p,isFixed:false}));
  useTripResult.mockImplementation(()=>({status:"success",trip,places:noBookings,timelines:{},account:"account:test"}));
  mount();
  const note=screen.getByRole("group",{name:"빠른 정렬 방문 정보"});
  expect(within(note).getByText(/숙소 → 숙소 도착/)).toBeInTheDocument();
  expect(within(note).getByText("중간 방문지 3곳")).toBeInTheDocument();
  expect(within(note).getByText(/머무르는 시간을 설정하면/)).toBeInTheDocument();
  expect(screen.queryByText("예약 시간이 있는 장소가 있어요.")).not.toBeInTheDocument();
  fireEvent.click(within(note).getByRole("button",{name:"수정하러 가기"}));
  expect(screen.getByText("/route-result?id=12&edit=1&day=1")).toBeInTheDocument();
});
test("optimizer saves quick/careful mode alongside each separate browser-local itinerary",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"상세 일정 미리보기 →"}));
  fireEvent.click(screen.getByRole("button",{name:"최적화안 적용"}));
  fireEvent.click(screen.getByRole("button",{name:"경고 확인 후 적용"}));
  const optimized=readOptimizedVersions(12,"account:test",places)["1"];
  expect(optimized.mode).toBe("quick");
});

test("careful optimization preserves a configured pinned-place stay for later optimized editing",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:/꼼꼼한 최적화/}));
  const segment=screen.getByRole("region",{name:"구간 1"});
  const duration=within(segment).getByRole("spinbutton",{name:"점심 식당 도착점 머무르기"});
  fireEvent.change(duration,{target:{value:"95"}});
  fireEvent.blur(duration);
  fireEvent.click(screen.getByRole("button",{name:"상세 일정 미리보기 →"}));
  fireEvent.click(screen.getByRole("button",{name:"최적화안 적용"}));
  const confirmation=screen.queryByRole("alertdialog",{name:"최적화 경고 확인"});
  if(confirmation)fireEvent.click(screen.getByRole("button",{name:"경고 확인 후 적용"}));
  const saved=readOptimizedVersions(12,"account:test",places)["1"];
  expect(saved.mode).toBe("careful");
  expect(saved.stayOverrides["3"]).toBe(95);
});

test("careful route shows calculated recommendation and the segment setup next step",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:/꼼꼼한 최적화/}));
  expect(screen.getByText(/NomanGo가 자동 계산을 끝내 먼저 효율적으로 장소를 배치했어요/)).toBeInTheDocument();
  expect(screen.getByText("이제 조금만 더 설정하면 NomanGo가 완성해드려요!")).toBeInTheDocument();
});
