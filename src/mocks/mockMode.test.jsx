import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import api, { getAccessToken } from "../api/api";
import { loginApi, logoutApi, signupApi, getSocialAuthorizationApi, sendEmailCodeApi, verifyEmailCodeApi } from "../api/authApi";
import { searchPlacesApi, getRecommendationsApi, createFolderApi, getFolderPlacesApi,
  savePlaceToFolderApi, removePlaceFromFolderApi, getReviewsApi, createReviewApi,
  getRecentPlacesApi, getRecentSearchesApi, deleteRecentSearchApi, clearRecentSearchesApi,
  createPlaceApi, deletePlaceApi, getPlaceApi, getPlacesApi } from "../api/placeApi";
import { createTripApi, updateTripApi, deleteTripApi, getTripByIdApi, getTripsApi,
  getTripPlacesApi, getTripTimelineApi, addPlaceToTripApi, setTripStartPlaceApi,
  updateTripPlaceScheduleApi, updateTripPlaceMemoApi, optimizeTripDayApi } from "../api/tripApi";
import { saveRouteToServer } from "../RouteCreate/RouteCreate";
import { getAuthSnapshot, notifyAuthChange } from "../utils/authState";
import { MOCK_SESSION_KEY, getMockUser } from "./authMock";
import { resetMockData } from "./mockAdapter";

jest.mock("../config/mockConfig", () => ({ USE_MOCK: true }));

let network;
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); resetMockData(); notifyAuthChange();
  window.matchMedia = jest.fn().mockReturnValue({ matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn() });
  network = jest.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => { throw new Error("Unexpected network request"); });
});
afterEach(() => { expect(network).not.toHaveBeenCalled(); network.mockRestore(); });

test.each([true, false])("email login survives remount with isolated credentials (keepLogin=%s)", async keepLogin => {
  localStorage.setItem("accessToken", "existing-real-token");
  localStorage.setItem("currentUser", JSON.stringify({ email: "real@example.com", name: "실제 사용자" }));
  await loginApi({ email: "test@example.com", password: "any-password", keepLogin });
  expect(getAccessToken()).toMatch(/^mock\./);
  expect((keepLogin ? localStorage : sessionStorage).getItem(MOCK_SESSION_KEY)).toBeTruthy();
  expect((keepLogin ? sessionStorage : localStorage).getItem(MOCK_SESSION_KEY)).toBeNull();
  window.history.replaceState({}, "", "/mypage");
  const view = render(<App />);
  expect(await screen.findByRole("heading", { name: /테스트 사용자/ })).toBeInTheDocument();
  view.unmount();
  render(<App />);
  expect(await screen.findByRole("heading", { name: /테스트 사용자/ })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/mypage");
  expect(localStorage.getItem("accessToken")).toBe("existing-real-token");
  expect(JSON.parse(localStorage.getItem("currentUser")).email).toBe("real@example.com");
  act(() => logoutApi());
  await screen.findByLabelText("이메일");
  expect(getAccessToken()).toBeNull();
  expect(getAuthSnapshot().authenticated).toBe(false);
  expect(localStorage.getItem("accessToken")).toBe("existing-real-token");
});

test.each(["구글 로그인", "카카오 로그인"])("%s uses existing return route without OAuth navigation", async button => {
  window.history.replaceState({}, "", "/login?returnTo=%2Fmy-schedule");
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: button }));
  expect(await screen.findByText("서울 주말 여행")).toBeInTheDocument();
  expect(window.location.pathname).toBe("/my-schedule");
  expect(sessionStorage.getItem("oauth_state_google")).toBeNull();
  expect(sessionStorage.getItem("oauth_state_kakao")).toBeNull();
  expect(getMockUser().email).toBe("test@example.com");
});

