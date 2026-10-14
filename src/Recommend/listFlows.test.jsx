import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Recommend from "./Recommend";
import Total from "./Total";
import PopularAll from "../Homepage/PopularAll";
import api from "../api/api";
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockToggle = jest.fn();
jest.mock("../utils/usePlaceSaving", () => ({ __esModule: true, default: () => ({ isSaved: () => false, toggle: mockToggle, folders: { account: "anonymous", status: "idle" }, open: false }) }));
const place = { id: 1, name: "서버 장소", address: "서울", rating: 0 };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function DetailTarget() { const location = useLocation(); return <p>상세 도착 {location.search}</p>; }
function setup(entry, component = <Recommend />) {
  return render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/recommend" element={component} /><Route path="/total" element={<Total />} /><Route path="/popular-all" element={<PopularAll />} /><Route path="/detail" element={<DetailTarget />} /></Routes></MemoryRouter>);
}
beforeEach(() => { jest.clearAllMocks(); mockToggle.mockImplementation(event => event.stopPropagation()); api.get.mockResolvedValue({ data: [place] }); });
test("theme recommendation screens send the current server seed theme", async () => {
  setup("/recommend"); await screen.findByText(place.name);
  expect(api.get).toHaveBeenLastCalledWith("/api/recommendations", expect.objectContaining({ params: { theme: "HEALING" } }));
  fireEvent.click(screen.getByRole("button", { name: /맛집 탐방/ }));
  await screen.findByText(place.name);
  expect(api.get).toHaveBeenLastCalledWith("/api/recommendations", expect.objectContaining({ params: { theme: "FOOD" } }));
});
test("search full list retains keyword and queries search instead of default healing", async () => {
  setup("/recommend?keyword=서울"); await screen.findByText(place.name);
  fireEvent.click(screen.getByRole("button", { name: "전체보기" }));
  await screen.findByRole("heading", { name: '"서울" 검색 결과' });
  expect(api.get.mock.calls).toHaveLength(2);
  expect(api.get.mock.calls.every(([url, options]) => url === "/api/places/search" && options.params.keyword === "서울")).toBe(true);
});
test.each(["Enter", " "])("internal save key %s cannot invoke parent detail navigation", async key => {
  setup("/recommend"); await screen.findByText(place.name);
  const button = screen.getByRole("button", { name: "저장", exact: true });
  fireEvent.keyDown(button, { key }); userEvent.click(button);
  expect(mockToggle).toHaveBeenCalledTimes(1); expect(screen.queryByText(/상세 도착/)).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("button", { name: /서버 장소/ }), { key: "Enter" });
  expect(await screen.findByText(/상세 도착/)).toBeInTheDocument();
});
test("late old theme success/error cannot overwrite current results", async () => {
  const old = deferred(); api.get.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ data: [{ id: 2, name: "새 테마 장소" }] });
  setup("/recommend"); fireEvent.click(screen.getByRole("button", { name: /액티비티/ })); await screen.findByText("새 테마 장소");
  await act(async () => old.reject(new Error("late failure")));
  expect(screen.getByText("새 테마 장소")).toBeInTheDocument(); expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("missing ratings are omitted; actual zero is retained and distance requires a selected origin", async () => {
  api.get.mockResolvedValue({ data: [place, { id: 2, name: "평점 없는 장소", distance: 0 }] });
  setup("/total"); await screen.findByText("평점 없는 장소");
  expect(screen.getAllByText("★")).toHaveLength(1); expect(screen.getByText("0")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /거리순/ }));
  expect(screen.getByRole("heading", { name: "거리 기준 선택" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "이 위치로 정렬" })).toBeDisabled();
});
test("popular list paginates more places and retains detail links and neutral missing photos", async () => {
  api.get.mockResolvedValue({ data: Array.from({ length: 11 }, (_, i) => ({ id: i + 1, name: `장소 ${i + 1}` })) });
  setup("/popular-all"); await screen.findByRole("link", { name: "장소 9", exact: true });
  expect(screen.getAllByRole("link", { name: /장소/ })).toHaveLength(9);
  expect(screen.getAllByRole("img", { name: /사진 정보 없음/ })).toHaveLength(9);
  expect(screen.queryByRole("link", { name: "장소 11", exact: true })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "2페이지", exact: true }));
  expect(screen.getAllByRole("link", { name: /장소/ })).toHaveLength(6);
  userEvent.click(screen.getByRole("link", { name: "장소 11", exact: true }));
  expect(await screen.findByText(/상세 도착.*id=11/)).toBeInTheDocument();
});
