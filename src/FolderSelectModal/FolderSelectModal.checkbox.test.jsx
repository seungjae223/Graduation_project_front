import React, { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FolderSelectModal from "./FolderSelectModal";
import api from "../api/api";

jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:checkbox" }));
jest.mock("../utils/authState", () => ({ getAuthSnapshot: () => ({ accountKey: "account:checkbox" }) }));

beforeEach(() => {
  jest.clearAllMocks();
  Element.prototype.scrollIntoView = jest.fn();
  api.get.mockResolvedValue({ data: [{ id: 1, name: "도쿄 여행" }, { id: 2, name: "다른 여행" }] });
});

function MembershipPicker({ onToggle = () => {}, complete = true }) {
  const [saved, setSaved] = useState(["1"]);
  const change = (folder, checked) => {
    onToggle(folder, checked);
    setSaved(current => checked ? [...current, folder.id] : current.filter(id => id !== folder.id));
  };
  return <FolderSelectModal open onClose={() => {}} savedFolderIds={saved}
    membershipComplete={complete} onToggleFolder={change} />;
}

test("체크된 폴더를 해제하고 체크되지 않은 폴더를 추가하면 각 폴더별 상태가 바뀜", async () => {
  const onToggle = jest.fn();
  render(<MembershipPicker onToggle={onToggle} />);
  const first = await screen.findByRole("checkbox", { name: "도쿄 여행 저장 해제" });
  const second = screen.getByRole("checkbox", { name: "다른 여행 저장" });
  expect(first).toHaveAttribute("aria-checked", "true");
  expect(second).toHaveAttribute("aria-checked", "false");
  fireEvent.click(first);
  await waitFor(() => expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }), false));
  expect(screen.getByRole("checkbox", { name: "도쿄 여행 저장" })).toHaveAttribute("aria-checked", "false");
  fireEvent.click(second);
  await waitFor(() => expect(onToggle).toHaveBeenCalledWith(expect.objectContaining({ id: "2" }), true));
  expect(screen.getByRole("checkbox", { name: "다른 여행 저장 해제" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("button", { name: "완료" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "저장", exact: true })).not.toBeInTheDocument();
});

test("저장 소속을 완전히 조회하지 못한 경우 체크박스로 삭제하지 못함", async () => {
  const onToggle = jest.fn();
  render(<MembershipPicker onToggle={onToggle} complete={false} />);
  const checkbox = await screen.findByRole("checkbox", { name: "도쿄 여행 저장 해제" });
  expect(checkbox).toBeDisabled();
  fireEvent.click(checkbox);
  expect(onToggle).not.toHaveBeenCalled();
});

test("체크박스 저장 요청 중 모달 포커스를 유지하고 중복 클릭을 무시함", async () => {
  const onToggle = jest.fn();
  const onClose = jest.fn();
  const props = { open: true, onClose, onToggleFolder: onToggle, savedFolderIds: ["1"], membershipComplete: true };
  const { rerender } = render(<FolderSelectModal {...props} />);
  const checkbox = await screen.findByRole("checkbox", { name: "도쿄 여행 저장 해제" });
  checkbox.focus();
  expect(checkbox).toHaveFocus();
  rerender(<FolderSelectModal {...props} isSaving saveDisabled />);
  expect(checkbox).toHaveFocus();
  expect(checkbox).not.toBeDisabled();
  expect(checkbox).toHaveAttribute("aria-disabled", "true");
  fireEvent.click(checkbox);
  expect(onToggle).not.toHaveBeenCalled();
  rerender(<FolderSelectModal {...props} />);
  expect(checkbox).toHaveFocus();
  fireEvent.click(checkbox);
  expect(onToggle).toHaveBeenCalledTimes(1);
});
