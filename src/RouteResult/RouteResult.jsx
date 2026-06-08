import React, { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { getSavedRouteById } from "../utils/routeStorage";
import api from "../api/api"; // ✅ API 통신을 위해 추가
import "./RouteResult.css";

let mapsConfigured = false;
let kakaoMapsLoadingPromise = null;
const runtimeCoordinateCache = new Map();
const TIMELINE_ITEM_BUTTON_STYLE = { cursor: "pointer" };
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
const BusIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    {" "}
    <rect
      x="5"
      y="4.5"
      width="14"
      height="11"
      rx="2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
    />{" "}
    <path
      d="M8 8.2H16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />{" "}
    <path
      d="M8.5 18.5V16M15.5 18.5V16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
    />{" "}
    <circle cx="8.5" cy="14.5" r="1" fill="currentColor" />{" "}
    <circle cx="15.5" cy="14.5" r="1" fill="currentColor" />{" "}
  </svg>
);
const WalkIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    {" "}
    <circle cx="14.5" cy="5.5" r="2" fill="currentColor" />{" "}
    <path
      d="M8 12L11.5 9.8L13.5 12.5L16.5 11"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />{" "}
    <path
      d="M11 12.5L9.3 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />{" "}
    <path
      d="M13.5 12.5L16.3 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
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
        move: "버스 15분 이동 (2.1km)",
        moveType: "bus",
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
  TOKYO: JP,
  "도쿄": JP,
  KYOTO: JP,
  "교토": JP,
  OSAKA: JP,
  "오사카": JP,
  FUKUOKA: JP,
  "후쿠오카": JP,
  SAPPORO: JP,
  "삿포로": JP,
  NAGOYA: JP,
  "나고야": JP,
  OKINAWA: JP,
  "오키나와": JP,
  KOBE: JP,
  "고베": JP,
  YOKOHAMA: JP,
  "요코하마": JP,
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

const hasValidCoordinate = (coord) => {
  const lat = Number(coord?.lat);
  const lng = Number(coord?.lng);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    !(lat === 0 && lng === 0)
  );
};

const isCoordinateInJapan = (coord) => {
  const lat = Number(coord?.lat);
  const lng = Number(coord?.lng);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 24 &&
    lat <= 46 &&
    lng >= 122 &&
    lng <= 154
  );
};

const getCountryCodeByCoordinate = (coord) => {
  if (!hasValidCoordinate(coord)) return "";

  if (isCoordinateInKorea(coord)) return KR;
  if (isCoordinateInJapan(coord)) return JP;

  return OVERSEAS;
};

const getCountryCodeByText = (value = "") => {
  const textValue = String(value || "").trim();

  if (!textValue) return "";

  const normalizedCode = normalizeCountryCode(textValue);
  if (normalizedCode === KR || normalizedCode === JP) {
    return normalizedCode;
  }

  if (
    /일본|도쿄|교토|오사카|후쿠오카|삿포로|나고야|오키나와|고베|요코하마|japan|tokyo|kyoto|osaka|fukuoka|sapporo|nagoya|okinawa|kobe|yokohama/i.test(
      textValue,
    )
  ) {
    return JP;
  }

  if (
    /대한민국|한국|서울|부산|제주|강원|경기|인천|전주|경주|여수|korea|seoul|busan|jeju/i.test(
      textValue,
    )
  ) {
    return KR;
  }

  return "";
};

const getTripCountryCode = (trip = {}) => {
  const directCountryCandidates = [
    trip.countryCode,
    trip.destinationCountryCode,
    trip.travelCountryCode,
    trip.country,
    trip.countryName,
    trip.destinationCountry,
    trip.addressCountry,
    trip.nationCode,
  ];

  const directCode = directCountryCandidates
    .map((candidate) => normalizeCountryCode(candidate))
    .find(Boolean);

  const textCountryCandidates = [trip.destination, trip.title, trip.address];
  const textCode = textCountryCandidates
    .map((candidate) => getCountryCodeByText(candidate))
    .find(Boolean);

  const coordinateCode = getCountryCodeByCoordinate({
    lat: getNumberValue(trip.latitude, trip.lat, trip.y),
    lng: getNumberValue(trip.longitude, trip.lng, trip.lon, trip.x),
  });

  // 예전 저장 데이터나 서버 기본값이 KR로 들어와도 목적지가 일본/해외면 해외 판단을 우선합니다.
  if (textCode && textCode !== KR) return textCode;
  if (coordinateCode && coordinateCode !== KR) return coordinateCode;

  return directCode || textCode || coordinateCode || "";
};

