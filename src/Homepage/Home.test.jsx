import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";
import { loadKakaoMapsScript } from "../utils/kakaoMapLoader";

jest.mock("../utils/kakaoMapLoader", () => ({ loadKakaoMapsScript: jest.fn() }));

test("leaving Home prevents late location lookup and SDK loading", async () => {
  const original = navigator.geolocation;
  const permissions = navigator.permissions;
  localStorage.setItem("locationPermissionAllowed", "true");
  let success;
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: jest.fn(callback => { success = callback; }) } });
  Object.defineProperty(navigator, "permissions", { configurable: true, value: { query: jest.fn().mockResolvedValue({ state: "granted" }) } });
  const view = render(<MemoryRouter><Home /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /내 주변 탐색/ }));
  await waitFor(() => expect(navigator.geolocation.getCurrentPosition).toHaveBeenCalled());
  view.unmount();
  await act(async () => success({ coords: { latitude: 37, longitude: 127 } }));
  expect(loadKakaoMapsScript).not.toHaveBeenCalled();
  localStorage.removeItem("locationPermissionAllowed");
  Object.defineProperty(navigator, "geolocation", { configurable: true, value: original });
  Object.defineProperty(navigator, "permissions", { configurable: true, value: permissions });
});
