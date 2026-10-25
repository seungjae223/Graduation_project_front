import { queryByClass, getArticleByText } from "../testQueries";
import { getPastTrips } from "./PastTrips";

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import PastTrips from "./PastTrips";
import { getTripsApi, deleteTripApi } from "../api/tripApi";

test("past trips are based on completed dates, sorted newest first", () => {
  const trips = [
    {id:1, endDate:"2026-10-18"}, {id:2, endDate:"2026-10-20"},
    {id:3, endDate:"2026-11-02"}, {id:4, endDate:"2026-09-11"},
    {id:5, endDate:""}, {id:6, endDate:"2026-10-19"}
  ];
  expect(getPastTrips(trips, new Date(2026,9,20)).map(x=>x.id)).toEqual([6,1,4]);
});
jest.mock("../api/tripApi", () => ({ getTripsApi: jest.fn(), deleteTripApi: jest.fn() }));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));
const Path = () => { const location = useLocation(); return <output>{location.pathname + location.search}</output>; };
const setupPage = () => render(<MemoryRouter initialEntries={["/mypage/past-trips"]}>
  <Routes>
    <Route path="/mypage/past-trips" element={<PastTrips />} />
    <Route path="/schedule" element={<p>일정 화면 도착</p>} />
    <Route path="/route-result" element={<Path />} />
  </Routes>
</MemoryRouter>);
beforeEach(() => {
  jest.clearAllMocks(); deleteTripApi.mockReset();
  Object.keys(localStorage).filter(key => key.startsWith("nomango:v15:hidden-trip-ids:"))
    .forEach(key => localStorage.removeItem(key));
});
test("past trips group by completion year and link back to upcoming", async () => {
  getTripsApi.mockResolvedValue([
    { id: 31, title: "작년 여행", destination: "제주", startDate: "2025-09-01", endDate: "2025-09-04" },
    { id: 32, title: "올해 여행", destination: "서울", startDate: "2026-01-02", endDate: "2026-01-04" },
  ]);
  setupPage();
  expect(await screen.findByRole("heading", { name: "2026년" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "2025년" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "올해 여행 일정 보기" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "내 여행 일정으로 돌아가기" }));
  expect(screen.getByText("일정 화면 도착")).toBeInTheDocument();
});
test("past used ticket has no flight stub and edit is on the list heading", async () => {
  getTripsApi.mockResolvedValue([{ id: 41, title: "부산 지난 여행", destination: "부산",
    startDate: "2025-03-01", endDate: "2025-03-03" }]);
  setupPage();
  const ticket = await screen.findByRole("button", { name: "부산 지난 여행 일정 보기" });
  expect(getArticleByText("부산 지난 여행")).toHaveClass("is-past");
  expect(queryByClass(ticket, "v15-ticket-flight-zone")).toBeNull();
  expect(screen.queryByRole("button", { name: "부산 지난 여행 영구 삭제" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "편집" }));
  fireEvent.click(screen.getByRole("button", { name: "부산 지난 여행 선택" }));
  expect(screen.getByRole("button", { name: "선택한 지난 여행 1개 삭제하기" })).toBeInTheDocument();
});

test("past edit mode permanently deletes the selected ticket after confirmation", async () => {
  getTripsApi.mockResolvedValue([{ id: 41, title: "부산 지난 여행", destination: "부산",
    startDate: "2025-03-01", endDate: "2025-03-03" }]);
  deleteTripApi.mockResolvedValue({});
  setupPage();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  try {
    fireEvent.click(await screen.findByRole("button", { name: "편집" }));
    fireEvent.click(screen.getByRole("button", { name: "부산 지난 여행 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 지난 여행 1개 삭제하기" }));
    await waitFor(() => expect(deleteTripApi).toHaveBeenCalledWith(41));
    await waitFor(() => expect(screen.queryByRole("button", { name: "부산 지난 여행 일정 보기" })).not.toBeInTheDocument());
    expect(confirm.mock.calls[0][0]).toContain("영구 삭제");
  } finally { confirm.mockRestore(); }
});

test("a past-trip card marks its detail page to return to past trips", async () => {
  getTripsApi.mockResolvedValue([{id:41,title:"부산 지난 여행",destination:"부산",
    startDate:"2025-03-01",endDate:"2025-03-03"}]);
  setupPage();
  fireEvent.click(await screen.findByRole("button",{name:"부산 지난 여행 일정 보기"}));
  expect(screen.getByText("/route-result?id=41&origin=past")).toBeInTheDocument();
});
