/* eslint-disable testing-library/no-node-access -- Track the native focused element during keyboard traversal. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RouteResult from "./RouteResult";
import api from "../api/api";
import { getTripByIdApi, getTripPlacesApi, getTripTimelineApi, updateTripPlaceOrderApi } from "../api/tripApi";
jest.mock("../api/tripApi", () => ({ getTripByIdApi: jest.fn(), getTripPlacesApi: jest.fn(), getTripTimelineApi: jest.fn(), updateTripPlaceOrderApi: jest.fn() }));
jest.mock("../api/api", () => ({ __esModule: true, default: { patch: jest.fn(), post: jest.fn(), delete: jest.fn() }, getApiErrorMessage: (_, fallback) => fallback }));
jest.mock("@googlemaps/js-api-loader", () => ({ setOptions: jest.fn(), importLibrary: jest.fn().mockRejectedValue(new Error("maps disabled")) }));
// Exercise the real drag-end handler deterministically, without synthetic pointer geometry.
jest.mock("@dnd-kit/core", () => ({ closestCenter: jest.fn(), PointerSensor: jest.fn(), KeyboardSensor: jest.fn(), useSensor: jest.fn(), useSensors: jest.fn(), DndContext: ({ children, onDragEnd }) => <><button onClick={() => onDragEnd({ active: { id: "91" }, over: { id: "92" } })}>테스트 순서 변경</button>{children}</> }));
jest.mock("@dnd-kit/sortable", () => ({ arrayMove: (items, from, to) => { const copy = [...items]; copy.splice(to, 0, copy.splice(from, 1)[0]); return copy; }, verticalListSortingStrategy: jest.fn(), sortableKeyboardCoordinates: jest.fn(), SortableContext: ({ children }) => children, useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: jest.fn(), setActivatorNodeRef: jest.fn(), transform: null, transition: null }) }));
const places = [91, 92].map((id, index) => ({ id, tripPlaceId: id, placeId: 4, day: 1, visitOrder: index + 1, placeName: "방문 " + id, memo: "", latitude: 35, longitude: 139, isFixed: index === 1, arrivalTime: index === 1 ? "12:00" : null, stayDuration: 30 }));
beforeEach(() => { jest.clearAllMocks(); getTripByIdApi.mockResolvedValue({ id: 7, startDate: "2026-10-04", endDate: "2026-10-04", mapType: "GOOGLE" }); getTripPlacesApi.mockResolvedValue(places); getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:30" }, { visitOrder: 2, arrivalTime: "12:00" }]); });
const setup = () => render(<MemoryRouter initialEntries={["/route-result?id=7"]}><RouteResult /></MemoryRouter>);

test("category labels and distance wording are shared by the visible and PDF content without mutating API types", async () => {
  const categorized = places.map(p => ({ ...p, isFixed: false, placeType: p.id === 92 ? "ATTRACTION" : "RESTAURANT" }));
  getTripPlacesApi.mockResolvedValue(categorized);
  setup(); await screen.findAllByText("방문 92");
  expect(document.querySelector("#route-result-pdf")).toHaveTextContent("관광지");
  expect(document.querySelector("#route-result-pdf")).toHaveTextContent("총 직선거리");
  expect(document.querySelector("#route-result-pdf")).not.toHaveTextContent("ATTRACTION");
  expect(categorized[1].placeType).toBe("ATTRACTION");
});
test("drag keeps the moved visit handle and memo association; reset restores confirmed times", async () => {
  setup(); await screen.findAllByText("방문 92");
  const handle = screen.getByRole("button", { name: "방문 91 일정 순서 변경" });
  handle.focus();
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  expect(screen.getByRole("button", { name: "방문 91 일정 순서 변경" })).toHaveFocus();
  expect(screen.queryByRole("button", { name: /방문 순서.*이동/ })).not.toBeInTheDocument();
  expect(screen.queryByText(/임시 순서 변경|재계산 필요|카드를 드래그/)).not.toBeInTheDocument();
  expect(screen.queryByText("10:30")).not.toBeInTheDocument();
  expect(screen.getAllByText("12:00").length).toBeGreaterThan(0);
  expect(api.patch).not.toHaveBeenCalled(); expect(api.post).not.toHaveBeenCalled();
  userEvent.click(screen.getByRole("button", { name: "저장된 순서로 되돌리기" }));
  await waitFor(() => expect(screen.getAllByText("10:30").length).toBeGreaterThan(0));
  expect(screen.queryByRole("button", { name: "저장된 순서로 되돌리기" })).not.toBeInTheDocument();
  expect(handle).toHaveFocus();
});

test("memo success + read failure retries only GET, cancel order retains saved memo", async () => {
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getAllByRole("button", { name: "메모를 입력하세요..." })[0]);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "새 메모" } });
  api.patch.mockResolvedValue({ data: {} }); getTripPlacesApi.mockRejectedValueOnce(new Error("read timeout"));
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  expect(await screen.findByText("메모는 저장됐지만 최신 내용을 확인하지 못했어요.")).toBeInTheDocument();
  expect(screen.getByRole("textbox")).toHaveValue("새 메모");
  getTripPlacesApi.mockResolvedValueOnce(places.map(place => ({ ...place, memo: place.id === 91 ? "새 메모" : "" })));
  fireEvent.click(screen.getByRole("button", { name: "최신 메모 다시 확인" }));
  await screen.findByText("메모를 저장하고 최신 내용을 확인했어요."); expect(api.patch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "취소", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  fireEvent.click(await screen.findByRole("button", { name: "저장된 순서로 되돌리기" }));
  const card = screen.getByRole("group", { name: "방문 91 구글맵에서 열기" });
  expect(card).toHaveTextContent("새 메모");
  expect(screen.getByRole("group", { name: "방문 92 구글맵에서 열기" })).not.toHaveTextContent("새 메모");
});

test("save sends visit IDs, restores recalculated times and survives a new result mount", async () => {
  const view = setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  const reordered = [{ ...places[1], visitOrder: 1 }, { ...places[0], visitOrder: 2 }];
  updateTripPlaceOrderApi.mockResolvedValue(reordered);
  getTripPlacesApi.mockResolvedValue(reordered);
  getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "12:00" }, { visitOrder: 2, arrivalTime: "13:00" }]);
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));
  await screen.findByText("방문 순서를 저장하고 시간을 다시 계산했어요.");
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(1);
  expect(updateTripPlaceOrderApi).toHaveBeenCalledWith({ tripId: "7", day: 1, tripPlaceIds: [92, 91], startTime: "10:00" });
  expect(screen.getAllByText("13:00").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: "저장된 순서로 되돌리기" })).not.toBeInTheDocument();
  view.unmount(); setup(); await screen.findAllByText("방문 91");
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 92 구글맵에서 열기");
});

test("order save followed by read failure retries only reads", async () => {
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  updateTripPlaceOrderApi.mockResolvedValue([]);
  getTripPlacesApi.mockRejectedValueOnce(new Error("read timeout"));
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));
  await screen.findByText("방문 순서는 저장됐지만 최신 일정 확인에 실패했어요.");
  getTripPlacesApi.mockResolvedValue([{ ...places[1], visitOrder: 1 }, { ...places[0], visitOrder: 2 }]);
  fireEvent.click(screen.getByRole("button", { name: "저장된 순서 다시 확인" }));
  await screen.findByText("방문 순서를 저장하고 시간을 다시 계산했어요.");
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(1);
});

test("a rejected order keeps the draft; a designated start cannot be moved", async () => {
  const view = setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  updateTripPlaceOrderApi.mockRejectedValue({ response: { status: 400 } });
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));
  await screen.findByText("방문 순서를 저장하지 못했어요. 출발지와 고정 시간을 확인해주세요.");
  expect(screen.getByRole("button", { name: "순서 저장" })).toBeEnabled();
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 92 구글맵에서 열기");
  view.unmount(); getTripPlacesApi.mockResolvedValue([{ ...places[0], isStartPoint: true }, places[1]]);
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  expect(screen.getByText("출발 장소는 첫 번째 방문 순서로 유지해주세요.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "순서 저장" })).not.toBeInTheDocument();
});

test("next-day fixed time remains visible after moving it to the first position", async () => {
  getTripPlacesApi.mockResolvedValue([places[0], { ...places[1], isNextDay: true, arrivalTime: "00:30" }]);
  getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:30" }, { visitOrder: 2, arrivalTime: "00:30", arrivalDayOffset: 1 }]);
  setup(); await screen.findAllByText("다음날 00:30");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  expect(screen.getAllByRole("group")[0]).toHaveTextContent("다음날 00:30");
  expect(screen.getAllByRole("group")[0]).toHaveTextContent("고정 일정");
});

test("an uncertain order write is confirmed with reads without a second PATCH", async () => {
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  updateTripPlaceOrderApi.mockRejectedValue(new Error("connection lost after write"));
  fireEvent.click(screen.getByRole("button", { name: "순서 저장" }));
  await screen.findByText("변경 여부를 확인하지 못했어요. 자동으로 다시 보내지 않습니다. 최신 상태를 확인해 주세요.");
  expect(screen.getByRole("button", { name: "순서 저장" })).toBeDisabled();
  getTripPlacesApi.mockResolvedValue([{ ...places[1], visitOrder: 1 }, { ...places[0], visitOrder: 2 }]);
  fireEvent.click(screen.getByRole("button", { name: "저장된 순서 다시 확인" }));
  await screen.findByText("방문 순서를 저장하고 시간을 다시 계산했어요.");
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(1);
});
