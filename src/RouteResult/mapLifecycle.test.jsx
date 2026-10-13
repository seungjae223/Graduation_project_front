/* eslint-disable testing-library/no-node-access -- Inspect SDK-owned children retained by the provider after React updates. */
import { act, render, screen, waitFor } from "@testing-library/react";
import { GoogleMapBox, KakaoMapBox } from "./RouteResult";
import { importLibrary } from "@googlemaps/js-api-loader";
import { loadKakaoMapsScript } from "../utils/kakaoMapLoader";

jest.mock("@googlemaps/js-api-loader", () => ({ setOptions: jest.fn(), importLibrary: jest.fn() }));
jest.mock("../utils/kakaoMapLoader", () => ({ loadKakaoMapsScript: jest.fn() }));
const day = { items: [{ title: "첫 장소", lat: 37.5, lng: 127 }, { title: "두 번째", lat: 37.51, lng: 127.01 }] };
const makeSdk = () => {
  const overlays = [];
  const maps = [];
  const listener = { remove: jest.fn() };
  const Map = jest.fn(function (container) {
    const attribution = document.createElement("span");
    attribution.textContent = "SDK map attribution";
    container.appendChild(attribution);
    this.addListener = jest.fn(() => listener);
    this.fitBounds = jest.fn(); this.setBounds = jest.fn();
    maps.push(this);
  });
  const Overlay = jest.fn(function () { this.setMap = jest.fn(); overlays.push(this); });
  const sdk = { Map, Marker: Overlay, Polyline: Overlay, LatLng: jest.fn(),
    LatLngBounds: jest.fn(() => ({ extend: jest.fn() })), Geocoder: jest.fn(),
    SymbolPath: { CIRCLE: 0 }, event: { addListener: jest.fn(), removeListener: jest.fn(), addListenerOnce: jest.fn(), trigger: jest.fn() },
    services: { Places: jest.fn(), Geocoder: jest.fn() } };
  return { sdk, overlays, maps, listener };
};
beforeEach(() => { jest.clearAllMocks(); process.env.REACT_APP_GOOGLE_MAPS_BROWSER_KEY = "test-key"; });
afterEach(() => { delete window.google; delete window.kakao; delete process.env.REACT_APP_GOOGLE_MAPS_BROWSER_KEY; });

test.each(["google", "kakao"])("%s attaches markers once, retains the map for callback changes, and releases overlays", async provider => {
  const { sdk, overlays, listener } = makeSdk();
  window.google = { maps: sdk }; window.kakao = { maps: sdk };
  importLibrary.mockImplementation(async library => ({
    maps: { Map: sdk.Map }, marker: { Marker: sdk.Marker }, geocoding: { Geocoder: sdk.Geocoder },
  }[library]));
  loadKakaoMapsScript.mockResolvedValue(window.kakao);
  const Box = provider === "google" ? GoogleMapBox : KakaoMapBox;
  const view = render(<Box dayData={day} dayIndex={0} onOpenMap={() => {}} />);
  await waitFor(() => expect(sdk.Map).toHaveBeenCalledTimes(1));
  expect(sdk.Marker).toHaveBeenCalledTimes(3); // Two markers and one polyline use the shared fake constructor.
  view.rerender(<Box dayData={day} dayIndex={0} onOpenMap={() => {}} />);
  await act(async () => { await Promise.resolve(); });
  expect(sdk.Map).toHaveBeenCalledTimes(1);
  view.unmount();
  overlays.forEach(overlay => expect(overlay.setMap).toHaveBeenCalledWith(null));
  const removeListener = provider === "google" ? listener.remove : sdk.event.removeListener;
  expect(removeListener).toHaveBeenCalledTimes(1);
});

test.each(["google", "kakao"])("%s keeps one SDK layer through coordinate publication, memo updates, reorder and reset", async provider => {
  const { sdk } = makeSdk();
  window.google = { maps: sdk }; window.kakao = { maps: sdk };
  importLibrary.mockImplementation(async library => ({
    maps: { Map: sdk.Map }, marker: { Marker: sdk.Marker }, geocoding: { Geocoder: sdk.Geocoder },
  }[library]));
  loadKakaoMapsScript.mockResolvedValue(window.kakao);
  const Box = provider === "google" ? GoogleMapBox : KakaoMapBox;
  const props = { dayIndex: 0, coordinateOwner: "account:A:trip1", onOpenMap: jest.fn() };
  const view = render(<Box {...props} dayData={day} />);
  await waitFor(() => expect(sdk.Map).toHaveBeenCalledTimes(1));
  const published = { ...day, items: day.items.map(item => ({ ...item, latitude: item.lat, longitude: item.lng, memo: "변경된 메모" })) };
  view.rerender(<Box {...props} dayData={published} />);
  await act(async () => { await Promise.resolve(); });
  expect(sdk.Map).toHaveBeenCalledTimes(1);
  view.rerender(<Box {...props} dayData={{ ...published, items: [...published.items].reverse() }} />);
  await act(async () => { await Promise.resolve(); });
  view.rerender(<Box {...props} dayData={day} />);
  await act(async () => { await Promise.resolve(); });
  expect(sdk.Map).toHaveBeenCalledTimes(1);
  expect(screen.getAllByText("SDK map attribution")).toHaveLength(1);
  const host = sdk.Map.mock.calls[0][0];
  view.rerender(<Box {...props} coordinateOwner="account:B:trip2" dayData={day} />);
  await waitFor(() => expect(sdk.Map).toHaveBeenCalledTimes(2));
  expect(screen.getAllByText("SDK map attribution")).toHaveLength(1);
  view.unmount();
  expect(host.childElementCount).toBe(0);
});

test("unmounted Kakao consumer ignores SDK completion", async () => {
  let finish;
  const { sdk } = makeSdk();
  loadKakaoMapsScript.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<KakaoMapBox dayData={day} dayIndex={0} />);
  view.unmount();
  await act(async () => finish({ maps: sdk }));
  expect(sdk.Map).not.toHaveBeenCalled();
});
