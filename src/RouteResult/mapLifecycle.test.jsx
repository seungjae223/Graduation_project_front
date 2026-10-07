import { act, render, waitFor } from "@testing-library/react";
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
  const Map = jest.fn(function () {
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

test("unmounted Kakao consumer ignores SDK completion", async () => {
  let finish;
  const { sdk } = makeSdk();
  loadKakaoMapsScript.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const view = render(<KakaoMapBox dayData={day} dayIndex={0} />);
  view.unmount();
  await act(async () => finish({ maps: sdk }));
  expect(sdk.Map).not.toHaveBeenCalled();
});