const getMapProviderFromTrip = (trip = {}) => {
  const countryCode = getTripCountryCode(trip);

  if (countryCode) {
    return countryCode === KR ? "kakao" : "google";
  }

  return normalizeMapProvider(trip.mapProvider || trip.provider || trip.mapType);
};

const getSafeServerRouteUrl = (routeUrl = "", provider = "") => {
  const url = String(routeUrl || "").trim();
  const normalizedProvider = normalizeMapProvider(provider);

  if (!url) return "";

  const lowerUrl = url.toLowerCase();

  if (normalizedProvider === "google" && lowerUrl.includes("kakao")) {
    return "";
  }

  if (
    normalizedProvider === "kakao" &&
    (lowerUrl.includes("google") || lowerUrl.includes("maps.app.goo.gl"))
  ) {
    return "";
  }

  return url;
};

const getItemCountryCode = (item = {}) => {
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

  const directCode = directCountryCandidates
    .map((candidate) => normalizeCountryCode(candidate))
    .find(Boolean);

  const textCountryCandidates = [
    item.title,
    item.placeName,
    item.name,
    item.destination,
    item.address,
    item.desc,
  ];

  const textCode = textCountryCandidates
    .map((candidate) => getCountryCodeByText(candidate))
    .find(Boolean);

  const titleCountryCode = getCountryCodeByTitle(item.title);
  const itemCoord = getCoordFromItem(item);
  const coordinateCountryCode = getCountryCodeByCoordinate(itemCoord);

  // 예전 코드가 일본 장소에 countryCode: "KR"를 넣어둔 경우에도 제목/주소/좌표가 해외면 구글맵을 우선합니다.
  if (textCode && textCode !== KR) return textCode;
  if (titleCountryCode && titleCountryCode !== KR) return titleCountryCode;
  if (coordinateCountryCode && coordinateCountryCode !== KR) {
    return coordinateCountryCode;
  }

  return directCode || textCode || titleCountryCode || coordinateCountryCode || "";
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
  const countryCodes = sourceItems.map(getItemCountryCode).filter(Boolean);

  // 일정 자체가 해외이거나 서버가 google을 명시하면 무조건 구글맵을 사용합니다.
  if (tripLevelMapProvider === "google") {
    return "google";
  }

  // 장소 중 하나라도 한국이 아니면 해외 일정으로 보고 무조건 구글맵을 사용합니다.
  if (countryCodes.some((code) => code !== KR)) {
    return "google";
  }

  const itemLevelProviders = sourceItems
    .map((item) => normalizeMapProvider(item?.mapProvider || item?.provider))
    .filter(Boolean);

  // 장소 단위에서 google이 명시되어도 구글맵을 사용합니다.
  if (itemLevelProviders.includes("google")) {
    return "google";
  }

  // 여기부터 국내 일정 처리입니다.
  if (tripLevelMapProvider === "kakao") {
    return "kakao";
  }

  if (countryCodes.length > 0 && countryCodes.every((code) => code === KR)) {
    return "kakao";
  }

  if (itemLevelProviders.includes("kakao")) {
    return "kakao";
  }

  return "kakao";
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
    memo: place.memo || place.memoText || place.note || place.notes || "",
    mapProvider: normalizeMapProvider(place.mapProvider || place.provider || place.mapType),
    countryCode: normalizeCountryCode(place.countryCode || place.country || place.nationCode),
  };
};

