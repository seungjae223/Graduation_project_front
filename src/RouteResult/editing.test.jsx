/* eslint-disable testing-library/no-node-access -- Track the native focused element during keyboard traversal. */
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RouteResult from "./RouteResult";
import api from "../api/api";
import { getTripByIdApi, getTripPlacesApi, getTripTimelineApi, updateTripPlaceOrderApi } from "../api/tripApi";
jest.mock("../api/tripApi", () => ({ getTripByIdApi: jest.fn(), getTripPlacesApi: jest.fn(), getTripTimelineApi: jest.fn(), updateTripPlaceOrderApi: jest.fn() }));
jest.mock("../api/api", () => ({ __esModule: true, default: { patch: jest.fn(), post: jest.fn(), delete: jest.fn() }, getApiErrorMessage: (_, fallback) => fallback }));
jest.mock("@googlemaps/js-api-loader", () => ({ setOptions: jest.fn(), importLibrary: jest.fn().mockRejectedValue(new Error("maps disabled")) }));
// Exercise the real drag-end handler deterministically, without synthetic pointer geometry.
jest.mock("@dnd-kit/core", () => ({ closestCenter: jest.fn(), PointerSensor: jest.fn(), KeyboardSensor: jest.fn(), useSensor: jest.fn(), useSensors: jest.fn(), DndContext: ({ children, onDragEnd }) => <><button onClick={() => onDragEnd({ active: { id: "91" }, over: { id: "92" } })}>테스트 순서 변경</button><button onClick={() => onDragEnd({ active: { id: "93" }, over: { id: "91" } })}>C를 처음으로</button>{children}</> }));
jest.mock("@dnd-kit/sortable", () => ({ arrayMove: (items, from, to) => { const copy = [...items]; copy.splice(to, 0, copy.splice(from, 1)[0]); return copy; }, verticalListSortingStrategy: jest.fn(), sortableKeyboardCoordinates: jest.fn(), SortableContext: ({ children }) => children, useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: jest.fn(), setActivatorNodeRef: jest.fn(), transform: null, transition: null }) }));
const places = [91, 92].map((id, index) => ({ id, tripPlaceId: id, placeId: 4, day: 1, visitOrder: index + 1, placeName: "방문 " + id, memo: "", latitude: 35, longitude: 139, isFixed: index === 1, arrivalTime: index === 1 ? "12:00" : null, stayDuration: 30 }));
beforeEach(() => { jest.clearAllMocks(); getTripByIdApi.mockResolvedValue({ id: 7, startDate: "2026-10-04", endDate: "2026-10-04", mapType: "GOOGLE" }); getTripPlacesApi.mockResolvedValue(places); getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:30" }, { visitOrder: 2, arrivalTime: "12:00" }]); });
const setup = () => render(<MemoryRouter initialEntries={["/route-result?id=7"]}><RouteResult /></MemoryRouter>);

test("category labels and distance wording are shared by the visible and PDF content without mutating API types", async () => {
  const categorized = places.map(p => ({ ...p, isFixed: false, placeCategory: p.id === 92 ? "LANDMARK" : "FOOD", placeCategoryLabel: p.id === 92 ? "명소" : "맛집" }));
  getTripPlacesApi.mockResolvedValue(categorized);
  setup(); await screen.findAllByText("방문 92");
  expect(document.querySelector("#route-result-pdf")).toHaveTextContent("명소");
  expect(document.querySelector("#route-result-pdf")).toHaveTextContent("총 직선거리");
  expect(document.querySelector("#route-result-pdf")).not.toHaveTextContent("LANDMARK");
  expect(categorized[1].placeCategory).toBe("LANDMARK");
});
test("drag immediately updates visit order without remounting cards and locks while saving", async () => {
  let finishWrite;
  updateTripPlaceOrderApi.mockImplementationOnce(() => new Promise(resolve => { finishWrite = resolve; }));
  setup(); await screen.findAllByText("방문 92");
  const handle = screen.getByRole("button", { name: "방문 91 일정 순서 변경" });
  handle.focus();
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  expect(screen.getByRole("button", { name: "방문 91 일정 순서 변경" })).toHaveFocus();
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 92 구글맵에서 열기");
  expect(handle).toHaveAttribute("aria-disabled", "true");
  expect(screen.queryByText("10:30")).not.toBeInTheDocument();
  expect(screen.getAllByText("12:00").length).toBeGreaterThan(0);
  expect(updateTripPlaceOrderApi).toHaveBeenCalledWith({ tripId: "7", day: 1, tripPlaceIds: [92, 91], startTime: "10:00" });
  getTripPlacesApi.mockResolvedValue([{ ...places[1], visitOrder: 1 }, { ...places[0], visitOrder: 2 }]);
  finishWrite([]);
  await screen.findByText("방문 순서를 저장했어요.");
  expect(screen.getByRole("button", { name: "방문 91 일정 순서 변경" })).toBe(handle);
  expect(handle).toHaveAttribute("aria-disabled", "false");
});

test("memo success + read failure retries only GET, automatic reorder retains saved memo", async () => {
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getAllByRole("button", { name: "메모를 입력하세요..." })[0]);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: "새 메모" } });
  api.patch.mockResolvedValue({ data: {} }); getTripPlacesApi.mockRejectedValueOnce(new Error("read timeout"));
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  expect(await screen.findByText("메모는 저장됐지만 최신 내용을 확인하지 못했어요.")).toBeInTheDocument();
  expect(screen.getByRole("textbox")).toHaveValue("새 메모");
  getTripPlacesApi.mockResolvedValueOnce(places.map(place => ({ ...place, memo: place.id === 91 ? "새 메모" : "" })));
  fireEvent.click(screen.getByRole("button", { name: "최신 메모 다시 확인" }));
  await screen.findByText("메모를 저장했어요."); expect(api.patch).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "닫기", exact: true }));
  updateTripPlaceOrderApi.mockResolvedValue([]);
  getTripPlacesApi.mockResolvedValue([{ ...places[1], visitOrder: 1 }, { ...places[0], visitOrder: 2, memo: "새 메모" }]);
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await screen.findByText("방문 순서를 저장했어요.");
  const card = screen.getByRole("group", { name: "방문 91 구글맵에서 열기" });
  expect(card).toHaveTextContent("새 메모");
  expect(screen.getByRole("group", { name: "방문 92 구글맵에서 열기" })).not.toHaveTextContent("새 메모");
});

