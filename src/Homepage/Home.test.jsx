import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { StrictMode } from "react";
import Home from "./Home";
import { loadKakaoMapsScript } from "../utils/kakaoMapLoader";

jest.mock("../utils/kakaoMapLoader", () => ({ loadKakaoMapsScript: jest.fn() }));
jest.mock("../api/placeApi", () => ({ getRecommendationsApi: jest.fn().mockResolvedValue([]) }));

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

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

function NearbyDestination() {
  const { state } = useLocation();
  return <output data-testid="nearby-destination">{JSON.stringify(state)}</output>;
}

describe("automatic and user location requests", () => {
  let originalGeolocation;
  let originalPermissions;
  let getCurrentPosition;

  beforeEach(() => {
    jest.clearAllMocks();
    originalGeolocation = Object.getOwnPropertyDescriptor(navigator, "geolocation");
    originalPermissions = Object.getOwnPropertyDescriptor(navigator, "permissions");
    localStorage.setItem("locationPermissionAllowed", "true");
    getCurrentPosition = jest.fn();
    Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition } });
    loadKakaoMapsScript.mockResolvedValue({ maps: { services: {
      Status: { OK: "OK" },
      Geocoder: function Geocoder() {
        this.coord2RegionCode = (longitude, latitude, callback) => callback([
          { region_type: "H", region_1depth_name: "서울", region_2depth_name: "성동구", region_3depth_name: "성수동" },
        ], "OK");
      },
    } } });
  });

  afterEach(() => {
    localStorage.removeItem("locationPermissionAllowed");
    localStorage.removeItem("currentLocation");
    localStorage.removeItem("currentLocationLabel");
    if (originalGeolocation) Object.defineProperty(navigator, "geolocation", originalGeolocation);
    else delete navigator.geolocation;
    if (originalPermissions) Object.defineProperty(navigator, "permissions", originalPermissions);
    else delete navigator.permissions;
  });

  const renderHome = (query, strict = false) => {
    Object.defineProperty(navigator, "permissions", { configurable: true, value: { query } });
    const routes = <MemoryRouter initialEntries={["/home"]}><Routes>
      <Route path="/home" element={<Home />} />
      <Route path="/search" element={<NearbyDestination />} />
    </Routes></MemoryRouter>;
    return render(strict ? <StrictMode>{routes}</StrictMode> : routes);
  };

  test.each([false, true])("late automatic permission does not cancel the user's nearby navigation (StrictMode=%s)", async strict => {
    const automatic = [];
    let manual;
    const query = jest.fn(() => {
      const pending = deferred();
      if (manual) manual = pending;
      else automatic.push(pending);
      return pending.promise;
    });
    renderHome(query, strict);
    manual = true;
    fireEvent.click(screen.getByRole("button", { name: /내 주변 탐색/ }));
    await act(async () => manual.resolve({ state: "granted" }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);

    await act(async () => automatic.forEach(pending => pending.resolve({ state: "granted" })));
    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    await act(async () => getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 37.54, longitude: 127.04 } }));

    expect(JSON.parse(screen.getByTestId("nearby-destination").textContent)).toEqual({
      mode: "nearby", currentLocation: { lat: 37.54, lng: 127.04 }, locationLabel: "성동구 성수동",
    });
    expect(loadKakaoMapsScript).toHaveBeenCalledTimes(1);
  });

  test("a user request can supersede an automatic geolocation already in progress", async () => {
    const automatic = deferred();
    const manual = deferred();
    renderHome(jest.fn().mockReturnValueOnce(automatic.promise).mockReturnValueOnce(manual.promise));
    await act(async () => automatic.resolve({ state: "granted" }));
    fireEvent.click(screen.getByRole("button", { name: /내 주변 탐색/ }));
    await act(async () => manual.resolve({ state: "granted" }));
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);

    await act(async () => getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 35, longitude: 129 } }));
    expect(loadKakaoMapsScript).not.toHaveBeenCalled();
    expect(screen.queryByTestId("nearby-destination")).not.toBeInTheDocument();
    await act(async () => getCurrentPosition.mock.calls[1][0]({ coords: { latitude: 37.54, longitude: 127.04 } }));
    expect(JSON.parse(screen.getByTestId("nearby-destination").textContent).currentLocation).toEqual({ lat: 37.54, lng: 127.04 });
  });

  test("automatic location still updates Home without navigating", async () => {
    renderHome(jest.fn().mockResolvedValue({ state: "granted" }));
    await waitFor(() => expect(getCurrentPosition).toHaveBeenCalledTimes(1));
    await act(async () => getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 37.54, longitude: 127.04 } }));
    expect(screen.getByRole("button", { name: /현재 위치: 성동구 성수동/ })).toBeInTheDocument();
    expect(screen.queryByTestId("nearby-destination")).not.toBeInTheDocument();
  });
});
