import React, { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getSavedRouteById } from "../utils/routeStorage";
import "./RouteResult.css";

let mapsConfigured = false;
let kakaoMapsLoadingPromise = null;
const runtimeCoordinateCache = new Map();

const TIMELINE_ITEM_BUTTON_STYLE = {
  cursor: "pointer",
};

const ROUTE_STORAGE_KEY = "mock_saved_route_results";
const ROUTE_STORAGE_EVENT = "mock-routes-updated";
const DELETE_ROUTE_EVENT = "route-result-delete-schedule";

const deleteSavedRouteById = (routeId) => {
  if (!routeId || typeof window === "undefined") {
    return false;
  }

  try {
    const raw = window.localStorage.getItem(ROUTE_STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(prev)) {
      return false;
    }

    const next = prev.filter((route) => String(route.id) !== String(routeId));

    window.localStorage.setItem(ROUTE_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ROUTE_STORAGE_EVENT));

    return prev.length !== next.length;
  } catch (error) {
    console.error("일정 삭제 실패:", error);
    return false;
  }
};

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 7.5V12.3L15.4 14.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <path
      d="M12 20C12 20 6.5 14.9 6.5 10.9C6.5 7.7 9.1 5 12.2 5C15.4 5 18 7.7 18 10.9C18 14.9 12.5 20 12.5 20H12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <circle
      cx="12.2"
      cy="10.8"
      r="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
  </svg>
);

const BusIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect
      x="5"
      y="4.5"
      width="14"
      height="11"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />
    <path
      d="M8 8.2H16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M8.5 18.5V16M15.5 18.5V16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <circle cx="8.5" cy="14.5" r="1" fill="currentColor" />
    <circle cx="15.5" cy="14.5" r="1" fill="currentColor" />
  </svg>
);

const WalkIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <circle cx="14.5" cy="5.5" r="2" fill="currentColor" />
    <path
      d="M8 12L11.5 9.8L13.5 12.5L16.5 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 12.5L9.3 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M13.5 12.5L16.3 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M12 8.7A3.3 3.3 0 1 0 12 15.3A3.3 3.3 0 1 0 12 8.7Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M19 12C19 11.5 18.95 11 18.82 10.53L21 8.8L19.2 5.7L16.56 6.5C15.84 5.9 14.99 5.45 14.06 5.21L13.5 2.5H10.5L9.94 5.21C9.01 5.45 8.16 5.9 7.44 6.5L4.8 5.7L3 8.8L5.18 10.53C5.05 11 5 11.5 5 12C5 12.5 5.05 13 5.18 13.47L3 15.2L4.8 18.3L7.44 17.5C8.16 18.1 9.01 18.55 9.94 18.79L10.5 21.5H13.5L14.06 18.79C14.99 18.55 15.84 18.1 16.56 17.5L19.2 18.3L21 15.2L18.82 13.47C18.95 13 19 12.5 19 12Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
  </svg>
);

const LayersIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M12 5L19 9L12 13L5 9L12 5Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
    />
    <path
      d="M5 13L12 17L19 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </svg>
);

const MemoInputIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M5 7H13.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M5 12H11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M15.7 11.2L18.8 14.3L12.7 20.4H9.6V17.3L15.7 11.2Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M17.2 9.7L20.3 12.8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

const MemoSavedIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <rect
      x="4"
      y="4"
      width="16"
      height="16"
      rx="2.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M8 9H16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 13H14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M7 19L10.2 15.8H17"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MoreVerticalIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <circle cx="12" cy="5" r="1.8" fill="currentColor" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <circle cx="12" cy="19" r="1.8" fill="currentColor" />
  </svg>
);

const FALLBACK_CENTER = { lat: 37.5665, lng: 126.978 };

