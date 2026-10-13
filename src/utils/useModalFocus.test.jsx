import React, { StrictMode, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import useModalFocus from "./useModalFocus";

function Dialog({ name, open, onClose, canClose = true, empty = false, children }) {
  const ref = useModalFocus({ open, onClose, canClose, lockScroll: true });
  if (!open) return null;
  return <section ref={ref} role="dialog" aria-label={name} tabIndex={-1}>
    {empty ? <><button disabled>Disabled</button><div hidden><button>Hidden</button></div></> : <>
      <button data-modal-initial-focus>{name} first</button>
      {children}
      <button>{name} last</button>
    </>}
  </section>;
}

function NestedDialogs({ innerClose, outerClose, innerCanClose = true }) {
  const [outer, setOuter] = useState(false);
  const [inner, setInner] = useState(false);
  return <>
    <button onClick={() => setOuter(true)}>Open outer</button>
    <button>Outside</button>
    <Dialog name="Outer" open={outer} onClose={() => { outerClose(); setOuter(false); }}>
      <button onClick={() => setInner(true)}>Open inner</button>
      <Dialog name="Inner" open={inner} canClose={innerCanClose} onClose={() => { innerClose(); setInner(false); }} />
    </Dialog>
  </>;
}

afterEach(() => {
  document.documentElement.style.overflowY = "";
  document.body.style.overflowY = "";
  document.documentElement.scrollTop = 0;
  document.documentElement.scrollLeft = 0;
});

test("the top modal owns Tab, Shift+Tab, external focus and Escape; closing restores each opener", () => {
  const innerClose = jest.fn();
  const outerClose = jest.fn();
  document.documentElement.style.overflowY = "scroll";
  document.body.style.overflowY = "auto";
  document.documentElement.scrollTop = 480;
  document.documentElement.scrollLeft = 13;
  render(<StrictMode><NestedDialogs innerClose={innerClose} outerClose={outerClose} /></StrictMode>);
  userEvent.click(screen.getByRole("button", { name: "Open outer" }));
  expect(screen.getByRole("button", { name: "Outer first" })).toHaveFocus();
  userEvent.click(screen.getByRole("button", { name: "Open inner" }));
  const first = screen.getByRole("button", { name: "Inner first" });
  const last = screen.getByRole("button", { name: "Inner last" });
  expect(first).toHaveFocus();
  userEvent.tab({ shift: true });
  expect(last).toHaveFocus();
  userEvent.tab();
  expect(first).toHaveFocus();
  screen.getByRole("button", { name: "Outside" }).focus();
  expect(first).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(innerClose).toHaveBeenCalledTimes(1);
  expect(outerClose).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Open inner" })).toHaveFocus();
  expect(document.documentElement.style.overflowY).toBe("hidden");
  expect(document.body.style.overflowY).toBe("auto");
  screen.getByRole("button", { name: "Outer last" }).focus();
  userEvent.tab();
  expect(screen.getByRole("button", { name: "Outer first" })).toHaveFocus();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(outerClose).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Open outer" })).toHaveFocus();
  expect(document.documentElement.style.overflowY).toBe("scroll");
  expect(document.body.style.overflowY).toBe("auto");
  expect(document.documentElement.scrollTop).toBe(480);
  expect(document.documentElement.scrollLeft).toBe(13);
});

test("a locked inner modal does not let Escape close either modal", () => {
  const innerClose = jest.fn();
  const outerClose = jest.fn();
  render(<NestedDialogs innerClose={innerClose} outerClose={outerClose} innerCanClose={false} />);
  userEvent.click(screen.getByRole("button", { name: "Open outer" }));
  userEvent.click(screen.getByRole("button", { name: "Open inner" }));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(innerClose).not.toHaveBeenCalled();
  expect(outerClose).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Inner first" })).toHaveFocus();
});

test("an empty modal traps focus on the dialog and unmount restores document scrolling", () => {
  const onClose = jest.fn();
  const { unmount } = render(<Dialog name="Empty" open empty onClose={onClose} />);
  expect(screen.getByRole("dialog", { name: "Empty" })).toHaveFocus();
  userEvent.tab();
  expect(screen.getByRole("dialog", { name: "Empty" })).toHaveFocus();
  userEvent.tab({ shift: true });
  expect(screen.getByRole("dialog", { name: "Empty" })).toHaveFocus();
  unmount();
  expect(document.documentElement.style.overflowY).toBe("");
  expect(document.body.style.overflowY).toBe("");
});

test("nested dialogs follow keyboard viewport changes and restore previous styles after closing", () => {
  const previousViewport = window.visualViewport;
  const viewport = new EventTarget();
  viewport.height = 667;
  viewport.offsetTop = 0;
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty("--modal-viewport-height", "600px");
  rootStyle.setProperty("--modal-viewport-top", "2px", "important");
  const view = render(<StrictMode><NestedDialogs innerClose={jest.fn()} outerClose={jest.fn()} /></StrictMode>);
  try {
    userEvent.click(screen.getByRole("button", { name: "Open outer" }));
    userEvent.click(screen.getByRole("button", { name: "Open inner" }));
    viewport.height = 280; viewport.offsetTop = 80;
    viewport.dispatchEvent(new Event("resize"));
    expect(rootStyle.getPropertyValue("--modal-viewport-height")).toBe("280px");
    expect(rootStyle.getPropertyValue("--modal-viewport-top")).toBe("80px");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(rootStyle.getPropertyValue("--modal-viewport-height")).toBe("280px");
    viewport.offsetTop = 100; viewport.dispatchEvent(new Event("scroll"));
    expect(rootStyle.getPropertyValue("--modal-viewport-top")).toBe("100px");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(rootStyle.getPropertyValue("--modal-viewport-height")).toBe("600px");
    expect(rootStyle.getPropertyValue("--modal-viewport-top")).toBe("2px");
    expect(rootStyle.getPropertyPriority("--modal-viewport-top")).toBe("important");
    viewport.height = 150; viewport.dispatchEvent(new Event("resize"));
    expect(rootStyle.getPropertyValue("--modal-viewport-height")).toBe("600px");
  } finally {
    view.unmount();
    rootStyle.removeProperty("--modal-viewport-height");
    rootStyle.removeProperty("--modal-viewport-top");
    Object.defineProperty(window, "visualViewport", { configurable: true, value: previousViewport });
  }
});
