import axios from "axios";
import { getMockUser, loginMock, signupMock } from "./authMock";
import { seedPlaces, searchText, themeKey } from "./placeMock";
import { seedReviews } from "./reviewMock";
import { seedSchedules, makeTripPlace, buildTimeline } from "./scheduleMock";
import { seedInquiries } from "./inquiryMock";

let state;
export function resetMockData() {
  const places = seedPlaces();
  state = { places, reviews: seedReviews(places), ...seedSchedules(places),
    folders: [{ id: 1, name: "가고 싶은 서울", placeIds: [1, 3] }, { id: 2, name: "제주 여행", placeIds: [7, 8] }],
    recentSearches: [{ id: 1, keyword: "서울" }, { id: 2, keyword: "제주" }],
    recentPlaceIds: [1, 7, 10], inquiries: seedInquiries() };
}
resetMockData();
const nextId = rows => Math.max(0, ...rows.map(row => Number(row.id))) + 1;
const find = (rows, id) => {
  const row = rows.find(item => String(item.id) === String(id));
  if (!row) throw new Error("요청한 정보를 찾을 수 없습니다.");
  return row;
};
const folderData = folder => ({ id: folder.id, name: folder.name, count: folder.placeIds.length, placeCount: folder.placeIds.length });

function handle(method, path, data, params) {
  if (path === "/api/auth/login" && method === "post") return loginMock(data);
  if (path === "/api/auth/signup" && method === "post") return signupMock(data);
  if (path === "/api/email/send" && method === "post") return { message: "인증번호가 발송되었습니다." };
  // Accept any nonempty code for offline UI development. No email is sent.
  if (path === "/api/email/verify" && method === "post" && String(data?.code || "").trim()) return { verified: true, message: "인증되었습니다." };
  if (path === "/api/mypage/stats" && method === "get") return {
    visitedPlacesCount: state.recentPlaceIds.length,
    savedPlacesCount: new Set(state.folders.flatMap(folder => folder.placeIds)).size,
    reviewsCount: state.reviews.filter(review => review.userId === getMockUser()?.id).length,
  };
  if (path === "/api/recommendations" && method === "get") return state.places.filter(place =>
    (!params.region || searchText(place.region).includes(searchText(params.region))) &&
    (!params.theme || place.theme === themeKey(params.theme)));
  if (path === "/api/places/search" && method === "get") {
    const keyword = String(params.keyword || "").trim();
    if (keyword && !state.recentSearches.some(row => row.keyword === keyword)) {
      state.recentSearches.unshift({ id: nextId(state.recentSearches), keyword });
    }
    return state.places.filter(place => searchText([place.name, place.address, place.region, place.theme, ...(place.tags || [])].join(" ")).includes(searchText(keyword)));
  }
  if (path === "/api/places") {
    if (method === "get") return state.places;
    if (method === "post") {
      const place = { ...data, id: nextId(state.places) };
      state.places.push(place);
      return place;
    }
  }
  let match = path.match(/^\/api\/places\/(\d+)(\/reviews)?$/);
  if (match) {
    const place = find(state.places, match[1]);
    if (match[2]) {
      if (method === "get") return state.reviews.filter(review => review.placeId === place.id);
      if (method === "post") {
        const user = getMockUser();
        const review = { ...data, id: nextId(state.reviews), placeId: place.id, nickname: user?.nickname || "여행자", userId: user?.id, createdAt: new Date().toISOString() };
        state.reviews.push(review);
        const reviews = state.reviews.filter(row => row.placeId === place.id);
        place.reviewCount = reviews.length;
        place.rating = reviews.reduce((sum, row) => sum + row.rating, 0) / reviews.length;
        return review;
      }
    } else {
      if (method === "get") return place;
      if (method === "delete") {
        state.places = state.places.filter(row => row !== place);
        state.folders.forEach(folder => { folder.placeIds = folder.placeIds.filter(id => id !== place.id); });
        return null;
      }
    }
  }
  match = path.match(/^\/api\/recent-searches(?:\/(\d+))?$/);
  if (match) {
    if (method === "get" && !match[1]) return state.recentSearches;
    if (method === "delete") {
      state.recentSearches = match[1] ? state.recentSearches.filter(row => String(row.id) !== match[1]) : [];
      return null;
    }
  }
  if (path === "/api/recent-places") {
    if (method === "get") return state.recentPlaceIds.map(id => state.places.find(place => place.id === id)).filter(Boolean);
    if (method === "post") {
      const place = find(state.places, data.placeId);
      state.recentPlaceIds = [place.id, ...state.recentPlaceIds.filter(id => id !== place.id)].slice(0, 20);
      return place;
    }
  }
  if (path === "/api/folders") {
    if (method === "get") return state.folders.map(folderData);
    if (method === "post") {
      const folder = { id: nextId(state.folders), name: data.name, placeIds: [] };
      state.folders.push(folder);
      return folderData(folder);
    }
  }
  match = path.match(/^\/api\/folders\/(\d+)\/places(?:\/(\d+))?$/);
  if (match) {
    const folder = find(state.folders, match[1]);
    if (!match[2] && method === "get") return folder.placeIds.map(id => find(state.places, id));
    if (match[2] && method === "post") {
      const place = find(state.places, match[2]);
      if (!folder.placeIds.includes(place.id)) folder.placeIds.push(place.id);
      return place;
    }
    if (match[2] && method === "delete") {
      folder.placeIds = folder.placeIds.filter(id => id !== Number(match[2]));
      return null;
    }
  }
  if (path === "/api/trips") {
    if (method === "get") return state.trips;
    if (method === "post") {
      const trip = { ...data, id: nextId(state.trips), createdAt: new Date().toISOString() };
      state.trips.push(trip);
      return trip;
    }
  }
  match = path.match(/^\/api\/trips\/(\d+)(.*)$/);
  if (match) {
    const trip = find(state.trips, match[1]);
    const suffix = match[2];
    if (!suffix) {
      if (method === "get") return trip;
      if (method === "put") { Object.assign(trip, data); return trip; }
      if (method === "delete") {
        state.trips = state.trips.filter(row => row !== trip);
        state.tripPlaces = state.tripPlaces.filter(row => row.tripId !== trip.id);
        return null;
      }
    }
    const all = state.tripPlaces.filter(row => row.tripId === trip.id);
    if (suffix === "/places" && method === "get") return all;
    let part = suffix.match(/^\/places\/(\d+)$/);
    if (part && method === "post") {
      const place = find(state.places, part[1]);
      const tripPlace = makeTripPlace(place, trip.id, nextId(state.tripPlaces), Number(params.day), Number(params.visitOrder));
      state.tripPlaces.push(tripPlace);
      return tripPlace;
    }
    part = suffix.match(/^\/days\/(\d+)\/(places|timeline|optimize)$/);
    if (part) {
      const dayPlaces = all.filter(row => row.day === Number(part[1]));
      if (part[2] === "places" && method === "get") return dayPlaces;
      if (part[2] === "timeline" && method === "get") return buildTimeline(trip, dayPlaces, params.startTime);
      if (part[2] === "optimize" && method === "post") {
        // Deterministic demo ordering: selected start first, then existing order.
        dayPlaces.sort((a, b) => Number(b.isStartPoint) - Number(a.isStartPoint) || a.visitOrder - b.visitOrder);
        dayPlaces.forEach((row, index) => { row.visitOrder = index + 1; });
        const timeline = buildTimeline(trip, dayPlaces, params.startTime);
        dayPlaces.forEach((row, index) => { row.arrivalTime = timeline[index].arrivalTime; row.departureTime = timeline[index].departureTime; });
        return dayPlaces;
      }
    }
    part = suffix.match(/^\/days\/(\d+)\/places\/(\d+)\/(start|schedule|memo)$/);
    if (part) {
      const dayPlaces = all.filter(row => row.day === Number(part[1]));
      const place = find(dayPlaces, part[2]);
      if (part[3] === "start" && method === "post") { dayPlaces.forEach(row => { row.isStartPoint = row === place; }); return place; }
      if (part[3] === "schedule" && method === "patch") {
        Object.assign(place, data, data.fixed === undefined ? {} : { isFixed: data.fixed });
        return place;
      }
      if (part[3] === "memo" && method === "patch") { place.memo = data.memo; return place; }
    }
  }
  if (["/api/inquiries", "/api/inquiries/admin"].includes(path)) {
    if (method === "get") return state.inquiries;
    if (method === "post" && path === "/api/inquiries") {
      const inquiry = { ...data, id: nextId(state.inquiries), userEmail: getMockUser()?.email || "test@example.com", createdAt: new Date().toISOString(), answer: "", answered: false, status: "waiting" };
      state.inquiries.unshift(inquiry);
      return inquiry;
    }
  }
  match = path.match(/^\/api\/inquiries\/admin\/(\d+)\/answer$/);
  if (match && method === "post") {
    const inquiry = find(state.inquiries, match[1]);
    Object.assign(inquiry, { answer: String(data), answered: true, status: "answered" });
    return inquiry;
  }
  // Never fall through to the network, even for an unimplemented endpoint.
  throw new Error(`[Mock API] 지원하지 않는 요청: ${method.toUpperCase()} ${path}`);
}

export async function mockAdapter(config) {
  if (config.signal?.aborted) throw new axios.CanceledError();
  const url = new URL(config.url, config.baseURL || "http://localhost:8080");
  const params = { ...Object.fromEntries(url.searchParams), ...config.params };
  let data = config.data;
  if (typeof data === "string" && config.headers.getContentType?.()?.includes("application/json")) {
    try { data = JSON.parse(data); } catch { /* text/plain answers stay strings */ }
  }
  const result = handle(config.method || "get", url.pathname, data, params);
  return { data: result === undefined ? null : JSON.parse(JSON.stringify(result)), status: 200, statusText: "OK", headers: {}, config };
}
