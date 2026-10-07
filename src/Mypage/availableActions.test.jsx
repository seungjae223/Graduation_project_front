import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import SavedPlaces from "./SavedPlaces";
import MyPage from "./MyPage";
import ShareModal from "../ShareModal/ShareModal";
import api from "../api/api";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:test" }) }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), delete: jest.fn() }, getAccessToken: () => "test-only-token" }));
beforeEach(() => {
  jest.clearAllMocks();
  window.matchMedia = jest.fn(() => ({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() }));
  api.get.mockImplementation(async url => ({ data: url === "/api/folders" ? [{ id: 3, name: "내 폴더" }] : url.includes("/places") ? [{ id: 71, name: "저장 장소", address: "주소" }] : {} }));
});
test("unsupported folder menu is absent; folder creation and place removal still work", async () => {
  render(<MemoryRouter><SavedPlaces /></MemoryRouter>);
  const folder = await screen.findByText("내 폴더");
  expect(screen.queryByRole("button", { name: "폴더 관리 열기" })).not.toBeInTheDocument();
  api.post.mockResolvedValue({ data: "폴더 생성 완료" });
  fireEvent.click(screen.getByRole("button", { name: /새 폴더 만들기/ }));
  fireEvent.change(screen.getByLabelText("폴더명"), { target: { value: "추가 폴더" } });
  fireEvent.click(screen.getByRole("button", { name: "생성", exact: true }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/folders", { name: "추가 폴더" }));
  await screen.findByText(/폴더가 생성됐어요/);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  fireEvent.click(folder);
  await screen.findByRole("heading", { name: "저장 장소" });
  const confirm = jest.spyOn(window, "confirm").mockReturnValue(true);
  api.delete.mockResolvedValue({ data: "장소 삭제 완료" });
  fireEvent.click(screen.getByRole("button", { name: /장소 삭제|장소 제거|더보기/ }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith("/api/folders/3/places/71"));
  confirm.mockRestore();
});
test("friend invitation banner is not actionable or visible", async () => {
  render(<MemoryRouter><MyPage /></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  expect(screen.queryByText("친구 초대하고 포인트 받기!")).not.toBeInTheDocument();
});
test("folder create is single flight; read retry never repeats a successful POST", async () => {
  render(<MemoryRouter><SavedPlaces /></MemoryRouter>);
  await screen.findByText("내 폴더");
  let complete; const pending = new Promise(resolve => { complete = resolve; });
  api.post.mockImplementation(() => pending);
  fireEvent.click(screen.getByRole("button", { name: /새 폴더 만들기/ }));
  fireEvent.change(screen.getByLabelText("폴더명"), { target: { value: "보존할 이름" } });
  const form = screen.getByRole("dialog"); fireEvent.submit(form); fireEvent.submit(form);
  expect(api.post).toHaveBeenCalledTimes(1);
  api.get.mockRejectedValueOnce(new Error("read fail")); complete({ data: "폴더 생성 완료" });
  expect(await screen.findByText("폴더는 생성됐지만 목록을 새로 불러오지 못했어요.")).toBeInTheDocument();
  expect(screen.getByLabelText("폴더명")).toHaveValue("보존할 이름");
  fireEvent.click(screen.getByRole("button", { name: "최신 목록 다시 확인" }));
  await screen.findByText(/폴더가 생성됐어요/); expect(api.post).toHaveBeenCalledTimes(1);
});
test("definite folder create failure preserves input", async () => {
  render(<MemoryRouter><SavedPlaces /></MemoryRouter>); await screen.findByText("내 폴더");
  api.post.mockRejectedValue({ response: { status: 400 } });
  fireEvent.click(screen.getByRole("button", { name: /새 폴더 만들기/ }));
  fireEvent.change(screen.getByLabelText("폴더명"), { target: { value: "다시 쓸 이름" } });
  fireEvent.submit(screen.getByRole("dialog")); await screen.findByText("폴더 생성에 실패했어요. 입력한 이름은 유지됩니다.");
  expect(screen.getByLabelText("폴더명")).toHaveValue("다시 쓸 이름");
});
test("normal URL copy still copies exactly the supplied URL", async () => {
  const writeText = jest.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  render(<ShareModal open onClose={() => {}} shareUrl="https://example.com/detail?id=71" />);
  fireEvent.click(screen.getByRole("button", { name: /링크 복사/ }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://example.com/detail?id=71"));
});