test("memo feedback follows the current save and clears when editing or reopening", async () => {
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getAllByRole("button", { name: "메모를 입력하세요..." })[0]);
  expect(screen.queryByText("메모를 저장했어요.")).not.toBeInTheDocument();
  const input = screen.getByRole("textbox", { name: "메모 내용" });
  expect(input).toHaveAccessibleDescription("최대 500자까지 작성할 수 있어요. 0/500");
  fireEvent.change(input, { target: { value: "새 메모" } });
  let finishSave;
  api.patch.mockImplementationOnce(() => new Promise(resolve => { finishSave = resolve; }));
  getTripPlacesApi.mockResolvedValueOnce(places.map(place => ({ ...place, memo: place.id === 91 ? "새 메모" : "" })));
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  expect(screen.getByRole("button", { name: "저장 중..." })).toBeDisabled();
  expect(input).toBeDisabled();
  expect(screen.queryByText("메모를 저장했어요.")).not.toBeInTheDocument();
  finishSave({ data: {} });
  await screen.findByText("메모를 저장했어요.");
  fireEvent.change(input, { target: { value: "수정할 메모" } });
  expect(screen.queryByText("메모를 저장했어요.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "취소", exact: true }));
  fireEvent.click(screen.getByRole("button", { name: "새 메모", exact: true }));
  expect(screen.getByRole("textbox", { name: "메모 내용" })).toHaveValue("새 메모");
  expect(screen.queryByText("메모를 저장했어요.")).not.toBeInTheDocument();
});

test("save sends visit IDs, restores recalculated times and survives a new result mount", async () => {
  const view = setup(); await screen.findAllByText("방문 92");
  const reordered = [{ ...places[1], visitOrder: 1 }, { ...places[0], visitOrder: 2 }];
  updateTripPlaceOrderApi.mockResolvedValue(reordered);
  getTripPlacesApi.mockResolvedValue(reordered);
  getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "12:00" }, { visitOrder: 2, arrivalTime: "13:00" }]);
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await screen.findByText("방문 순서를 저장했어요.");
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(1);
  expect(updateTripPlaceOrderApi).toHaveBeenCalledWith({ tripId: "7", day: 1, tripPlaceIds: [92, 91], startTime: "10:00" });
  expect(screen.getAllByText("13:00").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: "저장된 순서로 되돌리기" })).not.toBeInTheDocument();
  view.unmount(); setup(); await screen.findAllByText("방문 91");
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 92 구글맵에서 열기");
});

