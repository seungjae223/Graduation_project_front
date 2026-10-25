import { queryByClass, getArticleByText } from "../testQueries";
import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import TripInlineEditor from "./TripInlineEditor";
import { getTripPlacesApi, deleteTripDayPlacesApi, updateTripPlaceManualOrderApi,
  updateTripPlaceMemoApi, updateTripPlaceScheduleApi } from "../api/tripApi";

jest.mock("../api/tripApi", () => ({
  getTripPlacesApi: jest.fn(), deleteTripDayPlacesApi: jest.fn(), updateTripPlaceManualOrderApi: jest.fn(),
  updateTripPlaceMemoApi: jest.fn(), updateTripPlaceScheduleApi: jest.fn(),
}));
const places = [
  { tripPlaceId: 1, placeId: 101, placeName: "호텔", day: 1, visitOrder: 1,
    arrivalTime: "09:00", isStartPoint: true, memo: "" },
  { tripPlaceId: 2, placeId: 102, placeName: "오사카성", day: 1, visitOrder: 2,
    arrivalTime: "10:00", isFixed: false, memo: "" },
];
const refresh = jest.fn();
const openPlace = jest.fn();
const mount = (opts = {}) => render(<TripInlineEditor tripId="12"
  day={{ day: 1, places }} onRefresh={refresh} onPlaceDetail={openPlace} {...opts}/>);
beforeEach(() => {
  jest.clearAllMocks();
  refresh.mockResolvedValue(undefined);
  updateTripPlaceScheduleApi.mockResolvedValue({ id:2 });
  updateTripPlaceMemoApi.mockResolvedValue({ id:2 });
  getTripPlacesApi.mockResolvedValue(places);
  deleteTripDayPlacesApi.mockResolvedValue([]);
});
test("pencil opens a compact editor without route optimization or day-level time fields", () => {
  mount();
  expect(screen.queryByText("경로 최적화")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("마지막 도착 시간")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "오사카성 방문 정보 수정" }));
  expect(screen.getByLabelText("메모")).toHaveAttribute("rows", "2");
  expect(screen.getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","10");
  expect(screen.queryByText("방문 정보")).not.toBeInTheDocument();
  expect(screen.getByLabelText("이 시간에 꼭 방문")).not.toBeChecked();
  expect(screen.getByRole("button", { name: "오사카성 장소 상세 보기" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "오사카성 장소 상세 보기" }));
  expect(openPlace).toHaveBeenCalledWith(places[1]);
});
test("one compact save persists booking and memo without modifying stay or travel", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name: "오사카성 방문 정보 수정" }));
  fireEvent.click(screen.getByRole("button",{name:"+1시간"}));
  fireEvent.click(screen.getByRole("button",{name:"+30분"}));
  fireEvent.click(screen.getByLabelText("이 시간에 꼭 방문"));
  fireEvent.change(screen.getByLabelText("메모"), { target: { value: "성 산책" } });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await waitFor(() => expect(updateTripPlaceScheduleApi).toHaveBeenCalledWith({
    tripId:"12", day:1, tripPlaceId:"2", schedule:{ fixed:true, arrivalTime:"11:30", reorderByVisitTime:false },
  }));
  await waitFor(() => expect(updateTripPlaceMemoApi).toHaveBeenCalledWith({
    tripId:"12", day:1, tripPlaceId:"2", memo:"성 산책",
  }));
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(updateTripPlaceManualOrderApi).not.toHaveBeenCalled();
});
test("inline bottom add navigates to dedicated picker instead of opening an old panel", () => {
  const onAddPlaces = jest.fn();
  mount({ onAddPlaces });
  fireEvent.click(screen.getByRole("button", { name: "＋ 장소 추가" }));
  expect(onAddPlaces).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("searchbox", { name: "추가할 장소 검색" })).not.toBeInTheDocument();
});

