import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RouteResult from "./RouteResult";
import { getTripByIdApi, getTripPlacesApi, getTripTimelineApi } from "../api/tripApi";
import api from "../api/api";
jest.mock("../api/tripApi", () => ({ getTripByIdApi: jest.fn(), getTripPlacesApi: jest.fn(), getTripTimelineApi: jest.fn() }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() }, getApiErrorMessage: (_, fallback) => fallback }));
jest.mock("@googlemaps/js-api-loader", () => ({ setOptions: jest.fn(), importLibrary: jest.fn().mockRejectedValue(new Error("test map disabled")) }));
const trip = { id: 7, title: "실제 서버 여행", startDate: "2026-10-04", endDate: "2026-10-04", mapType: "GOOGLE" };
const place = { id: 91, tripPlaceId: 91, placeId: 81, day: 1, visitOrder: 1, placeName: "실제 저장 장소", address: "서버 주소", latitude: 35, longitude: 139 };
beforeEach(() => { jest.clearAllMocks(); getTripByIdApi.mockResolvedValue(trip); getTripPlacesApi.mockResolvedValue([place]); getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:00" }]); });
const setup = (props = {}, url = "/route-result?id=7") => render(<MemoryRouter initialEntries={[url]}><RouteResult {...props} /></MemoryRouter>);
test("initialSavedRoute and mock query cannot mask server detail failure", async () => {
  getTripByIdApi.mockRejectedValue(new Error("Network Error"));
  setup({ initialSavedRoute: { id: 7, selectedDates: ["2026-10-04"], placesByDate: { "2026-10-04": [{ name: "오래된 Mock" }] } } }, "/route-result?id=7&mock=domestic");
  expect(await screen.findByText("일정을 확인할 수 없어요")).toBeInTheDocument();
  expect(getTripByIdApi).toHaveBeenCalledWith("7", expect.any(Object));
  expect(screen.queryByText("오래된 Mock")).not.toBeInTheDocument();
  expect(document.querySelector(".route-result-map-section")).toBeNull();
});
test("direct URL restores a server trip; timeline failure retains places and retry is GET only", async () => {
  getTripTimelineApi.mockRejectedValueOnce(new Error("timeout")); setup();
  const retry = await screen.findByRole("button", { name: "타임라인 다시 불러오기" });
  expect((await screen.findAllByText("실제 저장 장소")).length).toBeGreaterThan(0);
  expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  getTripTimelineApi.mockResolvedValueOnce([{ visitOrder: 1, arrivalTime: "11:00" }]); fireEvent.click(retry);
  await waitFor(() => expect(screen.queryByRole("button", { name: "타임라인 다시 불러오기" })).not.toBeInTheDocument());
  expect(getTripTimelineApi).toHaveBeenCalledTimes(2);
  expect(api.post).not.toHaveBeenCalled(); expect(api.patch).not.toHaveBeenCalled(); expect(api.delete).not.toHaveBeenCalled();
});
test("successfully empty trip shows empty state and no example map", async () => {
  getTripPlacesApi.mockResolvedValue([]); setup();
  expect(await screen.findByText("이 일정에는 저장된 장소가 없어요.")).toBeInTheDocument();
  expect(document.querySelector(".route-result-map-section")).toBeNull();
});
test("missing ID asks for selection without fetching", async () => {
  setup({}, "/route-result"); await screen.findByText("일정을 확인할 수 없어요");
  expect(getTripByIdApi).not.toHaveBeenCalled();
});

test("old local time cache cannot overwrite server time on a direct result load", async () => {
  const key = "route_fixed_time_map_7";
  localStorage.setItem(key, JSON.stringify({ "실제 저장 장소": "09:00" }));
  const view = setup(); await screen.findAllByText("실제 저장 장소");
  expect(screen.getAllByText("10:00").length).toBeGreaterThan(0);
  expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  expect(localStorage.getItem(key)).toBe(JSON.stringify({ "실제 저장 장소": "09:00" }));
  view.unmount(); localStorage.removeItem(key);
});
