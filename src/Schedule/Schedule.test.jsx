import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Schedule from "./Schedule";
import { getTripsApi } from "../api/tripApi";
jest.mock("../api/tripApi", () => ({ getTripsApi: jest.fn() }));
const trip = { id: 51, title: "서버 여행", destination: "서울", startDate: "2099-01-01", endDate: "2099-01-02" };
function Result() { return <p>결과 주소 {useLocation().search}</p>; }
const setup = () => render(<MemoryRouter initialEntries={["/schedule"]}><Routes><Route path="/schedule" element={<Schedule />} /><Route path="/route-result" element={<Result />} /></Routes></MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); localStorage.setItem("mock_saved_route_results", JSON.stringify([{ id: "mock", title: "오래된 Mock" }])); });
test("direct entry fetches server list despite old Mock; selection keeps server ID", async () => {
  getTripsApi.mockResolvedValue([trip]); setup();
  expect(screen.getByText("저장된 일정을 불러오는 중입니다.")).toBeInTheDocument();
  const card = await screen.findByRole("button", { name: /서버 여행/ }); fireEvent.click(card);
  expect(screen.getByText("결과 주소 ?id=51")).toBeInTheDocument();
  expect(screen.queryByText("오래된 Mock")).not.toBeInTheDocument();
});
test("empty list differs from failure and retry", async () => {
  getTripsApi.mockRejectedValueOnce(new Error("Network Error")).mockResolvedValueOnce([]);
  setup(); const retry = await screen.findByRole("button", { name: "다시 불러오기" });
  expect(screen.queryByText("저장된 일정이 없습니다.")).not.toBeInTheDocument();
  fireEvent.click(retry); expect(await screen.findByText("저장된 일정이 없습니다.")).toBeInTheDocument();
  expect(getTripsApi).toHaveBeenCalledTimes(2);
});
test("reentry fetches a fresh server list", async () => {
  getTripsApi.mockResolvedValueOnce([]).mockResolvedValueOnce([trip]);
  const first = setup(); await screen.findByText("저장된 일정이 없습니다."); first.unmount();
  setup(); expect(await screen.findByText("서버 여행")).toBeInTheDocument();
});
