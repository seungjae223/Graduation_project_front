import userEvent from "@testing-library/user-event";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Search from "./Search";
import { searchPlacesApi, getRecentSearchesApi, clearRecentSearchesApi, deleteRecentSearchApi } from "../api/placeApi";
jest.mock("../api/placeApi", () => ({ searchPlacesApi: jest.fn(), getRecentSearchesApi: jest.fn(), deleteRecentSearchApi: jest.fn(), clearRecentSearchesApi: jest.fn() }));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const place = { id: 781, name: "서버 장소", address: "서버 주소", latitude: 37, longitude: 127 };
function Destination() { const location = useLocation(); return <p>{location.search} / {location.state.place.id}</p>; }
function setup() {
  render(<MemoryRouter initialEntries={["/search"]}><Routes><Route path="/search" element={<Search />} /><Route path="/detail" element={<Destination />} /></Routes></MemoryRouter>);
  return screen.getByPlaceholderText("장소, 도시 또는 테마 검색");
}
beforeEach(() => { jest.clearAllMocks(); getRecentSearchesApi.mockResolvedValue([]); });

test("region search remains available without the unimplemented more button", async () => {
  searchPlacesApi.mockResolvedValue([place]); setup();
  expect(screen.queryByRole("button", { name: "더보기", exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "부산", exact: true }));
  expect(await screen.findByText("서버 장소")).toBeInTheDocument();
  expect(searchPlacesApi.mock.calls[0][0]).toBe("부산");
});
test("clear uses the existing API and only removes records after success", async () => {
  getRecentSearchesApi.mockResolvedValue([{ id: 1, keyword: "테스트 검색" }]);
  const pending = deferred(); clearRecentSearchesApi.mockReturnValue(pending.promise); setup();
  await screen.findByRole("button", { name: "테스트 검색", exact: true });
  fireEvent.click(screen.getByRole("button", { name: "전체 삭제" }));
  expect(clearRecentSearchesApi).toHaveBeenCalledTimes(1);
  expect(screen.getByText("테스트 검색")).toBeInTheDocument();
  getRecentSearchesApi.mockResolvedValueOnce([]);
  await act(async () => pending.resolve({}));
  expect(await screen.findByText("최근 검색어가 없어요.")).toBeInTheDocument();
});
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

function HistoryControls() {
  const navigate = useNavigate(); const location = useLocation();
  return <><output aria-label="현재 검색 URL">{location.search}</output><button onClick={() => navigate(-1)}>이전 기록</button><button onClick={() => navigate(1)}>다음 기록</button></>;
}
function setupUrl(initial = "/search?keyword=서울") {
  render(<MemoryRouter initialEntries={[initial]}><HistoryControls /><Search /></MemoryRouter>);
  return screen.getByLabelText("장소, 도시 또는 테마 검색");
}
test("direct URL searches once without Enter and restores URL, input and results on history", async () => {
  searchPlacesApi.mockImplementation(async keyword => [{ ...place, name: keyword + " 결과" }]);
  const input = setupUrl();
  await screen.findByText("서울 결과"); expect(input).toHaveValue("서울"); expect(searchPlacesApi).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: "부산" } }); fireEvent.click(screen.getByRole("button", { name: "검색", exact: true }));
  await screen.findByText("부산 결과"); expect(screen.getByLabelText("현재 검색 URL")).toHaveTextContent("keyword=%EB%B6%80%EC%82%B0");
  expect(searchPlacesApi).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("button", { name: "이전 기록" })); await screen.findByText("서울 결과"); expect(input).toHaveValue("서울");
  fireEvent.click(screen.getByRole("button", { name: "다음 기록" })); await screen.findByText("부산 결과"); expect(input).toHaveValue("부산");
});
test("delete is an independent keyboard button; failed writes preserve recent list and current query", async () => {
  searchPlacesApi.mockResolvedValue([place]); getRecentSearchesApi.mockResolvedValue([{ id: 9, keyword: "최근" }]);
  const failure = { response: { status: 400 } }; deleteRecentSearchApi.mockRejectedValue(failure);
  const input = setupUrl(); await screen.findByText("서버 장소");
  const remove = await screen.findByRole("button", { name: "최근 최근 검색어 삭제" });
  userEvent.click(remove); await screen.findByText(/최근 검색어를 삭제하지/);
  expect(screen.getByRole("button", { name: "최근", exact: true })).toBeInTheDocument();
  expect(searchPlacesApi).toHaveBeenCalledTimes(1); expect(input).toHaveValue("서울");
  deleteRecentSearchApi.mockResolvedValue({}); getRecentSearchesApi.mockResolvedValue([]);
  userEvent.click(remove); await screen.findByText("최근 검색어가 없어요.");
  expect(deleteRecentSearchApi).toHaveBeenCalledTimes(2);
});
test("successful search refreshes recents and failed recent reads remain distinct from an empty list", async () => {
  getRecentSearchesApi.mockRejectedValue(new Error("read failure")); searchPlacesApi.mockResolvedValue([place]);
  const input = setupUrl(); await screen.findByText("서버 장소"); await screen.findByText("최근 검색어를 불러오지 못했어요.");
  expect(screen.queryByText("최근 검색어가 없어요.")).not.toBeInTheDocument();
  getRecentSearchesApi.mockResolvedValue([{ id: 4, keyword: "서울" }]); fireEvent.click(screen.getByRole("button", { name: "최근 검색어 다시 조회" }));
  await screen.findByRole("button", { name: "서울", exact: true }); expect(input).toHaveValue("서울"); expect(searchPlacesApi).toHaveBeenCalledTimes(1);
  fireEvent.change(input, { target: { value: "제주" } }); getRecentSearchesApi.mockResolvedValue([{ id: 5, keyword: "제주" }]);
  fireEvent.click(screen.getByRole("button", { name: "검색", exact: true })); await screen.findByRole("button", { name: "제주", exact: true });
  await waitFor(() => expect(input).toHaveValue("제주"));
});
