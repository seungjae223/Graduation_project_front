import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RouteCreate from "./RouteCreate";
import StartPlaceModal from "./StartPlaceModal";
import { searchPlacesApi } from "../api/placeApi";
import api from "../api/api";
jest.mock("../api/placeApi", () => ({ searchPlacesApi: jest.fn(), getFoldersApi: jest.fn(), getFolderPlacesApi: jest.fn() }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), patch: jest.fn() }, getApiErrorMessage: (_, message) => message }));
beforeEach(() => { jest.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); });
test("before a real response and after failure, Enter cannot add an example or start a write", async () => {
  let reject;
  searchPlacesApi.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
  render(<MemoryRouter><RouteCreate /></MemoryRouter>);
  const input = screen.getByRole("textbox", { name: "일정에 추가할 장소 검색" });
  fireEvent.focus(input); fireEvent.keyDown(input, { key: "Enter" });
  expect(screen.getByText("아직 추가된 장소가 없어요.")).toBeInTheDocument();
  fireEvent.change(input, { target: { value: "경복궁" } }); fireEvent.keyDown(input, { key: "Enter" });
  await waitFor(() => expect(searchPlacesApi).toHaveBeenCalledTimes(1));
  expect(screen.getByText("검색 중입니다.")).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "추가", exact: true })).not.toBeInTheDocument();
  await act(async () => reject(new Error("조회 실패"))); await screen.findByRole("button", { name: "검색 다시 시도" });
  fireEvent.keyDown(input, { key: "Enter" }); expect(screen.getByText("아직 추가된 장소가 없어요.")).toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
});
test("only server results can be added and a missing photo uses the common placeholder", async () => {
  searchPlacesApi.mockResolvedValue([{ id: 11, name: "실제 장소", address: "실제 주소" }]);
  render(<MemoryRouter><RouteCreate /></MemoryRouter>); const input = screen.getByRole("textbox", { name: "일정에 추가할 장소 검색" });
  fireEvent.change(input, { target: { value: "실제" } }); await screen.findByRole("button", { name: "추가", exact: true });
  fireEvent.keyDown(input, { key: "Enter" }); expect(await screen.findByText("실제 장소")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: "실제 장소 사진 정보 없음" })).toBeInTheDocument(); expect(api.post).not.toHaveBeenCalled();
});
test("a fixed-time place is visibly unavailable as departure; another place can be selected", () => {
  const select = jest.fn(), confirm = jest.fn(); const date = new Date(2026, 9, 12); const places = [{ id: "fixed", name: "고정 장소", isFixedTime: true }, { id: "normal", name: "출발 가능 장소" }];
  render(<StartPlaceModal open selectedDates={[date]} placesByDate={{ date: places }} getDateKey={() => "date"} onSelectPlace={select} onConfirm={confirm} />);
  expect(screen.getByText(/출발 시간은 오전 10시입니다/)).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: /현재 선택된 일정의 장소/ }));
  expect(screen.getByRole("button", { name: /^고정 장소/ })).toBeDisabled(); fireEvent.click(screen.getByRole("button", { name: "출발 가능 장소" }));
  expect(select).toHaveBeenCalledWith("date", "normal"); expect(screen.getByRole("button", { name: "확인", exact: true })).toBeEnabled();
});
