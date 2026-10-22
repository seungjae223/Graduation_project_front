/* eslint-disable testing-library/no-node-access -- Inspect SDK-owned children retained by the provider after React updates. */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GoogleMapBox, KakaoMapBox } from "./RouteResult";
import { importLibrary } from "@googlemaps/js-api-loader";
import { loadKakaoMapsScript } from "../utils/kakaoMapLoader";
import TripMapModal from "./TripMapModal";

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
    this.fitBounds = jest.fn(); this.setBounds = jest.fn(); this.relayout = jest.fn();
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
afterEach(() => { delete window.google; delete window.kakao; delete window.ResizeObserver; delete process.env.REACT_APP_GOOGLE_MAPS_BROWSER_KEY; });

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

test.each(["google", "kakao"])("%s refits all visits after the map container resizes and releases its observer", async provider => {
  const { sdk } = makeSdk();
  window.google = { maps: sdk }; window.kakao = { maps: sdk };
  importLibrary.mockImplementation(async library => ({
    maps: { Map: sdk.Map }, marker: { Marker: sdk.Marker }, geocoding: { Geocoder: sdk.Geocoder },
  }[library]));
  loadKakaoMapsScript.mockResolvedValue(window.kakao);
  let resize;
  const disconnect = jest.fn();
  window.ResizeObserver = jest.fn(callback => {
    resize = callback;
    return { observe: jest.fn(), disconnect };
  });
  const Box = provider === "google" ? GoogleMapBox : KakaoMapBox;
  const view = render(<Box dayData={day} dayIndex={0}/>);
  await waitFor(() => expect(window.ResizeObserver).toHaveBeenCalledTimes(1));
  const map = sdk.Map.mock.instances[0];
  const fit = provider === "google" ? map.fitBounds : map.setBounds;
  const before = fit.mock.calls.length;
  act(() => resize());
  expect(fit).toHaveBeenCalledTimes(before + 1);
  view.unmount();
  expect(disconnect).toHaveBeenCalledTimes(1);
});

test.each([
  ["서울", 37.57, 126.98, "카카오맵", "map.kakao.com"],
  ["오사카", 34.68, 135.52, "구글맵", "www.google.com"],
])("trip map uses the existing SDK for %s and keeps empty days empty", async (destination, lat, lng, label, host) => {
  const { sdk, overlays } = makeSdk();
  window.google = { maps: sdk }; window.kakao = { maps: sdk };
  importLibrary.mockImplementation(async library => ({
    maps: { Map: sdk.Map }, marker: { Marker: sdk.Marker }, geocoding: { Geocoder: sdk.Geocoder },
  }[library]));
  loadKakaoMapsScript.mockResolvedValue(window.kakao);
  const trip = { title: "테스트 여행", destination };
  const days = [
    { day: 1, label: "1일차", dateLabel: "10.26", places: [
      { tripPlaceId: 10, placeName: "첫 장소", latitude: lat, longitude: lng },
      { tripPlaceId: 11, placeName: "두 번째", latitude: lat + .01, longitude: lng + .01 },
    ] },
    { day: 2, label: "2일차", dateLabel: "10.27", places: [] },
  ];
  const close = jest.fn();
  render(<TripMapModal trip={trip} days={days} initialDay={1} owner="account:A:trip1" onClose={close}/>);
  await waitFor(() => expect(sdk.Map).toHaveBeenCalledTimes(1));
  expect(screen.getByRole("region", { name: label + " 일정 지도" })).toBeInTheDocument();
  expect(new URL(screen.getByRole("link", { name: label + "에서 경로 열기 ↗" }).href).hostname).toBe(host);
  expect(loadKakaoMapsScript).toHaveBeenCalledTimes(destination === "서울" ? 1 : 0);
  expect(importLibrary.mock.calls.map(([library]) => library))
    .toEqual(destination === "서울" ? [] : ["maps", "marker", "geocoding"]);
  fireEvent.click(screen.getByRole("button", { name: "2일차 10.27" }));
  expect(screen.getByText("이 일차에는 등록된 장소가 없어요.")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /에서 경로 열기/ })).not.toBeInTheDocument();
  expect(sdk.Map).toHaveBeenCalledTimes(1);
  overlays.forEach(overlay => expect(overlay.setMap).toHaveBeenCalledWith(null));
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalledTimes(1);
});
