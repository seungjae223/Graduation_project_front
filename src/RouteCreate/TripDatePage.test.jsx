import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import TripDatePage,{ makeMonthCells } from "./TripDatePage";
import { inclusiveDays,readDateDraft,saveDateDraft } from "./tripCreationDraft";
jest.mock("../utils/useSessionKey",()=>({__esModule:true,default:()=>"account:test:session:1"}));
const Landing = () => { const loc=useLocation();return <p>이동한 경로: {loc.pathname}</p>; };
const mount = () => render(<MemoryRouter initialEntries={["/route-create"]}><Routes>
  <Route path="/route-create" element={<TripDatePage/>}/>
  <Route path="/route-create/region" element={<Landing/>}/>
</Routes></MemoryRouter>);
beforeEach(()=>sessionStorage.clear());
afterEach(()=>jest.useRealTimers());

test("date draft enforces valid ISO days and account isolation",()=>{
  expect(inclusiveDays("2026-11-12","2026-11-15")).toBe(4);
  expect(inclusiveDays("2026-11-15","2026-11-12")).toBe(0);
  expect(saveDateDraft("account:one",{startDate:"2026-11-12",endDate:"2026-11-15"})).toBe(true);
  expect(readDateDraft("account:one")).toEqual({startDate:"2026-11-12",endDate:"2026-11-15"});
  expect(readDateDraft("account:two")).toBeNull();
  expect(saveDateDraft("account:one",{startDate:"2026-02-30",endDate:"2026-03-01"})).toBe(false);
});
test("calendar correctly inserts leading blank days",()=>{
  expect(makeMonthCells(2026,10).slice(0,7)).toEqual(["2026-11-01","2026-11-02","2026-11-03","2026-11-04","2026-11-05","2026-11-06","2026-11-07"]);
});
test("date selection requires end day and preserves range when continuing",()=>{
  jest.useFakeTimers().setSystemTime(new Date(2026, 9, 21, 12));
  mount();
  const next=screen.getByText("다음",{selector:"button"});
  expect(next).toBeDisabled();
  expect(screen.queryByRole("button",{name:"다음"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"2026-10-25"}));
  expect(next).toBeDisabled();
  expect(screen.queryByRole("button",{name:"다음"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"2026-10-27"}));
  expect(screen.getByText("2박 3일")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"다음"})).toBeEnabled();
  fireEvent.click(next);
  expect(screen.getByText("이동한 경로: /route-create/region")).toBeInTheDocument();
  expect(readDateDraft("account:test:session:1")).toEqual({startDate:"2026-10-25",endDate:"2026-10-27"});
  jest.useRealTimers();
});

test("calendar month and year headings open the month/year pickers without losing dates",()=>{
  jest.useFakeTimers().setSystemTime(new Date(2026,9,21,12));
  const view=mount();
  expect(view.container).not.toContainElement(screen.getByText("다음",{selector:"button"}));
  fireEvent.click(screen.getByRole("button",{name:"월 선택"}));
  expect(screen.getByRole("group",{name:"월 목록"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"연도 선택"}));
  expect(screen.getByRole("group",{name:"연도 목록"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"2027년"}));
  expect(screen.getByRole("group",{name:"월 목록"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"11월"}));
  expect(screen.getByRole("button",{name:"2027-11-15"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"2027-11-15"}));
  fireEvent.click(screen.getByRole("button",{name:"2027-11-18"}));
  expect(screen.getByText("2027.11.15")).toBeInTheDocument();
  expect(screen.getByText("2027.11.18")).toBeInTheDocument();
  expect(screen.getByText("3박 4일")).toBeInTheDocument();
});
test("year list moves in twelve-year groups for distant trip dates",()=>{
  mount();
  fireEvent.click(screen.getByRole("button",{name:"월 선택"}));
  fireEvent.click(screen.getByRole("button",{name:"연도 선택"}));
  const previous=screen.getByRole("group",{name:"연도 목록"}).textContent;
  fireEvent.click(screen.getByRole("button",{name:"다음 연도 목록"}));
  expect(screen.getByRole("group",{name:"연도 목록"}).textContent).not.toBe(previous);
});

test("reopening the date step starts blank instead of restoring the previous selection",()=>{
  saveDateDraft("account:test:session:1",{startDate:"2026-11-12",endDate:"2026-11-15"});
  mount();
  expect(screen.getAllByText("—",{selector:".v16-date-period-pair strong"})).toHaveLength(2);
  expect(screen.queryByRole("button",{name:"다음"})).not.toBeInTheDocument();
  expect(screen.getByText("다음",{selector:"button"})).toBeDisabled();
  expect(readDateDraft("account:test:session:1")).toBeNull();
});
test("the date step has no arrow decoration on Next",()=>{
  mount();
  expect(screen.getByText("다음",{selector:"button"})).toHaveTextContent(/^다음$/);
});

test.each(["start", "end", "clear"])("cancelling a completed range with %s hides Next and allows reselection", method=>{
  jest.useFakeTimers().setSystemTime(new Date(2026,9,21,12));
  mount();
  const next=screen.getByText("다음",{selector:"button"});
  fireEvent.click(screen.getByRole("button",{name:"2026-10-25"}));
  fireEvent.click(screen.getByRole("button",{name:"2026-10-27"}));
  expect(screen.getByRole("button",{name:"다음"})).toBeEnabled();
  fireEvent.click(screen.getByRole("button",{name:method==="clear" ? "선택 취소" : method==="start" ? "2026-10-25" : "2026-10-27"}));
  expect(next).toBeDisabled();
  expect(screen.queryByRole("button",{name:"다음"})).not.toBeInTheDocument();
  expect(screen.getAllByText("—",{selector:".v16-date-period-pair strong"})).toHaveLength(2);
  fireEvent.click(next);
  expect(readDateDraft("account:test:session:1")).toBeNull();
  fireEvent.click(screen.getByRole("button",{name:"2026-10-28"}));
  fireEvent.click(screen.getByRole("button",{name:"2026-10-30"}));
  expect(screen.getByRole("button",{name:"다음"})).toBeEnabled();
});

test("a pending start can be cleared and same-day trips still show Next",()=>{
  jest.useFakeTimers().setSystemTime(new Date(2026,9,21,12));
  mount();
  fireEvent.click(screen.getByRole("button",{name:"2026-10-25"}));
  fireEvent.click(screen.getByRole("button",{name:"선택 취소"}));
  expect(screen.queryByRole("button",{name:"다음"})).not.toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"선택 취소"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"2026-10-25"}));
  fireEvent.click(screen.getByRole("button",{name:"2026-10-25"}));
  expect(screen.getByText("0박 1일")).toBeInTheDocument();
  expect(screen.getByRole("button",{name:"다음"})).toBeEnabled();
});
