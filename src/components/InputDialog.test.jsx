import { fireEvent, render, screen } from "@testing-library/react";
import InputDialog from "./InputDialog";
test("input gets focus, keyboard submits, busy prevents editing and closing, restore focus", () => {
  const close = jest.fn(), submit = jest.fn();
  const opener = document.createElement("button"); document.body.appendChild(opener); opener.focus();
  const props = { open: true, title: "새 폴더 만들기", label: "폴더명", value: "입력 유지", onChange: jest.fn(), onClose: close, onSubmit: submit };
  const { rerender } = render(<InputDialog {...props} />);
  expect(screen.getByLabelText("폴더명")).toHaveFocus(); fireEvent.submit(screen.getByRole("dialog")); expect(submit).toHaveBeenCalledTimes(1);
  rerender(<InputDialog {...props} busy />); expect(screen.getByLabelText("폴더명")).toBeDisabled();
  fireEvent.keyDown(document, { key: "Escape" }); expect(close).not.toHaveBeenCalled();
  rerender(<InputDialog {...props} open={false} />); expect(opener).toHaveFocus(); opener.remove();
});
