import React, { useEffect, useMemo, useRef, useState } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { useLocation, useSearchParams } from "react-router-dom";
import { getSavedRouteById } from "../utils/routeStorage";
import "./RouteResult.css";

let mapsConfigured = false;

const MAP_OPEN_BUTTON_STYLE = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
  border: "none",
  padding: 0,
  background: "transparent",
  cursor: "pointer",
};

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
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
    <circle cx="12.2" cy="10.8" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const BusIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
    <rect x="5" y="4.5" width="14" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 8.2H16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M8.5 18.5V16M15.5 18.5V16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
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
    <path d="M11 12.5L9.3 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M13.5 12.5L16.3 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const GearIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path d="M12 8.7A3.3 3.3 0 1 0 12 15.3A3.3 3.3 0 1 0 12 8.7Z" fill="none" stroke="currentColor" strokeWidth="2" />
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
    <path d="M12 5L19 9L12 13L5 9L12 5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M5 13L12 17L19 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
  </svg>
);

const FALLBACK_CENTER = { lat: 37.5665, lng: 126.978 };

const PLACE_COORDS = {
  서울역: { lat: 37.5547, lng: 126.9706 },
  남산서울타워: { lat: 37.5512, lng: 126.9882 },
  "명동 거리": { lat: 37.5636, lng: 126.9827 },
  경복궁: { lat: 37.5796, lng: 126.977 },
  북촌한옥마을: { lat: 37.5826, lng: 126.9831 },
  "삼청동 카페 거리": { lat: 37.582, lng: 126.9816 },
  익선동카페거리: { lat: 37.5743, lng: 126.9895 },
  "익선동 카페거리": { lat: 37.5743, lng: 126.9895 },
  창덕궁: { lat: 37.5794, lng: 126.991 },
  광장시장: { lat: 37.5704, lng: 126.9992 },
  한강공원: { lat: 37.5289, lng: 126.9326 },
  성수동카페거리: { lat: 37.5446, lng: 127.0557 },
  "성수동 카페거리": { lat: 37.5446, lng: 127.0557 },
  서울숲: { lat: 37.5444, lng: 127.0374 },

  가평역: { lat: 37.8184, lng: 127.5091 },
  아침고요수목원: { lat: 37.743, lng: 127.3526 },
  남이섬: { lat: 37.7915, lng: 127.5259 },
  잣향기푸른숲: { lat: 37.8158, lng: 127.3923 },
  청평카페거리: { lat: 37.7362, lng: 127.4175 },
  "청평 카페거리": { lat: 37.7362, lng: 127.4175 },
  "서울 복귀": { lat: 37.5547, lng: 126.9706 },

  제주공항: { lat: 33.5104, lng: 126.4913 },
  협재해변: { lat: 33.3945, lng: 126.2395 },
  애월카페거리: { lat: 33.4621, lng: 126.3097 },
  "애월 카페거리": { lat: 33.4621, lng: 126.3097 },
  성산일출봉: { lat: 33.4589, lng: 126.9425 },
  우도: { lat: 33.5066, lng: 126.9559 },
  섭지코지: { lat: 33.424, lng: 126.9272 },
  사려니숲길: { lat: 33.4225, lng: 126.6265 },
  "서귀포 올레시장": { lat: 33.2501, lng: 126.5654 },
  "중문 야경 포인트": { lat: 33.2488, lng: 126.4122 },
  용머리해안: { lat: 33.2317, lng: 126.3142 },
  카멜리아힐: { lat: 33.2896, lng: 126.3707 },
  "제주공항 복귀": { lat: 33.5104, lng: 126.4913 },

  부산역: { lat: 35.1151, lng: 129.0414 },
  자갈치시장: { lat: 35.0979, lng: 129.0307 },
  "광안리 해변": { lat: 35.1532, lng: 129.1187 },
  "해운대 블루라인파크": { lat: 35.1587, lng: 129.1756 },
  "해운대 암소갈비": { lat: 35.1629, lng: 129.1635 },
  "전포 카페거리": { lat: 35.1578, lng: 129.0675 },
  국제시장: { lat: 35.1028, lng: 129.0285 },
  흰여울문화마을: { lat: 35.0789, lng: 129.0457 },
  "부산역 복귀": { lat: 35.1151, lng: 129.0414 },

  교토역: { lat: 34.9855, lng: 135.7586 },
  "후시미 이나리 신사": { lat: 34.9671, lng: 135.7727 },
  기요미즈데라: { lat: 34.9949, lng: 135.785 },
  아라시야마: { lat: 35.0094, lng: 135.6668 },
  "교토 복귀": { lat: 34.9855, lng: 135.7586 },
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

const normalizeTitle = (title = "") =>
  title.replace(/\s*\([^)]*\)/g, "").trim();

const getCoordByTitle = (title = "") => {
  const normalized = normalizeTitle(title);

  if (PLACE_COORDS[title]) return PLACE_COORDS[title];
  if (PLACE_COORDS[normalized]) return PLACE_COORDS[normalized];

  const matchedKey = Object.keys(PLACE_COORDS).find(
    (key) => normalized.includes(key) || key.includes(normalized)
  );

  return matchedKey ? PLACE_COORDS[matchedKey] : null;
};

