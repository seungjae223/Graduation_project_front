import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/api";
import "./RouteResult.css";

let mapsConfigured = false;
let kakaoMapsLoadingPromise = null;
const runtimeCoordinateCache = new Map();
const TIMELINE_ITEM_BUTTON_STYLE = { cursor: "pointer" };
const DELETE_ROUTE_EVENT = "route-result-delete-schedule";
const ROUTE_FIXED_TIME_STORAGE_PREFIX = "route_fixed_time_map";
const DEFAULT_ROUTE_START_TIME = "09:00";

const getApiErrorMessage = (error, fallbackMessage) => {
  const data = error?.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.message || data?.error || error?.message || fallbackMessage;
};

const deleteTripById = async (tripId) => {
  if (!tripId) {
    throw new Error("삭제할 일정 정보를 찾지 못했어요.");
  }

  await api.delete(`/api/trips/${tripId}`);
  return true;
};

const getDeleteEventDetail = (event) => {
  if (!event || typeof event !== "object") {
    return {};
  }

  return event.detail && typeof event.detail === "object" ? event.detail : {};
};

const getTripPlaceTargetFromDeleteDetail = (detail = {}) => {
  const place =
    detail.place ||
    detail.item ||
    detail.targetPlace ||
    detail.selectedPlace ||
    detail.tripPlace ||
    {};

  return {
    tripPlaceId:
      detail.tripPlaceId ??
      detail.tripPlace?.id ??
      place.tripPlaceId ??
      place.id ??
      "",
    placeId:
      detail.placeId ??
      detail.place?.id ??
      place.placeId ??
      "",
    day:
      detail.day ??
      detail.dayNumber ??
      place.day ??
      place.dayNumber ??
      "",
  };
};

const isPlaceDeleteDetail = (detail = {}) => {
  const target = getTripPlaceTargetFromDeleteDetail(detail);

  return Boolean(
    detail.type === "place" ||
      detail.deleteType === "place" ||
      detail.mode === "place" ||
      detail.place ||
      detail.item ||
      detail.targetPlace ||
      detail.selectedPlace ||
      target.tripPlaceId ||
      target.placeId,
  );
};


const deleteTripPlaceById = async () => {
  throw new Error(
    "현재 백엔드 Swagger에는 여행 장소 개별 삭제 API가 없습니다. 일정 전체 삭제만 가능합니다."
  );
};

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    {" "}
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />{" "}
    <path
      d="M12 7.5V12.3L15.4 14.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />{" "}
  </svg>
);
const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    {" "}
    <path
      d="M12 20C12 20 6.5 14.9 6.5 10.9C6.5 7.7 9.1 5 12.2 5C15.4 5 18 7.7 18 10.9C18 14.9 12.5 20 12.5 20H12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />{" "}
    <circle
      cx="12.2"
      cy="10.8"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />{" "}
  </svg>
);
const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    {" "}
    <path
      d="M12 8.7A3.3 3.3 0 1 0 12 15.3A3.3 3.3 0 1 0 12 8.7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />{" "}
    <path
      d="M19 12C19 11.5 18.95 11 18.82 10.53L21 8.8L19.2 5.7L16.56 6.5C15.84 5.9 14.99 5.45 14.06 5.21L13.5 2.5H10.5L9.94 5.21C9.01 5.45 8.16 5.9 7.44 6.5L4.8 5.7L3 8.8L5.18 10.53C5.05 11 5 11.5 5 12C5 12.5 5.05 13 5.18 13.47L3 15.2L4.8 18.3L7.44 17.5C8.16 18.1 9.01 18.55 9.94 18.79L10.5 21.5H13.5L14.06 18.79C14.99 18.55 15.84 18.1 16.56 17.5L19.2 18.3L21 15.2L18.82 13.47C18.95 13 19 12.5 19 12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />{" "}
  </svg>
);
const LayersIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    {" "}
    <path
      d="M12 5L19 9L12 13L5 9L12 5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />{" "}
    <path
      d="M5 13L12 17L19 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
    />{" "}
  </svg>
);
const MemoInputIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    {" "}
    <path
      d="M5 7H13.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />{" "}
    <path
      d="M5 12H11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />{" "}
    <path
      d="M15.7 11.2L18.8 14.3L12.7 20.4H9.6V17.3L15.7 11.2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />{" "}
    <path
      d="M17.2 9.7L20.3 12.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />{" "}
  </svg>
);
const MemoSavedIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    {" "}
    <rect
      x="4"
      y="4"
      width="16"
      height="16"
      rx="2.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />{" "}
    <path
      d="M8 9H16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />{" "}
    <path
      d="M8 13H14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />{" "}
    <path
      d="M7 19L10.2 15.8H17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />{" "}
  </svg>
);
const MoreVerticalIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    {" "}
    <circle cx="12" cy="5" r="1.8" fill="currentColor" />{" "}
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />{" "}
    <circle cx="12" cy="19" r="1.8" fill="currentColor" />{" "}
  </svg>
);
const FALLBACK_CENTER = { lat: 37.5665, lng: 126.978 };
const KR = "KR";
const JP = "JP";
const OVERSEAS = "OVERSEAS";
const withCountry = (countryCode, lat, lng) => ({ lat, lng, countryCode });
const PLACE_COORDS = {
  서울역: withCountry(KR, 37.5547, 126.9706),
  남산서울타워: withCountry(KR, 37.5512, 126.9882),
  "명동 거리": withCountry(KR, 37.5636, 126.9827),
  경복궁: withCountry(KR, 37.5796, 126.977),
  북촌한옥마을: withCountry(KR, 37.5826, 126.9831),
  "삼청동 카페 거리": withCountry(KR, 37.582, 126.9816),
  익선동카페거리: withCountry(KR, 37.5743, 126.9895),
  "익선동 카페거리": withCountry(KR, 37.5743, 126.9895),
  창덕궁: withCountry(KR, 37.5794, 126.991),
  광장시장: withCountry(KR, 37.5704, 126.9992),
  한강공원: withCountry(KR, 37.5289, 126.9326),
  성수동카페거리: withCountry(KR, 37.5446, 127.0557),
  "성수동 카페거리": withCountry(KR, 37.5446, 127.0557),
  서울숲: withCountry(KR, 37.5444, 127.0374),
  가평역: withCountry(KR, 37.8184, 127.5091),
  아침고요수목원: withCountry(KR, 37.743, 127.3526),
  남이섬: withCountry(KR, 37.7915, 127.5259),
  잣향기푸른숲: withCountry(KR, 37.8158, 127.3923),
  청평카페거리: withCountry(KR, 37.7362, 127.4175),
  "청평 카페거리": withCountry(KR, 37.7362, 127.4175),
  "서울 복귀": withCountry(KR, 37.5547, 126.9706),
  제주공항: withCountry(KR, 33.5104, 126.4913),
  협재해변: withCountry(KR, 33.3945, 126.2395),
  애월카페거리: withCountry(KR, 33.4621, 126.3097),
  "애월 카페거리": withCountry(KR, 33.4621, 126.3097),
  성산일출봉: withCountry(KR, 33.4589, 126.9425),
  우도: withCountry(KR, 33.5066, 126.9559),
  섭지코지: withCountry(KR, 33.424, 126.9272),
  사려니숲길: withCountry(KR, 33.4225, 126.6265),
  "서귀포 올레시장": withCountry(KR, 33.2501, 126.5654),
  "중문 야경 포인트": withCountry(KR, 33.2488, 126.4122),
  용머리해안: withCountry(KR, 33.2317, 126.3142),
  카멜리아힐: withCountry(KR, 33.2896, 126.3707),
  "제주공항 복귀": withCountry(KR, 33.5104, 126.4913),
  부산역: withCountry(KR, 35.1151, 129.0414),
  자갈치시장: withCountry(KR, 35.0979, 129.0307),
  "광안리 해변": withCountry(KR, 35.1532, 129.1187),
  "해운대 블루라인파크": withCountry(KR, 35.1587, 129.1756),
  "해운대 암소갈비": withCountry(KR, 35.1629, 129.1635),
  "전포 카페거리": withCountry(KR, 35.1578, 129.0675),
  국제시장: withCountry(KR, 35.1028, 129.0285),
  흰여울문화마을: withCountry(KR, 35.0789, 129.0457),
  "부산역 복귀": withCountry(KR, 35.1151, 129.0414),
  교토역: withCountry(JP, 34.9855, 135.7586),
  "후시미 이나리 신사": withCountry(JP, 34.9671, 135.7727),
  기요미즈데라: withCountry(JP, 34.9949, 135.785),
  아라시야마: withCountry(JP, 35.0094, 135.6668),
  "교토 복귀": withCountry(JP, 34.9855, 135.7586),
};

const DEFAULT_RESULT_DAYS = [
  {
    label: "1일차",
    totalDuration: "4시간 30분",
    totalDistance: "12.5km",
    sectionDistance: "총 4.5km 이동",
    items: [
      {
        time: "10:00 AM",
        title: "서울역 (출발)",
        desc: "",
        badge: "지하철/KTX",
        move: "직선거리 2.1km",
        moveType: "distance",
      },
    ],
  },
];

const DEFAULT_OVERSEAS_RESULT_DAYS = [
  {
    label: "1일차",
    totalDuration: "5시간 20분",
    totalDistance: "9.1km",
    sectionDistance: "총 3.4km 이동",
    items: [
      {
        time: "09:00 AM",
        title: "교토역",
        desc: "숙소 출발",
        badge: "출발",
        move: "직선거리 3.1km",
        moveType: "distance",
      },
    ],
  },
];

const normalizeTitle = (title = "") =>
  title.replace(/\s*\([^)]*\)/g, "").trim();
const getMemoKey = (dayIndex, itemIndex, itemTitle = "", item = {}) => {
  const stableId =
    item.tripPlaceId ?? item.id ?? item.placeId ?? item.sourceId ?? "";
  const title = normalizeTitle(
    itemTitle || item.title || item.placeName || item.name || ""
  );

  if (stableId) {
    return `${dayIndex}:id:${stableId}`;
  }

  return `${dayIndex}:title:${title || itemIndex}`;
};
const getLegacyMemoKey = (dayIndex, itemIndex, itemTitle = "") =>
  `${dayIndex}:${itemIndex}:${normalizeTitle(itemTitle)}`;
const getInitialMemoValue = (item = {}) =>
  String(item.memo || item.memoText || item.note || item.notes || "").trim();
const getItemMemoValue = (memoValues = {}, dayIndex, itemIndex, item = {}) => {
  const key = getMemoKey(dayIndex, itemIndex, item.title, item);
  const legacyKey = getLegacyMemoKey(dayIndex, itemIndex, item.title);

  if (Object.prototype.hasOwnProperty.call(memoValues, key)) {
    return memoValues[key];
  }

  if (Object.prototype.hasOwnProperty.call(memoValues, legacyKey)) {
    return memoValues[legacyKey];
  }

  return getInitialMemoValue(item);
};
const getMemoDisplayTitle = (memo = "") =>
  String(memo || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";
const COUNTRY_ALIAS_TO_CODE = {
  KR: KR,
  KOR: KR,
  ROK: KR,
  KOREA: KR,
  "SOUTH KOREA": KR,
  "REPUBLIC OF KOREA": KR,
  "KOREA, REPUBLIC OF": KR,
  "대한민국": KR,
  "한국": KR,
  "남한": KR,
  "국내": KR,
  "제주": KR,
  "제주도": KR,
  "제주특별자치도": KR,
  JEJU: KR,
  "JEJU ISLAND": KR,
  "JEJU-DO": KR,
  SEOUL: KR,
  "서울": KR,
  "서울특별시": KR,
  BUSAN: KR,
  "부산": KR,
  "부산광역시": KR,

  JP: JP,
  JPN: JP,
  JAPAN: JP,
  "일본": JP,
};

const normalizeCountryCode = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalizedRaw = raw.replace(/\s+/g, " ");
  const upper = normalizedRaw.toUpperCase();

  return (
    COUNTRY_ALIAS_TO_CODE[normalizedRaw] ||
    COUNTRY_ALIAS_TO_CODE[upper] ||
    upper
  );
};
const normalizeMapProvider = (value = "") => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (!normalized) return "";
  if (normalized.includes("kakao")) return "kakao";
  if (normalized.includes("google")) return "google";
  return "";
};
const getSourceItemsForDay = (day, dayIndex) => {
  if (day && Array.isArray(day.items)) {
    return day.items;
  }

  const fallbackDay =
    DEFAULT_RESULT_DAYS[dayIndex % DEFAULT_RESULT_DAYS.length] ||
    DEFAULT_RESULT_DAYS[0];

  return fallbackDay.items;
};
const getRuntimeCoordinateCacheKey = (provider, title) =>
  `${provider}:${normalizeTitle(title)}`;
