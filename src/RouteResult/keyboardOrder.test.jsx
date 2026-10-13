/* eslint-disable testing-library/no-node-access -- dnd-kit measures browser geometry and restores the activator focus. */
import React, { useState } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DetailSection } from "./RouteResult";
import { editDayOrder } from "./temporaryOrder";

const original = { label: "1일차", sectionDistance: "총 직선거리 100m", items: [
  { id: 91, tripPlaceId: 91, title: "첫 방문", time: "10:00", desc: "첫 주소", memo: "첫 메모" },
  { id: 92, tripPlaceId: 92, title: "고정 방문", time: "12:00", fixedTime: "12:00", desc: "둘째 주소", memo: "둘째 메모" },
] };
let geometry;
beforeEach(() => {
  geometry = jest.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function () {
    const items = Array.from(document.querySelectorAll(".route-result-timeline-item"));
    const index = Math.max(0, items.indexOf(this));
    const top = index * 120;
    return { top, bottom: top + 120, left: 0, right: 320, width: 320, height: 120, x: 0, y: top };
  });
});
afterEach(() => geometry.mockRestore());
const key = (target, code) => fireEvent.keyDown(target, { code, key: code === "Space" ? " " : code });
const setup = () => {
  const openMap = jest.fn();
  function Harness() {
    const [day, setDay] = useState(original);
    return <><DetailSection day={day} dayIndex={0} mapProvider="kakao" onOpenPlaceMap={openMap}
      onReorderItems={(_, items) => setDay(editDayOrder(day, items))} />
      <button onClick={() => setDay(original)}>되돌리기</button></>;
  }
  render(<Harness />);
  return openMap;
};

test("real keyboard sensor picks up, moves and drops the same visit without opening a map", async () => {
  const openMap = setup();
  const handle = screen.getByRole("button", { name: "첫 방문 일정 순서 변경" });
  handle.focus(); key(handle, "Space");
  await waitFor(() => expect(handle).toHaveAttribute("aria-pressed", "true"));
  await act(() => new Promise(resolve => setTimeout(resolve, 0))); // KeyboardSensor attaches document listeners on the next task.
  key(handle, "ArrowDown");
  await screen.findByText("첫 방문, 2번째 위치.");
  key(handle, "Space");
  await waitFor(() => expect(screen.getAllByRole("group")[1]).toHaveAccessibleName("첫 방문 카카오맵에서 열기"));
  await waitFor(() => expect(handle).toHaveFocus());
  expect(screen.getAllByRole("group")[1]).toHaveTextContent("첫 메모");
  expect(screen.getAllByRole("group")[0]).toHaveTextContent("둘째 메모");
  expect(screen.queryByText("10:00")).not.toBeInTheDocument();
  expect(screen.getByText("12:00")).toBeInTheDocument();
  expect(openMap).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  expect(screen.getAllByRole("group")[0]).toHaveTextContent("첫 메모");
  expect(screen.getByText("10:00")).toBeInTheDocument();
});

test("Enter picks up and Escape cancels without changing order or focus", async () => {
  const openMap = setup();
  const handle = screen.getByRole("button", { name: "첫 방문 일정 순서 변경" });
  handle.focus(); key(handle, "Enter");
  await waitFor(() => expect(handle).toHaveAttribute("aria-pressed", "true"));
  await act(() => new Promise(resolve => setTimeout(resolve, 0))); // KeyboardSensor attaches document listeners on the next task.
  key(handle, "ArrowDown");
  await screen.findByText("첫 방문, 2번째 위치.");
  key(handle, "Escape");
  await screen.findByText("순서 변경을 취소했습니다.");
  await waitFor(() => expect(handle).toHaveFocus());
  expect(screen.getAllByRole("group")[0]).toHaveAccessibleName("첫 방문 카카오맵에서 열기");
  expect(screen.getByText("10:00")).toBeInTheDocument();
  expect(openMap).not.toHaveBeenCalled();
});