const KR = "KR";
const JP = "JP";

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
        move: "버스 15분 이동 (2.1km)",
        moveType: "bus",
      },
      {
        time: "10:30 AM",
        title: "남산서울타워",
        desc: "전망대 관람 및 주변 산책 코스 (예상 소요 시간 1시간 30분)",
        badge: "",
        memo: "사랑의 자물쇠 미리 준비해가기!",
        move: "도보 12분 이동 (800m)",
        moveType: "walk",
      },
      {
        time: "12:15 PM",
        title: "명동 거리 (점심 식사)",
        desc: "추천 맛집: 명동교자, 하동관",
        badge: "",
        move: "",
        moveType: "walk",
      },
    ],
  },
  {
    label: "2일차",
    totalDuration: "5시간 10분",
    totalDistance: "10.2km",
    sectionDistance: "총 3.8km 이동",
    items: [
      {
        time: "09:30 AM",
        title: "경복궁",
        desc: "고궁 관람 및 수문장 교대식 관람",
        badge: "명소",
        move: "도보 10분 이동 (700m)",
        moveType: "walk",
      },
      {
        time: "11:00 AM",
        title: "북촌한옥마을",
        desc: "전통 골목 산책 및 사진 촬영",
        badge: "",
        move: "버스 18분 이동 (2.3km)",
        moveType: "bus",
      },
      {
        time: "01:00 PM",
        title: "삼청동 카페 거리",
        desc: "브런치 및 카페 휴식",
        badge: "",
        move: "",
        moveType: "walk",
      },
    ],
  },
  {
    label: "3일차",
    totalDuration: "4시간 00분",
    totalDistance: "8.9km",
    sectionDistance: "총 3.1km 이동",
    items: [
      {
        time: "10:00 AM",
        title: "익선동 카페거리",
        desc: "감성 카페 및 골목 산책",
        badge: "",
        move: "도보 9분 이동 (650m)",
        moveType: "walk",
      },
      {
        time: "11:30 AM",
        title: "창덕궁",
        desc: "후원 산책 포함 관람",
        badge: "명소",
        move: "버스 14분 이동 (1.9km)",
        moveType: "bus",
      },
      {
        time: "01:10 PM",
        title: "광장시장",
        desc: "먹거리 탐방 및 자유 일정",
        badge: "",
        move: "",
        moveType: "walk",
      },
    ],
  },
  {
    label: "4일차",
    totalDuration: "3시간 40분",
    totalDistance: "7.4km",
    sectionDistance: "총 2.6km 이동",
    items: [
      {
        time: "09:40 AM",
        title: "한강공원",
        desc: "산책 및 여유 시간",
        badge: "",
        move: "도보 15분 이동 (1.1km)",
        moveType: "walk",
      },
      {
        time: "11:00 AM",
        title: "성수동 카페거리",
        desc: "브런치 및 쇼핑",
        badge: "",
        move: "버스 12분 이동 (1.5km)",
        moveType: "bus",
      },
      {
        time: "12:30 PM",
        title: "서울숲",
        desc: "마무리 산책 코스",
        badge: "",
        move: "",
        moveType: "walk",
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
        move: "지하철 12분 이동 (3.1km)",
        moveType: "bus",
      },
      {
        time: "10:00 AM",
        title: "후시미 이나리 신사",
        desc: "도리이 길 산책",
        badge: "명소",
        move: "버스 20분 이동 (4.0km)",
        moveType: "bus",
      },
      {
        time: "12:10 PM",
        title: "기요미즈데라",
        desc: "청수사 관람 및 주변 산책",
        badge: "",
        move: "",
        moveType: "walk",
      },
    ],
  },
  {
    label: "2일차",
    totalDuration: "4시간 50분",
    totalDistance: "7.8km",
    sectionDistance: "총 2.9km 이동",
    items: [
      {
        time: "09:30 AM",
        title: "교토역",
        desc: "둘째 날 출발",
        badge: "출발",
        move: "전철 18분 이동 (6.5km)",
        moveType: "bus",
      },
      {
        time: "10:20 AM",
        title: "아라시야마",
        desc: "대나무숲 및 강변 산책",
        badge: "명소",
        move: "전철 25분 이동 (6.8km)",
        moveType: "bus",
      },
      {
        time: "01:00 PM",
        title: "교토역",
        desc: "복귀",
        badge: "복귀",
        move: "",
        moveType: "walk",
      },
    ],
  },
];

const normalizeTitle = (title = "") =>
  title.replace(/\s*\([^)]*\)/g, "").trim();

const getMemoKey = (dayIndex, itemIndex, itemTitle = "") =>
  `${dayIndex}:${itemIndex}:${normalizeTitle(itemTitle)}`;

const getInitialMemoValue = (item = {}) =>
  String(item.memo || item.memoText || item.note || item.notes || "").trim();

const getItemMemoValue = (memoValues = {}, dayIndex, itemIndex, item = {}) => {
  const key = getMemoKey(dayIndex, itemIndex, item.title);

  if (Object.prototype.hasOwnProperty.call(memoValues, key)) {
    return memoValues[key];
  }

  return getInitialMemoValue(item);
};