// ✅ 서버에서 받아온 여행/장소 데이터를 지도와 상세 일정에서 바로 쓸 수 있는 포맷으로 변환합니다.
const buildDaysFromServerData = (trip, places = []) => {
  if (!trip) return [];

  const normalizedTrip = normalizeServerTrip(trip);
  const daysCount = getTripDaysCount(normalizedTrip);
  const normalizedPlaces = places.map((place) => normalizeServerTripPlace(place));
  const tripCountryCode = getTripCountryCode(normalizedTrip);
  const tripMapProvider = getMapProviderFromTrip(normalizedTrip);

  const days = [];

  for (let i = 1; i <= daysCount; i += 1) {
    const dayPlaces = normalizedPlaces
      .filter((place) => Number(place.day || 1) === i)
      .sort((a, b) => Number(a.visitOrder || 0) - Number(b.visitOrder || 0));

    if (dayPlaces.length === 0) {
      days.push({
        label: `${i}일차`,
        totalDuration: "0시간 0분",
        totalDistance: "0km",
        sectionDistance: "일정이 없습니다.",
        routeUrl: normalizedTrip.routeUrl || "",
        items: [],
      });
      continue;
    }

    const items = dayPlaces.map((place, index) => {
      const isLast = index === dayPlaces.length - 1;
      const mockMove = makeMockMove(index);
      const title = place.placeName || "이름 없는 장소";
      const coord = {
        lat: getNumberValue(place.latitude, place.lat, place.y),
        lng: getNumberValue(place.longitude, place.lng, place.lon, place.x),
      };

      const directPlaceCountryCode = normalizeCountryCode(
        place.countryCode ||
          place.destinationCountryCode ||
          place.travelCountryCode ||
          place.country ||
          place.countryName ||
          place.destinationCountry ||
          place.addressCountry ||
          place.nationCode,
      );
      const textPlaceCountryCode =
        getCountryCodeByText(title) ||
        getCountryCodeByText(place.address) ||
        getCountryCodeByTitle(title);
      const coordinatePlaceCountryCode = getCountryCodeByCoordinate(coord);
      const placeCountryCode =
        (textPlaceCountryCode && textPlaceCountryCode !== KR
          ? textPlaceCountryCode
          : "") ||
        (coordinatePlaceCountryCode && coordinatePlaceCountryCode !== KR
          ? coordinatePlaceCountryCode
          : "") ||
        directPlaceCountryCode ||
        textPlaceCountryCode ||
        coordinatePlaceCountryCode ||
        tripCountryCode;

      const placeProvider =
        placeCountryCode && placeCountryCode !== KR
          ? "google"
          : normalizeMapProvider(place.mapProvider || place.provider || place.mapType) ||
            tripMapProvider ||
            "kakao";

      return {
        id: place.id,
        tripPlaceId: place.tripPlaceId,
        placeId: place.placeId,
        time:
          place.time ||
          place.timeLabel ||
          ["10:00 AM", "11:30 AM", "01:00 PM", "03:00 PM", "05:00 PM", "07:00 PM"][index % 6] ||
          "10:00 AM",
        title,
        desc: place.address || "",
        badge: place.isStartPoint ? "출발" : place.placeType || "",
        move: isLast ? "" : place.move || place.moveText || mockMove.move,
        moveType: isLast ? "walk" : place.moveType || place.moveTypeToNext || mockMove.moveType,
        lat: place.latitude,
        lng: place.longitude,
        latitude: place.latitude,
        longitude: place.longitude,
        address: place.address || "",
        placeType: place.placeType || "",
        day: place.day,
        visitOrder: place.visitOrder,
        isStartPoint: place.isStartPoint,
        countryCode: placeCountryCode,
        mapProvider: placeProvider,
        memo: place.memo || "",
      };
    });

    const totalMinutes = items.length * 90 + 60;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const totalDistanceNumber = (items.length * 2.4 + 3.2).toFixed(1);
    const sectionDistanceNumber = (items.length * 1.2 + 0.9).toFixed(1);

    days.push({
      label: `${i}일차`,
      totalDuration: `${hour}시간 ${minute}분`,
      totalDistance: `${totalDistanceNumber}km`,
      sectionDistance: `총 ${sectionDistanceNumber}km 이동`,
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
const buildDaysFromState = (selectedDates = [], placesByDate = {}) => {
  if (!selectedDates.length) return DEFAULT_RESULT_DAYS;
  return selectedDates.map((date, dayIndex) => {
    const dateKey = formatDateKey(date);
    const places = placesByDate?.[dateKey] || [];
    const fallbackDay =
      DEFAULT_RESULT_DAYS[dayIndex % DEFAULT_RESULT_DAYS.length] ||
      DEFAULT_RESULT_DAYS[0];
    if (!places.length) {
      return { ...fallbackDay, label: `${dayIndex + 1}일차` };
    }
    const items = places.map((place, index) => {
      const mockMove = makeMockMove(index);
      const isLast = index === places.length - 1;
      const placeName = place.name || place.title || place.placeName || "";
      return {
        time:
          place.timeLabel ||
          ["10:00 AM", "11:30 AM", "01:00 PM", "03:00 PM"][index] ||
          "10:00 AM",
        title:
          index === 0 && !placeName.includes("(출발)")
            ? `${placeName}${placeName.includes("역") ? " (출발)" : ""}`
            : placeName,
        desc:
          index === 0
            ? place.desc || "여행 시작 지점입니다."
            : place.desc || "추천 일정으로 배치된 장소입니다.",
        badge:
          index === 0
            ? placeName.includes("역")
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
        <span>총 소요 시간:</span> <strong>{day.totalDuration}</strong>{" "}
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
      {" "}
      <div className="route-result-detail-header">
        {" "}
        <h2>상세 일정</h2>{" "}
        <span className="route-result-distance-pill">
          {" "}
          {day.sectionDistance}{" "}
        </span>{" "}
      </div>{" "}
      <p className="route-result-detail-sub">
        {" "}
        가장 효율적인 동선으로 재구성되었습니다.{" "}
      </p>{" "}
      <div className="route-result-timeline">
        {" "}
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
              {" "}
              <div className="route-result-marker-column">
                {" "}
                <div className="route-result-step-circle">{index + 1}</div>{" "}
                {index !== day.items.length - 1 && (
                  <div className="route-result-step-line" />
                )}{" "}
              </div>{" "}
              <div className="route-result-item-body">
                {" "}
                <div className="route-result-item-time">{item.time}</div>{" "}
                <div className="route-result-item-title-row">
                  {" "}
                  <h3>{item.title}</h3>{" "}
                  {item.badge ? (
                    <span className="route-result-item-badge">
                      {" "}
                      {item.badge}{" "}
                    </span>
                  ) : isMemoEditable && index === 1 ? (
                    <button
                      type="button"
                      className="route-result-item-menu"
                      aria-label="메모 메뉴 열기"
                      onClick={(event) => handleMenuClick(event, index)}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      {" "}
                      <MoreVerticalIcon />{" "}
                    </button>
                  ) : null}{" "}
                </div>{" "}
                {item.desc ? (
                  <p className="route-result-item-desc">{item.desc}</p>
                ) : null}{" "}
                <TimelineMemo
                  memo={memo}
                  onClick={
                    isMemoEditable
                      ? () => onOpenMemo(dayIndex, index)
                      : undefined
                  }
                />{" "}
                {item.move ? (
                  <div className="route-result-item-move">
                    {" "}
                    <span className="route-result-item-move-icon">
                      {" "}
                      {item.moveType === "bus" ? (
                        <BusIcon />
                      ) : (
                        <WalkIcon />
                      )}{" "}
                    </span>{" "}
                    <span>{item.move}</span>{" "}
                  </div>
                ) : null}{" "}
              </div>{" "}
            </div>
          );
        })}{" "}
      </div>{" "}
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

  const savedRoute =
    initialSavedRoute ||
    savedRouteFromState ||
    (routeId ? getSavedRouteById(routeId) : null);

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

    // ✅ 1. 서버에서 조회한 데이터가 있다면 최우선으로 화면에 그려줍니다.
    if (serverTrip) {
      const serverDays = buildDaysFromServerData(serverTrip, serverTripPlaces);
      return serverDays.length > 0 ? serverDays : DEFAULT_RESULT_DAYS;
    }

    // ✅ 2. 서버 데이터가 없는데 이전 화면(RouteCreate)에서 넘겨준 임시 데이터가 있다면 렌더링
    const rawSelectedDates =
      savedRoute?.selectedDates || location.state?.selectedDates;
    const rawPlacesByDate =
      savedRoute?.placesByDate || location.state?.placesByDate;
    if (rawSelectedDates && rawSelectedDates.length) {
      const parsedDates = rawSelectedDates.map((date) => new Date(date));
      return buildDaysFromState(parsedDates, rawPlacesByDate);
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
    serverTripPlaces
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
    setMemoModal({ isOpen: false, dayIndex: null, itemIndex: null, value: "" });
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
    setMemoModal((prev) => ({ ...prev, value }));
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
      targetItem.title,
    );
    const nextValue = memoModal.value.trim();
    setMemoValues((prev) => ({ ...prev, [key]: nextValue }));
    closeMemoModal();
  };

  const tripLevelMapProvider = useMemo(() => {
    if (isOverseasMock) return "google";
    if (isDomesticMock) return "kakao";

    const serverMapProvider = getMapProviderFromTrip(serverTrip || {});
    if (serverMapProvider) return serverMapProvider;

    return getExplicitMapProviderFromContext(savedRoute, location.state);
  }, [
    serverTrip,
    savedRoute,
    location.state,
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
    const serverRouteUrl = getSafeServerRouteUrl(
      activeDay?.routeUrl || serverTrip?.routeUrl,
      activeMapProvider,
    );

    const url =
      serverRouteUrl ||
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

  const handleOpenPlaceMap = (title) => {
    const currentDayItem = activeDay?.items?.find(
      (item) => item.title === title,
    );

    const itemLevelProvider = normalizeMapProvider(
      currentDayItem?.mapProvider || currentDayItem?.provider,
    );
    const itemCountryCode = getItemCountryCode(currentDayItem || { title });

    const provider = itemCountryCode
      ? itemCountryCode === KR
        ? "kakao"
        : "google"
      : itemLevelProvider || activeMapProvider;

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
          resultDays={resultDays}
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
          {resultDays.map((day, index) => (
            <section
              key={`${day.label}-${index}`}
              className="route-result-pdf-day"
            >
              {" "}
              <RouteTabs
                resultDays={resultDays}
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