const filterResolvedPointsForMap = (points = []) => {
  return points.filter((point) => {
    const lat = Number(point.lat);
    const lng = Number(point.lng);

    return Number.isFinite(lat) && Number.isFinite(lng);
  });
};
const getPlaceMetaByTitle = (title = "") => {
  const normalized = normalizeTitle(title);
  if (PLACE_COORDS[title]) return PLACE_COORDS[title];
  if (PLACE_COORDS[normalized]) return PLACE_COORDS[normalized];
  const matchedKey = Object.keys(PLACE_COORDS).find(
    (key) => normalized.includes(key) || key.includes(normalized),
  );
  return matchedKey ? PLACE_COORDS[matchedKey] : null;
};
const getCoordByTitle = (title = "") => {
  const meta = getPlaceMetaByTitle(title);
  return meta ? { lat: meta.lat, lng: meta.lng } : null;
};
const getNumberValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  return null;
};
const getCoordFromItem = (item = {}) => {
  const lat = getNumberValue(
    item.lat,
    item.latitude,
    item.y,
    item.placeLat,
    item.placeLatitude,
    item.mapY,
    item.position?.lat,
    item.position?.latitude,
    item.coord?.lat,
    item.coord?.latitude,
    item.coordinate?.lat,
    item.coordinate?.latitude,
  );
  const lng = getNumberValue(
    item.lng,
    item.lon,
    item.longitude,
    item.x,
    item.placeLng,
    item.placeLon,
    item.placeLongitude,
    item.mapX,
    item.position?.lng,
    item.position?.lon,
    item.position?.longitude,
    item.coord?.lng,
    item.coord?.lon,
    item.coord?.longitude,
    item.coordinate?.lng,
    item.coordinate?.lon,
    item.coordinate?.longitude,
  );
  if (lat === null || lng === null) {
    return null;
  }
  return { lat, lng };
};
const getCountryCodeByTitle = (title = "") =>
  getPlaceMetaByTitle(title)?.countryCode || "";
const isCoordinateInKorea = (coord) => {
  const lat = Number(coord?.lat);
  const lng = Number(coord?.lng);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 32.5 &&
    lat <= 39.5 &&
    lng >= 124 &&
    lng <= 132
  );
};

const getMapProviderByCoordinate = (coord = {}) => {
  const lat = Number(coord?.lat ?? coord?.latitude);
  const lng = Number(coord?.lng ?? coord?.lon ?? coord?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  return isCoordinateInKorea({ lat, lng }) ? "kakao" : "google";
};

const getCountryCodeByCoordinate = (coord = {}) => {
  const lat = Number(coord?.lat ?? coord?.latitude);
  const lng = Number(coord?.lng ?? coord?.lon ?? coord?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  return isCoordinateInKorea({ lat, lng }) ? KR : OVERSEAS;
};

const getItemCountryCode = (item = {}) => {
  const coordinateCountryCode = getCountryCodeByCoordinate(getCoordFromItem(item));
  if (coordinateCountryCode) return coordinateCountryCode;

  const titleCountryCode = getCountryCodeByTitle(item.title);
  if (titleCountryCode) return titleCountryCode;

  const directCountryCandidates = [
    item.countryCode,
    item.destinationCountryCode,
    item.travelCountryCode,
    item.country,
    item.countryName,
    item.destinationCountry,
    item.addressCountry,
    item.nationCode,
  ];

  for (const candidate of directCountryCandidates) {
    const code = normalizeCountryCode(candidate);
    if (code) return code;
  }

  return "";
};

const getExplicitMapProviderFromContext = (savedRoute, routeState) => {
  const countryCandidates = [
    savedRoute?.countryCode,
    savedRoute?.destinationCountryCode,
    savedRoute?.travelCountryCode,
    savedRoute?.country,
    savedRoute?.countryName,
    savedRoute?.destinationCountry,
    savedRoute?.destination?.countryCode,
    savedRoute?.destination?.country,
    savedRoute?.destination?.countryName,

    routeState?.countryCode,
    routeState?.destinationCountryCode,
    routeState?.travelCountryCode,
    routeState?.country,
    routeState?.countryName,
    routeState?.destinationCountry,
    routeState?.destination?.countryCode,
    routeState?.destination?.country,
    routeState?.destination?.countryName,
  ];

  for (const candidate of countryCandidates) {
    const code = normalizeCountryCode(candidate);

    if (code) {
      return code === KR ? "kakao" : "google";
    }
  }

  const booleanDomesticCandidates = [
    savedRoute?.isDomestic,
    savedRoute?.domestic,
    routeState?.isDomestic,
    routeState?.domestic,
    savedRoute?.destination?.isDomestic,
    routeState?.destination?.isDomestic,
  ];

  for (const candidate of booleanDomesticCandidates) {
    if (candidate === true) return "kakao";
    if (candidate === false) return "google";
  }

  const providerCandidates = [
    savedRoute?.mapProvider,
    savedRoute?.provider,
    savedRoute?.mapType,
    routeState?.mapProvider,
    routeState?.provider,
    routeState?.mapType,
    savedRoute?.destination?.mapProvider,
    routeState?.destination?.mapProvider,
  ];

  for (const candidate of providerCandidates) {
    const provider = normalizeMapProvider(candidate);
    if (provider) return provider;
  }

  return "";
};

const getMapProviderForDay = (day, dayIndex, tripLevelMapProvider = "") => {
  const sourceItems = getSourceItemsForDay(day, dayIndex);

  // 좌표가 있으면 좌표 기준을 최우선으로 사용합니다.
  // 한국 좌표는 카카오맵, 한국 밖 좌표는 구글맵입니다.
  const coordinateProviders = sourceItems
    .map((item) => getMapProviderByCoordinate(getCoordFromItem(item)))
    .filter(Boolean);

  if (coordinateProviders.includes("google")) {
    return "google";
  }

  if (
    coordinateProviders.length > 0 &&
    coordinateProviders.every((provider) => provider === "kakao")
  ) {
    return "kakao";
  }

  const countryCodes = sourceItems.map(getItemCountryCode).filter(Boolean);

  // 해외 국가 코드가 하나라도 있으면 구글맵을 사용합니다.
  if (countryCodes.some((code) => code !== KR)) {
    return "google";
  }

  // 전부 한국 국가 코드면 카카오맵을 사용합니다.
  if (countryCodes.length > 0 && countryCodes.every((code) => code === KR)) {
    return "kakao";
  }

  const itemLevelProviders = sourceItems
    .map((item) => normalizeMapProvider(item?.mapProvider || item?.provider))
    .filter(Boolean);

  if (itemLevelProviders.includes("google")) return "google";
  if (itemLevelProviders.includes("kakao")) return "kakao";

  if (tripLevelMapProvider) {
    return tripLevelMapProvider;
  }

  return "google";
};
const getCoordinateQueryText = (itemOrCoord = {}) => {
  const coord = getCoordFromItem(itemOrCoord) || itemOrCoord;
  const lat = Number(coord?.lat ?? coord?.latitude);
  const lng = Number(coord?.lng ?? coord?.lon ?? coord?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return "";
  }

  return `${lat},${lng}`;
};

const buildGoogleMapsPlaceUrl = (title = "", itemOrCoord = null) => {
  const coordinateQuery = itemOrCoord ? getCoordinateQueryText(itemOrCoord) : "";
  const query = coordinateQuery || normalizeTitle(title);

  if (!query) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};
const buildGoogleMapsRouteUrl = (day) => {
  const placeQueries = (day?.items || [])
    .map((item) => getCoordinateQueryText(item) || normalizeTitle(item.title))
    .filter(Boolean);

  if (placeQueries.length === 0) return "";

  if (placeQueries.length === 1) {
    return buildGoogleMapsPlaceUrl(placeQueries[0]);
  }

  const origin = placeQueries[0];
  const destination = placeQueries[placeQueries.length - 1];
  const waypoints = placeQueries.slice(1, -1);
  let url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}`;

  if (waypoints.length > 0) {
    url += `&waypoints=${encodeURIComponent(waypoints.join("|"))}`;
  }

  return url;
};
const buildKakaoMapsPlaceUrl = (title = "", itemOrCoord = null) => {
  const name = normalizeTitle(title);
  if (!name) return "";

  const itemCoord = itemOrCoord ? getCoordFromItem(itemOrCoord) || itemOrCoord : null;
  const lat = Number(itemCoord?.lat ?? itemCoord?.latitude);
  const lng = Number(itemCoord?.lng ?? itemCoord?.lon ?? itemCoord?.longitude);

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
  }

  const place = getPlaceMetaByTitle(title);
  if (place) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${place.lat},${place.lng}`;
  }

  return `https://map.kakao.com/link/search/${encodeURIComponent(name)}`;
};
const buildKakaoMapsRouteUrl = (day) => {
  const placeInfos = (day?.items || [])
    .map((item) => {
      const name = normalizeTitle(item.title);
      const itemCoord = getCoordFromItem(item);
      const place = getPlaceMetaByTitle(item.title);
      const coord = itemCoord || place;
      if (!name || !coord) return null;
      return { name, lat: coord.lat, lng: coord.lng };
    })
    .filter(Boolean)
    .slice(0, 7);
  if (placeInfos.length === 0) {
    const firstTitle = normalizeTitle(day?.items?.[0]?.title || "");
    return firstTitle ? buildKakaoMapsPlaceUrl(firstTitle) : "";
  }
  if (placeInfos.length === 1) {
    return buildKakaoMapsPlaceUrl(placeInfos[0].name);
  }
  const movementType = (day?.items || []).every(
    (item, index, array) =>
      index === array.length - 1 || (item.moveType || "walk") === "walk",
  )
    ? "walk"
    : "car";
  const segments = placeInfos.map(
    (place) => `${encodeURIComponent(place.name)},${place.lat},${place.lng}`,
  );
  return `https://map.kakao.com/link/by/${movementType}/${segments.join("/")}`;
};
const isMapUrlForProvider = (url = "", provider = "") => {
  const normalizedUrl = String(url || "").toLowerCase();

  if (!normalizedUrl) return false;
  if (provider === "kakao") return normalizedUrl.includes("kakao.com");
  if (provider === "google") {
    return (
      normalizedUrl.includes("google.") ||
      normalizedUrl.includes("goo.gl/maps") ||
      normalizedUrl.includes("maps.app.goo.gl")
    );
  }

  return true;
};
const buildMapDataFromResolvedPoints = (sourceItems, resolvedPoints) => {
  const filteredPoints = filterResolvedPointsForMap(resolvedPoints);
  if (!filteredPoints.length) {
    return { center: FALLBACK_CENTER, markers: [], lines: [] };
  }
  const colors = ["#22C55E", "#21A0F6", "#A45CFF", "#F59E0B", "#EF4444"];
  const markers = filteredPoints.map((point, index) => ({
    lat: point.lat,
    lng: point.lng,
    title: point.title,
    color: colors[index % colors.length],
  }));
  const lines = [];
  for (let i = 0; i < filteredPoints.length - 1; i += 1) {
    const sourceIndex = filteredPoints[i].sourceIndex ?? i;
    lines.push({
      color: colors[i % colors.length],
      path: [
        { lat: filteredPoints[i].lat, lng: filteredPoints[i].lng },
        { lat: filteredPoints[i + 1].lat, lng: filteredPoints[i + 1].lng },
      ],
      moveType:
        sourceItems[sourceIndex]?.moveTypeToNext ||
        sourceItems[sourceIndex]?.moveType ||
        "walk",
    });
  }
  return {
    center: { lat: filteredPoints[0].lat, lng: filteredPoints[0].lng },
    markers,
    lines,
  };
};
const buildMapDataFromDay = (day, dayIndex) => {
  const sourceItems = getSourceItemsForDay(day, dayIndex);
  const points = sourceItems
    .map((item, index) => {
      const itemCoord = getCoordFromItem(item);
      const staticCoord = getCoordByTitle(item.title);
      const coord = itemCoord || staticCoord;
      if (!coord) return null;
      return {
        ...coord,
        title: item.title,
        sourceIndex: index,
        resolvedBy: itemCoord ? "item" : "static",
      };
    })
    .filter(Boolean);
  return buildMapDataFromResolvedPoints(sourceItems, points);
};
const resolveMapDataForDay = async (day, dayIndex, resolveDynamicCoord) => {
  const sourceItems = getSourceItemsForDay(day, dayIndex);
  const resolvedPoints = (
    await Promise.all(
      sourceItems.map(async (item, index) => {
        const itemCoord = getCoordFromItem(item);
        const staticCoord = getCoordByTitle(item.title);
        const coord =
          itemCoord ||
          staticCoord ||
          (typeof resolveDynamicCoord === "function"
            ? await resolveDynamicCoord(item.title)
            : null);
        if (!coord) return null;
        return {
          lat: coord.lat,
          lng: coord.lng,
          title: item.title,
          sourceIndex: index,
          resolvedBy: itemCoord ? "item" : staticCoord ? "static" : "dynamic",
        };
      }),
    )
  ).filter(Boolean);
  return buildMapDataFromResolvedPoints(sourceItems, resolvedPoints);
};
const loadKakaoMapsScript = () => {
  if (window.kakao?.maps?.services) {
    return Promise.resolve(window.kakao);
  }
  if (kakaoMapsLoadingPromise) {
    return kakaoMapsLoadingPromise;
  }
  kakaoMapsLoadingPromise = new Promise((resolve, reject) => {
    const appKey =
      process.env.REACT_APP_KAKAO_MAP_JS_KEY ||
      process.env.REACT_APP_KAKao_MAP_JS_KEY;
    if (!appKey) {
      reject(new Error("카카오맵 JS 키가 없습니다."));
      return;
    }
    const initialize = () => {
      if (!window.kakao?.maps?.load) {
        reject(new Error("카카오맵 SDK 초기화에 실패했습니다."));
        return;
      }
      window.kakao.maps.load(() => {
        if (window.kakao?.maps?.services) {
          resolve(window.kakao);
        } else {
          reject(new Error("카카오맵 services 라이브러리를 찾지 못했습니다."));
        }
      });
    };
    const existingScript = document.querySelector(
      'script[data-kakao-maps="true"]',
    );
    if (existingScript) {
      if (window.kakao?.maps?.services) {
        resolve(window.kakao);
        return;
      }
      if (window.kakao?.maps?.load) {
        initialize();
        return;
      }
      existingScript.addEventListener("load", initialize, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("카카오맵 SDK 로드 실패")),
        { once: true },
      );
      return;
    }
    const script = document.createElement("script");
    script.src =
      `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}` +
      `&autoload=false&libraries=services`;
    script.async = true;
    script.defer = true;
    script.dataset.kakaoMaps = "true";
    script.onload = initialize;
    script.onerror = () => reject(new Error("카카오맵 SDK 로드 실패"));
    document.head.appendChild(script);
  }).catch((error) => {
    kakaoMapsLoadingPromise = null;
    throw error;
  });
  return kakaoMapsLoadingPromise;
};
const resolveKakaoCoordinate = (kakao, title, placesService, geocoder) =>
  new Promise((resolve) => {
    const keyword = normalizeTitle(title);
    if (!keyword) {
      resolve(null);
      return;
    }
    const cacheKey = getRuntimeCoordinateCacheKey("kakao", keyword);
    if (runtimeCoordinateCache.has(cacheKey)) {
      resolve(runtimeCoordinateCache.get(cacheKey));
      return;
    }
    const finish = (coord) => {
      runtimeCoordinateCache.set(cacheKey, coord);
      resolve(coord);
    };
    placesService.keywordSearch(keyword, (data, status) => {
      if (status === kakao.maps.services.Status.OK && data?.[0]) {
        finish({ lat: Number(data[0].y), lng: Number(data[0].x) });
        return;
      }
      geocoder.addressSearch(keyword, (addressData, addressStatus) => {
        if (
          addressStatus === kakao.maps.services.Status.OK &&
          addressData?.[0]
        ) {
          finish({
            lat: Number(addressData[0].y),
            lng: Number(addressData[0].x),
          });
          return;
        }
        finish(null);
      });
    });
  });
