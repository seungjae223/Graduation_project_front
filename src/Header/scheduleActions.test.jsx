import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useNavigate } from "react-router-dom";
import Header from "./Header";
import { deleteTripApi } from "../api/tripApi";
import { navigateWithOnboardingTransition } from "../OnBoarding/onboardingTransition";
jest.mock("../api/tripApi", () => ({ deleteTripApi: jest.fn() }));
jest.mock("html2pdf.js", () => jest.fn());
jest.mock("../OnBoarding/onboardingTransition", () => ({ navigateWithOnboardingTransition: jest.fn() }));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const Harness = () => {
  const navigate = useNavigate();
  return <><Header /><button onClick={() => navigate("/home")}>테스트 이탈</button><Routes>
    <Route path="/my-schedule" element={<p>서버 일정 목록</p>} /><Route path="/home" element={<p>실제 홈</p>} /><Route path="*" element={<p>현재 화면</p>} />
  </Routes></>;
};
const setup = (path = "/route-result?id=7") => render(<MemoryRouter initialEntries={[path]}><Harness /></MemoryRouter>);
beforeEach(() => jest.clearAllMocks());
test("cancel does not delete; repeated confirm sends one server deletion then opens the list", async () => {
  const pending = deferred(); deleteTripApi.mockReturnValue(pending.promise); setup();
  fireEvent.click(screen.getByRole("button", { name: "일정 삭제" })); fireEvent.click(screen.getByRole("button", { name: "취소" })); expect(deleteTripApi).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "일정 삭제" })); const confirm = screen.getByRole("button", { name: "삭제하기" });
  fireEvent.click(confirm); fireEvent.click(confirm); expect(deleteTripApi).toHaveBeenCalledTimes(1); expect(deleteTripApi).toHaveBeenCalledWith("7");
  expect(screen.getByRole("button", { name: "삭제 중..." })).toBeDisabled(); expect(screen.queryByText("서버 일정 목록")).not.toBeInTheDocument();
  await act(async () => pending.resolve({})); expect(await screen.findByText("서버 일정 목록")).toBeInTheDocument();
});
test("an uncertain response keeps deletion unconfirmed and offers a read-only list, never resends", async () => {
  deleteTripApi.mockRejectedValue(new Error("response lost")); setup(); fireEvent.click(screen.getByRole("button", { name: "일정 삭제" })); fireEvent.click(screen.getByRole("button", { name: "삭제하기" }));
  const check = await screen.findByRole("button", { name: "일정 목록에서 확인" }); expect(screen.queryByText("삭제되었습니다")).not.toBeInTheDocument();
  fireEvent.click(check); expect(await screen.findByText("서버 일정 목록")).toBeInTheDocument(); expect(deleteTripApi).toHaveBeenCalledTimes(1);
});
test("the late deletion response does not navigate away from a newer page", async () => {
  const pending = deferred(); deleteTripApi.mockReturnValue(pending.promise); setup(); fireEvent.click(screen.getByRole("button", { name: "일정 삭제" })); fireEvent.click(screen.getByRole("button", { name: "삭제하기" }));
  fireEvent.click(screen.getByRole("button", { name: "테스트 이탈" })); await act(async () => pending.resolve({}));
  expect(screen.getByText("실제 홈")).toBeInTheDocument(); expect(screen.queryByText("서버 일정 목록")).not.toBeInTheDocument();
});
test.each(["/", "/onboarding", "/onboarding2"])("Skip from %s opens the actual home", async path => {
  setup(path); fireEvent.click(screen.getByRole("button", { name: "Skip" })); expect(await screen.findByText("실제 홈")).toBeInTheDocument();
});
test("direct onboarding 3 uses the previous onboarding page when there is no history", () => {
  window.history.replaceState({}, "", "/"); setup("/onboarding3"); fireEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));
  expect(navigateWithOnboardingTransition).toHaveBeenCalledWith(expect.any(Function), "/onboarding2", "backward");
});
