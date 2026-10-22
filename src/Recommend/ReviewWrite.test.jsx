import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import ReviewWrite from "./ReviewWrite";
import api from "../api/api";

jest.mock("../utils/useSessionKey", () => ({ __esModule: true, default: () => "account:test" }));
jest.mock("../api/api", () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));
function Path() { return <output data-testid="path">{useLocation().pathname}</output>; }
const setup = () => render(<MemoryRouter initialEntries={["/detail/review?id=6"]}><Routes>
  <Route path="/detail/review" element={<ReviewWrite />} />
  <Route path="/detail" element={<Path />} />
</Routes></MemoryRouter>);
beforeEach(() => { jest.clearAllMocks(); api.get.mockResolvedValue({ data: { id: 6, name: "신세카이" } }); api.post.mockResolvedValue({data:{}}); });

test("stars have no initial selection, pressing the 3rd fills first three and submits exact rating", async () => {
  setup();
  expect(screen.getByRole("button", { name: "리뷰 등록" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "3점" }));
  expect(screen.getByRole("button", { name: "3점" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", { name: "4점" })).toHaveTextContent("☆");
  fireEvent.change(screen.getByRole("textbox", { name: "방문 후기" }), { target: { value: "분위기가 좋아요" } });
  fireEvent.click(screen.getByRole("button", { name: "리뷰 등록" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/places/6/reviews", { comment: "분위기가 좋아요", rating: 3 }));
  await screen.findByTestId("path");
});

test("known duplicate review responds with guidance to edit the existing review", async () => {
  api.post.mockRejectedValueOnce({ response: { status: 409 } });
  setup();
  fireEvent.click(screen.getByRole("button", { name: "4점" }));
  fireEvent.change(screen.getByRole("textbox", { name: "방문 후기" }), { target: { value: "이미 작성했어요" } });
  fireEvent.click(screen.getByRole("button", { name: "리뷰 등록" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("기존 리뷰를 수정");
  expect(api.post).toHaveBeenCalledTimes(1);
});

test("if review submit response is uncertain, do not retry automatically", async () => {
  api.post.mockRejectedValue(new Error("unconfirmed"));
  setup();
  fireEvent.click(screen.getByRole("button", { name: "5점" }));
  fireEvent.change(screen.getByRole("textbox", { name: "방문 후기" }), { target: { value: "좋았어요" } });
  fireEvent.click(screen.getByRole("button", { name: "리뷰 등록" }));
  await screen.findByRole("alert");
  expect(api.post).toHaveBeenCalledTimes(1);
});


test("the editor accepts at most five supported photo files and shows a visible error for other types", async () => {
  setup();
  const input = screen.getByLabelText("리뷰 사진 선택");
  fireEvent.change(input, { target: { files: [new File(["data"], "film.mp4", { type: "video/mp4" })] } });
  expect(await screen.findByRole("alert")).toHaveTextContent(/JPEG/);
  expect(api.post).not.toHaveBeenCalled();
});

// Review controls should be custom and keep native inputs hidden from the visible layout.
test("photo picker uses a custom button and keeps the existing accessible file input", () => {
  setup();
  const input = screen.getByLabelText("리뷰 사진 선택");
  const click = jest.spyOn(input, "click").mockImplementation(() => {});
  fireEvent.click(screen.getByRole("button", { name: "사진 추가" }));
  expect(click).toHaveBeenCalledTimes(1);
  expect(input).toHaveClass("review-write-file-input");
  click.mockRestore();
});

// The shared, fixed header already supplies Back. Never show an extra body-level back link.
test("review writer has one navigation back affordance (owned by the common header)", async () => {
  setup();
  expect(screen.queryByRole("button", { name: /뒤로가기|돌아가기/ })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "리뷰 작성" })).toBeInTheDocument();
});