test("a read completed after closing does not show a previous save as success on reopening", async () => {
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getAllByRole("button", { name: "메모를 입력하세요..." })[0]);
  fireEvent.change(screen.getByRole("textbox", { name: "메모 내용" }), { target: { value: "확인할 메모" } });
  api.patch.mockResolvedValue({ data: {} });
  getTripPlacesApi.mockRejectedValueOnce(new Error("read timeout"));
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  await screen.findByText("메모는 저장됐지만 최신 내용을 확인하지 못했어요.");
  let finishRead;
  getTripPlacesApi.mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
  fireEvent.click(screen.getByRole("button", { name: "최신 메모 다시 확인" }));
  fireEvent.click(screen.getByRole("button", { name: "취소", exact: true }));
  finishRead(places.map(place => ({ ...place, memo: place.id === 91 ? "확인할 메모" : "" })));
  fireEvent.click(await screen.findByRole("button", { name: "확인할 메모", exact: true }));
  expect(screen.getByRole("textbox", { name: "메모 내용" })).toHaveValue("확인할 메모");
  expect(screen.queryByText("메모를 저장했어요.")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "취소", exact: true })).toBeEnabled();
  expect(api.patch).toHaveBeenCalledTimes(1);
});

test("order save followed by read failure retries only reads", async () => {
  setup(); await screen.findAllByText("방문 92");
  updateTripPlaceOrderApi.mockResolvedValue([]);
  getTripPlacesApi.mockRejectedValueOnce(new Error("read timeout"));
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await screen.findByText("저장 응답은 받았지만 최신 일정을 확인하지 못했어요. 다시 확인해주세요.");
  getTripPlacesApi.mockResolvedValue([{ ...places[1], visitOrder: 1 }, { ...places[0], visitOrder: 2 }]);
  fireEvent.click(screen.getByRole("button", { name: "저장된 순서 다시 확인" }));
  await screen.findByText("방문 순서를 저장했어요.");
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(1);
});

