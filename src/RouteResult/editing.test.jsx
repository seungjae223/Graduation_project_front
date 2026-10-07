/* eslint-disable testing-library/no-node-access -- Track the native focused element during keyboard traversal. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RouteResult from "./RouteResult";
import api from "../api/api";
import { getTripByIdApi, getTripPlacesApi, getTripTimelineApi } from "../api/tripApi";
jest.mock("../api/tripApi", () => ({ getTripByIdApi: jest.fn(), getTripPlacesApi: jest.fn(), getTripTimelineApi: jest.fn() }));
jest.mock("../api/api", () => ({ __esModule: true, default: { patch: jest.fn(), post: jest.fn(), delete: jest.fn() }, getApiErrorMessage: (_, fallback) => fallback }));
jest.mock("@googlemaps/js-api-loader", () => ({ setOptions: jest.fn(), importLibrary: jest.fn().mockRejectedValue(new Error("maps disabled")) }));
// Exercise the real drag-end handler deterministically, without synthetic pointer geometry.
jest.mock("@dnd-kit/core", () => ({ closestCenter: jest.fn(), PointerSensor: jest.fn(), useSensor: jest.fn(), useSensors: jest.fn(), DndContext: ({ children, onDragEnd }) => <><button onClick={() => onDragEnd({ active: { id: "91" }, over: { id: "92" } })}>테스트 순서 변경</button>{children}</> }));
jest.mock("@dnd-kit/sortable", () => ({ arrayMove: (items, from, to) => { const copy = [...items]; copy.splice(to, 0, copy.splice(from, 1)[0]); return copy; }, verticalListSortingStrategy: jest.fn(), SortableContext: ({ children }) => children, useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: jest.fn(), transform: null, transition: null }) }));
const places = [91, 92].map((id, index) => ({ id, tripPlaceId: id, placeId: 4, day: 1, visitOrder: index + 1, placeName: "방문 " + id, memo: "", latitude: 35, longitude: 139, isFixed: index === 1, arrivalTime: index === 1 ? "12:00" : null, stayDuration: 30 }));
beforeEach(() => { jest.clearAllMocks(); getTripByIdApi.mockResolvedValue({ id: 7, startDate: "2026-10-04", endDate: "2026-10-04", mapType: "GOOGLE" }); getTripPlacesApi.mockResolvedValue(places); getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:30" }, { visitOrder: 2, arrivalTime: "12:00" }]); });
const setup = () => render(<MemoryRouter initialEntries={["/route-result?id=7"]}><RouteResult /></MemoryRouter>);
test("move buttons share temporary-order rules and keep focus on the moved visit", async () => {
  setup(); await screen.findAllByText("방문 92");
  expect(screen.getByRole("button", { name: "방문 91 방문 순서 위로 이동" })).toBeDisabled();
  const down = screen.getByRole("button", { name: "방문 91 방문 순서 아래로 이동" }); down.focus(); fireEvent.click(down);
  expect(await screen.findByText(/임시 순서 변경 중이에요/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "방문 91 방문 순서 위로 이동" })).toHaveFocus();
  expect(api.patch).not.toHaveBeenCalled(); expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "저장된 순서로 되돌리기" }));
  expect(screen.queryByText(/임시 순서 변경 중이에요/)).not.toBeInTheDocument();
});

test("native buttons support Tab, Enter and Space with focus staying on the visit", async () => {
  setup(); await screen.findAllByText("방문 92");
  let attempts = 0;
  const down = screen.getByRole("button", { name: "방문 91 방문 순서 아래로 이동" });
  while (document.activeElement !== down && attempts++ < 40) userEvent.tab();
  expect(down).toHaveFocus(); userEvent.keyboard("{Enter}");
  const up = await screen.findByRole("button", { name: "방문 91 방문 순서 위로 이동" });
  expect(up).toHaveFocus(); userEvent.keyboard(" ");
  await waitFor(() => expect(screen.getByRole("button", { name: "방문 91 방문 순서 아래로 이동" })).toHaveFocus());
  expect(screen.queryByText(/임시 순서 변경 중이에요/)).not.toBeInTheDocument();
  expect(api.patch).not.toHaveBeenCalled();
});
test("drag is temporary, return to original clears notice, no mutation is sent", async () => {
  setup(); await screen.findAllByText("방문 92");
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  expect(await screen.findByText(/임시 순서 변경 중이에요/)).toBeInTheDocument();
  expect(screen.getAllByText("재계산 필요").length).toBeGreaterThan(0); expect(screen.queryByText("09:00")).not.toBeInTheDocument();
  expect(api.patch).not.toHaveBeenCalled(); expect(api.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "테스트 순서 변경" }));
  await waitFor(() => expect(screen.queryByText(/임시 순서 변경 중이에요/)).not.toBeInTheDocument());
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
  expect(screen.getAllByText("새 메모").length).toBeGreaterThan(0);
});
