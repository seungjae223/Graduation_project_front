import { act, fireEvent, render, screen } from "@testing-library/react";
import ShareModal from "./ShareModal";
jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
test("copy failure offers manual URL and retry; copy lock also blocks closing", async () => {
  let reject; const writeText = jest.fn(() => new Promise((_, no) => { reject = no; })); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
  const close = jest.fn(); render(<ShareModal open onClose={close} shareUrl="https://example.test/place?id=1" />);
  const copy = screen.getByRole("button", { name: "링크 복사" }); fireEvent.click(copy); fireEvent.click(copy); expect(writeText).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "닫기" })); fireEvent.keyDown(document, { key: "Escape" }); expect(close).not.toHaveBeenCalled();
  await act(async () => reject(new Error("clipboard denied"))); expect(await screen.findByLabelText("직접 복사할 링크")).toHaveValue("https://example.test/place?id=1"); expect(copy).toBeEnabled();
});
test("PDF is single flight and a changed context invalidates late completion", async () => {
  let complete; let context; const save = jest.fn(options => { context = options; return new Promise(resolve => { complete = resolve; }); });
  const props = { open: true, onClose: jest.fn(), onSavePdf: save, shareUrl: "https://example.test/trip?id=1" };
  const { rerender } = render(<ShareModal {...props} contextKey="trip1" />);
  const pdf = screen.getByRole("button", { name: "PDF로 저장하기" }); fireEvent.click(pdf); fireEvent.click(pdf); expect(save).toHaveBeenCalledTimes(1); expect(context.isCurrent()).toBe(true);
  rerender(<ShareModal {...props} contextKey="trip2" />); expect(context.isCurrent()).toBe(false);
  await act(async () => complete()); expect(screen.queryByText(/파일 저장 요청을 보냈어요/)).not.toBeInTheDocument();
});

test("PDF failure unlocks retry, success reports only a save request", async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error("renderer failed")).mockResolvedValueOnce();
  render(<ShareModal open onClose={jest.fn()} onSavePdf={save} shareUrl="https://example.test/trip?id=1" />);
  fireEvent.click(screen.getByRole("button", { name: "PDF로 저장하기" }));
  const retry = await screen.findByRole("button", { name: /다시 시도/ });
  expect(screen.getByRole("button", { name: "닫기" })).toBeEnabled(); fireEvent.click(retry);
  expect(await screen.findByText(/파일 저장 요청을 보냈어요/)).toBeInTheDocument();
  expect(save).toHaveBeenCalledTimes(2);
});