const buildGoogleMapsRouteUrl = (day) => {
  const placeNames = (day?.items || [])
    .map((item) => normalizeTitle(item.title))
    .filter(Boolean);

  if (placeNames.length === 0) return "";

  if (placeNames.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      placeNames[0]
    )}`;
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

const buildMapDataFromDay = (day, dayIndex) => {
  const fallbackDay =
    DEFAULT_RESULT_DAYS[dayIndex % DEFAULT_RESULT_DAYS.length] ||
    DEFAULT_RESULT_DAYS[0];

  const sourceItems = day?.items?.length > 0 ? day.items : fallbackDay.items;

  const points = sourceItems
    .map((item) => {
      const coord = getCoordByTitle(item.title);
      if (!coord) return null;

      return {
        ...coord,
        title: item.title,
      };
    })
    .filter(Boolean);

  if (!points.length) {
    return {
      center: FALLBACK_CENTER,
      markers: [],
      lines: [],
    };
  }

  const colors = ["#22C55E", "#21A0F6", "#A45CFF", "#F59E0B", "#EF4444"];

  const markers = points.map((point, index) => ({
    lat: point.lat,
    lng: point.lng,
    title: point.title,
    color: colors[index % colors.length],
  }));

  const lines = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    lines.push({
      color: colors[i % colors.length],
      path: [
        { lat: points[i].lat, lng: points[i].lng },
        { lat: points[i + 1].lat, lng: points[i + 1].lng },
      ],
    });
  }

  return {
    center: { lat: points[0].lat, lng: points[0].lng },
    markers,
    lines,
  };
};

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
        move: index < places.length - 1 ? mockMove.move : "",
        moveType: index < places.length - 1 ? mockMove.moveType : "walk",
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
    <div className={`route-result-tabs ${isStatic ? "route-result-tabs-static" : ""}`}>
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

const DetailSection = ({ day }) => (
  <section className="route-result-detail-section">
    <div className="route-result-detail-header">
      <h2>상세 일정</h2>
      <span className="route-result-distance-pill">{day.sectionDistance}</span>
    </div>

    <p className="route-result-detail-sub">
      가장 효율적인 동선으로 재구성되었습니다.
    </p>

    <div className="route-result-timeline">
      {day.items.map((item, index) => (
        <div
          key={`${day.label}-${item.title}-${index}`}
          className="route-result-timeline-item"
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
                <span className="route-result-item-badge">{item.badge}</span>
              ) : null}
            </div>

            {item.desc ? (
              <p className="route-result-item-desc">{item.desc}</p>
            ) : null}

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
      ))}
    </div>
  </section>
);

const GoogleMapBox = ({ dayData, dayIndex, onOpenGoogleMaps }) => {
  const mapRef = useRef(null);
  const [mapError, setMapError] = useState("");

  const mapData = useMemo(
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

    (async () => {
      try {
        const { Map } = await importLibrary("maps");
        if (!mounted || !mapRef.current) return;

        const gm = window.google.maps;

        map = new Map(mapRef.current, {
          center: mapData.center,
          zoom: 11,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        });

        const bounds = new gm.LatLngBounds();

        mapData.lines.forEach((line) => {
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
          "지도를 불러오지 못했어요. API 키 또는 Google Cloud 설정을 확인해 주세요."
        );
      }
    })();

    return () => {
      mounted = false;
      markers.forEach((marker) => marker.setMap(null));
      polylines.forEach((polyline) => polyline.setMap(null));
    };
  }, [mapData]);

  return (
    <div className="route-map-mock">
      <div ref={mapRef} className="route-map-real" />

      <button
        type="button"
        aria-label="Google Maps에서 경로 열기"
        onClick={onOpenGoogleMaps}
        style={MAP_OPEN_BUTTON_STYLE}
      />

      {mapError && <div className="route-map-error-overlay">{mapError}</div>}

      <div className="route-map-controls">
        <button
          type="button"
          className="route-map-control-btn"
          onClick={onOpenGoogleMaps}
        >
          <GearIcon />
        </button>
        <button
          type="button"
          className="route-map-control-btn"
          onClick={onOpenGoogleMaps}
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
  onOpenGoogleMaps,
}) => {
  return (
    <div className="route-result-content">
      <SummaryCard day={day} />

      <section className="route-result-map-section">
        {useStaticMap ? (
          <PdfMapPreview dayData={day} dayIndex={dayIndex} />
        ) : (
          <GoogleMapBox
            dayData={day}
            dayIndex={dayIndex}
            onOpenGoogleMaps={onOpenGoogleMaps}
          />
        )}
      </section>

      <DetailSection day={day} />
    </div>
  );
};

function RouteResult({ initialSavedRoute = null, isEmbedded = false }) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const routeId = searchParams.get("id");
  const savedRouteFromState = location.state?.savedRoute;
  const savedRoute =
    initialSavedRoute ||
    savedRouteFromState ||
    (routeId ? getSavedRouteById(routeId) : null);

  const resultDays = useMemo(() => {
    const rawSelectedDates =
      savedRoute?.selectedDates || location.state?.selectedDates;
    const rawPlacesByDate =
      savedRoute?.placesByDate || location.state?.placesByDate;

    if (rawSelectedDates && rawSelectedDates.length) {
      const parsedDates = rawSelectedDates.map((date) => new Date(date));
      return buildDaysFromState(parsedDates, rawPlacesByDate);
    }

    return DEFAULT_RESULT_DAYS;
  }, [savedRoute, location.state?.selectedDates, location.state?.placesByDate]);

  const [activeDayIndex, setActiveDayIndex] = useState(0);

  useEffect(() => {
    if (activeDayIndex > resultDays.length - 1) {
      setActiveDayIndex(0);
    }
  }, [activeDayIndex, resultDays.length]);

  const activeDay = resultDays[activeDayIndex] || resultDays[0];

  const handleOpenGoogleMaps = () => {
    const googleMapsUrl = buildGoogleMapsRouteUrl(activeDay);

    if (!googleMapsUrl) {
      alert("구글맵으로 넘길 장소 정보가 없어요.");
      return;
    }

    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
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
          onOpenGoogleMaps={handleOpenGoogleMaps}
        />
      </div>

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
              />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export default RouteResult;