test("manual editor hides the starting marker and marks reserved stops in yellow", () => {
  mount();
  const first = getArticleByText("호텔");
  const marker = queryByClass(first, "v16-inline-position");
  expect(queryByClass(marker, "v16-detail-sequence")).toHaveTextContent("1");
  expect(queryByClass(marker, "v16-inline-start")).toBeNull();
  expect(marker).not.toHaveTextContent("시작");
  expect(screen.getByRole("button", { name: "호텔 방문 정보 수정" })).toHaveTextContent("수정");
});
test("only stored clock or dwell makes the manual visit summary visible", () => {
  const custom=[{...places[0],arrivalTime:"",stayDuration:0,isStartPoint:true},
    {...places[1],arrivalTime:"",stayDuration:45,isFixed:true}];
  mount({day:{day:1,places:custom}});
  const empty=getArticleByText("호텔");
  expect(queryByClass(empty, "v16-inline-place-meta")).toBeNull();
  const fixed=getArticleByText("오사카성");
  expect(queryByClass(fixed, "v16-inline-position")).toHaveClass("is-fixed");
  expect(queryByClass(fixed, "v16-inline-pin-label")).toHaveTextContent("고정");
  expect(queryByClass(fixed, "v16-inline-place-meta")).toHaveTextContent("방문 --:--");
  expect(queryByClass(fixed, "v16-inline-place-meta")).toHaveTextContent("머무르기 45분");
});
test("day edit opens the first place's compact form immediately", () => {
  mount({ autoOpenFirst: true });
  expect(screen.getByRole("button", { name: "호텔 수정 닫기" })).toHaveAttribute("aria-expanded","true");
  expect(screen.getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","09");
});
test("delete mode selects cards with right-side checks and cancels the animated dock", () => {
  mount({ deleteMode: true });
  fireEvent.click(screen.getByRole("button", { name: "오사카성 삭제 선택" }));
  const dock = queryByClass(document, "v16-inline-floating-delete");
  expect(dock).toHaveClass("is-visible");
  expect(screen.getByRole("button", { name: "선택한 장소 1개 삭제하기" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "오사카성 삭제 선택 해제" }));
  expect(dock).not.toHaveClass("is-visible");
  expect(dock).toHaveAttribute("aria-hidden","true");
  expect(deleteTripDayPlacesApi).not.toHaveBeenCalled();
});
test("selected day places delete after explicit confirmation and refresh the original itinerary", async () => {
  const onFinishDelete = jest.fn();
  mount({ deleteMode: true, onFinishDelete });
  fireEvent.click(screen.getByRole("button", { name: "호텔 삭제 선택" }));
  fireEvent.click(screen.getByRole("button", { name: "오사카성 삭제 선택" }));
  fireEvent.click(screen.getByRole("button", { name: "선택한 장소 2개 삭제하기" }));
  expect(screen.getByRole("alertdialog", { name: "선택한 일정 장소 삭제 확인" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "삭제 확인" }));
  await waitFor(() => expect(deleteTripDayPlacesApi).toHaveBeenCalledWith({
    tripId: "12", day: 1, tripPlaceIds: [1,2],
  }));
  await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
  expect(onFinishDelete).toHaveBeenCalledTimes(1);
  expect(queryByClass(document, "v16-inline-floating-delete")).not.toHaveClass("is-visible");
});

test("removing a planned clock persists an explicit null and clears fixed state", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name:"호텔 방문 정보 수정" }));
  fireEvent.click(screen.getByRole("button", { name:"시간 지우기" }));
  expect(screen.getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","미정");
  fireEvent.click(screen.getByRole("button", { name:"저장" }));
  await waitFor(() => expect(updateTripPlaceScheduleApi).toHaveBeenCalledWith({
    tripId:"12",day:1,tripPlaceId:"1",
    schedule:{fixed:false,clearArrivalTime:true,reorderByVisitTime:false},
  }));
});
test("the first stop accepts a hard visit time and a fixed reservation", async () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name:"호텔 방문 정보 수정" }));
  const fixed=screen.getByLabelText("이 시간에 꼭 방문");
  expect(fixed).toBeEnabled();
  fireEvent.click(fixed);
  fireEvent.click(screen.getByRole("button", { name:"저장" }));
  await waitFor(() => expect(updateTripPlaceScheduleApi).toHaveBeenCalledWith({
    tripId:"12",day:1,tripPlaceId:"1",
    schedule:{fixed:true,arrivalTime:"09:00",reorderByVisitTime:false},
  }));
});
test("quick time choices and hover help remain usable from the compact editor", () => {
  mount();
  fireEvent.click(screen.getByRole("button", { name:"오사카성 방문 정보 수정" }));
  fireEvent.click(screen.getByRole("button", { name:"-1시간" }));
  expect(screen.getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","09");
  fireEvent.click(screen.getByRole("button", { name:"+1시간" }));
  fireEvent.click(screen.getByRole("button", { name:"+30분" }));
  expect(screen.getByRole("spinbutton",{name:"분"})).toHaveAttribute("aria-valuetext","30");
  const help=screen.getByRole("button", { name:"고정 방문 시간 설명" });
  expect(help).toHaveAttribute("aria-describedby");
  expect(screen.getByRole("tooltip")).toHaveTextContent("꼼꼼한 최적화에서 예약 시각을 고려");
});

test("empty clock arrows and one-tap hour have predictable starting points",()=>{
  mount({day:{day:1,places:[{...places[0],arrivalTime:null}]}});
  fireEvent.click(screen.getByRole("button",{name:"호텔 방문 정보 수정"}));
  fireEvent.click(screen.getByRole("button",{name:"분 아래 화살표"}));
  expect(screen.getByRole("spinbutton",{name:"분"})).toHaveAttribute("aria-valuetext","01");
  fireEvent.click(screen.getByRole("button",{name:"시간 지우기"}));
  fireEvent.click(screen.getByRole("button",{name:"오전 오후 위 화살표"}));
  expect(screen.getByRole("spinbutton",{name:"오전 오후"})).toHaveAttribute("aria-valuetext","오전");
  fireEvent.click(screen.getByRole("button",{name:"오전 오후 위 화살표"}));
  expect(screen.getByRole("spinbutton",{name:"오전 오후"})).toHaveAttribute("aria-valuetext","오후");
  fireEvent.click(screen.getByRole("button",{name:"시간 지우기"}));
  fireEvent.click(screen.getByRole("button",{name:"시 위 화살표"}));
  fireEvent.click(screen.getByRole("button",{name:"시 위 화살표"}));
  expect(screen.getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","11");
  fireEvent.click(screen.getByRole("button",{name:"시간 지우기"}));
  fireEvent.click(screen.getByRole("button",{name:"+1시간"}));
  expect(screen.getByRole("spinbutton",{name:"시"})).toHaveAttribute("aria-valuetext","01");
});
test("clock segment can be changed using keyboard arrows",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"오사카성 방문 정보 수정"}));
  fireEvent.keyDown(screen.getByRole("spinbutton",{name:"분"}),{key:"ArrowDown"});
  expect(screen.getByRole("spinbutton",{name:"분"})).toHaveAttribute("aria-valuetext","01");
});