test("email form logs in and logout returns to login", async () => {
  window.history.replaceState({}, "", "/login?returnTo=%2Fmypage");
  render(<App />);
  fireEvent.change(await screen.findByLabelText("이메일"), { target: { value: "test@example.com" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인", exact: true }));
  expect(await screen.findByRole("heading", { name: /테스트 사용자/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /로그아웃/ }));
  expect(await screen.findByLabelText("이메일")).toBeInTheDocument();
  expect(getAccessToken()).toBeNull();
});

test("signup and email verification retain registered nickname", async () => {
  await sendEmailCodeApi("new@example.com");
  expect(await verifyEmailCodeApi({ email: "new@example.com", code: "123456" })).toMatchObject({ verified: true });
  await signupApi({ email: "new@example.com", nickname: "새 여행자", password: "password" });
  await loginApi({ email: "new@example.com", password: "password" });
  expect(getMockUser().nickname).toBe("새 여행자");
  expect(localStorage.getItem("accessToken")).toBeNull();
  await expect(getSocialAuthorizationApi("unknown")).rejects.toThrow();
});

test("signup form enables submission after verification, matching password and policy agreement", async () => {
  const alert = jest.spyOn(window, "alert").mockImplementation(() => {});
  window.history.replaceState({}, "", "/signup");
  render(<App />);
  await userEvent.type(await screen.findByLabelText("이름"), "가입 여행자");
  await userEvent.type(screen.getByLabelText("이메일 (아이디)"), "signup@example.com");
  userEvent.click(screen.getByRole("button", { name: "인증번호 발송" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "인증 확인" })).toBeEnabled());
  await userEvent.type(screen.getByLabelText("이메일 인증번호"), "123456");
  userEvent.click(screen.getByRole("button", { name: "인증 확인" }));
  await screen.findByText("이메일 인증이 완료되었습니다.");
  await userEvent.type(screen.getByLabelText("비밀번호", { exact: true }), "Traveltest!1");
  await userEvent.type(screen.getByLabelText("비밀번호 확인", { exact: true }), "Traveltest!1");
  const submit = screen.getByRole("button", { name: "회원가입 하기" });
  expect(submit).toBeDisabled();
  userEvent.click(screen.getByRole("checkbox"));
  userEvent.click(await screen.findByRole("button", { name: "확인하고 동의하기" }));
  expect(screen.getByRole("checkbox")).toBeChecked();
  expect(submit).toBeEnabled();
  userEvent.click(submit);
  expect(await screen.findByRole("dialog", { name: "알림" })).toHaveTextContent("회원가입이 완료되었습니다!");
  alert.mockRestore();
});

test("search, recommendations, detail and reviews use existing response contracts", async () => {
  expect((await searchPlacesApi("  경복궁 "))[0]).toMatchObject({ id: 1, latitude: expect.any(Number), longitude: expect.any(Number) });
  expect(await searchPlacesApi("일치하지않는검색어")).toEqual([]);
  expect((await getRecommendationsApi({ theme: "healing", region: "제주" }))[0].name).toBe("사려니숲길");
  await loginApi({ email: "test@example.com", password: "password" });
  const oldCount = (await getReviewsApi(1)).length;
  await createReviewApi({ placeId: 1, comment: "다시 방문하고 싶어요", rating: 5 });
  expect(await getReviewsApi(1)).toHaveLength(oldCount + 1);
  expect((await getPlaceApi(1)).reviewCount).toBe(oldCount + 1);
  await api.post("/api/recent-places", { placeId: 4 });
  expect((await getRecentPlacesApi())[0].id).toBe(4);
  const recent = await getRecentSearchesApi();
  await deleteRecentSearchApi(recent[0].id);
  expect(await getRecentSearchesApi()).toHaveLength(recent.length - 1);
  await clearRecentSearchesApi();
  expect(await getRecentSearchesApi()).toEqual([]);
  const place = await createPlaceApi({ name: "새 장소", tags: [], address: "서울", latitude: 37, longitude: 127 });
  expect((await getPlaceApi(place.id)).name).toBe("새 장소");
  await deletePlaceApi(place.id);
});

test("Mock ON: unauthenticated place list, search and detail share Mock data without a backend", async () => {
  const places = await getPlacesApi();
  expect(places.length).toBeGreaterThan(0);
  const palace = places.find(place => place.name === "경복궁");
  expect(palace).toMatchObject({ id: 1 });
  expect((await searchPlacesApi("경복궁"))[0].id).toBe(palace.id);
  expect(await getPlaceApi(palace.id)).toMatchObject({ id: palace.id, name: palace.name });
  expect(getAccessToken()).toBeNull();
});

test("folder creation and save/remove are reflected on the next read", async () => {
  const folder = await createFolderApi("새 여행 폴더");
  await savePlaceToFolderApi({ folderId: folder.id, placeId: 1 });
  await savePlaceToFolderApi({ folderId: folder.id, placeId: 1 });
  expect(await getFolderPlacesApi(folder.id)).toHaveLength(1);
  await removePlaceFromFolderApi({ folderId: folder.id, placeId: 1 });
  expect(await getFolderPlacesApi(folder.id)).toEqual([]);
});

test("trip CRUD, start, fixed time, memo and timeline stay consistent", async () => {
  const trip = await createTripApi({ title: "새 일정", startDate: "2026-10-25", endDate: "2026-10-26" });
  const first = await addPlaceToTripApi({ tripId: trip.id, placeId: 1, day: 1, visitOrder: 1 });
  const second = await addPlaceToTripApi({ tripId: trip.id, placeId: 4, day: 1, visitOrder: 2 });
  await setTripStartPlaceApi({ tripId: trip.id, day: 1, tripPlaceId: second.id });
  await updateTripPlaceScheduleApi({ tripId: trip.id, day: 1, tripPlaceId: first.id, schedule: { fixed: true, arrivalTime: "13:30", stayDuration: 45 } });
  await updateTripPlaceMemoApi({ tripId: trip.id, day: 1, tripPlaceId: first.id, memo: "예약 확인" });
  const optimized = await optimizeTripDayApi({ tripId: trip.id, day: 1 });
  expect(optimized[0].id).toBe(second.id);
  expect(optimized[1]).toMatchObject({ id: first.id, arrivalTime: "13:30", departureTime: "14:15", memo: "예약 확인", isFixed: true });
  const timeline = await getTripTimelineApi({ tripId: trip.id, day: 1 });
  expect(timeline[1]).toMatchObject({ visitOrder: 2, arrivalTime: "13:30", stayMinutes: 45 });
  await updateTripApi(trip.id, { ...trip, title: "변경한 일정" });
  expect((await getTripByIdApi(trip.id)).title).toBe("변경한 일정");
  const copy = await getTripPlacesApi(trip.id); copy[0].memo = "외부 변조";
  expect((await getTripPlacesApi(trip.id))[0].memo).not.toBe("외부 변조");
  await deleteTripApi(trip.id);
  expect((await getTripsApi()).some(row => row.id === trip.id)).toBe(false);
});

test("existing route generation flow saves and re-reads a multi-day itinerary", async () => {
  const saved = await saveRouteToServer({ id: "local", title: "생성한 여행", selectedDates: ["2026-10-25", "2026-10-26"], placesByDate: {
    "2026-10-25": [{ id: "start", placeId: 1, name: "경복궁" }, { id: "fixed", placeId: 4, name: "북촌한옥마을", isFixedTime: true, timeLabel: "01:30 PM" }],
    "2026-10-26": [{ id: "next", placeId: 3, name: "서울숲" }],
  } });
  expect((await getTripByIdApi(saved.id)).title).toBe("생성한 여행");
  expect(await getTripPlacesApi(saved.id)).toHaveLength(3);
  expect(await getTripTimelineApi({ tripId: saved.id, day: 2 })).toHaveLength(1);
});

test.each([1, 2])("domestic Mock trip %s renders the Kakao map container without returning a DOM child", async id => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  window.history.replaceState({}, "", `/route-result?id=${id}`);
  render(<App />);
  await screen.findAllByText(id === 1 ? "경복궁" : "사려니숲길");
  // The SDK's empty map container has no accessible role or text to query.
  // eslint-disable-next-line testing-library/no-node-access
  expect(document.querySelector(".route-result-map-section .route-map-real")).toBeInTheDocument();
  expect(log.mock.calls.flat().join(" ")).not.toMatch(/Objects are not valid as a React child|HTMLBodyElement/);
  log.mockRestore();
});

test("inquiry creation and admin reply share the same data", async () => {
  const created = (await api.post("/api/inquiries", { title: "테스트 문의", content: "일정 질문" })).data;
  await api.post(`/api/inquiries/admin/${created.id}/answer`, "답변 내용", { headers: { "Content-Type": "text/plain" } });
  const inquiries = (await api.get("/api/inquiries")).data;
  expect(inquiries.find(row => row.id === created.id)).toMatchObject({ answer: "답변 내용", answered: true });
  expect((await api.get("/api/inquiries/admin")).data).toEqual(inquiries);
});

test("Mock forces its adapter, strips credentials and never falls back for unknown endpoints", async () => {
  const realAdapter = jest.fn();
  const response = await api.get("/api/places", { adapter: realAdapter, headers: { authorization: "Bearer real-secret" } });
  expect(realAdapter).not.toHaveBeenCalled();
  expect(response.config.headers.Authorization).toBeUndefined();
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  const controller = new AbortController(); controller.abort();
  await expect(api.get("/api/places", { signal: controller.signal })).rejects.toMatchObject({ code: "ERR_CANCELED" });
  await expect(api.get("/api/unknown", { adapter: realAdapter })).rejects.toThrow("지원하지 않는 요청");
  log.mockRestore();
  expect(realAdapter).not.toHaveBeenCalled();
});

test("place search and detail pages render the adapter data and review pagination", async () => {
  window.history.replaceState({}, "", "/search?keyword=경복궁");
  const view = render(<App />);
  const input = await screen.findByPlaceholderText("장소, 도시 또는 테마 검색");
  fireEvent.change(input, { target: { value: "경복궁" } });
  userEvent.click(input);
  userEvent.keyboard("{Enter}");
  expect((await screen.findAllByText("경복궁")).length).toBeGreaterThan(0);
  view.unmount();
  window.history.replaceState({}, "", "/detail?id=1");
  render(<App />);
  expect(await screen.findByRole("heading", { name: "경복궁" })).toBeInTheDocument();
  const more = await screen.findByRole("button", { name: "리뷰 더보기" });
  fireEvent.click(more);
  await waitFor(() => expect(screen.queryByRole("button", { name: "리뷰 더보기" })).not.toBeInTheDocument());
});