const getMemoDisplayTitle = (memo = "") =>
  String(memo || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || "";

const normalizeCountryCode = (value = "") =>
  String(value || "").trim().toUpperCase();

const normalizeMapProvider = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();

  if (!normalized) return "";
  if (normalized.includes("kakao")) return "kakao";
  if (normalized.includes("google")) return "google";

  return "";
};

const getSourceItemsForDay = (day, dayIndex) => {
  const fallbackDay =
    DEFAULT_RESULT_DAYS[dayIndex % DEFAULT_RESULT_DAYS.length] ||
    DEFAULT_RESULT_DAYS[0];

  return day?.items?.length > 0 ? day.items : fallbackDay.items;
};

const getRuntimeCoordinateCacheKey = (provider, title) =>
  `${provider}:${normalizeTitle(title)}`;

const MAP_OUTLIER_DISTANCE_KM = 80;

const toRadians = (degree) => (degree * Math.PI) / 180;

const getDistanceKm = (a, b) => {
  const earthRadiusKm = 6371;

  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
};

const filterResolvedPointsForMap = (points = []) => {
  if (points.length <= 1) {
    return points;
  }

  const staticPoints = points.filter((point) => point.resolvedBy === "static");

  if (points.length === 2) {
    if (
      staticPoints.length === 1 &&
      getDistanceKm(points[0], points[1]) > MAP_OUTLIER_DISTANCE_KM
    ) {
      return staticPoints;
    }

    return points;
  }

  const anchorCandidates = staticPoints.length > 0 ? staticPoints : points;

  const getNeighborCount = (basePoint) =>
    points.filter(
      (point) => getDistanceKm(basePoint, point) <= MAP_OUTLIER_DISTANCE_KM
    ).length;

  const anchor = anchorCandidates.reduce(
    (bestPoint, currentPoint) =>
      getNeighborCount(currentPoint) > getNeighborCount(bestPoint)
        ? currentPoint
        : bestPoint,
    anchorCandidates[0]
  );

  const clusteredPoints = points.filter(
    (point) => getDistanceKm(anchor, point) <= MAP_OUTLIER_DISTANCE_KM
  );

  return clusteredPoints.length >= 2 && clusteredPoints.length > points.length / 2
    ? clusteredPoints
    : points;
};

const getPlaceMetaByTitle = (title = "") => {
  const normalized = normalizeTitle(title);

  if (PLACE_COORDS[title]) return PLACE_COORDS[title];
  if (PLACE_COORDS[normalized]) return PLACE_COORDS[normalized];

  const matchedKey = Object.keys(PLACE_COORDS).find(
    (key) => normalized.includes(key) || key.includes(normalized)
  );

  return matchedKey ? PLACE_COORDS[matchedKey] : null;
};

const getCoordByTitle = (title = "") => {
  const meta = getPlaceMetaByTitle(title);
  return meta ? { lat: meta.lat, lng: meta.lng } : null;
};

const getCountryCodeByTitle = (title = "") =>
  getPlaceMetaByTitle(title)?.countryCode || "";

const getItemCountryCode = (item = {}) => {
  const directCountryCandidates = [
    item.countryCode,
    item.destinationCountryCode,
    item.country,
    item.nationCode,
  ];

  for (const candidate of directCountryCandidates) {
    const code = normalizeCountryCode(candidate);
    if (code) return code;
  }

  return getCountryCodeByTitle(item.title);
};

const getExplicitMapProviderFromContext = (savedRoute, routeState) => {
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

  const countryCandidates = [
    savedRoute?.countryCode,
    savedRoute?.destinationCountryCode,
    savedRoute?.travelCountryCode,
    savedRoute?.destination?.countryCode,
    routeState?.countryCode,
    routeState?.destinationCountryCode,
    routeState?.travelCountryCode,
    routeState?.destination?.countryCode,
  ];

  for (const candidate of countryCandidates) {
    const code = normalizeCountryCode(candidate);
    if (code) {
      return code === KR ? "kakao" : "google";
    }
  }

  return "";
};

const getMapProviderForDay = (day, dayIndex, tripLevelMapProvider = "") => {
  if (tripLevelMapProvider) {
    return tripLevelMapProvider;
  }

  const sourceItems = getSourceItemsForDay(day, dayIndex);

  const itemLevelProviders = sourceItems
    .map((item) => normalizeMapProvider(item?.mapProvider || item?.provider))
    .filter(Boolean);

  if (itemLevelProviders.includes("google")) return "google";
  if (itemLevelProviders.includes("kakao")) return "kakao";

  const countryCodes = sourceItems.map(getItemCountryCode).filter(Boolean);

  if (countryCodes.some((code) => code !== KR)) return "google";
  if (countryCodes.some((code) => code === KR)) return "kakao";

  return "kakao";
};

