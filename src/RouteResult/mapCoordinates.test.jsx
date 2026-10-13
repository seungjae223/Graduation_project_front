/* eslint-disable testing-library/no-node-access -- Inspect the actual hidden PDF map payload, not a CSS string. */
import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import RouteResult, { buildKakaoMapsRouteUrl, DetailSection } from "./RouteResult";
import useResolvedMapCoordinates, { coordinateDayKey } from "./useResolvedMapCoordinates";
import { getTripByIdApi, getTripPlacesApi, getTripTimelineApi } from "../api/tripApi";
import { loadKakaoMapsScript } from "../utils/kakaoMapLoader";
jest.mock("../api/tripApi", () => ({ getTripByIdApi: jest.fn(), getTripPlacesApi: jest.fn(), getTripTimelineApi: jest.fn() }));
jest.mock("../utils/kakaoMapLoader", () => ({ loadKakaoMapsScript: jest.fn() }));
const day = { label: "1일차", items: [{ id: 91, tripPlaceId: 91, title: "동일 이름", address: "서울 주소" }] };
beforeEach(() => jest.clearAllMocks());
test("a single place keeps its exact server coordinate instead of falling back to its name", () => {
  const first = buildKakaoMapsRouteUrl({ items: [{ title: "동일 이름", latitude: 37.5, longitude: 127 }] });
  const second = buildKakaoMapsRouteUrl({ items: [{ title: "동일 이름", latitude: 35.1, longitude: 129 }] });
  expect(first).toContain(",37.5,127"); expect(second).toContain(",35.1,129"); expect(first).not.toBe(second);
});
test("resolved coordinates reject obsolete owners, dates and visits while retaining visit identity after reordering", () => {
  const { result, rerender } = renderHook(({ owner, days }) => useResolvedMapCoordinates(owner, days), { initialProps: { owner: "account-A:trip-1", days: [day] } });
  const old = { owner: "account-A:trip-1", dayIndex: 0, key: coordinateDayKey(day, 0), points: [{ visitKey: "91", lat: 37.5, lng: 127 }] };
  act(() => result.current.publish(old)); expect(result.current.days[0].items[0].lat).toBe(37.5);
  rerender({ owner: "account-B:trip-2", days: [day] }); act(() => result.current.publish(old)); expect(result.current.days[0].items[0].lat).toBeUndefined();
  act(() => result.current.publish({ ...old, owner: "account-B:trip-2", points: [{ visitKey: "999", lat: 1, lng: 1 }] })); expect(result.current.days[0].items[0].lat).toBeUndefined();
  const changed = { ...day, items: [{ ...day.items[0], address: "부산 주소" }] }; rerender({ owner: "account-B:trip-2", days: [changed] });
  act(() => result.current.publish({ ...old, owner: "account-B:trip-2" })); expect(result.current.days[0].items[0].lat).toBeUndefined();
});
test("map buttons expose independent keyboard actions and preserve the drag handle", async () => {
  const openMap = jest.fn(); render(<DetailSection day={day} dayIndex={0} mapProvider="kakao" onOpenPlaceMap={openMap} />);
  const action = screen.getByRole("button", { name: "동일 이름 카카오맵에서 열기" }); action.focus(); userEvent.keyboard("{Enter}"); expect(openMap).toHaveBeenCalledTimes(1);
  userEvent.keyboard(" "); expect(openMap).toHaveBeenCalledTimes(2);
});
test("coordinate association follows stable visits when the order changes", () => {
  const second = { id: 92, tripPlaceId: 92, title: "두 번째 장소", address: "부산 주소" };
  const original = { ...day, items: [...day.items, second] };
  const { result, rerender } = renderHook(({ days }) => useResolvedMapCoordinates("trip-1", days), { initialProps: { days: [original] } });
  act(() => result.current.publish({ owner: "trip-1", dayIndex: 0, key: coordinateDayKey(original, 0), points: [{ visitKey: "91", lat: 37.5, lng: 127 }, { visitKey: "92", lat: 35.1, lng: 129 }] }));
  rerender({ days: [{ ...day, items: [second, ...day.items] }] });
  expect(result.current.days[0].items.map(item => [item.id, item.lat])).toEqual([[92, 35.1], [91, 37.5]]);
});
test("dynamically resolved coordinates are shared by the real result page and PDF payload", async () => {
  const maps = {
    Map: function () { this.setCenter = jest.fn(); this.setLevel = jest.fn(); this.setBounds = jest.fn(); },
    LatLng: function (lat, lng) { this.lat = lat; this.lng = lng; },
    LatLngBounds: function () { this.extend = jest.fn(); },
    Marker: function () { this.setMap = jest.fn(); },
    Polyline: function () { this.setMap = jest.fn(); this.setZIndex = jest.fn(); },
    services: { Status: { OK: "OK" }, Places: function () { this.keywordSearch = (_, callback) => callback([{ y: "37.5", x: "127" }], "OK"); }, Geocoder: function () {} },
    event: { addListener: jest.fn(), removeListener: jest.fn(), trigger: jest.fn() },
  };
  loadKakaoMapsScript.mockResolvedValue({ maps });
  getTripByIdApi.mockResolvedValue({ id: 7, startDate: "2026-10-12", endDate: "2026-10-12", mapType: "KAKAO" });
  getTripPlacesApi.mockResolvedValue([{ id: 91, tripPlaceId: 91, placeId: 4, placeName: "새로운 지역 장소", address: "서울 특정 주소", day: 1, visitOrder: 1, latitude: null, longitude: null }]);
  getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:00" }]);
  render(<MemoryRouter initialEntries={["/route-result?id=7"]}><RouteResult /></MemoryRouter>);
  await screen.findByRole("button", { name: "새로운 지역 장소 카카오맵에서 열기" });
  await waitFor(() => {
    const payload = JSON.parse(document.querySelector("[data-pdf-kakao-map]").dataset.pdfKakaoMap);
    expect(payload.markers[0]).toMatchObject({ title: "새로운 지역 장소", lat: 37.5, lng: 127 });
  });
  const open = jest.spyOn(window, "open").mockImplementation(() => {});
  fireEvent.click(screen.getByRole("button", { name: "새로운 지역 장소 카카오맵에서 열기" })); expect(open.mock.calls[0][0]).toContain(",37.5,127"); open.mockRestore();
  expect(screen.getAllByRole("button", { name: "카카오맵에서 경로 열기" })).toHaveLength(1);
});

