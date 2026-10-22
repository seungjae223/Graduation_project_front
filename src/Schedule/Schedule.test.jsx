import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import Schedule from "./Schedule";
import { getScheduleDday } from "../MySchedule/MySchedule";
import { getTripsApi, deleteTripApi } from "../api/tripApi";
jest.mock("../api/tripApi", () => ({ getTripsApi: jest.fn(), deleteTripApi: jest.fn() }));
const trip = { id: 51, title: "서버 여행", destination: "서울", startDate: "2099-01-01", endDate: "2099-01-02" };
function Result() { return <p>결과 주소 {useLocation().search}</p>; }
const setup = () => render(<MemoryRouter initialEntries={["/schedule"]}><Routes><Route path="/schedule" element={<Schedule />} /><Route path="/route-result" element={<Result />} /></Routes></MemoryRouter>);
beforeEach(() => {
  Object.keys(localStorage).filter(key => key.startsWith("nomango:v15:hidden-trip-ids:"))
    .forEach(key => localStorage.removeItem(key));
  jest.clearAllMocks(); getTripsApi.mockReset(); deleteTripApi.mockReset(); localStorage.setItem("mock_saved_route_results", JSON.stringify([{ id: "mock", title: "오래된 Mock" }])); });
test("direct entry fetches server list despite old Mock; selection keeps server ID", async () => {
  getTripsApi.mockResolvedValue([trip]); setup();
  expect(screen.getByText("저장된 일정을 불러오는 중입니다.")).toBeInTheDocument();
  const card = await screen.findByRole("button", { name: "서버 여행 일정 보기" }); fireEvent.click(card);
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
  const view = setup(); await screen.findByText("저장된 일정이 없습니다."); view.unmount();
  setup(); expect(await screen.findByText("서버 여행")).toBeInTheDocument();
});

test("upcoming dashboard highlights the nearest trip, separates past and links to history", async () => {
  getTripsApi.mockResolvedValue([
    trip,
    { id: 52, title: "다음 여행", destination: "도쿄", startDate: "2099-02-01", endDate: "2099-02-04" },
    { id: 49, title: "오래된 여행", destination: "제주", startDate: "2020-01-01", endDate: "2020-01-02" },
  ]);
  setup();
  const featured = await screen.findByRole("region", { name: "가장 가까운 여행" });
  expect(within(featured).getByRole("button", { name: "서버 여행 일정 보기" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "다음 여행 일정 보기" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "오래된 여행 일정 보기" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "날짜 미정" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /지난 여행 보기/ })).toBeInTheDocument();
});

test("departure day is 1일차, subsequent days increase, and future trips keep D-n", () => {
  const tripDates = { startDate: "2026-10-20", endDate: "2026-10-23" };
  expect(getScheduleDday(tripDates, new Date(2026, 9, 19))).toBe("D-1");
  expect(getScheduleDday(tripDates, new Date(2026, 9, 20))).toBe("1일차");
  expect(getScheduleDday(tripDates, new Date(2026, 9, 21))).toBe("2일차");
  expect(getScheduleDday(tripDates, new Date(2026, 9, 23))).toBe("4일차");
  expect(getScheduleDday(tripDates, new Date(2026, 9, 24))).toBe("완료");
});

test("edit aligns with nearest-trip header and selects a boarding pass without navigating", async () => {
  getTripsApi.mockResolvedValue([trip]); setup();
  expect(await screen.findByRole("button", { name: "서버 여행 일정 보기" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "서버 여행 영구 삭제" })).not.toBeInTheDocument();
  const featured = screen.getByRole("region", { name: "가장 가까운 여행" });
  fireEvent.click(within(featured).getByRole("button", { name: "편집" }));
  const ticket = within(featured).getByRole("button", { name: "서버 여행 선택" });
  fireEvent.click(ticket);
  expect(ticket).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "선택한 일정 1개 삭제하기" })).toBeInTheDocument();
  expect(screen.queryByText(/결과 주소/)).not.toBeInTheDocument();
  fireEvent.click(within(featured).getByRole("button", { name: "완료" }));
  expect(screen.queryByRole("button", { name: "선택한 일정 1개 삭제하기" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "서버 여행 일정 보기" })).toBeInTheDocument();
});