const resolveGoogleCoordinate = (gm, title, geocoder) =>
  new Promise((resolve) => {
    const keyword = normalizeTitle(title);
    if (!keyword) {
      resolve(null);
      return;
    }
    const cacheKey = getRuntimeCoordinateCacheKey("google", keyword);
    if (runtimeCoordinateCache.has(cacheKey)) {
      resolve(runtimeCoordinateCache.get(cacheKey));
      return;
    }
    geocoder.geocode({ address: keyword }, (results, status) => {
      const isOk =
        status === "OK" ||
        status === gm.GeocoderStatus?.OK ||
        status === gm.GeocoderStatus?.ZERO_RESULTS;
      if (
        isOk &&
        results?.[0]?.geometry?.location &&
        status !== gm.GeocoderStatus?.ZERO_RESULTS
      ) {
        const location = results[0].geometry.location;
        const coord = {
          lat:
            typeof location.lat === "function"
              ? location.lat()
              : Number(location.lat),
          lng:
            typeof location.lng === "function"
              ? location.lng()
              : Number(location.lng),
        };
        runtimeCoordinateCache.set(cacheKey, coord);
        resolve(coord);
        return;
      }
      runtimeCoordinateCache.set(cacheKey, null);
      resolve(null);
    });
  });
const STATIC_MAP_WIDTH = 640;
const STATIC_MAP_HEIGHT = 320;
const toStaticMarkerColor = (hex = "#21A0F6") => {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const full = normalized
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase();
    return `0x${full}`;
  }
  if (normalized.length === 6 || normalized.length === 8) {
    return `0x${normalized.slice(0, 6).toUpperCase()}`;
  }
  return "0x21A0F6";
};
const toStaticPathColor = (hex = "#21A0F6") => {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    const full = normalized
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase();
    return `0x${full}FF`;
  }
  if (normalized.length === 6) {
    return `0x${normalized.toUpperCase()}FF`;
  }
  if (normalized.length === 8) {
    return `0x${normalized.toUpperCase()}`;
  }
  return "0x21A0F6FF";
};
const buildStaticMapUrl = (mapData) => {
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_BROWSER_KEY;
  if (!apiKey) return "";
  const params = new URLSearchParams();
  params.set("size", `${STATIC_MAP_WIDTH}x${STATIC_MAP_HEIGHT}`);
  params.set("scale", "2");
  params.set("format", "png");
  params.set("maptype", "roadmap");
  params.set("key", apiKey);
  if (!mapData.markers.length && !mapData.lines.length) {
    params.set("center", `${FALLBACK_CENTER.lat},${FALLBACK_CENTER.lng}`);
    params.set("zoom", "11");
  }
  mapData.markers.forEach((marker) => {
    params.append(
      "markers",
      `size:mid|color:${toStaticMarkerColor(marker.color)}|${marker.lat},${marker.lng}`,
    );
  });
  mapData.lines.forEach((line) => {
    const pathValue = [
      `color:${toStaticPathColor(line.color)}`,
      "weight:5",
      ...line.path.map((point) => `${point.lat},${point.lng}`),
    ].join("|");
    params.append("path", pathValue);
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
};
const padTimeValue = (value) => String(value).padStart(2, "0");

const formatServerTimeValue = (timeValue) => {
  if (!timeValue) return "";

  if (typeof timeValue === "string") {
    const trimmed = timeValue.trim();
    if (!trimmed) return "";

    const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (hhmmMatch) {
      return `${padTimeValue(hhmmMatch[1])}:${hhmmMatch[2]}`;
    }

    return trimmed;
  }

  const hour = Number(timeValue.hour);
  const minute = Number(timeValue.minute);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return "";
  }

  return `${padTimeValue(hour)}:${padTimeValue(minute)}`;
};

const getDistanceKm = (from = {}, to = {}) => {
  const fromCoord = getCoordFromItem(from);
  const toCoord = getCoordFromItem(to);

  if (!fromCoord || !toCoord) {
    return null;
  }

  const toRad = (value) => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(toCoord.lat - fromCoord.lat);
  const dLng = toRad(toCoord.lng - fromCoord.lng);
  const lat1 = toRad(fromCoord.lat);
  const lat2 = toRad(toCoord.lat);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatStraightDistance = (distanceKm) => {
  const value = Number(distanceKm);

  if (!Number.isFinite(value)) {
    return "";
  }

  if (value < 1) {
    return `직선거리 ${Math.round(value * 1000)}m`;
  }

  return `직선거리 ${value.toFixed(1)}km`;
};

const getStraightDistanceText = (from, to) => {
  return formatStraightDistance(getDistanceKm(from, to));
};

const getTotalStraightDistanceKm = (items = []) => {
  return items.reduce((sum, item, index) => {
    if (index >= items.length - 1) return sum;

    const distance = getDistanceKm(item, items[index + 1]);
    return Number.isFinite(distance) ? sum + distance : sum;
  }, 0);
};

const normalizeFixedTimeMap = (map = {}) => {
  return map && typeof map === "object" && !Array.isArray(map) ? map : {};
};

const readFixedTimeMap = (routeId) => {
  if (!routeId || typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(
      `${ROUTE_FIXED_TIME_STORAGE_PREFIX}:${routeId}`
    );

    return raw ? normalizeFixedTimeMap(JSON.parse(raw)) : {};
  } catch (error) {
    console.error("고정 시간 정보 불러오기 실패:", error);
    return {};
  }
};

const getFirstFormattedTimeValue = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const formatted = formatServerTimeValue(value);

    if (formatted) {
      return formatted;
    }
  }

  return "";
};

const isRealFixedTimeEntry = (entry) => {
  if (entry === null || entry === undefined || entry === "") {
    return false;
  }

  if (typeof entry === "string" || typeof entry === "number") {
    return Boolean(getFirstFormattedTimeValue(entry));
  }

  if (typeof entry !== "object") {
    return false;
  }

  if (
    entry.isFixedTime === false ||
    entry.isFixed === false ||
    entry.fixed === false
  ) {
    return false;
  }

  if (
    entry.isFixedTime === true ||
    entry.isFixed === true ||
    entry.fixed === true
  ) {
    return true;
  }

  // flag 없이 저장된 경우에는 fixedTime 계열 필드만 고정 시간으로 인정합니다.
  return Boolean(
    getFirstFormattedTimeValue(entry.fixedTimeLabel, entry.fixedTime)
  );
};

