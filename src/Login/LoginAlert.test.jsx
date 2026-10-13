import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginAlert from "./LoginAlert";

test("login feedback locks scrolling, contains keyboard focus and restores its opener on Escape", () => {
  function Harness() {
    const [open, setOpen] = useState(false);
    return <><button onClick={() => setOpen(true)}>로그인 안내 열기</button>
      <LoginAlert open={open} type="loginFail" onClose={() => setOpen(false)} /></>;
  }
  render(<Harness />);
  const trigger = screen.getByRole("button", { name: "로그인 안내 열기" });
  userEvent.click(trigger);
  expect(screen.getByRole("alertdialog", { name: "로그인 실패" })).toBeInTheDocument();
  const confirm = screen.getByRole("button", { name: "확인" });
  expect(confirm).toHaveFocus();
  expect(document.documentElement.style.overflowY || document.body.style.overflowY).toBe("hidden");
  userEvent.tab(); expect(confirm).toHaveFocus();
  userEvent.tab({ shift: true }); expect(confirm).toHaveFocus();
  userEvent.keyboard("{Escape}");
  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
