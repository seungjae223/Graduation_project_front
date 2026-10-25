import { queryByClass } from "../testQueries";
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import TripPlacePickerPage from "./TripPlacePickerPage";
import { getTripByIdApi, getTripPlacesApi, addPlaceToTripApi } from "../api/tripApi";
import { getDestinationsApi, getDestinationPlacesApi } from "../api/destinationApi";
import { getFoldersApi, getFolderPlacesApi } from "../api/placeApi";
import { getPlaceEngagementApi } from "../api/placeEngagementApi";

jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));
jest.mock("../api/tripApi", () => ({
  getTripByIdApi: jest.fn(), getTripPlacesApi: jest.fn(), addPlaceToTripApi: jest.fn(),
}));
jest.mock("../api/destinationApi", () => ({
  getDestinationsApi: jest.fn(), getDestinationPlacesApi: jest.fn(),
}));
jest.mock("../api/placeApi", () => ({
  getFoldersApi: jest.fn(), getFolderPlacesApi: jest.fn(),
}));
jest.mock("../api/placeEngagementApi", () => ({ getPlaceEngagementApi: jest.fn() }));
jest.mock("../components/PlacePhoto", () => () => <span>사진</span>);
const trip = { id:12, title:"홍콩 여행", destination:"홍콩", startDate:"2026-11-12", endDate:"2026-11-15" };
const hk = (id, name, placeCategory) => ({ id, name, placeCategory, region:"홍콩" });
const home = hk(1, "홍콩 숙소", "STAY");
const market = hk(2, "레이디스 마켓", "SHOPPING");
const harbour = hk(3, "빅토리아 하버", "LANDMARK");
const japanese = { id:10, name:"도쿄 타워", region:"일본", placeCategory:"LANDMARK" };
const folders = [
  {id:10,name:"좋아하는 장소",systemType:"FAVORITES"},
  {id:11,name:"일본 여행",systemType:null},
  {id:12,name:"홍콩 여행",systemType:null},
];
const paths = {
  10:[market,harbour,japanese], 11:[japanese], 12:[home,market,harbour],
};
const Locator=()=>{const l=useLocation();return <output>{l.pathname+l.search}</output>};
const mount=(path="/route-add-places?id=12&day=1")=>render(<MemoryRouter initialEntries={[path]}>
  <Routes><Route path="/route-add-places" element={<TripPlacePickerPage/>}/>
    <Route path="/route-result" element={<Locator/>}/>
    <Route path="/detail" element={<Locator/>}/></Routes></MemoryRouter>);
