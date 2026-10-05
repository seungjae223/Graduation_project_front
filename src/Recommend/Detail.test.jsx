jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import Detail from "./Detail";
import api from "../api/api";
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn().mockResolvedValue({}), delete: jest.fn() }, getAccessToken: () => "test-session", getApiErrorMessage: (_, fallback) => fallback }));
jest.mock("../Context/SavedPlacesContext", () => ({ useSavedPlaces: () => ({ isSaved: () => false, toggleSavedPlace: jest.fn() }) }));
jest.mock("../utils/recentPlaces", () => ({ saveRecentPlace: jest.fn() }));
const place = id => ({ id, name: "장소 " + id, address: "주소 " + id });
beforeEach(() => { jest.clearAllMocks(); api.post.mockResolvedValue({}); api.get.mockImplementation(async url => ({ data: url === "/api/folders" || url.endsWith("/reviews") ? [] : place(Number(url.split("/").pop())) })); });
function Nav() { const navigate = useNavigate(); return <><button onClick={() => navigate("/detail?id=2")}>B로 이동</button><Detail /></>; }
const setup = () => render(<MemoryRouter initialEntries={["/detail?id=1"]}><Nav /></MemoryRouter>);
test("full review response is revealed locally in batches without another GET", async () => {
  api.get.mockImplementation(async url => ({ data: url.endsWith("/reviews") ? Array.from({ length: 7 }, (_, index) => ({ id: index + 1, rating: 4, comment: "리뷰 " + index })) : url === "/api/folders" ? [] : place(1) }));
  setup(); await screen.findByText("리뷰 2"); expect(screen.queryByText("리뷰 3")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "리뷰 더보기" })); await screen.findByText("리뷰 5");
  fireEvent.click(screen.getByRole("button", { name: "리뷰 더보기" })); await screen.findByText("리뷰 6");
  expect(screen.queryByRole("button", { name: "리뷰 더보기" })).not.toBeInTheDocument(); expect(api.get.mock.calls.filter(([url]) => url.endsWith("/reviews"))).toHaveLength(1);
});
test("review failure and saved-state failure do not erase detail or mean empty/not saved", async () => {
  api.get.mockImplementation(async url => { if (url.endsWith("/reviews") || url === "/api/folders") throw new Error("fail"); return { data: place(1) }; });
  setup(); expect(await screen.findByRole("heading", { name: "장소 1" })).toBeInTheDocument();
  expect(await screen.findByText("리뷰를 불러오지 못했어요. 다시 시도해 주세요.")).toBeInTheDocument();
  expect(screen.queryByText("아직 리뷰가 없어요.")).not.toBeInTheDocument();
  const toggle = screen.getByRole("button", { name: /관심 장소에 추가하기/ }); expect(toggle).toBeDisabled();
  fireEvent.click(toggle); expect(api.delete).not.toHaveBeenCalled();
  const callsBefore = api.get.mock.calls.filter(([url]) => url === "/api/places/1").length;
  api.get.mockResolvedValue({ data: [] }); fireEvent.click(screen.getByRole("button", { name: "리뷰 다시 불러오기" }));
  expect(await screen.findByText("아직 리뷰가 없어요.")).toBeInTheDocument();
  expect(api.get.mock.calls.filter(([url]) => url === "/api/places/1")).toHaveLength(callsBefore);
});
test("late A detail never overwrites B", async () => {
  let resolveA; const pending = new Promise(resolve => { resolveA = resolve; });
  api.get.mockImplementation(async url => url === "/api/places/1" ? pending : { data: url === "/api/folders" || url.endsWith("/reviews") ? [] : place(2) });
  setup(); fireEvent.click(screen.getByRole("button", { name: "B로 이동" }));
  expect(await screen.findByRole("heading", { name: "장소 2" })).toBeInTheDocument();
  await act(async () => resolveA({ data: place(1) })); expect(screen.queryByRole("heading", { name: "장소 1" })).not.toBeInTheDocument();
});