test("confirmed batch delete uses one confirmation and sequential API calls", async () => {
  getTripsApi.mockResolvedValue([trip,
    { id: 52, title: "다음 여행", destination: "도쿄", startDate: "2099-02-01", endDate: "2099-02-04" }
  ]);
  deleteTripApi.mockResolvedValue({});
  setup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  try {
    const edit = await screen.findByRole("button", { name: "편집" });
    fireEvent.click(edit);
    fireEvent.click(screen.getByRole("button", { name: "서버 여행 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "다음 여행 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 일정 2개 삭제하기" }));
    await waitFor(() => expect(deleteTripApi).toHaveBeenCalledTimes(2));
    expect(deleteTripApi).toHaveBeenNthCalledWith(1, 51);
    expect(deleteTripApi).toHaveBeenNthCalledWith(2, 52);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(confirm.mock.calls[0][0]).toMatch(/영구 삭제/);
    await waitFor(() => expect(screen.queryByRole("button", { name: "서버 여행 일정 보기" })).not.toBeInTheDocument());
    expect(screen.queryByRole("button", { name: "선택한 일정 2개 삭제하기" })).not.toBeInTheDocument();
  } finally { confirm.mockRestore(); }
});

test("cancelled batch removal retains the selected trip and makes no API call", async () => {
  getTripsApi.mockResolvedValue([trip]); setup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(false);
  try {
    fireEvent.click(await screen.findByRole("button", { name: "편집" }));
    fireEvent.click(screen.getByRole("button", { name: "서버 여행 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 일정 1개 삭제하기" }));
    expect(deleteTripApi).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "서버 여행 선택" })).toBeInTheDocument();
  } finally { confirm.mockRestore(); }
});

test("failed batch delete leaves the selected ticket for review without an automatic retry", async () => {
  getTripsApi.mockResolvedValue([trip]);
  deleteTripApi.mockRejectedValue({ response: { status: 403 } });
  setup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  try {
    fireEvent.click(await screen.findByRole("button", { name: "편집" }));
    fireEvent.click(screen.getByRole("button", { name: "서버 여행 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 일정 1개 삭제하기" }));
    expect(await screen.findByText("여행 일정을 삭제하지 못했어요. 다시 확인해 주세요.")).toBeInTheDocument();
    expect(deleteTripApi).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "서버 여행 선택" })).toBeInTheDocument();
  } finally { confirm.mockRestore(); }
});

test("uncertain deletion offers a read-only recovery button and blocks another delete", async () => {
  getTripsApi.mockResolvedValueOnce([trip]).mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce([]);
  deleteTripApi.mockRejectedValue({ response: { status: 500 } });
  setup();
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  try {
    fireEvent.click(await screen.findByRole("button", { name: "편집" }));
    fireEvent.click(screen.getByRole("button", { name: "서버 여행 선택" }));
    fireEvent.click(screen.getByRole("button", { name: "선택한 일정 1개 삭제하기" }));
    const retry = await screen.findByRole("button", { name: "삭제 결과 다시 확인" });
    expect(screen.getByRole("button", { name: "선택한 일정 1개 삭제하기" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "서버 여행 선택" })).toBeInTheDocument();
    fireEvent.click(retry);
    expect(await screen.findByText("일정 삭제를 확인했어요.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "서버 여행 선택" })).not.toBeInTheDocument();
    expect(deleteTripApi).toHaveBeenCalledTimes(1);
    expect(getTripsApi).toHaveBeenCalledTimes(3);
  } finally { confirm.mockRestore(); }
});