beforeEach(()=>{
  jest.clearAllMocks();sessionStorage.clear();
  getTripByIdApi.mockResolvedValue(trip);
  getTripPlacesApi.mockResolvedValue([]);
  getDestinationsApi.mockResolvedValue([{name:"홍콩",code:"hong-kong"}]);
  getDestinationPlacesApi.mockResolvedValue([home,market,harbour]);
  getFoldersApi.mockResolvedValue(folders);
  getFolderPlacesApi.mockImplementation(async id=>paths[id]||[]);
  getPlaceEngagementApi.mockImplementation(async ids=>ids.map(id=>({
    placeId:id, likeCount:id+10, reviewCount:id===3?0:id, averageRating:id===1?4.5:id===2?5.0:null,
  })));
  addPlaceToTripApi.mockImplementation(async ({placeId})=>({tripPlaceId:placeId}));
});
afterEach(()=>sessionStorage.clear());
test("opens all regional places by default, then favorites and region-ranked folders in one strip",async()=>{
  mount();
  expect(await screen.findByRole("button",{name:"홍콩 숙소 선택"})).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"레이디스 마켓 선택"})).toBeInTheDocument();
  const group=screen.getByRole("group",{name:"내 장소 목록"});
  expect(within(group).getByRole("button",{name:"전체"})).toHaveAttribute("aria-pressed","true");
  const labels=within(group).getAllByRole("button").map(x=>x.textContent);
  expect(labels).toEqual(["전체","내 숙소","좋아하는 장소","홍콩 여행","일본 여행"]);
  expect(screen.queryByRole("button",{name:"장소를 선택해 주세요"})).not.toBeInTheDocument();
  expect(queryByClass(document, "v166-cart-dock")).not.toHaveClass("is-visible");
  expect(queryByClass(document, "v166-cart-dock")).toHaveAttribute("aria-hidden","true");
  expect(within(group).getByRole("button",{name:"홍콩 여행"})).not.toHaveClass("is-unrelated");
  expect(within(group).getByRole("button",{name:"일본 여행"})).toHaveClass("is-unrelated");
  expect(await screen.findByText("★ 4.5(1)")).toBeInTheDocument();
  expect(screen.getByText("★ 5.0(2)")).toBeInTheDocument();
  expect(screen.getByText("★ 0.0(0)")).toBeInTheDocument();

  fireEvent.click(within(group).getByRole("button",{name:"좋아하는 장소"}));
  expect(screen.getByRole("button",{name:"레이디스 마켓 선택"})).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"도쿄 타워 선택"})).not.toBeInTheDocument();
});
test("deselecting the final place hides and disables the basket instead of showing disabled CTA", async () => {
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(screen.getByRole("button",{name:"홍콩 숙소 선택"}));
  expect(screen.getByRole("button",{name:"1곳 선택 완료"})).toBeInTheDocument();
  fireEvent.click(within(screen.getByRole("list",{name:"장소 목록"}))
    .getByRole("button",{name:"홍콩 숙소 선택 해제"}));
  expect(screen.queryByRole("button",{name:"1곳 선택 완료"})).not.toBeInTheDocument();
  expect(queryByClass(document, "v166-cart-dock")).toHaveAttribute("aria-hidden","true");
  expect(queryByClass(document, "v166-cart-dock")).not.toHaveClass("is-visible");
});
test("all days can be cleared and submission requires selected days",async()=>{
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  const days=screen.getByRole("region",{name:"추가 날짜 선택"});
  fireEvent.click(within(days).getByRole("button",{name:/1일차/}));
  expect(within(days).getByRole("button",{name:/1일차/})).toHaveAttribute("aria-pressed","false");
  fireEvent.click(screen.getByRole("button",{name:"홍콩 숙소 선택"}));
  expect(screen.getByRole("button",{name:"1곳 선택 완료"})).toBeDisabled();
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
  expect(screen.queryByText("추가할 일차를 선택해 주세요.")).not.toBeInTheDocument();
  fireEvent.click(within(days).getByRole("button",{name:/2일차/}));
  expect(screen.getByRole("button",{name:"1곳 선택 완료"})).toBeEnabled();
});
test("deselecting all days clears every faint already-in-day check without altering the basket",async()=>{
  getTripPlacesApi.mockResolvedValue([{tripPlaceId:99,placeId:1,day:1,visitOrder:1}]);
  mount();
  const place=await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  expect(place).toHaveClass("is-already");
  fireEvent.click(within(screen.getByRole("region",{name:"추가 날짜 선택"}))
    .getByRole("button",{name:/1일차/}));
  expect(screen.getByRole("button",{name:"홍콩 숙소 선택"})).not.toHaveClass("is-already");
  expect(screen.queryByText("추가할 일차를 선택해 주세요.")).not.toBeInTheDocument();
});
test("reentering resets target day but preserves picked places and filters from session",async()=>{
  const { unmount: firstUnmount }=mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(screen.getByRole("button",{name:"홍콩 숙소 선택"}));
  fireEvent.click(within(screen.getByRole("region",{name:"추가 날짜 선택"}))
    .getByRole("button",{name:/2일차/}));
  fireEvent.click(within(screen.getByRole("region",{name:"추가 날짜 선택"}))
    .getByRole("button",{name:/1일차/}));
  fireEvent.change(screen.getByRole("searchbox",{name:"홍콩 장소 검색"}),{target:{value:"숙소"}});
  firstUnmount();
  mount();
  await screen.findByRole("searchbox",{name:"홍콩 장소 검색"});
  const days=screen.getByRole("region",{name:"추가 날짜 선택"});
  expect(within(days).getByRole("button",{name:/1일차/})).toHaveAttribute("aria-pressed","true");
  expect(within(days).getByRole("button",{name:/2일차/})).toHaveAttribute("aria-pressed","false");
  expect(screen.getByRole("searchbox",{name:"홍콩 장소 검색"})).toHaveValue("숙소");
  expect(within(screen.getByRole("list",{name:"장소 목록"}))
    .getByRole("button",{name:"홍콩 숙소 선택 해제"})).toHaveAttribute("aria-pressed","true");
});
test("region-limited search overrides current folder; category uses existing seven codes",async()=>{
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.change(screen.getByRole("searchbox",{name:"홍콩 장소 검색"}),{target:{value:"마켓"}});
  expect(screen.getByRole("button",{name:"레이디스 마켓 선택"})).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"홍콩 숙소 선택"})).not.toBeInTheDocument();
  const cats=within(screen.getByRole("group",{name:"장소 분류"})).getAllByRole("button");
  expect(cats.map(x=>x.textContent)).toEqual(["전체","명소","문화","자연","맛집","쇼핑","체험","숙박"]);
  fireEvent.click(within(screen.getByRole("group",{name:"장소 분류"})).getByRole("button",{name:"맛집"}));
  expect(screen.getByText("해당 지역에서 검색된 장소가 없어요.")).toBeInTheDocument();
});
test("selected places are saved to multiple selected days and page stays open",async()=>{
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(within(screen.getByRole("group",{name:"내 장소 목록"})).getByRole("button",{name:"좋아하는 장소"}));
  fireEvent.click(screen.getByRole("button",{name:"레이디스 마켓 선택"}));
  const dayGroup = screen.getByRole("region",{name:"추가 날짜 선택"});
  fireEvent.click(within(dayGroup).getByRole("button",{name:/2일차/}));
  expect(within(dayGroup).getByRole("button",{name:/1일차/})).toHaveAttribute("aria-pressed","true");
  expect(within(dayGroup).getByRole("button",{name:/2일차/})).toHaveAttribute("aria-pressed","true");
  fireEvent.click(screen.getByRole("button",{name:"빅토리아 하버 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"2곳 선택 완료"}));
  await waitFor(()=>expect(addPlaceToTripApi).toHaveBeenCalledTimes(4));
  expect(addPlaceToTripApi.mock.calls.map(([args])=>[args.placeId,args.visitOrder,args.day]))
    .toEqual([[2,1,1],[3,2,1],[2,1,2],[3,2,2]]);
  expect(await screen.findByRole("button",{name:"✓ 일정 편집으로 돌아가기"})).toBeInTheDocument();
  expect(screen.queryByText("/route-result?id=12&edit=1&day=2")).not.toBeInTheDocument();
});
test("the success return button navigates only when user taps it",async()=>{
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(screen.getByRole("button",{name:"홍콩 숙소 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"1곳 선택 완료"}));
  const back=await screen.findByRole("button",{name:"✓ 일정 편집으로 돌아가기"});
  fireEvent.click(back);
  expect(screen.getByText("/route-result?id=12&edit=1&day=1")).toBeInTheDocument();
});
test("switching back to day 1 retains chosen checkmarks without saving to that day",async()=>{
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(screen.getByRole("button",{name:"홍콩 숙소 선택"}));
  fireEvent.click(within(screen.getByRole("region",{name:"추가 날짜 선택"})).getByRole("button",{name:/2일차/}));
  expect(within(screen.getByRole("list",{name:"장소 목록"})).getByRole("button",{name:"홍콩 숙소 선택 해제"})).toHaveAttribute("aria-pressed","true");
  fireEvent.click(within(screen.getByRole("region",{name:"추가 날짜 선택"})).getByRole("button",{name:/1일차/}));
  expect(within(screen.getByRole("list",{name:"장소 목록"})).getByRole("button",{name:"홍콩 숙소 선택 해제"})).toHaveAttribute("aria-pressed","true");
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
});
test("success return button dismisses on scroll without navigating automatically",async()=>{
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(screen.getByRole("button",{name:"홍콩 숙소 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"1곳 선택 완료"}));
  await screen.findByRole("button",{name:"✓ 일정 편집으로 돌아가기"});
  fireEvent.scroll(window);
  expect(screen.queryByRole("button",{name:"✓ 일정 편집으로 돌아가기"})).not.toBeInTheDocument();
  expect(queryByClass(document, "v166-cart-dock")).toHaveAttribute("aria-hidden","true");
});
test("duplicate same-day place requires explicit confirmation and is permitted",async()=>{
  getTripPlacesApi.mockResolvedValue([{tripPlaceId:99,placeId:1,day:1,visitOrder:1}]);
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(screen.getByRole("button",{name:"홍콩 숙소 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"1곳 선택 완료"}));
  const dialog=await screen.findByRole("alertdialog",{name:"중복 장소 추가 확인"});
  expect(within(dialog).getByText("1일차")).toHaveClass("v166-duplicate-day-label");
  expect(within(dialog).getByText("홍콩 숙소")).toBeInTheDocument();
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"중복 포함 추가"}));
  await waitFor(()=>expect(addPlaceToTripApi).toHaveBeenCalledWith({
    tripId:"12",placeId:1,day:1,visitOrder:2,
  }));
});
test("already added place is a subdued check until deliberately selected",async()=>{
  getTripPlacesApi.mockResolvedValue([{tripPlaceId:99,placeId:1,day:1,visitOrder:1}]);
  mount();
  const place=await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  expect(place).toHaveClass("is-already");
  expect(place).toHaveAttribute("aria-pressed","false");
  fireEvent.click(place);
  expect(within(screen.getByRole("list",{name:"장소 목록"}))
    .getByRole("button",{name:"홍콩 숙소 선택 해제"})).not.toHaveClass("is-already");
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"1곳 선택 완료"}));
  expect(await screen.findByRole("alertdialog",{name:"중복 장소 추가 확인"})).toBeInTheDocument();
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
});
test("picker selection uses icon-only plus and animated check with accessible state", async()=>{
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  const button = screen.getByRole("button",{name:"홍콩 숙소 선택"});
  expect(button).toHaveTextContent("+");
  expect(button).not.toHaveTextContent("선택");
  expect(button).toHaveAttribute("aria-pressed","false");
  fireEvent.click(button);
  expect(within(screen.getByRole("list",{name:"장소 목록"})).getByRole("button",{name:"홍콩 숙소 선택 해제"})).toHaveAttribute("aria-pressed","true");
});
test("detail opens public place page without selecting it",async()=>{
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(screen.getByRole("button",{name:"홍콩 숙소 상세 보기"}));
  expect(screen.getByText("/detail?id=1")).toBeInTheDocument();
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
});
test("does not show unconfirmed destination and never mixes another region",async()=>{
  getDestinationsApi.mockResolvedValue([]);
  mount();
  expect(await screen.findByText(/이 여행의 지역 목록을 찾지 못했어요/)).toBeInTheDocument();
  expect(getDestinationPlacesApi).not.toHaveBeenCalled();
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
});
test("an existing stay from a trip is included in My Hotels even outside a saved folder",async()=>{
  getTripPlacesApi.mockResolvedValue([{ tripPlaceId:99, placeId:1, day:1, visitOrder:1 }]);
  getFolderPlacesApi.mockResolvedValue([]);
  mount();
  await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  fireEvent.click(within(screen.getByRole("group",{name:"내 장소 목록"}))
    .getByRole("button",{name:"내 숙소"}));
  expect(screen.getByRole("button",{name:"홍콩 숙소 선택"})).toBeInTheDocument();
});

test("already-on-selected-days indicator respects all selected days, not only the active day",async()=>{
  getTripPlacesApi.mockResolvedValue([
    {tripPlaceId:81,placeId:1,day:1,visitOrder:1},
    {tripPlaceId:82,placeId:1,day:2,visitOrder:1},
    {tripPlaceId:83,placeId:1,day:3,visitOrder:1},
  ]);
  mount();
  const place=await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  const days=screen.getByRole("region",{name:"추가 날짜 선택"});
  expect(place).toHaveClass("is-already");
  fireEvent.click(within(days).getByRole("button",{name:/2일차/}));
  fireEvent.click(within(days).getByRole("button",{name:/3일차/}));
  expect(place).toHaveClass("is-already");
});
test("faint already mark disappears if any selected day lacks the place",async()=>{
  getTripPlacesApi.mockResolvedValue([
    {tripPlaceId:81,placeId:1,day:1,visitOrder:1},
    {tripPlaceId:82,placeId:1,day:2,visitOrder:1},
  ]);
  mount();
  const place=await screen.findByRole("button",{name:"홍콩 숙소 선택"});
  const days=screen.getByRole("region",{name:"추가 날짜 선택"});
  fireEvent.click(within(days).getByRole("button",{name:/2일차/}));
  expect(place).toHaveClass("is-already");
  fireEvent.click(within(days).getByRole("button",{name:/3일차/}));
  expect(place).not.toHaveClass("is-already");
});

test("optimized place picker writes only the saved optimized draft and returns to optimized edit", async () => {
  window.localStorage.clear();
  const {saveOptimizedDay,readOptimizedVersions}=require("./tripOptimizationVersionStore");
  const original=[
    {tripPlaceId:81,placeId:1,day:1,visitOrder:1,placeName:"홍콩 숙소"},
    {tripPlaceId:82,placeId:3,day:1,visitOrder:2,placeName:"빅토리아 하버"},
  ];
  getTripPlacesApi.mockResolvedValue(original);
  expect(saveOptimizedDay(12,"account:test",original,1,{
    mode:"quick",order:["81","82"],
    rows:[{type:"start",id:"81",name:"홍콩 숙소",time:540},
      {type:"end",id:"82",name:"빅토리아 하버",time:720}],warnings:[],
  })).toBe(true);
  try {
    mount("/route-add-places?id=12&day=1&version=optimized");
    await screen.findByRole("button",{name:"레이디스 마켓 선택"});
    fireEvent.click(screen.getByRole("button",{name:"레이디스 마켓 선택"}));
    fireEvent.click(screen.getByRole("button",{name:"1곳 선택 완료"}));
    expect(await screen.findByRole("button",{name:"✓ 일정 편집으로 돌아가기"})).toBeInTheDocument();
    expect(addPlaceToTripApi).not.toHaveBeenCalled();
    const saved=readOptimizedVersions(12,"account:test",original)["1"];
    expect(saved.order).toHaveLength(3);
    expect(Object.values(saved.addedPlaces).map(place=>place.placeName)).toEqual(["레이디스 마켓"]);
    fireEvent.click(screen.getByRole("button",{name:"✓ 일정 편집으로 돌아가기"}));
    expect(screen.getByText("/route-result?id=12&edit=1&day=1&version=optimized")).toBeInTheDocument();
  }finally{window.localStorage.clear();}
});

test("optimized picker lets users choose several days and saves only independent drafts", async () => {
  window.localStorage.clear();
  const {saveOptimizedDays,readOptimizedVersions}=require("./tripOptimizationVersionStore");
  const originals=[
    {tripPlaceId:81,placeId:1,day:1,visitOrder:1,placeName:"홍콩 숙소"},
    {tripPlaceId:82,placeId:3,day:1,visitOrder:2,placeName:"빅토리아 하버"},
    {tripPlaceId:91,placeId:1,day:2,visitOrder:1,placeName:"홍콩 숙소"},
    {tripPlaceId:92,placeId:3,day:2,visitOrder:2,placeName:"빅토리아 하버"},
  ];
  const draft=(id1,id2)=>({mode:"quick",order:[id1,id2],
    rows:[{type:"start",id:id1,name:"홍콩 숙소",time:540},
      {type:"end",id:id2,name:"빅토리아 하버",time:720}],warnings:[]});
  getTripPlacesApi.mockResolvedValue(originals);
  expect(saveOptimizedDays(12,"account:test",originals,{
    1:draft("81","82"),2:draft("91","92"),
  })).toBe(true);
  try {
    mount("/route-add-places?id=12&day=1&version=optimized");
    await screen.findByRole("button",{name:"레이디스 마켓 선택"});
    const days=screen.getByRole("region",{name:"추가 날짜 선택"});
    const second=within(days).getByRole("button",{name:/2일차/});
    expect(second).not.toBeDisabled();
    fireEvent.click(second);
    expect(second).toHaveAttribute("aria-pressed","true");
    fireEvent.click(screen.getByRole("button",{name:"레이디스 마켓 선택"}));
    fireEvent.click(screen.getByRole("button",{name:"1곳 선택 완료"}));
    expect(await screen.findByRole("button",{name:"✓ 일정 편집으로 돌아가기"})).toBeInTheDocument();
    expect(addPlaceToTripApi).not.toHaveBeenCalled();
    const versions=readOptimizedVersions(12,"account:test",originals);
    expect(versions["1"].order).toHaveLength(3);
    expect(versions["2"].order).toHaveLength(3);
  }finally{window.localStorage.clear();}
});