test("a rejected order restores confirmed order; a designated start cannot be moved", async () => {
  const view = setup(); await screen.findAllByText("방문 92");
  updateTripPlaceOrderApi.mockRejectedValue({ response: { status: 400 } });
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await screen.findByText("순서를 저장하지 못해 이전 순서로 복원했어요. 출발지와 고정 시간을 확인해주세요.");
  expect(screen.getByRole("button", { name: "방문 91 일정 순서 변경" })).toHaveAttribute("aria-disabled", "false");
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 91 구글맵에서 열기");
  view.unmount(); getTripPlacesApi.mockResolvedValue([{ ...places[0], isStartPoint: true }, places[1]]);
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  expect(screen.getByText("출발 장소는 첫 번째 방문 순서로 유지해주세요.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "순서 저장" })).not.toBeInTheDocument();
});

test("next-day fixed time remains visible after moving it to the first position", async () => {
  updateTripPlaceOrderApi.mockReturnValueOnce(new Promise(() => {}));
  getTripPlacesApi.mockResolvedValue([places[0], { ...places[1], isNextDay: true, arrivalTime: "00:30" }]);
  getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:30" }, { visitOrder: 2, arrivalTime: "00:30", arrivalDayOffset: 1 }]);
  setup(); await screen.findAllByText("다음날 00:30");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  expect(screen.getAllByRole("group")[0]).toHaveTextContent("다음날 00:30");
  expect(screen.getAllByRole("group")[0]).toHaveTextContent("고정 일정");
});

test("an uncertain order write is confirmed with reads without a second PATCH", async () => {
  setup(); await screen.findAllByText("방문 92");
  updateTripPlaceOrderApi.mockRejectedValue(new Error("connection lost after write"));
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await screen.findByText("저장 여부를 확인하지 못해 이전 순서로 복원했어요. 최신 순서를 다시 확인해주세요.");
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 91 구글맵에서 열기");
  expect(screen.getByRole("button", { name: "방문 91 일정 순서 변경" })).toHaveAttribute("aria-disabled", "true");
  getTripPlacesApi.mockResolvedValue([{ ...places[1], visitOrder: 1 }, { ...places[0], visitOrder: 2 }]);
  fireEvent.click(screen.getByRole("button", { name: "저장된 순서 다시 확인" }));
  await screen.findByText("방문 순서를 저장했어요.");
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(1);
});

test("A-B-C changes to C-A-B immediately, confirms GET order and allows the next move", async () => {
  const three = [...places.map(place => ({ ...place, isFixed: false, memo: "메모 " + place.id })),
    { ...places[0], id: 93, tripPlaceId: 93, visitOrder: 3, placeName: "방문 93", memo: "메모 93" }];
  getTripPlacesApi.mockResolvedValue(three);
  getTripTimelineApi.mockResolvedValue([1, 2, 3].map(visitOrder => ({ visitOrder, arrivalTime: "11:00" })));
  let finish;
  updateTripPlaceOrderApi.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const view = setup(); await screen.findAllByText("방문 93");
  fireEvent.click(screen.getByRole("button", { name: "C를 처음으로" }));
  expect(screen.getAllByRole("group").slice(0, 3).map(card => card.getAttribute("aria-label")))
    .toEqual(["방문 93 구글맵에서 열기", "방문 91 구글맵에서 열기", "방문 92 구글맵에서 열기"]);
  expect(updateTripPlaceOrderApi).toHaveBeenCalledWith({ tripId: "7", day: 1, tripPlaceIds: [93, 91, 92], startTime: "10:00" });
  const saved = [three[2], three[0], three[1]].map((place, index) => ({ ...place, visitOrder: index + 1 }));
  getTripPlacesApi.mockResolvedValue(saved);
  finish(saved);
  await screen.findByText("방문 순서를 저장했어요.");
  expect(screen.getAllByRole("group")[0]).toHaveTextContent("메모 93");
  view.unmount();
  setup(); await screen.findAllByText("방문 93");
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 93 구글맵에서 열기");
  updateTripPlaceOrderApi.mockResolvedValue(saved);
  getTripPlacesApi.mockResolvedValue([saved[0], saved[2], saved[1]].map((place, index) => ({ ...place, visitOrder: index + 1 })));
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await screen.findByText("방문 순서를 저장했어요.");
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(2);
  expect(updateTripPlaceOrderApi).toHaveBeenLastCalledWith({ tripId: "7", day: 1, tripPlaceIds: [93, 92, 91], startTime: "10:00" });
});

test("network failure before saving reconciles the unchanged server order and unlocks", async () => {
  setup(); await screen.findAllByText("방문 92");
  updateTripPlaceOrderApi.mockRejectedValue(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await screen.findByText("저장 여부를 확인하지 못해 이전 순서로 복원했어요. 최신 순서를 다시 확인해주세요.");
  fireEvent.click(screen.getByRole("button", { name: "저장된 순서 다시 확인" }));
  await screen.findByText("서버의 최신 순서가 요청한 순서와 달라 최신 순서로 복원했어요.");
  expect(screen.getByRole("button", { name: "방문 91 일정 순서 변경" })).toHaveAttribute("aria-disabled", "false");
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 91 구글맵에서 열기");
  expect(screen.queryByText("방문 순서를 저장했어요.")).not.toBeInTheDocument();
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(1);
});

test("a successful PATCH followed by the old GET order never shows false success", async () => {
  setup(); await screen.findAllByText("방문 92");
  updateTripPlaceOrderApi.mockResolvedValue([]);
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await screen.findByText("저장 응답은 받았지만 최신 일정을 확인하지 못했어요. 다시 확인해주세요.");
  expect(screen.queryByText("방문 순서를 저장했어요.")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "저장된 순서 다시 확인" }));
  await screen.findByText("서버의 최신 순서가 요청한 순서와 달라 최신 순서로 복원했어요.");
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("방문 91 구글맵에서 열기");
  expect(screen.getByRole("button", { name: "방문 91 일정 순서 변경" })).toHaveAttribute("aria-disabled", "false");
  expect(updateTripPlaceOrderApi).toHaveBeenCalledTimes(1);
});