test("missing server coordinates resolve pure addresses for every day before PDF export and update distances", async () => {
  const addresses = ["서울특별시 종로구 사직로 161", "서울특별시 종로구 계동길 37", "서울특별시 종로구 창경궁로 88", "서울특별시 성동구 뚝섬로 273"];
  const titles = ["경복궁", "북촌한옥마을", "광장시장", "서울숲"];
  const pending = {};
  const sdkPoints = addresses.map((address, index) => ({ lat: 37.6 + index * 0.01, lng: 127.1 + index * 0.01 }));
  const maps = {
    Map: function () { this.setCenter = jest.fn(); this.setLevel = jest.fn(); this.setBounds = jest.fn(); },
    LatLng: function () {}, LatLngBounds: function () { this.extend = jest.fn(); },
    Marker: function () { this.setMap = jest.fn(); }, Polyline: function () { this.setMap = jest.fn(); this.setZIndex = jest.fn(); },
    services: { Status: { OK: "OK" },
      Places: function () { this.keywordSearch = (_, callback) => callback([], "ZERO_RESULT"); },
      Geocoder: function () { this.addressSearch = (address, callback) => { pending[address] = callback; }; } },
    event: { addListener: jest.fn(), removeListener: jest.fn(), trigger: jest.fn() },
  };
  loadKakaoMapsScript.mockResolvedValue({ maps });
  getTripByIdApi.mockResolvedValue({ id: 8, startDate: "2026-10-12", endDate: "2026-10-13", mapType: "KAKAO" });
  getTripPlacesApi.mockResolvedValue(titles.map((title, index) => ({ id: 101 + index, tripPlaceId: 101 + index, placeId: index + 1,
    placeName: title, address: addresses[index], day: Math.floor(index / 2) + 1, visitOrder: index % 2 + 1, latitude: null, longitude: null })));
  getTripTimelineApi.mockResolvedValue([{ visitOrder: 1, arrivalTime: "10:00" }, { visitOrder: 2, arrivalTime: "11:00" }]);
  render(<MemoryRouter initialEntries={["/route-result?id=8"]}><RouteResult /></MemoryRouter>);
  await waitFor(() => expect(Object.keys(pending).sort()).toEqual([...addresses].sort()));
  const page = document.getElementById("route-result-pdf");
  expect(page.dataset.exportReady).toBe("false");
  expect(screen.queryByText("직선거리 0m")).not.toBeInTheDocument();
  expect(screen.queryByText(/^0m$/)).not.toBeInTheDocument();
  await act(async () => addresses.slice(0, 2).forEach((address, index) => pending[address]([{ y: String(sdkPoints[index].lat), x: String(sdkPoints[index].lng) }], "OK")));
  await waitFor(() => expect(JSON.parse(document.querySelector("[data-pdf-kakao-map]").dataset.pdfKakaoMap).markers).toHaveLength(2));
  expect(page.dataset.exportReady).toBe("false");
  expect(JSON.parse(document.querySelectorAll("[data-pdf-kakao-map]")[1].dataset.pdfKakaoMap).markers).toHaveLength(0);
  await act(async () => addresses.slice(2).forEach((address, position) => {
    const point = sdkPoints[position + 2];
    pending[address]([{ y: String(point.lat), x: String(point.lng) }], "OK");
  }));
  await waitFor(() => expect(page.dataset.exportReady).toBe("true"));
  const pdfDays = [...document.querySelectorAll("[data-pdf-kakao-map]")].map(element => JSON.parse(element.dataset.pdfKakaoMap));
  expect(pdfDays.flatMap(data => data.markers.map(marker => ({ lat: marker.lat, lng: marker.lng })))).toEqual(sdkPoints);
  expect(screen.queryByText("직선거리 0m")).not.toBeInTheDocument();
  expect(screen.getAllByText(/직선거리 \d/).length).toBeGreaterThan(0);
});
