import React, { StrictMode } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import useKeyboardRouteFocus from "./useKeyboardRouteFocus";

function RouteFocus({ pathname, navigationType = "PUSH", label = "Page", ready = true, modal = false }) {
  useKeyboardRouteFocus(pathname, navigationType);
  return <>
    <button>Keep focus</button>
    <div className="route-transition" data-page-entry={ready ? "ready" : "pending"}>
      <h1>{label}</h1>
      {modal && <section role="dialog" aria-modal="true"><button>Modal action</button></section>}
    </div>
  </>;
}

const keyboardNavigation = () => fireEvent.keyDown(document, { key: "Enter" });

test("a keyboard PUSH focuses the new title once and leaves later content updates alone", async () => {
  const { rerender } = render(<StrictMode><RouteFocus pathname="/home" label="Home" /></StrictMode>);
  const keep = screen.getByRole("button", { name: "Keep focus" });
  keep.focus();
  keyboardNavigation();
  rerender(<StrictMode><RouteFocus pathname="/search" label="Search" /></StrictMode>);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Search" })).toHaveFocus());
  expect(screen.getByRole("heading", { name: "Search" })).toHaveAttribute("tabindex", "-1");
  keep.focus();
  rerender(<StrictMode><RouteFocus pathname="/search" label="Loaded search" /></StrictMode>);
  expect(keep).toHaveFocus();
});

test("keyboard focus waits for lazy content and ignores a cancelled older entry", async () => {
  const { rerender } = render(<RouteFocus pathname="/home" />);
  screen.getByRole("button", { name: "Keep focus" }).focus();
  keyboardNavigation();
  rerender(<RouteFocus pathname="/search" label="Loading search" ready={false} />);
  expect(screen.getByRole("button", { name: "Keep focus" })).toHaveFocus();
  rerender(<RouteFocus pathname="/recommend" label="Recommend" ready={false} />);
  rerender(<RouteFocus pathname="/recommend" label="Loaded recommendation" />);
  await waitFor(() => expect(screen.getByRole("heading", { name: "Loaded recommendation" })).toHaveFocus());
});

test.each(["POP", "REPLACE", "query", "pointer", "onboarding", "landing"])("%s navigation preserves the existing focus", mode => {
  const { rerender } = render(<RouteFocus pathname="/home" />);
  const keep = screen.getByRole("button", { name: "Keep focus" });
  keep.focus();
  keyboardNavigation();
  if (mode === "pointer") fireEvent.pointerDown(document);
  const pathname = mode === "query" ? "/home" : mode === "onboarding" ? "/onboarding2" : mode === "landing" ? "/" : "/search";
  rerender(<RouteFocus pathname={pathname} navigationType={["POP", "REPLACE"].includes(mode) ? mode : "PUSH"} label="Next" />);
  expect(keep).toHaveFocus();
});

test("an open modal keeps keyboard focus during a route PUSH and after returning from it", async () => {
  const { rerender } = render(<RouteFocus pathname="/home" modal />);
  const modalAction = screen.getByRole("button", { name: "Modal action" });
  modalAction.focus();
  keyboardNavigation();
  rerender(<RouteFocus pathname="/search" modal label="Search" />);
  expect(modalAction).toHaveFocus();
  const keep = screen.getByRole("button", { name: "Keep focus" });
  keep.focus();
  rerender(<RouteFocus pathname="/search" label="Search" />);
  await Promise.resolve();
  expect(keep).toHaveFocus();
});