const getFixedTimeValue = (entry) => {
  if (!isRealFixedTimeEntry(entry)) {
    return "";
  }

  if (typeof entry === "string" || typeof entry === "number") {
    return getFirstFormattedTimeValue(entry);
  }

  return getFirstFormattedTimeValue(
    entry.timeLabel,
    entry.fixedTimeLabel,
    entry.time,
    entry.fixedTime,
    entry.arrivalTime,
    entry.departureTime,
    entry.startTime,
  );
};

const getFixedTimeValueFromPlace = (place = {}, fixedEntry = null) => {
  const fixedEntryTime = getFixedTimeValue(fixedEntry);
  if (fixedEntryTime) {
    return fixedEntryTime;
  }

  const explicitFixedTime = getFirstFormattedTimeValue(
    place.fixedTimeLabel,
    place.fixedTime,
    place.fixedArrivalTime,
    place.fixedDepartureTime,
  );

  if (explicitFixedTime) {
    return explicitFixedTime;
  }

  // time/timeLabel은 일반 일정에도 들어올 수 있으므로 isFixedTime이 명확할 때만 사용합니다.
  // 기본 출발 시간 09:00이 여러 장소에 복사되는 문제도 여기서 막습니다.
  if (place.isFixedTime === true) {
    const flaggedTime = getFirstFormattedTimeValue(
      place.timeLabel,
      place.time,
      place.arrivalTime,
      place.departureTime,
      place.startTime,
    );

    if (flaggedTime && flaggedTime !== DEFAULT_ROUTE_START_TIME) {
      return flaggedTime;
    }
  }

  return "";
};

const isFixedTimePlace = (place = {}, fixedEntry = null) =>
  Boolean(getFixedTimeValueFromPlace(place, fixedEntry));

const getNormalizedCompareText = (value = "") => {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, "");
};

const cloneFixedTimeEntryWithMeta = (
  entry,
  mapKey = "",
  matchType = "",
  mapOrder = 0,
) => {
  if (entry === null || entry === undefined || entry === "") {
    return null;
  }

  const meta = {
    _fixedTimeMapKey: mapKey,
    _fixedTimeMatchType: matchType,
    _fixedTimeMapOrder: mapOrder,
  };

  if (typeof entry === "object") {
    return { ...entry, ...meta };
  }

  return {
    ...meta,
    isFixedTime: true,
    time: entry,
  };
};

const getFixedTimeEntry = (fixedTimeMap = {}, day, place = {}) => {
  const normalizedMap = normalizeFixedTimeMap(fixedTimeMap);
  const entries = Object.entries(normalizedMap);

  if (!entries.length) {
    return null;
  }

  const name =
    place.placeName ||
    place.name ||
    place.title ||
    place.destinationName ||
    "";

  const address = place.address || place.desc || place.roadAddress || "";
  const normalizedName = getNormalizedCompareText(name);
  const normalizedAddress = getNormalizedCompareText(address);
  const normalizedDay = getNumberValue(day);
  const dayKeyValues = Array.from(
    new Set(
      [day, normalizedDay, Number.isFinite(normalizedDay) ? normalizedDay - 1 : ""]
        .filter((value) => value !== null && value !== undefined && value !== "")
        .map((value) => String(value))
    )
  );

  const entryOrderByKey = new Map(
    entries.map(([key], index) => [key, index + 1])
  );

  const idCandidateValues = [
    ["tripPlaceId", place.tripPlaceId],
    ["tripPlaceId", place.serverTripPlaceId],
    ["tripPlaceId", place.id],
    ["placeId", place.placeId],
    ["placeId", place.originalId],
    ["sourceId", place.sourceId],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  const stableCandidateKeys = dayKeyValues
    .flatMap((dayKey) => [
      ...idCandidateValues.map(([type, value]) => `${dayKey}:${type}:${value}`),
      normalizedName ? `${dayKey}:name:${normalizedName}` : "",
      normalizedAddress ? `${dayKey}:address:${normalizedAddress}` : "",
    ])
    .filter(Boolean);

  const findByKeys = (keys = []) => {
    for (const key of keys) {
      const entry = normalizedMap[key];

      if (isRealFixedTimeEntry(entry)) {
        return cloneFixedTimeEntryWithMeta(
          entry,
          key,
          "stable-key",
          entryOrderByKey.get(key) || 0,
        );
      }
    }

    return null;
  };

  const stableEntry = findByKeys(stableCandidateKeys);
  if (stableEntry) {
    return stableEntry;
  }

  for (const [key, entry] of entries) {
    if (!isRealFixedTimeEntry(entry) || typeof entry !== "object") {
      continue;
    }

    const entryPlace =
      entry.place ||
      entry.item ||
      entry.targetPlace ||
      entry.selectedPlace ||
      entry.tripPlace ||
      {};

    const entryDay = getNumberValue(
      entry.day,
      entry.dayNumber,
      entryPlace.day,
      entryPlace.dayNumber,
    );
    if (
      Number.isFinite(normalizedDay) &&
      Number.isFinite(entryDay) &&
      entryDay !== normalizedDay &&
      entryDay !== normalizedDay - 1
    ) {
      continue;
    }

    const entryIds = [
      entry.tripPlaceId,
      entry.serverTripPlaceId,
      entry.placeId,
      entry.originalId,
      entry.sourceId,
      entry.id,
      entryPlace.tripPlaceId,
      entryPlace.serverTripPlaceId,
      entryPlace.placeId,
      entryPlace.originalId,
      entryPlace.sourceId,
      entryPlace.id,
    ].map((value) => String(value || ""));

    if (
      idCandidateValues.some(([, value]) =>
        entryIds.includes(String(value || ""))
      )
    ) {
      return cloneFixedTimeEntryWithMeta(
        entry,
        key,
        "entry-id",
        entryOrderByKey.get(key) || 0,
      );
    }

    const entryName = getNormalizedCompareText(
      entry.placeName ||
        entry.name ||
        entry.title ||
        entry.destinationName ||
        entryPlace.placeName ||
        entryPlace.name ||
        entryPlace.title ||
        entryPlace.destinationName ||
        ""
    );
    const entryAddress = getNormalizedCompareText(
      entry.address ||
        entry.desc ||
        entry.roadAddress ||
        entryPlace.address ||
        entryPlace.desc ||
        entryPlace.roadAddress ||
        ""
    );

    if (normalizedName && entryName && normalizedName === entryName) {
      return cloneFixedTimeEntryWithMeta(
        entry,
        key,
        "entry-name",
        entryOrderByKey.get(key) || 0,
      );
    }

    if (normalizedAddress && entryAddress && normalizedAddress === entryAddress) {
      return cloneFixedTimeEntryWithMeta(
        entry,
        key,
        "entry-address",
        entryOrderByKey.get(key) || 0,
      );
    }

    const normalizedKey = getNormalizedCompareText(key);
    if (
      normalizedName &&
      normalizedKey.includes(normalizedName) &&
      dayKeyValues.some((dayKey) => normalizedKey.includes(String(dayKey)))
    ) {
      return cloneFixedTimeEntryWithMeta(
        entry,
        key,
        "key-name",
        entryOrderByKey.get(key) || 0,
      );
    }
  }

  // 순서/인덱스 기반 키는 드래그 후 다른 장소에 시간이 붙을 수 있어서 사용하지 않습니다.
  return null;
};

const getFixedTimeAssignmentScore = (item = {}) => {
  const matchType = String(
    item.fixedTimeEntry?._fixedTimeMatchType || item.fixedTimeMatchType || ""
  );

  if (
    matchType.includes("stable") ||
    matchType.includes("id") ||
    matchType.includes("name") ||
    matchType.includes("address")
  ) {
    return 100;
  }

  if (item.fixedTimeEntry) {
    return 90;
  }

  if (
    getFirstFormattedTimeValue(
      item.fixedTimeLabel,
      item.fixedTime,
      item.fixedArrivalTime,
      item.fixedDepartureTime,
    )
  ) {
    return 80;
  }

  if (item.isFixedTime === true) {
    return 60;
  }

  return 0;
};

const getFixedTimeAssignmentOrder = (item = {}) => {
  const numericOrder = getNumberValue(
    item.fixedTimeEntry?._fixedTimeMapOrder,
    item.fixedTimeMapOrder,
    item.fixedTimeOrder,
  );

  if (Number.isFinite(numericOrder)) {
    return numericOrder;
  }

  const dateCandidates = [
    item.fixedTimeEntry?.updatedAt,
    item.fixedTimeEntry?.createdAt,
    item.fixedTimeUpdatedAt,
    item.fixedTimeCreatedAt,
  ];

  for (const candidate of dateCandidates) {
    const parsed = Date.parse(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
};

const getItemFixedTimeValueForNormalization = (item = {}) => {
  const explicitFixedTime = getFirstFormattedTimeValue(
    item.fixedTimeLabel,
    item.fixedTime,
    item.fixedArrivalTime,
    item.fixedDepartureTime,
  );

  if (explicitFixedTime) {
    return explicitFixedTime;
  }

  if (item.isFixedTime === true) {
    return getFirstFormattedTimeValue(item.timeLabel, item.time);
  }

  return "";
};

const normalizeFixedScheduleItems = (items = []) => {
  const groups = new Map();

  items.forEach((item, index) => {
    if (index === 0) return;

    const fixedTimeValue = getItemFixedTimeValueForNormalization(item);
    if (!fixedTimeValue) return;

    const group = groups.get(fixedTimeValue) || [];
    group.push({
      index,
      score: getFixedTimeAssignmentScore(item),
      order: getFixedTimeAssignmentOrder(item),
    });
    groups.set(fixedTimeValue, group);
  });

  const keepIndexes = new Set();

  for (const group of groups.values()) {
    if (group.length === 1) {
      keepIndexes.add(group[0].index);
      continue;
    }

    const [best] = [...group].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.order !== a.order) return b.order - a.order;
      return b.index - a.index;
    });

    keepIndexes.add(best.index);
  }

  return items.map((item, index) => {
    const fixedTimeValue = getItemFixedTimeValueForNormalization(item);

    if (index === 0) {
      return {
        ...item,
        time: DEFAULT_ROUTE_START_TIME,
        badge: "출발",
        isStartPoint: true,
      };
    }

    if (fixedTimeValue && keepIndexes.has(index)) {
      return {
        ...item,
        time: fixedTimeValue,
        timeLabel: fixedTimeValue,
        fixedTime: fixedTimeValue,
        badge: "고정 일정",
        isFixed: true,
        isFixedTime: true,
      };
    }

    const previousBadge = String(item.badge || "").trim();

    return {
      ...item,
      time: "",
      timeLabel: "",
      fixedTime: "",
      fixedTimeLabel: "",
      fixedArrivalTime: "",
      fixedDepartureTime: "",
      fixedTimeEntry: null,
      fixedTimeMatchType: "",
      fixedTimeMapOrder: null,
      badge:
        previousBadge === "출발" || previousBadge === "고정 일정"
          ? item.placeType || ""
          : previousBadge,
      isStartPoint: false,
      isFixed: false,
      isFixedTime: false,
    };
  });
};

const getDisplayTimeForPlace = ({ fixedEntry, index, place = {} }) => {
  if (index === 0) {
    return DEFAULT_ROUTE_START_TIME;
  }

  return getFixedTimeValueFromPlace(place, fixedEntry);
};

