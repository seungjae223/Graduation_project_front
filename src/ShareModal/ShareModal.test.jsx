import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import ShareModal from "./ShareModal";
import useSessionKey from "../utils/useSessionKey";

jest.mock("../utils/useSessionKey", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockUseSessionKey = useSessionKey;
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator,
  "clipboard"
);

const setClipboard = (writeText) => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
};

const mockExpectedError = () =>
  jest.spyOn(console, "error").mockImplementation(() => {});

const expectShareModalError = (errorSpy) => {
  expect(errorSpy).toHaveBeenCalledTimes(1);
  expect(errorSpy).toHaveBeenCalledWith("Request failed", {
    context: "ShareModal.jsx",
  });
};

beforeEach(() => {
  mockUseSessionKey.mockReset();
  mockUseSessionKey.mockReturnValue("account:test");
});

afterEach(() => {
  if (originalClipboardDescriptor) {
    Object.defineProperty(
      navigator,
      "clipboard",
      originalClipboardDescriptor
    );
  } else {
    delete navigator.clipboard;
  }

  jest.restoreAllMocks();
});

test("blocks duplicate copy attempts and closing while copy is pending", async () => {
  let completeCopy;
  const writeText = jest.fn(
    () =>
      new Promise((resolve) => {
        completeCopy = resolve;
      })
  );
  const close = jest.fn();
  setClipboard(writeText);

  render(
    <ShareModal
      open
      onClose={close}
      shareUrl="https://example.test/place?id=1"
    />
  );

  const copyButton = screen.getByRole("button", { name: "링크 복사" });
  const closeButton = screen.getByRole("button", { name: "닫기" });

  fireEvent.click(copyButton);
  fireEvent.click(copyButton);

  expect(writeText).toHaveBeenCalledTimes(1);
  expect(closeButton).toBeDisabled();

  fireEvent.click(closeButton);
  fireEvent.keyDown(document, { key: "Escape" });

  expect(close).not.toHaveBeenCalled();

  await act(async () => {
    completeCopy();
  });

  expect(copyButton).toBeEnabled();
  expect(closeButton).toBeEnabled();
  expect(screen.getByRole("status")).toHaveTextContent(/링크를 복사했어요/);
});

test("shows a manual URL and allows retry after clipboard failure", async () => {
  const errorSpy = mockExpectedError();
  const writeText = jest
    .fn()
    .mockRejectedValueOnce(new Error("clipboard denied"))
    .mockResolvedValueOnce();
  setClipboard(writeText);

  render(
    <ShareModal
      open
      onClose={jest.fn()}
      shareUrl="https://example.test/place?id=1"
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "링크 복사" }));

  const manualUrl = await screen.findByLabelText("직접 복사할 링크");
  const retryButton = screen.getByRole("button", { name: "다시 시도" });

  expect(manualUrl).toHaveValue("https://example.test/place?id=1");
  expect(screen.getByRole("button", { name: "링크 복사" })).toBeEnabled();

  fireEvent.click(retryButton);

  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(/링크를 복사했어요/)
  );
  expect(screen.queryByLabelText("직접 복사할 링크")).not.toBeInTheDocument();
  expect(writeText).toHaveBeenCalledTimes(2);
  expectShareModalError(errorSpy);
});

test("blocks duplicate PDF requests", async () => {
  let completePdf;
  const savePdf = jest.fn(
    () =>
      new Promise((resolve) => {
        completePdf = resolve;
      })
  );

  render(
    <ShareModal
      open
      onClose={jest.fn()}
      onSavePdf={savePdf}
      shareUrl="https://example.test/trip?id=1"
    />
  );

  const pdfButton = screen.getByRole("button", { name: "PDF로 저장하기" });

  fireEvent.click(pdfButton);
  fireEvent.click(pdfButton);

  expect(savePdf).toHaveBeenCalledTimes(1);
  expect(pdfButton).toBeDisabled();

  await act(async () => {
    completePdf();
  });

  expect(pdfButton).toBeEnabled();
  expect(screen.getByRole("status")).toHaveTextContent(/저장 요청/);
});

test("ignores late PDF completion after context changes", async () => {
  const completions = [];
  const savePdf = jest.fn(
    () =>
      new Promise((resolve) => {
        completions.push(resolve);
      })
  );
  const props = {
    open: true,
    onClose: jest.fn(),
    onSavePdf: savePdf,
    shareUrl: "https://example.test/trip?id=1",
  };

  const { rerender } = render(
    <ShareModal {...props} contextKey="trip1" />
  );

  fireEvent.click(screen.getByRole("button", { name: "PDF로 저장하기" }));

  rerender(<ShareModal {...props} contextKey="trip2" />);

  const currentPdfButton = screen.getByRole("button", {
    name: "PDF로 저장하기",
  });
  expect(currentPdfButton).toBeEnabled();

  fireEvent.click(currentPdfButton);

  expect(savePdf).toHaveBeenCalledTimes(2);
  expect(currentPdfButton).toBeDisabled();

  await act(async () => {
    completions[0]();
  });

  expect(screen.queryByText(/저장 요청/)).not.toBeInTheDocument();
  expect(currentPdfButton).toBeDisabled();

  await act(async () => {
    completions[1]();
  });

  expect(currentPdfButton).toBeEnabled();
  expect(screen.getByRole("status")).toHaveTextContent(/저장 요청/);
});

test("unlocks PDF actions and allows retry after failure", async () => {
  const errorSpy = mockExpectedError();
  const savePdf = jest
    .fn()
    .mockRejectedValueOnce(new Error("renderer failed"))
    .mockResolvedValueOnce();

  render(
    <ShareModal
      open
      onClose={jest.fn()}
      onSavePdf={savePdf}
      shareUrl="https://example.test/trip?id=1"
    />
  );

  fireEvent.click(screen.getByRole("button", { name: "PDF로 저장하기" }));

  const retryButton = await screen.findByRole("button", {
    name: "다시 시도",
  });
  expect(screen.getByRole("button", { name: "닫기" })).toBeEnabled();

  fireEvent.click(retryButton);

  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(/저장 요청/)
  );
  expect(screen.getByRole("status")).not.toHaveTextContent(
    /저장 완료|저장됐어요/
  );
  expect(savePdf).toHaveBeenCalledTimes(2);
  expectShareModalError(errorSpy);
});
