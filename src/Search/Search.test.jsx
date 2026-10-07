import userEvent from "@testing-library/user-event";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Search from "./Search";
import { searchPlacesApi, getRecentSearchesApi } from "../api/placeApi";
jest.mock("../api/placeApi", () => ({ searchPlacesApi: jest.fn(), getRecentSearchesApi: jest.fn(), deleteRecentSearchApi: jest.fn(), clearRecentSearchesApi: jest.fn() }));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const place = { id: 781, name: "서버 장소", address: "서버 주소", latitude: 37, longitude: 127 };
function Destination() { const location = useLocation(); return <p>{location.search} / {location.state.place.id}</p>; }
function setup() {
  render(<MemoryRouter initialEntries={["/search"]}><Routes><Route path="/search" element={<Search />} /><Route path="/detail" element={<Destination />} /></Routes></MemoryRouter>);
  return screen.getByPlaceholderText("장소, 도시 또는 테마 검색");
}
beforeEach(() => { jest.clearAllMocks(); getRecentSearchesApi.mockResolvedValue([]); });
test("typing does not search; blank and long submissions are rejected", async () => {
  const input = setup();
  fireEvent.change(input, { target: { value: "   " } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  expect(await screen.findByText("검색어를 입력해주세요.")).toBeInTheDocument();
  fireEvent.change(input, { target: { value: "가".repeat(101) } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  expect(await screen.findByText("검색어는 100자 이하로 입력해주세요.")).toBeInTheDocument();
  expect(searchPlacesApi).not.toHaveBeenCalled();
});
test("Enter/form and button cannot duplicate an in-flight query; server ID reaches detail", async () => {
  const pending = deferred(); searchPlacesApi.mockReturnValue(pending.promise);
  const input = setup(); fireEvent.change(input, { target: { value: "  서울  " } });
  userEvent.click(input); userEvent.keyboard("{Enter}"); fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  expect(searchPlacesApi).toHaveBeenCalledTimes(1);
  expect(searchPlacesApi.mock.calls[0][0]).toBe("서울");
  await act(async () => pending.resolve([place]));
  fireEvent.click(screen.getByRole("button", { name: /서버 장소/ }));
  expect(screen.getByText(/id=781.*781/)).toBeInTheDocument();
});
test("late previous response is ignored; failure stays distinct from empty and can retry", async () => {
  const old = deferred(); searchPlacesApi.mockReturnValueOnce(old.promise).mockResolvedValueOnce([place]);
  const input = setup(); fireEvent.change(input, { target: { value: "이전" } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  fireEvent.change(input, { target: { value: "최신" } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  expect(await screen.findByText("서버 장소")).toBeInTheDocument();
  await act(async () => old.resolve([{ id: 2, name: "이전 결과" }]));
  expect(screen.queryByText("이전 결과")).not.toBeInTheDocument();
  searchPlacesApi.mockRejectedValueOnce(new Error("Network Error"));
  fireEvent.change(input, { target: { value: "실패" } }); userEvent.click(input); userEvent.keyboard("{Enter}");
  await screen.findByRole("alert"); expect(input).toHaveValue("실패");
  expect(screen.queryByText("검색 결과가 없어요.")).not.toBeInTheDocument();
  searchPlacesApi.mockResolvedValueOnce([]); fireEvent.click(screen.getByRole("button", { name: "다시 검색" }));
  await screen.findByText("검색 결과가 없어요.");
});