// ✅ 서버에서 받아온 데이터를 화면용 포맷으로 변환해주는 함수
const getResponseData = (data) => {
  if (data?.data) return data.data;
  if (data?.trip) return data.trip;
  if (data?.result) return data.result;
  if (data?.response) return data.response;

  return data;
};

const getArrayData = (data) => {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.places)) return data.places;
  if (Array.isArray(data?.tripPlaces)) return data.tripPlaces;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.places)) return data.data.places;
  if (Array.isArray(data?.data?.tripPlaces)) return data.data.tripPlaces;

  return [];
};

const getTripDaysCount = (trip = {}) => {
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1;
  }

  return Math.max(
    1,
    Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1,
  );
};

const normalizeServerTrip = (trip = {}) => ({
  ...trip,
  id: trip.id ?? trip.tripId,
  title: trip.title || "여행 일정",
  destination: trip.destination || "",
  startDate: trip.startDate,
  endDate: trip.endDate,
  mapType: trip.mapType || trip.mapProvider || trip.provider || "",
  routeUrl: trip.routeUrl || trip.mapUrl || trip.url || "",
});

const normalizeServerTripPlace = (place = {}, fallbackDay = 1) => {
  const latitude = getNumberValue(
    place.latitude,
    place.lat,
    place.y,
    place.placeLatitude,
    place.placeLat,
    place.mapY,
  );
  const longitude = getNumberValue(
    place.longitude,
    place.lng,
    place.lon,
    place.x,
    place.placeLongitude,
    place.placeLng,
    place.placeLon,
    place.mapX,
  );
  const normalizedDay = getNumberValue(place.day, place.dayNumber, fallbackDay) || fallbackDay;
  const normalizedVisitOrder = getNumberValue(
    place.visitOrder,
    place.order,
    place.sequence,
    place.sortOrder,
    0,
  );

  return {
    ...place,
    id: place.id ?? place.tripPlaceId,
    tripId: place.tripId,
    tripPlaceId: place.tripPlaceId ?? place.id,
    placeId: place.placeId,
    placeName:
      place.placeName ||
      place.name ||
      place.title ||
      place.destinationName ||
      "이름 없는 장소",
    latitude,
    longitude,
    address: place.address || place.roadAddress || place.location || "",
    placeType: place.placeType || place.category || place.categoryName || "",
    day: normalizedDay,
    visitOrder: normalizedVisitOrder,
    isStartPoint: Boolean(place.isStartPoint || place.startPoint),
    arrivalTime: place.arrivalTime || "",
    departureTime: place.departureTime || "",
    stayDuration: place.stayDuration ?? place.stayMinutes ?? 0,
    isFixed: Boolean(place.isFixed || place.fixed),
    memo: place.memo || place.memoText || place.note || place.notes || "",
    mapProvider: normalizeMapProvider(place.mapProvider || place.provider || place.mapType),
    countryCode: normalizeCountryCode(place.countryCode || place.country || place.nationCode),
  };
};

// ✅ 서버에서 받아온 여행/장소 데이터를 지도와 상세 일정에서 바로 쓸 수 있는 포맷으로 변환합니다.
const buildDaysFromServerData = (trip, places = [], fixedTimeMap = {}) => {
  if (!trip) return [];

  const normalizedTrip = normalizeServerTrip(trip);
  const daysCount = getTripDaysCount(normalizedTrip);
  const normalizedPlaces = places.map((place, index) => ({
    ...normalizeServerTripPlace(place),
    __sourceIndex: index,
  }));
  const tripMapProvider = normalizeMapProvider(normalizedTrip.mapType);

  const days = [];

  for (let i = 1; i <= daysCount; i += 1) {
    const dayPlaces = normalizedPlaces
      .filter((place) => Number(place.day || 1) === i)
      .sort((a, b) => {
        if (a.isStartPoint !== b.isStartPoint) {
          return a.isStartPoint ? -1 : 1;
        }

        const aOrder = Number(a.visitOrder);
        const bOrder = Number(b.visitOrder);
        const safeAOrder = aOrder > 0 ? aOrder : Number(a.__sourceIndex || 0) + 1;
        const safeBOrder = bOrder > 0 ? bOrder : Number(b.__sourceIndex || 0) + 1;

        return safeAOrder - safeBOrder;
      });

    if (dayPlaces.length === 0) {
      days.push({
        label: `${i}일차`,
        totalDuration: DEFAULT_ROUTE_START_TIME,
        totalDistance: "0km",
        sectionDistance: "일정이 없습니다.",
        routeUrl: normalizedTrip.routeUrl || "",
        items: [],
      });
      continue;
    }

    const items = normalizeFixedScheduleItems(dayPlaces.map((place, index) => {
      const isLast = index === dayPlaces.length - 1;
      const nextPlace = dayPlaces[index + 1];
      const fixedEntry = getFixedTimeEntry(fixedTimeMap, i, place, index);
      const fixedTimeValue = getFixedTimeValueFromPlace(place, fixedEntry);
      const displayTime = index === 0 ? DEFAULT_ROUTE_START_TIME : fixedTimeValue;
      const isFixedSchedule = index !== 0 && Boolean(fixedTimeValue);

      const hasCoordinate =
        Number.isFinite(Number(place.latitude)) &&
        Number.isFinite(Number(place.longitude));

      const placeCoordinate = hasCoordinate
        ? { lat: place.latitude, lng: place.longitude }
        : null;

      const coordinateProvider = getMapProviderByCoordinate(placeCoordinate);
      const coordinateCountryCode = getCountryCodeByCoordinate(placeCoordinate);

      const placeProvider =
        coordinateProvider ||
        place.mapProvider ||
        tripMapProvider ||
        "google";

      return {
        id: place.id,
        tripPlaceId: place.tripPlaceId,
        placeId: place.placeId,
        time: displayTime,
        fixedTime: fixedTimeValue,
        timeLabel: fixedTimeValue,
        fixedTimeEntry: fixedEntry || null,
        fixedTimeMatchType: fixedEntry?._fixedTimeMatchType || "",
        fixedTimeMapOrder: fixedEntry?._fixedTimeMapOrder ?? null,
        departureTime: formatServerTimeValue(place.departureTime),
        title: place.placeName || "이름 없는 장소",
        desc: place.address || "",
        badge:
          index === 0
            ? "출발"
            : isFixedSchedule
              ? "고정 일정"
              : place.placeType || "",
        move: isLast ? "" : getStraightDistanceText(place, nextPlace),
        moveType: "distance",
        lat: place.latitude,
        lng: place.longitude,
        latitude: place.latitude,
        longitude: place.longitude,
        address: place.address || "",
        placeType: place.placeType || "",
        day: place.day,
        visitOrder: place.visitOrder,
        isStartPoint: index === 0,
        isFixed: isFixedSchedule,
        isFixedTime: Boolean(fixedTimeValue),
        stayDuration: place.stayDuration,
        countryCode: coordinateCountryCode || place.countryCode,
        mapProvider: placeProvider,
        memo: place.memo || "",
      };
    }));

    const totalStraightDistance = getTotalStraightDistanceKm(items);
    const totalDistanceText = Number.isFinite(totalStraightDistance)
      ? formatStraightDistance(totalStraightDistance).replace("직선거리 ", "")
      : "0km";

    days.push({
      label: `${i}일차`,
      totalDuration: DEFAULT_ROUTE_START_TIME,
      totalDistance: totalDistanceText || "0km",
      sectionDistance: totalDistanceText
        ? `총 직선거리 ${totalDistanceText}`
        : "직선거리 정보 없음",
      routeUrl: normalizedTrip.routeUrl || "",
      items,
    });
  }

  return days;
};

const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const buildDaysFromState = (selectedDates = [], placesByDate = {}, fixedTimeMap = {}) => {
  if (!selectedDates.length) return DEFAULT_RESULT_DAYS;

  return selectedDates.map((date, dayIndex) => {
    const dateKey = formatDateKey(date);
    const places = placesByDate?.[dateKey] || [];

    if (!places.length) {
      return {
        label: `${dayIndex + 1}일차`,
        totalDuration: DEFAULT_ROUTE_START_TIME,
        totalDistance: "0km",
        sectionDistance: "일정이 없습니다.",
        items: [],
      };
    }

    const items = normalizeFixedScheduleItems(places.map((place, index) => {
      const isLast = index === places.length - 1;
      const nextPlace = places[index + 1];
      const placeName = place.name || place.title || place.placeName || "";
      const fixedEntry = getFixedTimeEntry(fixedTimeMap, dayIndex + 1, place, index);
      const fixedTimeValue = getFixedTimeValueFromPlace(place, fixedEntry);
      const displayTime = index === 0 ? DEFAULT_ROUTE_START_TIME : fixedTimeValue;
      const isFixedSchedule = index !== 0 && Boolean(fixedTimeValue);

      const item = {
        ...place,
        title:
          index === 0 && !placeName.includes("(출발)")
            ? `${placeName}${placeName.includes("역") ? " (출발)" : ""}`
            : placeName,
        time: displayTime,
        fixedTime: fixedTimeValue,
        timeLabel: fixedTimeValue,
        fixedTimeEntry: fixedEntry || null,
        fixedTimeMatchType: fixedEntry?._fixedTimeMatchType || "",
        fixedTimeMapOrder: fixedEntry?._fixedTimeMapOrder ?? null,
        isStartPoint: index === 0,
        isFixed: isFixedSchedule,
        isFixedTime: Boolean(fixedTimeValue),
        desc:
          index === 0
            ? place.desc || "여행 시작 지점입니다."
            : place.desc || "추천 일정으로 배치된 장소입니다.",
        badge:
          index === 0
            ? "출발"
            : isFixedSchedule
              ? "고정 일정"
              : place.placeType || "",
        lat:
          place.lat ||
          place.latitude ||
          place.y ||
          place.placeLat ||
          place.placeLatitude ||
          place.mapY ||
          place.position?.lat ||
          place.position?.latitude ||
          place.coord?.lat ||
          place.coord?.latitude ||
          place.coordinate?.lat ||
          place.coordinate?.latitude,
        lng:
          place.lng ||
          place.lon ||
          place.longitude ||
          place.x ||
          place.placeLng ||
          place.placeLon ||
          place.placeLongitude ||
          place.mapX ||
          place.position?.lng ||
          place.position?.lon ||
          place.position?.longitude ||
          place.coord?.lng ||
          place.coord?.lon ||
          place.coord?.longitude ||
          place.coordinate?.lng ||
          place.coordinate?.lon ||
          place.coordinate?.longitude,
        countryCode: normalizeCountryCode(
          place.countryCode ||
            place.destinationCountryCode ||
            place.country ||
            place.nationCode,
        ),
        mapProvider: normalizeMapProvider(
          place.mapProvider || place.provider || place.mapType,
        ),
        memo: place.memo || place.memoText || place.note || place.notes || "",
      };

      item.move = isLast ? "" : getStraightDistanceText(item, nextPlace);
      item.moveType = "distance";

      return item;
    }));

    const totalStraightDistance = getTotalStraightDistanceKm(items);
    const totalDistanceText = Number.isFinite(totalStraightDistance)
      ? formatStraightDistance(totalStraightDistance).replace("직선거리 ", "")
      : "0km";

    return {
      label: `${dayIndex + 1}일차`,
      totalDuration: DEFAULT_ROUTE_START_TIME,
      totalDistance: totalDistanceText || "0km",
      sectionDistance: totalDistanceText
        ? `총 직선거리 ${totalDistanceText}`
        : "직선거리 정보 없음",
      items,
    };
  });
};