test("holding a minute arrow repeats after the initial delay, then stops on release",()=>{
  jest.useFakeTimers();
  try {
    mount();
    fireEvent.click(screen.getByRole("button",{name:"오사카성 방문 정보 수정"}));
    const arrow=screen.getByRole("button",{name:"분 아래 화살표"});
    fireEvent.mouseDown(arrow,{button:0});
    act(()=>jest.advanceTimersByTime(715));
    fireEvent.mouseUp(arrow);
    fireEvent.click(arrow);
    expect(screen.getByRole("spinbutton",{name:"분"})).toHaveAttribute("aria-valuetext","03");
    act(()=>jest.advanceTimersByTime(500));
    expect(screen.getByRole("spinbutton",{name:"분"})).toHaveAttribute("aria-valuetext","03");
  } finally {
    jest.useRealTimers();
  }
});

test("changing a visit time does not request automatic visit-order changes",async()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"오사카성 방문 정보 수정"}));
  fireEvent.click(screen.getByRole("button",{name:"+30분"}));
  fireEvent.click(screen.getByRole("button",{name:"저장"}));
  await waitFor(()=>expect(updateTripPlaceScheduleApi).toHaveBeenCalledWith(
    expect.objectContaining({schedule:expect.objectContaining({reorderByVisitTime:false})})));
  expect(updateTripPlaceManualOrderApi).not.toHaveBeenCalled();
});

test("visit dwell saves through schedule API without changing booking or manual order",async()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"오사카성 방문 정보 수정"}));
  expect(screen.getByRole("spinbutton",{name:"머무르기 (분)"})).toHaveValue(60);
  fireEvent.click(screen.getByRole("button",{name:"90분"}));
  expect(screen.getByRole("spinbutton",{name:"머무르기 (분)"})).toHaveValue(90);
  fireEvent.click(screen.getByRole("button",{name:"저장"}));
  await waitFor(()=>expect(updateTripPlaceScheduleApi).toHaveBeenCalledWith({
    tripId:"12",day:1,tripPlaceId:"2",schedule:{stayDuration:90},
  }));
  expect(updateTripPlaceMemoApi).not.toHaveBeenCalled();
  expect(updateTripPlaceManualOrderApi).not.toHaveBeenCalled();
  expect(refresh).toHaveBeenCalledTimes(1);
});
test("dwell outside backend 1 to 1440 minute range is rejected before writing",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"오사카성 방문 정보 수정"}));
  const duration=screen.getByRole("spinbutton",{name:"머무르기 (분)"});
  fireEvent.change(duration,{target:{value:"1441"}});
  fireEvent.click(screen.getByRole("button",{name:"저장"}));
  expect(screen.getByText("머무르는 시간은 1~1440분 사이로 입력해 주세요.")).toBeInTheDocument();
  expect(updateTripPlaceScheduleApi).not.toHaveBeenCalled();
  fireEvent.change(duration,{target:{value:"0"}});
  fireEvent.click(screen.getByRole("button",{name:"저장"}));
  expect(updateTripPlaceScheduleApi).not.toHaveBeenCalled();
});
test("visit time and dwell saved together keep explicitly disabled automatic reordering",async()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"오사카성 방문 정보 수정"}));
  fireEvent.click(screen.getByRole("button",{name:"+30분"}));
  fireEvent.change(screen.getByRole("spinbutton",{name:"머무르기 (분)"}),
    {target:{value:"75"}});
  fireEvent.click(screen.getByRole("button",{name:"저장"}));
  await waitFor(()=>expect(updateTripPlaceScheduleApi).toHaveBeenCalledWith({
    tripId:"12",day:1,tripPlaceId:"2",
    schedule:{fixed:false,arrivalTime:"10:30",reorderByVisitTime:false,stayDuration:75},
  }));
});
