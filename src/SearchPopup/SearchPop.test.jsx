import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SearchPop from "./SearchPop";
import api from "../api/api";
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
const place = { id: 1, name: "확인된 추천", address: "서울" };
const response = data => Promise.resolve({ data });
const fail = () => Promise.reject(new Error("추천 조회 실패"));
const setup = () => render(<MemoryRouter><SearchPop isOpen onClose={jest.fn()} /></MemoryRouter>);
beforeEach(() => jest.clearAllMocks());

test("all failed theme reads show failure and retry instead of an empty successful list", async () => {
  api.get.mockImplementation((url, options) => options.params ? fail() : response([]));
  setup(); await screen.findByRole("alert");
  expect(screen.queryByText("검색 결과가 없습니다.")).not.toBeInTheDocument();
  api.get.mockResolvedValue({ data: [place] }); fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  expect(await screen.findByText(place.name)).toBeInTheDocument();
});
test("partial results remain usable; failed refresh preserves previously confirmed recommendation batches", async () => {
  let second = false;
  api.get.mockImplementation((url, options) => {
    if (!options.params) return response([]);
    if (options.params.theme === "HEALING") return second ? fail() : response([place]);
    return options.params.theme === "FOOD" ? fail() : response([]);
  });
  setup(); await screen.findByText(place.name); expect(screen.getByRole("alert")).toHaveTextContent("일부 추천");
  second = true; fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  await screen.findByText(place.name); expect(screen.getByRole("button", { name: "상세보기" })).toBeEnabled();
});
test("confirmed empty reads show an empty result without an error", async () => {
  api.get.mockResolvedValue({ data: [] }); setup();
  await screen.findByText("검색 결과가 없습니다."); expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
test("server tag matches remain visible even when name and address lack the keyword", async () => {
  api.get.mockResolvedValue({ data: [place] }); setup(); await screen.findByText(place.name);
  api.get.mockResolvedValue({ data: [{ id: 4, name: "산책 장소", address: "서울", theme: "healing", tags: ["힐링"] }] });
  fireEvent.change(screen.getByLabelText("장소 검색어"), { target: { value: "힐링" } });
  await screen.findByText("산책 장소"); expect(screen.queryByText("검색 결과가 없습니다.")).not.toBeInTheDocument();
});
test("late old popup search cannot replace a newer query", async () => {
  let resolveOld;
  api.get.mockImplementation((url, options) => options.params?.keyword === "이전" ? new Promise(resolve => { resolveOld = resolve; }) : response([place]));
  setup(); await screen.findByText(place.name);
  fireEvent.change(screen.getByLabelText("장소 검색어"), { target: { value: "이전" } });
  await screen.findByRole("status");
  // Wait for the actual first request instead of assuming a debounce tick has run.
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 270)); });
  fireEvent.change(screen.getByLabelText("장소 검색어"), { target: { value: "최신" } });
  api.get.mockResolvedValue({ data: [{ id: 2, name: "최신 장소", address: "부산" }] });
  await screen.findByText("최신 장소");
  await act(async () => resolveOld({ data: [{ id: 3, name: "이전 장소" }] }));
  expect(screen.queryByText("이전 장소")).not.toBeInTheDocument();
});
