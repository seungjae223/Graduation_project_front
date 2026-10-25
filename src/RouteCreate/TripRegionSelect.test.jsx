import { queryByClass } from "../testQueries";
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter,Routes,Route,useLocation } from "react-router-dom";
import TripRegionSelect from "./TripRegionSelect";
import { getDestinationsApi } from "../api/destinationApi";
import { createTripApi, getTripsApi } from "../api/tripApi";
import { saveDateDraft,readDateDraft } from "./tripCreationDraft";
jest.mock("../utils/useSessionKey",()=>({__esModule:true,default:()=>"account:test"}));
jest.mock("../utils/authState",()=>({getAuthSnapshot:()=>({accountKey:"account:test"})}));
jest.mock("../api/destinationApi",()=>({getDestinationsApi:jest.fn()}));
jest.mock("../api/tripApi",()=>({createTripApi:jest.fn(),getTripsApi:jest.fn()}));
const sample=[
{code:"osaka",name:"오사카",countryName:"일본",countryCode:"jp",scope:"OVERSEAS"},
{code:"tokyo",name:"도쿄",countryName:"일본",countryCode:"jp",scope:"OVERSEAS"},
{code:"jeju",name:"제주",countryName:"대한민국",countryCode:"kr",scope:"DOMESTIC"},
];
const Path=()=>{const l=useLocation();return <p>도착: {l.pathname+l.search}</p>;};
const mount=()=>render(<MemoryRouter initialEntries={["/route-create/region"]}><Routes>
  <Route path="/route-create" element={<Path/>}/>
  <Route path="/route-create/region" element={<TripRegionSelect/>}/>
  <Route path="/route-result" element={<Path/>}/>
  <Route path="/schedule" element={<Path/>}/>
</Routes></MemoryRouter>);
beforeEach(()=>{
  jest.clearAllMocks();sessionStorage.clear();
  getDestinationsApi.mockResolvedValue(sample);
  createTripApi.mockResolvedValue({id:123});
  getTripsApi.mockResolvedValue([]);
});
test("direct region visit without dates returns to date selection",async()=>{
  mount();
  expect(await screen.findByText("도착: /route-create")).toBeInTheDocument();
  expect(createTripApi).not.toHaveBeenCalled();
});
test("region selection is single choice with only a floating next action",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  mount();
  expect(await screen.findByRole("button",{name:"오사카"})).toHaveAttribute("aria-pressed","false");
  expect(screen.queryByRole("button",{name:"다음"})).not.toBeInTheDocument();
  expect(screen.queryByText(/선택 완료|1곳 선택/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"오사카"}));
  expect(screen.getByRole("button",{name:"다음"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"도쿄"}));
  expect(screen.getByRole("button",{name:"오사카"})).toHaveAttribute("aria-pressed","false");
  expect(screen.getByRole("button",{name:"도쿄"})).toHaveAttribute("aria-pressed","true");
  fireEvent.click(screen.getByRole("button",{name:"오사카"}));
  fireEvent.click(screen.getByRole("button",{name:"다음"}));
  await waitFor(()=>expect(createTripApi).toHaveBeenCalledTimes(1));
  expect(createTripApi).toHaveBeenCalledWith({
    title:"오사카 여행",destination:"오사카",startDate:"2026-11-12",endDate:"2026-11-15",
    latitude:null,longitude:null,
  });
  expect(await screen.findByText("도착: /route-result?id=123")).toBeInTheDocument();
  expect(readDateDraft("account:test")).toBeNull();
});
test("unknown create response is not automatically retried",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  createTripApi.mockRejectedValueOnce(new Error("Connection lost"));
  mount();
  fireEvent.click(await screen.findByRole("button",{name:"오사카"}));
  fireEvent.click(screen.getByRole("button",{name:"다음"}));
  expect(await screen.findByRole("button",{name:"일정 목록 확인"})).toBeInTheDocument();
  expect(createTripApi).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("button",{name:"다음"})).not.toBeInTheDocument();
});

