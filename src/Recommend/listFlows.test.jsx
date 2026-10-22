import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import Recommend from "./Recommend";
import Total from "./Total";
import PopularAll from "../Homepage/PopularAll";
import api from "../api/api";
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn() } }));
const mockToggle = jest.fn();
const mockFavorite = jest.fn();
jest.mock("../utils/usePlaceSaving", () => ({ __esModule: true, default: () => ({ isSaved: () => false, isLiked: () => false, toggle: mockToggle, openFolderPicker: mockToggle, toggleFavorite: mockFavorite, folders: { account: "anonymous", status: "idle" }, open: false }) }));
const place = { id: 1, name: "서버 장소", address: "서울", rating: 0 };
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
function DetailTarget() { const location = useLocation(); return <p>상세 도착 {location.search}</p>; }
function setup(entry, component = <Recommend />) {
  return render(<MemoryRouter initialEntries={[entry]}><Routes><Route path="/recommend" element={component} /><Route path="/destinations/:code" element={<p>여행지 화면</p>} /><Route path="/total" element={<Total />} /><Route path="/popular-all" element={<PopularAll />} /><Route path="/detail" element={<DetailTarget />} /></Routes></MemoryRouter>);
}
beforeEach(() => { jest.clearAllMocks(); mockToggle.mockImplementation(event => event.stopPropagation()); mockFavorite.mockImplementation(event => event.stopPropagation()); api.get.mockResolvedValue({ data: [place] }); });
test("recommend tab selects travel destination before exploring", async () => {
  const destinations = [
    { code: "hong-kong", name: "홍콩", countryName: "홍콩", countryCode: "hk", scope: "OVERSEAS" },
    { code: "osaka", name: "오사카", countryName: "일본", countryCode: "jp", scope: "OVERSEAS" },
  ];
  api.get.mockResolvedValueOnce({ data: destinations });
  setup("/recommend");
  expect(await screen.findByRole("link", { name: "홍콩 여행지 보기" })).toHaveAttribute("href", "/destinations/hong-kong?from=recommend");
  expect(screen.queryByRole("button", { name: /힐링|액티비티|맛집 탐방/ })).not.toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(1);
  expect(api.get).toHaveBeenCalledWith("/api/destinations", expect.any(Object));
  fireEvent.click(screen.getByRole("link", { name: "홍콩 여행지 보기" }));
  expect(await screen.findByText("여행지 화면")).toBeInTheDocument();
});

test("destination chooser retries failed catalogs", async () => {
  api.get.mockRejectedValueOnce(new Error("offline"));
  api.get.mockResolvedValueOnce({ data: [{ code: "osaka", name: "오사카", countryName: "일본", countryCode: "jp", scope: "OVERSEAS" }] });
  setup("/recommend");
  fireEvent.click(await screen.findByRole("button", { name: "다시 조회" }));
  expect(await screen.findByRole("link", { name: "오사카 여행지 보기" })).toBeInTheDocument();
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

test("overseas regions and domestic scope filter only real catalog destinations", async () => {
  api.get.mockResolvedValueOnce({ data: [
    { code: "tokyo", name: "도쿄", countryName: "일본", countryCode: "jp", scope: "OVERSEAS" },
    { code: "hong-kong", name: "홍콩", countryName: "홍콩", countryCode: "hk", scope: "OVERSEAS" },
    { code: "bangkok", name: "방콕", countryName: "태국", countryCode: "th", scope: "OVERSEAS" },
    { code: "new-york", name: "뉴욕", countryName: "미국", countryCode: "us", scope: "OVERSEAS" },
    { code: "jeju", name: "제주", countryName: "대한민국", countryCode: "kr", scope: "DOMESTIC" },
  ] });
  setup("/recommend");
  expect(await screen.findByRole("link", { name: "도쿄 여행지 보기" })).toBeInTheDocument();
  const regions = screen.getByRole("group", { name: "여행 지역" });
  fireEvent.click(within(regions).getByRole("button", { name: "중화" }));
  expect(screen.getByRole("link", { name: "홍콩 여행지 보기" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "도쿄 여행지 보기" })).not.toBeInTheDocument();
  fireEvent.click(within(regions).getByRole("button", { name: "동남아시아" }));
  expect(screen.getByRole("link", { name: "방콕 여행지 보기" })).toBeInTheDocument();
  fireEvent.click(within(regions).getByRole("button", { name: "아메리카" }));
  expect(screen.getByRole("link", { name: "뉴욕 여행지 보기" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "국내" }));
  expect(screen.getByRole("link", { name: "제주 여행지 보기" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "홍콩 여행지 보기" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "해외" }));
  expect(within(regions).getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
});