const RouteTabs = ({ resultDays, activeIndex, onChange, isStatic = false }) => {
  return (
    <div
      className={`route-result-tabs ${isStatic ? "route-result-tabs-static" : ""}`}
    >
      {" "}
      {resultDays.map((day, index) =>
        isStatic ? (
          <div
            key={`${day.label}-${index}`}
            className={`route-result-tab ${activeIndex === index ? "active" : ""}`}
          >
            {" "}
            {day.label}{" "}
          </div>
        ) : (
          <button
            key={`${day.label}-${index}`}
            type="button"
            className={`route-result-tab ${activeIndex === index ? "active" : ""}`}
            onClick={() => onChange(index)}
          >
            {" "}
            {day.label}{" "}
          </button>
        ),
      )}{" "}
    </div>
  );
};
const SummaryCard = ({ day }) => (
  <section className="route-result-summary-card">
    {" "}
    <div className="route-result-summary-item">
      {" "}
      <div className="route-result-summary-icon">
        {" "}
        <ClockIcon />{" "}
      </div>{" "}
      <div className="route-result-summary-text">
        {" "}
        <span>출발 시간:</span>{" "}
        <strong>{day.startTime || day.items?.[0]?.time || DEFAULT_ROUTE_START_TIME}</strong>{" "}
      </div>{" "}
    </div>{" "}
    <div className="route-result-summary-divider" />{" "}
    <div className="route-result-summary-item">
      {" "}
      <div className="route-result-summary-icon">
        {" "}
        <PinIcon />{" "}
      </div>{" "}
      <div className="route-result-summary-text">
        {" "}
        <span>총 이동 거리:</span> <strong>{day.totalDistance}</strong>{" "}
      </div>{" "}
    </div>{" "}
  </section>
);
const TimelineMemo = ({ memo, onClick }) => {
  const displayTitle = getMemoDisplayTitle(memo);
  const isSaved = Boolean(displayTitle);
  const className = isSaved
    ? "route-result-memo-card"
    : "route-result-memo-input";
  const icon = isSaved ? <MemoSavedIcon /> : <MemoInputIcon />;
  const text = isSaved ? displayTitle : "메모를 입력하세요...";
  const handleClick = (event) => {
    event.stopPropagation();
    if (typeof onClick === "function") {
      onClick();
    }
  };
  if (typeof onClick !== "function") {
    return (
      <div className={className} title={isSaved ? displayTitle : undefined}>
        {" "}
        <span className="route-result-memo-icon">{icon}</span>{" "}
        <span className="route-result-memo-text">{text}</span>{" "}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={className}
      title={isSaved ? displayTitle : undefined}
      onClick={handleClick}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {" "}
      <span className="route-result-memo-icon">{icon}</span>{" "}
      <span className="route-result-memo-text">{text}</span>{" "}
    </button>
  );
};
const MemoModal = ({ isOpen, value, onChange, onCancel, onSave }) => {
  const textareaRef = useRef(null);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);
  useEffect(() => {
    if (!isOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCancelRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div className="route-result-memo-backdrop" onClick={onCancel}>
      {" "}
      <div
        className="route-result-memo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-result-memo-title"
        onClick={(event) => event.stopPropagation()}
      >
        {" "}
        <h3 id="route-result-memo-title">메모 작성</h3>{" "}
        <textarea
          ref={textareaRef}
          className="route-result-memo-textarea"
          value={value}
          placeholder="이 장소에 대한 메모를 남겨보세요."
          onChange={(event) => onChange(event.target.value)}
        />{" "}
        <div className="route-result-memo-actions">
          {" "}
          <button
            type="button"
            className="route-result-memo-cancel"
            onClick={onCancel}
          >
            {" "}
            취소{" "}
          </button>{" "}
          <button
            type="button"
            className="route-result-memo-save"
            onClick={onSave}
          >
            {" "}
            저장{" "}
          </button>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
const getSortablePlaceId = (item = {}, index) => {
  const explicitId =
    item.tripPlaceId ?? item.id ?? item.placeId ?? item.sourceId ?? "";

  if (explicitId) {
    return String(explicitId);
  }

  const title = normalizeTitle(item.title || item.placeName || item.name || "");
  const lat = item.lat ?? item.latitude ?? "";
  const lng = item.lng ?? item.longitude ?? item.lon ?? "";

  return `${title}-${lat}-${lng}-${index}`;
};

const rebuildDayWithItems = (day, nextItems = []) => {
  const items = normalizeFixedScheduleItems(nextItems.map((item, index) => {
    const isLast = index === nextItems.length - 1;
    const nextPlace = nextItems[index + 1];
    const previousBadge = String(item.badge || "").trim();
    const fixedEntry = item.fixedTimeEntry || null;
    const fixedTimeValue = getFixedTimeValueFromPlace(item, fixedEntry);
    const displayTime = index === 0 ? DEFAULT_ROUTE_START_TIME : fixedTimeValue;
    const isFixedSchedule = index !== 0 && Boolean(fixedTimeValue);
    const nextBadge =
      index === 0
        ? "출발"
        : isFixedSchedule
          ? "고정 일정"
          : previousBadge === "출발" || previousBadge === "고정 일정"
            ? item.placeType || ""
            : previousBadge;

    return {
      ...item,
      time: displayTime,
      badge: nextBadge,
      move: isLast ? "" : getStraightDistanceText(item, nextPlace),
      moveType: "distance",
      visitOrder: index + 1,
      isStartPoint: index === 0,
      isFixed: isFixedSchedule,
      isFixedTime: Boolean(fixedTimeValue),
      fixedTime: fixedTimeValue,
      timeLabel: fixedTimeValue,
    };
  }));

  const totalStraightDistance = getTotalStraightDistanceKm(items);
  const totalDistanceText = Number.isFinite(totalStraightDistance)
    ? formatStraightDistance(totalStraightDistance).replace("직선거리 ", "")
    : "0km";

  return {
    ...day,
    items,
    routeUrl: "",
    isCustomOrder: true,
    totalDistance: totalDistanceText || "0km",
    sectionDistance: totalDistanceText
      ? `총 직선거리 ${totalDistanceText}`
      : "직선거리 정보 없음",
  };
};

const SortableTimelineItem = ({
  id,
  children,
  isClickable,
  onClick,
  onKeyDown,
  ariaLabel,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`route-result-timeline-item is-sortable ${
        isDragging ? "is-dragging" : ""
      }`}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        ...(isClickable ? TIMELINE_ITEM_BUTTON_STYLE : undefined),
      }}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        className="route-result-drag-handle"
        aria-label="일정 순서 변경"
        title="드래그해서 순서 변경"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      {children}
    </div>
  );
};

const DetailSection = ({
  day,
  dayIndex,
  memoValues = {},
  onOpenMemo,
  onOpenPlaceMap,
  onReorderItems,
  mapProvider = "google",
}) => {
  const providerLabel = mapProvider === "kakao" ? "카카오맵" : "구글맵";
  const isClickable = typeof onOpenPlaceMap === "function";
  const isMemoEditable = typeof onOpenMemo === "function";
  const isReorderable =
    typeof onReorderItems === "function" && (day?.items || []).length > 1;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const sortableIds = useMemo(
    () => (day?.items || []).map((item, index) => getSortablePlaceId(item, index)),
    [day?.items]
  );

  const handleOpen = (item) => {
    if (typeof onOpenPlaceMap === "function") {
      onOpenPlaceMap(item.title, item);
    }
  };

  const handleKeyDown = (event, item) => {
    if (!isClickable) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen(item);
    }
  };

  const handleMenuClick = (event, itemIndex) => {
    event.stopPropagation();

    if (isMemoEditable) {
      onOpenMemo(dayIndex, itemIndex);
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = sortableIds.indexOf(active.id);
    const newIndex = sortableIds.indexOf(over.id);

    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const nextItems = arrayMove(day.items, oldIndex, newIndex);
    onReorderItems(dayIndex, nextItems);
  };

  const renderTimelineItemContent = (item, index) => {
    const memo = getItemMemoValue(memoValues, dayIndex, index, item);

    return (
      <>
        <div className="route-result-marker-column">
          <div className="route-result-step-circle">{index + 1}</div>
          {index !== day.items.length - 1 && (
            <div className="route-result-step-line" />
          )}
        </div>

        <div className="route-result-item-body">
          {item.time ? (
            <div className="route-result-item-time">{item.time}</div>
          ) : null}

          <div className="route-result-item-title-row">
            <h3>{item.title}</h3>
            {item.badge ? (
              <span className="route-result-item-badge">{item.badge}</span>
            ) : isMemoEditable && index === 1 ? (
              <button
                type="button"
                className="route-result-item-menu"
                aria-label="메모 메뉴 열기"
                onClick={(event) => handleMenuClick(event, index)}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <MoreVerticalIcon />
              </button>
            ) : null}
          </div>

          {item.desc ? (
            <p className="route-result-item-desc">{item.desc}</p>
          ) : null}

          <TimelineMemo
            memo={memo}
            onClick={
              isMemoEditable ? () => onOpenMemo(dayIndex, index) : undefined
            }
          />

          {item.move ? (
            <div className="route-result-item-move">
              <span className="route-result-item-move-icon">
                <PinIcon />
              </span>
              <span>{item.move}</span>
            </div>
          ) : null}
        </div>
      </>
    );
  };

  const renderTimelineItems = () =>
    day.items.map((item, index) => {
      const sortableId = sortableIds[index];
      const ariaLabel = isClickable
        ? `${normalizeTitle(item.title)} ${providerLabel}에서 열기`
        : undefined;

      if (!isReorderable) {
        return (
          <div
            key={`${day.label}-${item.title}-${index}`}
            className="route-result-timeline-item"
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onClick={isClickable ? () => handleOpen(item) : undefined}
            onKeyDown={
              isClickable ? (event) => handleKeyDown(event, item) : undefined
            }
            style={isClickable ? TIMELINE_ITEM_BUTTON_STYLE : undefined}
            aria-label={ariaLabel}
          >
            {renderTimelineItemContent(item, index)}
          </div>
        );
      }

      return (
        <SortableTimelineItem
          key={sortableId}
          id={sortableId}
          isClickable={isClickable}
          onClick={isClickable ? () => handleOpen(item) : undefined}
          onKeyDown={
            isClickable ? (event) => handleKeyDown(event, item) : undefined
          }
          ariaLabel={ariaLabel}
        >
          {renderTimelineItemContent(item, index)}
        </SortableTimelineItem>
      );
    });

  return (
    <section className="route-result-detail-section">
      <div className="route-result-detail-header">
        <h2>상세 일정</h2>
        <span className="route-result-distance-pill">
          {day.sectionDistance}
        </span>
      </div>

      <p className="route-result-detail-sub">
        {isReorderable
          ? "카드를 드래그해서 방문 순서를 다시 조정할 수 있습니다."
          : "가장 효율적인 동선으로 재구성되었습니다."}
      </p>

      {isReorderable ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortableIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="route-result-timeline">{renderTimelineItems()}</div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="route-result-timeline">{renderTimelineItems()}</div>
      )}
    </section>
  );
};
const GoogleMapBox = ({ dayData, dayIndex, onOpenMap }) => {
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState("");
  const fallbackMapData = useMemo(
    () => buildMapDataFromDay(dayData, dayIndex),
    [dayData, dayIndex],
  );
  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_BROWSER_KEY;
    if (!apiKey) {
      setMapError("구글맵 API 키가 없습니다. .env 파일을 확인하세요.");
      return;
    }
    if (!mapsConfigured) {
      setOptions({ key: apiKey, v: "weekly" });
      mapsConfigured = true;
    }
    let mounted = true;
    let map = null;
    let markers = [];
    let polylines = [];
    let mapClickListener = null;
    const drawStraightLine = (gm, line, bounds) => {
      line.path.forEach((point) => bounds.extend(point));

      const polyline = new gm.Polyline({
        map,
        path: line.path,
        strokeColor: line.color || "#21A0F6",
        strokeOpacity: 1,
        strokeWeight: 8,
        geodesic: true,
        zIndex: 999,
      });

      polylines.push(polyline);
    };
    (async () => {
      try {
        const { Map } = await importLibrary("maps");
        await importLibrary("routes");
        if (!mounted || !mapRef.current) return;
        const gm = window.google.maps;
        const geocoder = new gm.Geocoder();
        const resolvedMapData = await resolveMapDataForDay(
          dayData,
          dayIndex,
          (title) => resolveGoogleCoordinate(gm, title, geocoder),
        );
        if (!mounted || !mapRef.current) return;
        const mapData =
          resolvedMapData.markers.length >= fallbackMapData.markers.length
            ? resolvedMapData
            : fallbackMapData;

        console.log("구글 지도 데이터:", mapData);
        console.log("구글 마커 개수:", mapData.markers.length);
        console.log("구글 선 개수:", mapData.lines.length);
        map = new Map(mapRef.current, {
          center: mapData.center,
          zoom: 11,
          gestureHandling: "greedy",
          clickableIcons: false,
          disableDefaultUI: true,
          zoomControl: true,
          scrollwheel: true,
          keyboardShortcuts: true,
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: false,
        });
        mapClickListener = map.addListener("click", () => {
          if (typeof onOpenMap === "function") {
            onOpenMap();
          }
        });
        const bounds = new gm.LatLngBounds();
        mapData.lines.forEach((line) => {
          drawStraightLine(gm, line, bounds);
        });
        mapData.markers.forEach((marker) => {
          const position = { lat: marker.lat, lng: marker.lng };
          bounds.extend(position);
          const markerInstance = new gm.Marker({
            map,
            position,
            title: marker.title,
            icon: {
              path: gm.SymbolPath.CIRCLE,
              fillColor: marker.color,
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 3,
              scale: 8,
            },
          });
          markers.push(markerInstance);
        });
        if (mapData.markers.length > 1) {
          map.fitBounds(bounds, 60);
          gm.event.addListenerOnce(map, "idle", () => {
            if (map && map.getZoom() > 13) {
              map.setZoom(13);
            }
          });
        } else if (mapData.markers.length === 1) {
          map.setCenter(mapData.center);
          map.setZoom(13);
        }
        setMapError("");
      } catch (error) {
        console.error("Google Maps 로드 실패:", error);
        setMapError(
          "지도를 불러오지 못했어요. API 키 또는 Google Cloud 설정을 확인해 주세요.",
        );
      }
    })();
    return () => {
      mounted = false;
      if (mapClickListener) {
        mapClickListener.remove();
      }
      markers.forEach((marker) => marker.setMap(null));
      polylines.forEach((polyline) => polyline.setMap(null));
    };
  }, [dayData, dayIndex, fallbackMapData, onOpenMap]);
  return (
    <div className="route-map-mock">
      {" "}
      <div ref={mapRef} className="route-map-real" />{" "}
      {mapError && <div className="route-map-error-overlay">{mapError}</div>}{" "}
      <div className="route-map-controls" style={{ zIndex: 2 }}>
        {" "}
        <button
          type="button"
          className="route-map-control-btn"
          onClick={onOpenMap}
        >
          {" "}
          <GearIcon />{" "}
        </button>{" "}
        <button
          type="button"
          className="route-map-control-btn"
          onClick={onOpenMap}
        >
          {" "}
          <LayersIcon />{" "}
        </button>{" "}
      </div>{" "}
    </div>
  );
};
const KakaoMapBox = ({ dayData, dayIndex, onOpenMap }) => {
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState("");

  const fallbackMapData = useMemo(
    () => buildMapDataFromDay(dayData, dayIndex),
    [dayData, dayIndex]
  );

  useEffect(() => {
    let map = null;
    let clickHandler = null;
    let resizeTimer = null;
    const markers = [];
    const polylines = [];

    loadKakaoMapsScript()
      .then(async (kakao) => {
        if (!mapRef.current) return;

        const placesService = new kakao.maps.services.Places();
        const geocoder = new kakao.maps.services.Geocoder();

        const resolvedMapData = await resolveMapDataForDay(
          dayData,
          dayIndex,
          (title) =>
            resolveKakaoCoordinate(kakao, title, placesService, geocoder)
        );

        if (!mapRef.current) return;

        const mapData =
          resolvedMapData.markers.length >= fallbackMapData.markers.length
            ? resolvedMapData
            : fallbackMapData;

        console.log("카카오 지도 데이터:", mapData);
        console.log("카카오 마커 개수:", mapData.markers.length);
        console.log("카카오 선 개수:", mapData.lines.length);

        map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(
            Number(mapData.center.lat),
            Number(mapData.center.lng)
          ),
          level: 7,
        });

        clickHandler = () => {
          if (typeof onOpenMap === "function") {
            onOpenMap();
          }
        };

        kakao.maps.event.addListener(map, "click", clickHandler);

        const bounds = new kakao.maps.LatLngBounds();

        mapData.lines.forEach((line) => {
          const path = line.path
            .map((point) => {
              const lat = Number(point.lat);
              const lng = Number(point.lng);

              if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                return null;
              }

              return new kakao.maps.LatLng(lat, lng);
            })
            .filter(Boolean);

          if (path.length < 2) {
            return;
          }

          path.forEach((point) => bounds.extend(point));

          const polyline = new kakao.maps.Polyline({
            path,
            strokeWeight: 10,
            strokeColor: line.color || "#FF3B30",
            strokeOpacity: 1,
            strokeStyle: "solid",
          });

          polyline.setMap(map);

          if (typeof polyline.setZIndex === "function") {
            polyline.setZIndex(9999);
          }

          polylines.push(polyline);
        });

        mapData.markers.forEach((marker) => {
          const lat = Number(marker.lat);
          const lng = Number(marker.lng);

          if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
            return;
          }

          const position = new kakao.maps.LatLng(lat, lng);
          bounds.extend(position);

          const markerInstance = new kakao.maps.Marker({
            map,
            position,
            title: marker.title,
          });

          markers.push(markerInstance);
        });

        if (mapData.markers.length > 1) {
          map.setBounds(bounds);

          resizeTimer = setTimeout(() => {
            if (!map) return;

            kakao.maps.event.trigger(map, "resize");
            map.setBounds(bounds);

            polylines.forEach((polyline) => {
              polyline.setMap(null);
              polyline.setMap(map);

              if (typeof polyline.setZIndex === "function") {
                polyline.setZIndex(9999);
              }
            });
          }, 100);
        } else if (mapData.markers.length === 1) {
          map.setCenter(
            new kakao.maps.LatLng(
              Number(mapData.center.lat),
              Number(mapData.center.lng)
            )
          );
          map.setLevel(4);
        }

        setMapError("");
      })
      .catch((error) => {
        console.error("Kakao Maps 로드 실패:", error);
        setMapError(
          "카카오 지도를 불러오지 못했어요. JS 키 또는 JavaScript SDK 도메인을 확인해 주세요."
        );
      });

    return () => {
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }

      if (window.kakao?.maps && map && clickHandler) {
        window.kakao.maps.event.removeListener(map, "click", clickHandler);
      }

      markers.forEach((marker) => marker.setMap(null));
      polylines.forEach((polyline) => polyline.setMap(null));
    };
  }, [dayData, dayIndex, fallbackMapData, onOpenMap]);

  return (
    <div className="route-map-mock">
      <div ref={mapRef} className="route-map-real" />

      {mapError && <div className="route-map-error-overlay">{mapError}</div>}

      <div className="route-map-controls" style={{ zIndex: 2 }}>
        <button
          type="button"
          className="route-map-control-btn"
          onClick={onOpenMap}
        >
          <GearIcon />
        </button>

        <button
          type="button"
          className="route-map-control-btn"
          onClick={onOpenMap}
        >
          <LayersIcon />
        </button>
      </div>
    </div>
  );
};
const PdfMapPreview = ({ dayData, dayIndex }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const mapData = useMemo(
    () => buildMapDataFromDay(dayData, dayIndex),
    [dayData, dayIndex],
  );
  const staticMapUrl = useMemo(() => buildStaticMapUrl(mapData), [mapData]);
  useEffect(() => {
    setImageFailed(false);
  }, [staticMapUrl]);
  if (!staticMapUrl || imageFailed) {
    return (
      <div className="route-map-static-fallback">
        {" "}
        PDF용 지도 이미지를 불러오지 못했어요.{" "}
      </div>
    );
  }
  return (
    <div className="route-map-static-preview">
      {" "}
      <img
        src={staticMapUrl}
        alt={`${dayData.label} 경로 지도`}
        className="route-map-static-image"
        crossOrigin="anonymous"
        loading="eager"
        data-pdf-asset="true"
        onError={() => setImageFailed(true)}
      />{" "}
    </div>
  );
};
const RouteDayContent = ({
  day,
  dayIndex,
  useStaticMap = false,
  mapProvider = "google",
  memoValues = {},
  onOpenRouteMap,
  onOpenPlaceMap,
  onOpenMemo,
  onReorderItems,
}) => {
  return (
    <div className="route-result-content">
      {" "}
      <SummaryCard day={day} />{" "}
      <section className="route-result-map-section">
        {" "}
        {useStaticMap ? (
          <PdfMapPreview dayData={day} dayIndex={dayIndex} />
        ) : mapProvider === "kakao" ? (
          <KakaoMapBox
            dayData={day}
            dayIndex={dayIndex}
            onOpenMap={onOpenRouteMap}
          />
        ) : (
          <GoogleMapBox
            dayData={day}
            dayIndex={dayIndex}
            onOpenMap={onOpenRouteMap}
          />
        )}{" "}
      </section>{" "}
      <DetailSection
        day={day}
        dayIndex={dayIndex}
        memoValues={memoValues}
        onOpenMemo={onOpenMemo}
        onOpenPlaceMap={onOpenPlaceMap}
        onReorderItems={onReorderItems}
        mapProvider={mapProvider}
      />{" "}
    </div>
  );
};