test("next button remains anchored in document body outside route animations",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  mount();
  fireEvent.click(await screen.findByRole("button",{name:"오사카"}));
  const dock = queryByClass(document.body, "v16-region-next");
  expect(document.body).toContainElement(dock);
  expect(screen.getByRole("main")).not.toContainElement(dock);
});
test("server failure is visible next to the fixed next action, without claiming navigation",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  createTripApi.mockRejectedValueOnce({response:{status:500}});
  mount();
  fireEvent.click(await screen.findByRole("button",{name:"오사카"}));
  fireEvent.click(screen.getByRole("button",{name:"다음"}));
  const alert=await screen.findByRole("alert");
  expect(alert).toHaveTextContent("저장 결과를 확인하지 못했어요 (HTTP 500)");
  expect(queryByClass(document.body, "v16-region-next")).toContainElement(alert);
  expect(createTripApi).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("도착: /route-result?id=123")).not.toBeInTheDocument();
});

test("successful create reads the baseline but still posts only once",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  mount();
  fireEvent.click(await screen.findByRole("button",{name:"오사카"}));
  fireEvent.click(screen.getByRole("button",{name:"다음"}));
  expect(await screen.findByText("도착: /route-result?id=123")).toBeInTheDocument();
  expect(getTripsApi).toHaveBeenCalledTimes(1);
  expect(createTripApi).toHaveBeenCalledTimes(1);
});
test("lost POST response can recover a uniquely confirmed new server trip by read-only GET",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  const newTrip={id:197,title:"오사카 여행",destination:"오사카",startDate:"2026-11-12",endDate:"2026-11-15"};
  getTripsApi.mockResolvedValueOnce([]).mockResolvedValueOnce([newTrip]);
  createTripApi.mockRejectedValueOnce({response:{status:500}});
  mount();
  fireEvent.click(await screen.findByRole("button",{name:"오사카"}));
  fireEvent.click(screen.getByRole("button",{name:"다음"}));
  expect(await screen.findByText("도착: /route-result?id=197")).toBeInTheDocument();
  expect(getTripsApi).toHaveBeenCalledTimes(2);
  expect(createTripApi).toHaveBeenCalledTimes(1);
  expect(readDateDraft("account:test")).toBeNull();
});
test("an existing identical trip is never mistaken for the newly created trip",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  const existing={id:41,title:"오사카 여행",destination:"오사카",startDate:"2026-11-12",endDate:"2026-11-15"};
  getTripsApi.mockResolvedValue([existing]);
  createTripApi.mockRejectedValueOnce({response:{status:500}});
  mount();
  fireEvent.click(await screen.findByRole("button",{name:"오사카"}));
  fireEvent.click(screen.getByRole("button",{name:"다음"}));
  expect(await screen.findByRole("button",{name:"일정 목록 확인"})).toBeInTheDocument();
  expect(createTripApi).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("도착: /route-result?id=41")).not.toBeInTheDocument();
});
test("failed baseline GET prevents creating an untraceable duplicate trip",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  getTripsApi.mockRejectedValueOnce(new Error("Offline"));
  mount();
  fireEvent.click(await screen.findByRole("button",{name:"오사카"}));
  fireEvent.click(screen.getByRole("button",{name:"다음"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("일정 목록을 확인하지 못했어요");
  expect(createTripApi).not.toHaveBeenCalled();
});
test("confirmed validation failure remains retryable and does not post automatically again",async()=>{
  saveDateDraft("account:test",{startDate:"2026-11-12",endDate:"2026-11-15"});
  createTripApi.mockRejectedValueOnce({response:{status:400}});
  mount();
  fireEvent.click(await screen.findByRole("button",{name:"오사카"}));
  fireEvent.click(screen.getByRole("button",{name:"다음"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("선택한 날짜와 여행지를 저장할 수 없어요");
  expect(screen.getByRole("button",{name:"다음"})).not.toBeDisabled();
  expect(createTripApi).toHaveBeenCalledTimes(1);
});
