import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import QuickTripAddModal, { getTripDayCount } from "./QuickTripAddModal";
import { addPlaceToTripApi, getTripPlacesApi, getTripsApi } from "../api/tripApi";

jest.mock("../api/tripApi", () => ({
  getTripsApi: jest.fn(), getTripPlacesApi: jest.fn(), addPlaceToTripApi: jest.fn(),
}));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:A" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:A" }) }));
jest.mock("../utils/useModalFocus", () => ({ __esModule: true, default: () => ({ current: null }) }));
const place = { id: 11, name: "센소지" };
let tripPlaces;
beforeEach(() => {
  jest.clearAllMocks();
  tripPlaces = [{ id: 100, tripId: 5, placeId: 9, day: 1, visitOrder: 1 }];
  getTripsApi.mockResolvedValue([{ id: 5, title: "도쿄 여행", startDate: "2026-11-01", endDate: "2026-11-03" }]);
  getTripPlacesApi.mockImplementation(async () => [...tripPlaces]);
  addPlaceToTripApi.mockImplementation(async ({ tripId, placeId, day, visitOrder }) => {
    const saved = { id: 101, tripId, placeId, day, visitOrder };
    tripPlaces.push(saved);
    return saved;
  });
});
const show = (chosen = place) => render(<MemoryRouter><QuickTripAddModal place={chosen} onClose={jest.fn()} /></MemoryRouter>);
const choose = async () => {
  await screen.findByRole("option", { name: "도쿄 여행" });
  fireEvent.change(screen.getByLabelText("어느 일정에 추가할까요?"), { target: { value: "5" } });
  await waitFor(() => expect(getTripPlacesApi).toHaveBeenCalled());
  fireEvent.change(screen.getByLabelText("몇 일차에 추가할까요?"), { target: { value: "2" } });
};
test("날짜만으로 계산한 여행 일차 수가 시간대와 무관함", () => {
  expect(getTripDayCount({ startDate: "2026-11-01", endDate: "2026-11-03" })).toBe(3);
  expect(getTripDayCount({ startDate: "2026-11-03", endDate: "2026-11-01" })).toBe(0);
});
test("기존 일정과 일차를 명시적으로 선택한 뒤 마지막 방문 순서로 추가", async () => {
  show();
  expect(await screen.findByRole("button", { name: "선택한 일차에 추가" })).toBeDisabled();
  await choose();
  await waitFor(() => expect(screen.getByRole("button", { name: "선택한 일차에 추가" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "선택한 일차에 추가" }));
  await waitFor(() => expect(addPlaceToTripApi).toHaveBeenCalledWith({ tripId: 5, placeId: 11, day: 2, visitOrder: 1 }));
  expect(await screen.findByText("선택한 일차에 장소를 추가했어요.")).toBeInTheDocument();
  expect(addPlaceToTripApi).toHaveBeenCalledTimes(1);
});
test("같은 일차 장소는 확인 후 중복 추가를 허용하며 새 TripPlace를 검증", async () => {
  tripPlaces = [{ id: 2, tripId: 5, placeId: 11, day: 2, visitOrder: 1 }];
  show();
  await choose();
  expect(screen.queryByText("이미 이 일차에 있는 장소예요.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "선택한 일차에 추가" }));
  expect(await screen.findByText("이미 이 일차에 있는 장소예요.")).toBeInTheDocument();
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "중복 추가" }));
  await waitFor(() => expect(addPlaceToTripApi).toHaveBeenCalledWith({ tripId: 5, placeId: 11, day: 2, visitOrder: 2 }));
  expect(await screen.findByText("선택한 일차에 장소를 추가했어요.")).toBeInTheDocument();
  expect(tripPlaces.filter(record => Number(record.day) === 2 && Number(record.placeId) === 11)).toHaveLength(2);
});
test("사용자의 일정이 없으면 임의로 여행을 생성하지 않음", async () => {
  getTripsApi.mockResolvedValue([]);
  show();
  expect(await screen.findByText("아직 만든 일정이 없어요.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "+ 새 일정 만들기" })).toBeInTheDocument();
  expect(addPlaceToTripApi).not.toHaveBeenCalled();
});
test("기존 일정이 있어도 새 일정 만들기가 항상 표시됨", async () => {
  show();
  expect(await screen.findByRole("option", { name: "도쿄 여행" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "+ 새 일정 만들기" })).toBeInTheDocument();
});
test("이미 존재하는 장소를 다른 일차에 추가할 때는 중복 경고가 없음", async () => {
  tripPlaces = [{ id: 2, tripId: 5, placeId: 11, day: 1, visitOrder: 1 }];
  show(); await choose();
  fireEvent.click(screen.getByRole("button", { name: "선택한 일차에 추가" }));
  await waitFor(() => expect(addPlaceToTripApi).toHaveBeenCalledTimes(1));
  expect(screen.queryByText("이미 이 일차에 있는 장소예요.")).not.toBeInTheDocument();
});
