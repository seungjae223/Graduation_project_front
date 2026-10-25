import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import Header from "./Header";
import { deleteTripApi } from "../api/tripApi";
import { navigateWithOnboardingTransition } from "../OnBoarding/onboardingTransition";
jest.mock("../api/tripApi", () => ({ deleteTripApi: jest.fn() }));
jest.mock("html2pdf.js", () => jest.fn());
jest.mock("../OnBoarding/onboardingTransition", () => ({ navigateWithOnboardingTransition: jest.fn() }));
const Harness = () => {
  const navigate = useNavigate();
  const location = useLocation();
  return <><Header /><button onClick={() => navigate("/home")}>테스트 이탈</button><Routes>
    <Route path="/my-schedule" element={<><p>서버 일정 목록</p>{location.state?.deleteSuccess && <p>삭제 성공 안내</p>}</>} /><Route path="/home" element={<p>실제 홈</p>} /><Route path="*" element={<p>현재 화면</p>} />
  </Routes></>;
};
const setup = (path = "/route-result?id=7") => render(<MemoryRouter initialEntries={[path]}><Harness /></MemoryRouter>);
beforeEach(() => jest.clearAllMocks());
test("V16.4 detail header shows an itinerary title and no permanent-delete icon", () => {
  setup();
  expect(screen.getByRole("heading", { name: "여행 일정" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "뒤로 가기" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "일정 삭제" })).not.toBeInTheDocument();
  expect(deleteTripApi).not.toHaveBeenCalled();
});
test.each(["/", "/onboarding", "/onboarding2"])("Skip from %s opens the actual home", async path => {
  setup(path); fireEvent.click(screen.getByRole("button", { name: "Skip" })); expect(await screen.findByText("실제 홈")).toBeInTheDocument();
});
test("direct onboarding 3 uses the previous onboarding page when there is no history", () => {
  window.history.replaceState({}, "", "/"); setup("/onboarding3"); fireEvent.click(screen.getByRole("button", { name: "뒤로 가기" }));
  expect(navigateWithOnboardingTransition).toHaveBeenCalledWith(expect.any(Function), "/onboarding2", "backward");
});


test.each(["/search", "/recommend", "/schedule", "/mypage"])("top-level tab %s does not show a back button", path => {
  setup(path);
  expect(screen.queryByRole("button", { name: "뒤로 가기" })).not.toBeInTheDocument();
});

test.each(["/route-create", "/route-result?id=7", "/detail?id=1"])("subpage %s keeps a back button", path => {
  setup(path);
  expect(screen.getByRole("button", { name: "뒤로 가기" })).toBeInTheDocument();
});

test("both V16 creation steps keep the same itinerary-creation header",()=>{
  const { unmount: firstUnmount }=setup("/route-create");
  expect(screen.getByRole("heading",{name:"일정 만들기"})).toBeInTheDocument();
  firstUnmount();
  setup("/route-create/region");
  expect(screen.getByRole("heading",{name:"일정 만들기"})).toBeInTheDocument();
});
