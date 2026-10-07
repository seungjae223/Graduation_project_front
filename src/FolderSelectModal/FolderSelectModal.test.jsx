import userEvent from "@testing-library/user-event";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FolderSelectModal from "./FolderSelectModal";
import api from "../api/api";
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
let mockAccount = "account:test";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => mockAccount }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: mockAccount }) }));
beforeEach(() => { mockAccount = "account:test"; jest.clearAllMocks(); Element.prototype.scrollIntoView = jest.fn(); api.get.mockResolvedValue({ data: [{ id: 1, name: "같은 이름" }, { id: 2, name: "같은 이름" }] }); });
const openCreate = async () => { await screen.findAllByText("같은 이름"); fireEvent.click(screen.getByRole("button", { name: /새 폴더/ })); fireEvent.change(screen.getByLabelText("폴더 이름"), { target: { value: "같은 이름" } }); };
test("ID-less success has no name-based selection and duplicate submits only POST once", async () => {
  const save = jest.fn(); render(<FolderSelectModal open onClose={jest.fn()} onSave={save} />); await openCreate();
  let complete; api.post.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
  userEvent.click(screen.getByLabelText("폴더 이름")); userEvent.keyboard("{Enter}"); userEvent.click(screen.getByLabelText("폴더 이름")); userEvent.keyboard("{Enter}"); expect(api.post).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "새 폴더 만들기 닫기" })).toBeDisabled();
  await act(async () => complete({ data: "폴더 생성 완료" })); await screen.findByText(/목록으로 돌아가 직접 폴더/);
  fireEvent.click(screen.getByRole("button", { name: "취소" }));
  expect(save).not.toHaveBeenCalled(); expect(screen.getByRole("button", { name: /저장/ })).toBeDisabled();
  fireEvent.click(screen.getAllByRole("button", { name: "같은 이름" })[1]);
  fireEvent.click(screen.getByRole("button", { name: "저장", exact: true }));
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }));
});
test("confirmed create with failed list retries GET only", async () => {
  render(<FolderSelectModal open onClose={jest.fn()} />); await openCreate(); api.post.mockResolvedValue({ data: "폴더 생성 완료" }); api.get.mockRejectedValueOnce(new Error("read failed"));
  userEvent.click(screen.getByLabelText("폴더 이름")); userEvent.keyboard("{Enter}"); await screen.findByText("폴더는 생성됐지만 목록을 불러오지 못했어요.");
  fireEvent.click(screen.getByRole("button", { name: "목록 다시 확인" })); await screen.findByText(/목록으로 돌아가 직접 폴더/); expect(api.post).toHaveBeenCalledTimes(1);
});

test("lost response retains input and only permits list reads, never automatic recreation", async () => {
  render(<FolderSelectModal open onClose={jest.fn()} />); await openCreate();
  api.post.mockRejectedValueOnce(new Error("timeout"));
  userEvent.click(screen.getByLabelText("폴더 이름")); userEvent.keyboard("{Enter}");
  await screen.findByText(/폴더가 생성되었을 수/);
  expect(screen.getByLabelText("폴더 이름")).toHaveValue("같은 이름");
  userEvent.click(screen.getByLabelText("폴더 이름")); userEvent.keyboard("{Enter}");
  fireEvent.click(screen.getByRole("button", { name: "목록 다시 확인" }));
  await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  expect(api.post).toHaveBeenCalledTimes(1);
});

test.each(["reopen", "place", "account"])("late creation refresh cannot replace a new %s context", async mode => {
  let complete;
  const props = { open: true, onClose: jest.fn(), contextKey: "place1" };
  const { rerender } = render(<FolderSelectModal {...props} />); await openCreate();
  api.post.mockImplementationOnce(() => new Promise(resolve => { complete = resolve; }));
  userEvent.click(screen.getByLabelText("폴더 이름")); userEvent.keyboard("{Enter}");
  if (mode === "reopen") rerender(<FolderSelectModal {...props} open={false} />);
  if (mode === "account") mockAccount = "account:B";
  rerender(<FolderSelectModal {...props} contextKey={mode === "place" ? "place2" : "place1"} />);
  await act(async () => complete({ data: "폴더 생성 완료" }));
  expect(screen.queryByText(/폴더가 생성됐어요/)).not.toBeInTheDocument();
  expect(api.post).toHaveBeenCalledTimes(1);
});
