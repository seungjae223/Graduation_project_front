import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import installActionButtonMotion from "./actionButtonMotion";

const press = button => fireEvent(button, new MouseEvent("pointerdown", { bubbles: true, button: 0 }));

test("adds and replays a decorative action icon without changing the button action or name", () => {
  const clicked = jest.fn();
  const view = render(<button type="button" onClick={clicked}>일정 저장</button>);
  const stop = installActionButtonMotion(view.container);
  try {
    const button = screen.getByRole("button", { name: "일정 저장" });
    expect(button).toHaveAttribute("data-button-icon", "save");
    press(button);
    expect(button).toHaveAttribute("data-button-feedback", "first");
    fireEvent.click(button, { detail: 1 });
    expect(clicked).toHaveBeenCalledTimes(1);
    press(button);
    expect(button).toHaveAttribute("data-button-feedback", "second");
  } finally { stop(); }
});

test("observes newly rendered controls and leaves existing animations and disabled buttons alone", async () => {
  const view = render(<div />);
  const stop = installActionButtonMotion(view.container);
  try {
    view.rerender(<div>
      <button type="button" disabled>다시 조회</button>
      <button type="button" aria-label="이전" data-testid="existing-motion"><span data-useanimations="" /></button>
    </div>);
    const disabled = screen.getByRole("button", { name: "다시 조회" });
    const existing = screen.getByTestId("existing-motion");
    await waitFor(() => expect(disabled).toHaveAttribute("data-button-icon", "refresh"));
    press(disabled);
    press(existing);
    expect(disabled).not.toHaveAttribute("data-button-feedback");
    expect(existing).not.toHaveAttribute("data-button-icon");
    expect(existing).not.toHaveAttribute("data-button-feedback");
  } finally { stop(); }
});