function RouteResult({ initialSavedRoute = null, isEmbedded = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeId = searchParams.get("id");
  const mockMode = searchParams.get("mock");
  const isDomesticMock = mockMode === "domestic";
  const isOverseasMock = mockMode === "overseas";
  const savedRouteFromState = location.state?.savedRoute;

  const savedRoute = initialSavedRoute || savedRouteFromState || null;

  // ✅ 서버 데이터를 관리할 상태 추가
  const [serverTrip, setServerTrip] = useState(null);
  const [serverTripPlaces, setServerTripPlaces] = useState([]);
  const [isLoading, setIsLoading] = useState(() => {
    // mock 모드나 state에서 바로 넘어온 데이터가 없으면 처음엔 로딩 상태로 둡니다.
    return !!routeId && !isDomesticMock && !isOverseasMock && !initialSavedRoute;
  });

  // ✅ 컴포넌트 진입 시 백엔드에서 일정과 장소 목록을 조회합니다.
  useEffect(() => {
    const fetchTripData = async () => {
      // routeId가 없거나 mock 모드이거나, 화면에 직접 데이터를 꽂아줬다면 서버 통신 패스
      if (!routeId || isDomesticMock || isOverseasMock || initialSavedRoute) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // 1. 일정 기본 정보와 일정 전체 장소 목록을 먼저 가져옵니다.
        const [tripRes, placesRes] = await Promise.all([
          api.get(`/api/trips/${routeId}`),
          api.get(`/api/trips/${routeId}/places`),
        ]);

        const nextTrip = normalizeServerTrip(getResponseData(tripRes.data));
        let nextPlaces = getArrayData(placesRes.data).map((place) =>
          normalizeServerTripPlace(place),
        );

        // 2. 전체 장소 API가 비어 있으면 일차별 장소 API로 한 번 더 조회합니다.
        if (nextPlaces.length === 0) {
          const daysCount = getTripDaysCount(nextTrip);
          const dayResponses = await Promise.all(
            Array.from({ length: daysCount }, (_, index) => {
              const day = index + 1;

              return api
                .get(`/api/trips/${routeId}/days/${day}/places`)
                .then((response) => ({ day, data: response.data }))
                .catch((error) => {
                  console.error(`${day}일차 장소 조회 실패:`, error);
                  return { day, data: [] };
                });
            }),
          );

          nextPlaces = dayResponses.flatMap(({ day, data }) =>
            getArrayData(data).map((place) =>
              normalizeServerTripPlace({ ...place, day: place.day ?? day }, day),
            ),
          );
        }

        console.log("서버 여행 정보:", nextTrip);
        console.log("서버 여행 장소 목록:", nextPlaces);

        setServerTrip(nextTrip);
        setServerTripPlaces(nextPlaces);
      } catch (error) {
        console.error("여행 정보 조회 실패:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTripData();
  }, [routeId, isDomesticMock, isOverseasMock, initialSavedRoute]);

  useEffect(() => {
    if (isEmbedded) return undefined;

    const handleDeleteSchedule = async (event) => {
      const detail = getDeleteEventDetail(event);

      const targetRouteId =
        detail.tripId ||
        detail.routeId ||
        detail.scheduleId ||
        routeId ||
        serverTrip?.id ||
        savedRoute?.id;

      if (!targetRouteId) {
        alert("삭제할 일정 정보를 찾지 못했어요.");
        return;
      }

      const shouldDeletePlace = isPlaceDeleteDetail(detail);
      const { tripPlaceId, placeId, day } =
        getTripPlaceTargetFromDeleteDetail(detail);

      try {
        if (shouldDeletePlace) {
          await deleteTripPlaceById({
            tripId: targetRouteId,
            tripPlaceId,
            placeId,
            day,
          });

          setServerTripPlaces((prevPlaces) =>
            prevPlaces.filter((place) => {
              const placeKeys = [
                place.id,
                place.tripPlaceId,
                place.placeId,
              ].map((value) => String(value || ""));

              return (
                !placeKeys.includes(String(tripPlaceId || "")) &&
                !placeKeys.includes(String(placeId || ""))
              );
            }),
          );

          return;
        }

        await deleteTripById(targetRouteId);

        navigate("/my-schedule", { replace: true });
      } catch (error) {
        console.error("삭제 실패:", error);

        alert(
          getApiErrorMessage(
            error,
            shouldDeletePlace
              ? "장소 삭제에 실패했습니다."
              : "일정 삭제에 실패했습니다.",
          ),
        );
      }
    };

    window.addEventListener(DELETE_ROUTE_EVENT, handleDeleteSchedule);

    return () => {
      window.removeEventListener(DELETE_ROUTE_EVENT, handleDeleteSchedule);
    };
  }, [
    routeId,
    savedRoute?.id,
    serverTrip?.id,
    navigate,
    isEmbedded,
  ]);

  const fixedTimeMap = useMemo(() => {
    return {
      ...readFixedTimeMap(routeId || serverTrip?.id || savedRoute?.id),
      ...normalizeFixedTimeMap(savedRoute?.fixedTimeMap),
    };
  }, [routeId, serverTrip?.id, savedRoute?.id, savedRoute?.fixedTimeMap]);

  const resultDays = useMemo(() => {
    if (isOverseasMock) {
      return DEFAULT_OVERSEAS_RESULT_DAYS;
    }
    if (isDomesticMock) {
      return DEFAULT_RESULT_DAYS;
    }

    // ✅ 1. 서버에서 조회한 데이터가 있다면 최우선으로 화면에 그려줍니다.
    if (serverTrip) {
      const serverDays = buildDaysFromServerData(serverTrip, serverTripPlaces, fixedTimeMap);
      return serverDays.length > 0 ? serverDays : DEFAULT_RESULT_DAYS;
    }

    // ✅ 2. 서버 데이터가 없는데 이전 화면(RouteCreate)에서 넘겨준 임시 데이터가 있다면 렌더링
    const rawSelectedDates =
      savedRoute?.selectedDates || location.state?.selectedDates;
    const rawPlacesByDate =
      savedRoute?.placesByDate || location.state?.placesByDate;
    if (rawSelectedDates && rawSelectedDates.length) {
      const parsedDates = rawSelectedDates.map((date) => new Date(date));
      return buildDaysFromState(parsedDates, rawPlacesByDate, fixedTimeMap);
    }

    // 3. 다 없으면 기본 목업 표시
    return DEFAULT_RESULT_DAYS;
  }, [
    savedRoute,
    location.state?.selectedDates,
    location.state?.placesByDate,
    isDomesticMock,
    isOverseasMock,
    serverTrip,
    serverTripPlaces,
    fixedTimeMap,
  ]);

  const [customResultDays, setCustomResultDays] = useState([]);

  useEffect(() => {
    setCustomResultDays(resultDays);
  }, [resultDays]);

  const displayResultDays = customResultDays.length
    ? customResultDays
    : resultDays;

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  useEffect(() => {
    if (activeDayIndex > displayResultDays.length - 1) {
      setActiveDayIndex(0);
    }
  }, [activeDayIndex, displayResultDays.length]);

  const activeDay = displayResultDays[activeDayIndex] || displayResultDays[0];
  const [memoValues, setMemoValues] = useState({});
  const [memoModal, setMemoModal] = useState({
    isOpen: false,
    dayIndex: null,
    itemIndex: null,
    value: "",
  });

  const closeMemoModal = () => {
    setMemoModal({ isOpen: false, dayIndex: null, itemIndex: null, value: "" });
  };
  const handleOpenMemo = (dayIndex, itemIndex) => {
    const targetDay = displayResultDays[dayIndex];
    const targetItem = targetDay?.items?.[itemIndex];
    if (!targetItem) return;
    setMemoModal({
      isOpen: true,
      dayIndex,
      itemIndex,
      value: getItemMemoValue(memoValues, dayIndex, itemIndex, targetItem),
    });
  };
  const handleChangeMemo = (value) => {
    setMemoModal((prev) => ({ ...prev, value }));
  };
  const handleSaveMemo = () => {
    const targetDay = displayResultDays[memoModal.dayIndex];
    const targetItem = targetDay?.items?.[memoModal.itemIndex];
    if (!targetItem) {
      closeMemoModal();
      return;
    }
    const key = getMemoKey(
      memoModal.dayIndex,
      memoModal.itemIndex,
      targetItem.title,
      targetItem,
    );
    const nextValue = memoModal.value.trim();
    setMemoValues((prev) => ({ ...prev, [key]: nextValue }));
    closeMemoModal();
  };

  const handleReorderItems = (dayIndex, nextItems) => {
    setCustomResultDays((prevDays) => {
      const baseDays = prevDays.length ? prevDays : resultDays;

      return baseDays.map((day, index) => {
        if (index !== dayIndex) return day;

        return rebuildDayWithItems(day, nextItems);
      });
    });
  };

  const tripLevelMapProvider = useMemo(() => {
    if (isOverseasMock) return "google";
    if (isDomesticMock) return "kakao";

    const serverMapProvider = normalizeMapProvider(serverTrip?.mapType);
    if (serverMapProvider) return serverMapProvider;

    return getExplicitMapProviderFromContext(savedRoute, location.state);
  }, [
    savedRoute,
    location.state,
    serverTrip?.mapType,
    isDomesticMock,
    isOverseasMock,
  ]);

  const activeMapProvider = useMemo(
    () => getMapProviderForDay(activeDay, activeDayIndex, tripLevelMapProvider),
    [activeDay, activeDayIndex, tripLevelMapProvider],
  );

  const openInNewTab = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenRouteMap = () => {
    const serverRouteUrl = activeDay?.isCustomOrder
      ? ""
      : activeDay?.routeUrl || serverTrip?.routeUrl;
    const matchedServerRouteUrl = isMapUrlForProvider(serverRouteUrl, activeMapProvider)
      ? serverRouteUrl
      : "";
    const url =
      matchedServerRouteUrl ||
      (activeMapProvider === "kakao"
        ? buildKakaoMapsRouteUrl(activeDay)
        : buildGoogleMapsRouteUrl(activeDay));

    if (!url) {
      alert(
        `${activeMapProvider === "kakao" ? "카카오맵" : "구글맵"}으로 넘길 장소 정보가 없어요.`,
      );
      return;
    }

    openInNewTab(url);
  };

  const handleOpenPlaceMap = (title, selectedItem = null) => {
    const currentDayItem =
      selectedItem ||
      activeDay?.items?.find((item) => item.title === title);

    const itemLevelProvider = normalizeMapProvider(
      currentDayItem?.mapProvider || currentDayItem?.provider,
    );
    const itemCountryCode = getItemCountryCode(currentDayItem || { title });
    const coordinateProvider = getMapProviderByCoordinate(
      getCoordFromItem(currentDayItem || {}),
    );

    const provider = coordinateProvider
      ? coordinateProvider
      : itemCountryCode
        ? itemCountryCode === KR
          ? "kakao"
          : "google"
        : itemLevelProvider || activeMapProvider || "google";

    const url =
      provider === "kakao"
        ? buildKakaoMapsPlaceUrl(title, currentDayItem)
        : buildGoogleMapsPlaceUrl(title, currentDayItem);

    if (!url) {
      alert(
        `${provider === "kakao" ? "카카오맵" : "구글맵"}으로 넘길 장소 정보가 없어요.`,
      );
      return;
    }

    openInNewTab(url);
  };

  // ✅ 데이터 로딩 중일 때 보여줄 빈 화면 처리
  if (isLoading) {
    return (
      <div className={`route-result-page ${isEmbedded ? "embedded" : ""}`}>
        <div className="route-result-screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#6b7788' }}>
          <p>일정 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      id={!isEmbedded ? "route-result-pdf" : undefined}
      className={`route-result-page ${isEmbedded ? "embedded" : ""}`}
    >
      {" "}
      <div className="route-result-screen">
        {" "}
        <RouteTabs
          resultDays={displayResultDays}
          activeIndex={activeDayIndex}
          onChange={setActiveDayIndex}
        />{" "}
        <RouteDayContent
          day={activeDay}
          dayIndex={activeDayIndex}
          useStaticMap={false}
          mapProvider={activeMapProvider}
          memoValues={memoValues}
          onOpenRouteMap={handleOpenRouteMap}
          onOpenPlaceMap={handleOpenPlaceMap}
          onOpenMemo={handleOpenMemo}
          onReorderItems={handleReorderItems}
        />{" "}
      </div>{" "}
      <MemoModal
        isOpen={memoModal.isOpen}
        value={memoModal.value}
        onChange={handleChangeMemo}
        onCancel={closeMemoModal}
        onSave={handleSaveMemo}
      />{" "}
      {!isEmbedded && (
        <div className="route-result-pdf-root" aria-hidden="true">
          {" "}
          {displayResultDays.map((day, index) => (
            <section
              key={`${day.label}-${index}`}
              className="route-result-pdf-day"
            >
              {" "}
              <RouteTabs
                resultDays={displayResultDays}
                activeIndex={index}
                isStatic={true}
              />{" "}
              <RouteDayContent
                day={day}
                dayIndex={index}
                useStaticMap={true}
                mapProvider={getMapProviderForDay(
                  day,
                  index,
                  tripLevelMapProvider,
                )}
                memoValues={memoValues}
              />{" "}
            </section>
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
}
export default RouteResult;