const buildGoogleMapsPlaceUrl = (title = "") => {
  const query = normalizeTitle(title);

  if (!query) return "";

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query
  )}`;
};

const buildGoogleMapsRouteUrl = (day) => {
  const placeNames = (day?.items || [])
    .map((item) => normalizeTitle(item.title))
    .filter(Boolean);

  if (placeNames.length === 0) return "";

  if (placeNames.length === 1) {
    return buildGoogleMapsPlaceUrl(placeNames[0]);
  }

  const origin = placeNames[0];
  const destination = placeNames[placeNames.length - 1];
  const waypoints = placeNames.slice(1, -1);

  let url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}`;

  if (waypoints.length > 0) {
    url += `&waypoints=${encodeURIComponent(waypoints.join("|"))}`;
  }

  return url;
};

const buildKakaoMapsPlaceUrl = (title = "") => {
  const name = normalizeTitle(title);

  if (!name) return "";

  const place = getPlaceMetaByTitle(title);

  if (place) {
    return `https://map.kakao.com/link/map/${encodeURIComponent(name)},${
      place.lat
    },${place.lng}`;
  }

  return `https://map.kakao.com/link/search/${encodeURIComponent(name)}`;
};

const buildKakaoMapsRouteUrl = (day) => {
  const placeInfos = (day?.items || [])
    .map((item) => {
      const name = normalizeTitle(item.title);
      const place = getPlaceMetaByTitle(item.title);

      if (!name || !place) return null;

      return {
        name,
        lat: place.lat,
        lng: place.lng,
      };
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

  const movementType =
    (day?.items || []).every(
      (item, index, array) =>
        index === array.length - 1 || (item.moveType || "walk") === "walk"
    )
      ? "walk"
      : "car";

  const segments = placeInfos.map(
    (place) => `${encodeURIComponent(place.name)},${place.lat},${place.lng}`
  );

  return `https://map.kakao.com/link/by/${movementType}/${segments.join("/")}`;
};

const buildMapDataFromResolvedPoints = (sourceItems, resolvedPoints) => {
  const filteredPoints = filterResolvedPointsForMap(resolvedPoints);

  if (!filteredPoints.length) {
    return {
      center: FALLBACK_CENTER,
      markers: [],
      lines: [],
    };
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
      const coord = getCoordByTitle(item.title);
      if (!coord) return null;

      return {
        ...coord,
        title: item.title,
        sourceIndex: index,
        resolvedBy: "static",
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
        const staticCoord = getCoordByTitle(item.title);
        const coord =
          staticCoord ||
          (typeof resolveDynamicCoord === "function"
            ? await resolveDynamicCoord(item.title)
            : null);

        if (!coord) return null;

        return {
          ...coord,
          title: item.title,
          sourceIndex: index,
          resolvedBy: staticCoord ? "static" : "dynamic",
        };
      })
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
    const appKey = process.env.REACT_APP_KAKAO_MAP_JS_KEY;

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
      'script[data-kakao-maps="true"]'
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
        { once: true }
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
        finish({
          lat: Number(data[0].y),
          lng: Number(data[0].x),
        });
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
      `size:mid|color:${toStaticMarkerColor(marker.color)}|${marker.lat},${marker.lng}`
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

const makeMockMove = (index) => {
  const busTexts = [
    "버스 15분 이동 (2.1km)",
    "버스 12분 이동 (1.8km)",
    "버스 18분 이동 (2.4km)",
  ];
  const walkTexts = [
    "도보 12분 이동 (800m)",
    "도보 9분 이동 (650m)",
    "도보 14분 이동 (1.1km)",
  ];

  return index % 2 === 0
    ? { move: busTexts[index % busTexts.length], moveType: "bus" }
    : { move: walkTexts[index % walkTexts.length], moveType: "walk" };
};

const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildDaysFromState = (selectedDates = [], placesByDate = {}) => {
  if (!selectedDates.length) return DEFAULT_RESULT_DAYS;

  return selectedDates.map((date, dayIndex) => {
    const dateKey = formatDateKey(date);
    const places = placesByDate?.[dateKey] || [];
    const fallbackDay =
      DEFAULT_RESULT_DAYS[dayIndex % DEFAULT_RESULT_DAYS.length] ||
      DEFAULT_RESULT_DAYS[0];

    if (!places.length) {
      return {
        ...fallbackDay,
        label: `${dayIndex + 1}일차`,
      };
    }

    const items = places.map((place, index) => {
      const mockMove = makeMockMove(index);
      const isLast = index === places.length - 1;

      return {
        time:
          place.timeLabel ||
          ["10:00 AM", "11:30 AM", "01:00 PM", "03:00 PM"][index] ||
          "10:00 AM",
        title:
          index === 0 && !place.name.includes("(출발)")
            ? `${place.name}${place.name.includes("역") ? " (출발)" : ""}`
            : place.name,
        desc:
          index === 0
            ? place.desc || "여행 시작 지점입니다."
            : place.desc || "추천 일정으로 배치된 장소입니다.",
        badge:
          index === 0
            ? place.name.includes("역")
              ? "지하철/KTX"
              : "출발"
            : place.isFixedTime
            ? "고정 일정"
            : "",
        move: isLast
          ? ""
          : place.moveTextToNext || place.moveText || mockMove.move,
        moveType: isLast
          ? "walk"
          : place.moveTypeToNext || place.moveType || mockMove.moveType,
        countryCode: normalizeCountryCode(
          place.countryCode ||
            place.destinationCountryCode ||
            place.country ||
            place.nationCode
        ),
        mapProvider: normalizeMapProvider(
          place.mapProvider || place.provider || place.mapType
        ),
        memo: place.memo || place.memoText || place.note || place.notes || "",
      };
    });

    const totalMinutes = items.length * 90 + 60;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const totalDistanceNumber = (items.length * 2.4 + 3.2).toFixed(1);
    const sectionDistanceNumber = (items.length * 1.2 + 0.9).toFixed(1);

    return {
      label: `${dayIndex + 1}일차`,
      totalDuration: `${hour}시간 ${minute}분`,
      totalDistance: `${totalDistanceNumber}km`,
      sectionDistance: `총 ${sectionDistanceNumber}km 이동`,
      items,
    };
  });
};

const RouteTabs = ({ resultDays, activeIndex, onChange, isStatic = false }) => {
  return (
    <div
      className={`route-result-tabs ${
        isStatic ? "route-result-tabs-static" : ""
      }`}
    >
      {resultDays.map((day, index) =>
        isStatic ? (
          <div
            key={`${day.label}-${index}`}
            className={`route-result-tab ${
              activeIndex === index ? "active" : ""
            }`}
          >
            {day.label}
          </div>
        ) : (
          <button
            key={`${day.label}-${index}`}
            type="button"
            className={`route-result-tab ${
              activeIndex === index ? "active" : ""
            }`}
            onClick={() => onChange(index)}
          >
            {day.label}
          </button>
        )
      )}
    </div>
  );
};

const SummaryCard = ({ day }) => (
  <section className="route-result-summary-card">
    <div className="route-result-summary-item">
      <div className="route-result-summary-icon">
        <ClockIcon />
      </div>
      <div className="route-result-summary-text">
        <span>총 소요 시간:</span>
        <strong>{day.totalDuration}</strong>
      </div>
    </div>

    <div className="route-result-summary-divider" />

    <div className="route-result-summary-item">
      <div className="route-result-summary-icon">
        <PinIcon />
      </div>
      <div className="route-result-summary-text">
        <span>총 이동 거리:</span>
        <strong>{day.totalDistance}</strong>
      </div>
    </div>
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
        <span className="route-result-memo-icon">{icon}</span>
        <span className="route-result-memo-text">{text}</span>
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
      <span className="route-result-memo-icon">{icon}</span>
      <span className="route-result-memo-text">{text}</span>
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
      <div
        className="route-result-memo-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-result-memo-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h3 id="route-result-memo-title">메모 작성</h3>

        <textarea
          ref={textareaRef}
          className="route-result-memo-textarea"
          value={value}
          placeholder="이 장소에 대한 메모를 남겨보세요."
          onChange={(event) => onChange(event.target.value)}
        />

        <div className="route-result-memo-actions">
          <button
            type="button"
            className="route-result-memo-cancel"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            className="route-result-memo-save"
            onClick={onSave}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

const DetailSection = ({
  day,
  dayIndex,
  memoValues = {},
  onOpenMemo,
  onOpenPlaceMap,
  mapProvider = "google",
}) => {
  const providerLabel = mapProvider === "kakao" ? "카카오맵" : "구글맵";
  const isClickable = typeof onOpenPlaceMap === "function";
  const isMemoEditable = typeof onOpenMemo === "function";

  const handleOpen = (title) => {
    if (typeof onOpenPlaceMap === "function") {
      onOpenPlaceMap(title);
    }
  };

  const handleKeyDown = (event, title) => {
    if (!isClickable) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen(title);
    }
  };

  const handleMenuClick = (event, itemIndex) => {
    event.stopPropagation();

    if (isMemoEditable) {
      onOpenMemo(dayIndex, itemIndex);
    }
  };

  return (
    <section className="route-result-detail-section">
      <div className="route-result-detail-header">
        <h2>상세 일정</h2>
        <span className="route-result-distance-pill">
          {day.sectionDistance}
        </span>
      </div>

      <p className="route-result-detail-sub">
        가장 효율적인 동선으로 재구성되었습니다.
      </p>

      <div className="route-result-timeline">
        {day.items.map((item, index) => {
          const memo = getItemMemoValue(memoValues, dayIndex, index, item);

          return (
            <div
              key={`${day.label}-${item.title}-${index}`}
              className="route-result-timeline-item"
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onClick={isClickable ? () => handleOpen(item.title) : undefined}
              onKeyDown={
                isClickable
                  ? (event) => handleKeyDown(event, item.title)
                  : undefined
              }
              style={isClickable ? TIMELINE_ITEM_BUTTON_STYLE : undefined}
              aria-label={
                isClickable
                  ? `${normalizeTitle(item.title)} ${providerLabel}에서 열기`
                  : undefined
              }
            >
              <div className="route-result-marker-column">
                <div className="route-result-step-circle">{index + 1}</div>
                {index !== day.items.length - 1 && (
                  <div className="route-result-step-line" />
                )}
              </div>

              <div className="route-result-item-body">
                <div className="route-result-item-time">{item.time}</div>

                <div className="route-result-item-title-row">
                  <h3>{item.title}</h3>

                  {item.badge ? (
                    <span className="route-result-item-badge">
                      {item.badge}
                    </span>
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
                    isMemoEditable
                      ? () => onOpenMemo(dayIndex, index)
                      : undefined
                  }
                />

                {item.move ? (
                  <div className="route-result-item-move">
                    <span className="route-result-item-move-icon">
                      {item.moveType === "bus" ? <BusIcon /> : <WalkIcon />}
                    </span>
                    <span>{item.move}</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

const GoogleMapBox = ({ dayData, dayIndex, onOpenMap }) => {
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState("");

  const fallbackMapData = useMemo(
    () => buildMapDataFromDay(dayData, dayIndex),
    [dayData, dayIndex]
  );

  useEffect(() => {
    const apiKey = process.env.REACT_APP_GOOGLE_MAPS_BROWSER_KEY;

    if (!apiKey) {
      setMapError("구글맵 API 키가 없습니다. .env 파일을 확인하세요.");
      return;
    }

    if (!mapsConfigured) {
      setOptions({
        key: apiKey,
        v: "weekly",
      });
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
        strokeColor: line.color,
        strokeOpacity: 1,
        strokeWeight: 5,
        geodesic: true,
      });

      polylines.push(polyline);
    };

    (async () => {
      try {
        const { Map } = await importLibrary("maps");
        await importLibrary("routes");

        if (!mounted || !mapRef.current) return;

        const gm = window.google.maps;
        const directionsService = new gm.DirectionsService();
        const geocoder = new gm.Geocoder();

        const resolvedMapData = await resolveMapDataForDay(
          dayData,
          dayIndex,
          (title) => resolveGoogleCoordinate(gm, title, geocoder)
        );

        if (!mounted || !mapRef.current) return;

        const mapData =
          resolvedMapData.markers.length > 0 ? resolvedMapData : fallbackMapData;

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

        await Promise.all(
          mapData.lines.map(async (line) => {
            if (line.moveType !== "walk") {
              drawStraightLine(gm, line, bounds);
              return;
            }

            try {
              const result = await directionsService.route({
                origin: line.path[0],
                destination: line.path[1],
                travelMode: gm.TravelMode.WALKING,
              });

              const route = result.routes?.[0];
              const drawPath =
                route?.overview_path && route.overview_path.length > 0
                  ? route.overview_path
                  : line.path;

              drawPath.forEach((point) => bounds.extend(point));

              const polyline = new gm.Polyline({
                map,
                path: drawPath,
                strokeColor: line.color,
                strokeOpacity: 1,
                strokeWeight: 5,
                geodesic: true,
              });

              polylines.push(polyline);
            } catch (error) {
              console.error("도보 경로 계산 실패:", error);
              drawStraightLine(gm, line, bounds);
            }
          })
        );

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
          "지도를 불러오지 못했어요. API 키 또는 Google Cloud 설정을 확인해 주세요."
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
          resolvedMapData.markers.length > 0 ? resolvedMapData : fallbackMapData;

        map = new kakao.maps.Map(mapRef.current, {
          center: new kakao.maps.LatLng(mapData.center.lat, mapData.center.lng),
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
          const path = line.path.map(
            (point) => new kakao.maps.LatLng(point.lat, point.lng)
          );

          path.forEach((point) => bounds.extend(point));

          const polyline = new kakao.maps.Polyline({
            map,
            path,
            strokeWeight: 5,
            strokeColor: line.color,
            strokeOpacity: 1,
            strokeStyle: "solid",
          });

          polylines.push(polyline);
        });

        mapData.markers.forEach((marker) => {
          const position = new kakao.maps.LatLng(marker.lat, marker.lng);
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
        } else if (mapData.markers.length === 1) {
          map.setCenter(
            new kakao.maps.LatLng(mapData.center.lat, mapData.center.lng)
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
    [dayData, dayIndex]
  );

  const staticMapUrl = useMemo(() => buildStaticMapUrl(mapData), [mapData]);

  useEffect(() => {
    setImageFailed(false);
  }, [staticMapUrl]);

  if (!staticMapUrl || imageFailed) {
    return (
      <div className="route-map-static-fallback">
        PDF용 지도 이미지를 불러오지 못했어요.
      </div>
    );
  }

  return (
    <div className="route-map-static-preview">
      <img
        src={staticMapUrl}
        alt={`${dayData.label} 경로 지도`}
        className="route-map-static-image"
        crossOrigin="anonymous"
        loading="eager"
        data-pdf-asset="true"
        onError={() => setImageFailed(true)}
      />
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
}) => {
  return (
    <div className="route-result-content">
      <SummaryCard day={day} />

      <section className="route-result-map-section">
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
        )}
      </section>

      <DetailSection
        day={day}
        dayIndex={dayIndex}
        memoValues={memoValues}
        onOpenMemo={onOpenMemo}
        onOpenPlaceMap={onOpenPlaceMap}
        mapProvider={mapProvider}
      />
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
  const savedRoute =
    initialSavedRoute ||
    savedRouteFromState ||
    (routeId ? getSavedRouteById(routeId) : null);

  useEffect(() => {
    if (isEmbedded) return undefined;

    const handleDeleteSchedule = () => {
      const targetRouteId = routeId || savedRoute?.id;

      if (!targetRouteId) {
        alert("삭제할 일정 정보를 찾지 못했어요.");
        return;
      }

      const deleted = deleteSavedRouteById(targetRouteId);

      if (!deleted) {
        console.log("삭제할 일정이 localStorage에 없어요:", targetRouteId);
      }

      navigate("/my-schedule", { replace: true });
    };

    window.addEventListener(DELETE_ROUTE_EVENT, handleDeleteSchedule);

    return () => {
      window.removeEventListener(DELETE_ROUTE_EVENT, handleDeleteSchedule);
    };
  }, [routeId, savedRoute?.id, navigate, isEmbedded]);

  const resultDays = useMemo(() => {
    if (isOverseasMock) {
      return DEFAULT_OVERSEAS_RESULT_DAYS;
    }

    if (isDomesticMock) {
      return DEFAULT_RESULT_DAYS;
    }

    const rawSelectedDates =
      savedRoute?.selectedDates || location.state?.selectedDates;
    const rawPlacesByDate =
      savedRoute?.placesByDate || location.state?.placesByDate;

    if (rawSelectedDates && rawSelectedDates.length) {
      const parsedDates = rawSelectedDates.map((date) => new Date(date));
      return buildDaysFromState(parsedDates, rawPlacesByDate);
    }

    return DEFAULT_RESULT_DAYS;
  }, [
    savedRoute,
    location.state?.selectedDates,
    location.state?.placesByDate,
    isDomesticMock,
    isOverseasMock,
  ]);

  const [activeDayIndex, setActiveDayIndex] = useState(0);

  useEffect(() => {
    if (activeDayIndex > resultDays.length - 1) {
      setActiveDayIndex(0);
    }
  }, [activeDayIndex, resultDays.length]);

  const activeDay = resultDays[activeDayIndex] || resultDays[0];

  const [memoValues, setMemoValues] = useState({});
  const [memoModal, setMemoModal] = useState({
    isOpen: false,
    dayIndex: null,
    itemIndex: null,
    value: "",
  });

  const closeMemoModal = () => {
    setMemoModal({
      isOpen: false,
      dayIndex: null,
      itemIndex: null,
      value: "",
    });
  };

  const handleOpenMemo = (dayIndex, itemIndex) => {
    const targetDay = resultDays[dayIndex];
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
    setMemoModal((prev) => ({
      ...prev,
      value,
    }));
  };

  const handleSaveMemo = () => {
    const targetDay = resultDays[memoModal.dayIndex];
    const targetItem = targetDay?.items?.[memoModal.itemIndex];

    if (!targetItem) {
      closeMemoModal();
      return;
    }

    const key = getMemoKey(
      memoModal.dayIndex,
      memoModal.itemIndex,
      targetItem.title
    );

    const nextValue = memoModal.value.trim();

    setMemoValues((prev) => ({
      ...prev,
      [key]: nextValue,
    }));

    closeMemoModal();
  };

  const tripLevelMapProvider = useMemo(() => {
    if (isOverseasMock) return "google";
    if (isDomesticMock) return "kakao";

    return getExplicitMapProviderFromContext(savedRoute, location.state);
  }, [savedRoute, location.state, isDomesticMock, isOverseasMock]);

  const activeMapProvider = useMemo(
    () => getMapProviderForDay(activeDay, activeDayIndex, tripLevelMapProvider),
    [activeDay, activeDayIndex, tripLevelMapProvider]
  );

  const openInNewTab = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleOpenRouteMap = () => {
    const url =
      activeMapProvider === "kakao"
        ? buildKakaoMapsRouteUrl(activeDay)
        : buildGoogleMapsRouteUrl(activeDay);

    if (!url) {
      alert(
        `${
          activeMapProvider === "kakao" ? "카카오맵" : "구글맵"
        }으로 넘길 장소 정보가 없어요.`
      );
      return;
    }

    openInNewTab(url);
  };

  const handleOpenPlaceMap = (title) => {
    const currentDayItem = activeDay?.items?.find((item) => item.title === title);

    const itemLevelProvider = normalizeMapProvider(
      currentDayItem?.mapProvider || currentDayItem?.provider
    );

    const itemCountryCode = getItemCountryCode(currentDayItem || { title });

    const provider =
      itemLevelProvider ||
      (itemCountryCode
        ? itemCountryCode === KR
          ? "kakao"
          : "google"
        : activeMapProvider);

    const url =
      provider === "kakao"
        ? buildKakaoMapsPlaceUrl(title)
        : buildGoogleMapsPlaceUrl(title);

    if (!url) {
      alert(
        `${
          provider === "kakao" ? "카카오맵" : "구글맵"
        }으로 넘길 장소 정보가 없어요.`
      );
      return;
    }

    openInNewTab(url);
  };

  return (
    <div
      id={!isEmbedded ? "route-result-pdf" : undefined}
      className={`route-result-page ${isEmbedded ? "embedded" : ""}`}
    >
      <div className="route-result-screen">
        <RouteTabs
          resultDays={resultDays}
          activeIndex={activeDayIndex}
          onChange={setActiveDayIndex}
        />

        <RouteDayContent
          day={activeDay}
          dayIndex={activeDayIndex}
          useStaticMap={false}
          mapProvider={activeMapProvider}
          memoValues={memoValues}
          onOpenRouteMap={handleOpenRouteMap}
          onOpenPlaceMap={handleOpenPlaceMap}
          onOpenMemo={handleOpenMemo}
        />
      </div>

      <MemoModal
        isOpen={memoModal.isOpen}
        value={memoModal.value}
        onChange={handleChangeMemo}
        onCancel={closeMemoModal}
        onSave={handleSaveMemo}
      />

      {!isEmbedded && (
        <div className="route-result-pdf-root" aria-hidden="true">
          {resultDays.map((day, index) => (
            <section
              key={`${day.label}-${index}`}
              className="route-result-pdf-day"
            >
              <RouteTabs
                resultDays={resultDays}
                activeIndex={index}
                isStatic={true}
              />

              <RouteDayContent
                day={day}
                dayIndex={index}
                useStaticMap={true}
                mapProvider={getMapProviderForDay(
                  day,
                  index,
                  tripLevelMapProvider
                )}
                memoValues={memoValues}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default RouteResult;