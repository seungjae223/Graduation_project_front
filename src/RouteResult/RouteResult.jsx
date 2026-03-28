import React, { useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { getSavedRouteById } from "../utils/routeStorage";
import "./RouteResult.css";

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

const MapMock = () => {
  return (
    <div className="route-map-mock">
      <svg
        viewBox="0 0 800 520"
        className="route-map-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="800" height="520" fill="#eef3f6" />
        <rect x="0" y="320" width="180" height="120" fill="#d7ece3" />
        <rect x="550" y="40" width="160" height="100" fill="#d7ece3" />
        <rect x="620" y="210" width="120" height="80" fill="#d7ece3" />

        <path
          d="M0 160 C120 130, 220 170, 340 150 S580 100, 800 130"
          stroke="#d2d9e2"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M120 0 C180 100, 240 200, 300 520"
          stroke="#d2d9e2"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M460 0 C500 120, 520 210, 580 520"
          stroke="#d2d9e2"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M0 250 C130 260, 260 240, 420 255 S660 290, 800 250"
          stroke="#d2d9e2"
          strokeWidth="14"
          fill="none"
          strokeLinecap="round"
        />

        <path
          d="M80 290 C180 250, 260 210, 350 220 C430 230, 520 260, 640 210"
          stroke="#21a0f6"
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M350 220 C420 180, 500 150, 620 170"
          stroke="#a45cff"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M350 220 C310 270, 290 340, 300 450"
          stroke="#22c55e"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M620 170 C690 155, 730 120, 770 70"
          stroke="#7c3aed"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />

        <circle cx="350" cy="220" r="13" fill="#22c55e" />
        <circle cx="350" cy="220" r="5" fill="#fff" />
        <circle cx="620" cy="170" r="12" fill="#a45cff" />
        <circle cx="620" cy="170" r="5" fill="#fff" />
        <circle cx="760" cy="75" r="12" fill="#3b82f6" />
        <circle cx="760" cy="75" r="5" fill="#fff" />

        <text x="335" y="250" className="map-city-label-main">
          Seoul
        </text>
        <text x="290" y="280" className="map-city-label-sub">
          서울특별시
        </text>
      </svg>

      <div className="route-map-controls">
        <button type="button" className="route-map-control-btn">
          <GearIcon />
        </button>
        <button type="button" className="route-map-control-btn">
          <LayersIcon />
        </button>
      </div>
    </div>
  );
};

const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const buildDaysFromState = (selectedDates = [], placesByDate = {}) => {
  if (!selectedDates.length) return DEFAULT_RESULT_DAYS;

  return selectedDates.map((date, dayIndex) => {
    const dateKey = formatDateKey(date);
    const places = placesByDate?.[dateKey] || [];

    const items =
      places.length > 0
        ? places.map((place, index) => {
            const mockMove = makeMockMove(index);

            return {
              time: place.timeLabel || ["10:00 AM", "11:30 AM", "01:00 PM", "03:00 PM"][index] || "10:00 AM",
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
              move:
                index < places.length - 1 ? mockMove.move : "",
              moveType:
                index < places.length - 1 ? mockMove.moveType : "walk",
            };
          })
        : [
            {
              time: "10:00 AM",
              title: `${dayIndex + 1}일차 추천 일정`,
              desc: "아직 생성된 장소가 없어 기본 목업 일정이 표시됩니다.",
              badge: "",
              move: "",
              moveType: "walk",
            },
          ];

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

function RouteResult() {
  const location = useLocation();
  const state = location.state || {};

  const resultDays = useMemo(() => {
    return buildDaysFromState(state.selectedDates, state.placesByDate);
  }, [state.selectedDates, state.placesByDate]);

  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const activeDay = resultDays[activeDayIndex] || resultDays[0];

  return (
    <div className="route-result-page">
      <div className="route-result-tabs">
        {resultDays.map((day, index) => (
          <button
            key={day.label}
            type="button"
            className={`route-result-tab ${
              activeDayIndex === index ? "active" : ""
            }`}
            onClick={() => setActiveDayIndex(index)}
          >
            {day.label}
          </button>
        ))}
      </div>

      <div className="route-result-content">
        <section className="route-result-summary-card">
          <div className="route-result-summary-item">
            <div className="route-result-summary-icon">
              <ClockIcon />
            </div>
            <div className="route-result-summary-text">
              <span>총 소요 시간:</span>
              <strong>{activeDay.totalDuration}</strong>
            </div>
          </div>

          <div className="route-result-summary-divider" />

          <div className="route-result-summary-item">
            <div className="route-result-summary-icon">
              <PinIcon />
            </div>
            <div className="route-result-summary-text">
              <span>총 이동 거리:</span>
              <strong>{activeDay.totalDistance}</strong>
            </div>
          </div>
        </section>

        <section className="route-result-map-section">
          <MapMock />
        </section>

        <section className="route-result-detail-section">
          <div className="route-result-detail-header">
            <h2>상세 일정</h2>
            <span className="route-result-distance-pill">
              {activeDay.sectionDistance}
            </span>
          </div>

          <p className="route-result-detail-sub">
            가장 효율적인 동선으로 재구성되었습니다.
          </p>

          <div className="route-result-timeline">
            {activeDay.items.map((item, index) => (
              <div key={`${item.title}-${index}`} className="route-result-timeline-item">
                <div className="route-result-marker-column">
                  <div className="route-result-step-circle">{index + 1}</div>
                  {index !== activeDay.items.length - 1 && (
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
      </div>
    </div>
  );
}

export default RouteResult;