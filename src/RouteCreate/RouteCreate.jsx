import { getApiErrorMessage as safeApiErrorMessage } from "../api/api";
import { logSafeApiError } from "../utils/safeLog";
import { validateTripRequest } from "../utils/tripValidation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import "./RouteCreate.css";

import heartIcon from "../img/파랑색 하트.png";
import scheduleIcon from "../img/파랑색 일정.png";
import blueFolderIcon from "../img/파랑색폴더.png";
import darkFolderIcon from "../img/검정색폴더.png";

import PlacePhoto from "../components/PlacePhoto";
import useRoutePlaceSearch from "./useRoutePlaceSearch";
import useFavoriteFolders from "./useFavoriteFolders";
import { createGenerationRequest } from "./generationRequest";
import StartPlaceModal from "./StartPlaceModal";
import useModalFocus from "../utils/useModalFocus";
import api from "../api/api";
import useGenerationTask from "./useGenerationTask";

const ROUTE_SELECTED_PLACE_KEY = "routeSelectedPlace";
const ROUTE_DRAFT_PLACES_KEY = "routeDraftPlaces";
const RECENT_PLACES_KEY = "recentPlaces";
const TRIPS_API = "/api/trips";

const DEFAULT_COORDS = {
  latitude: 37.5665,
  longitude: 126.978,
};

const toNumberOrNull = (...values) => {
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

const PLACE_COORDS_BY_SOURCE_ID = {
  "seoul-gyeongbokgung": { latitude: 37.5796, longitude: 126.977 },
  "seoul-bukchon": { latitude: 37.5826, longitude: 126.9831 },
  "seoul-ikseondong": { latitude: 37.5743, longitude: 126.9895 },
  "seoul-starfield-library": { latitude: 37.5126, longitude: 127.0598 },
  "seoul-namsan-tower": { latitude: 37.5512, longitude: 126.9882 },

  "tokyo-skytree": { latitude: 35.7101, longitude: 139.8107 },
  "tokyo-sensoji": { latitude: 35.7148, longitude: 139.7967 },
  "tokyo-shibuya-scramble": { latitude: 35.6584, longitude: 139.7016 },

  "busan-haeundae": { latitude: 35.1587, longitude: 129.1604 },
  "busan-gwangalli": { latitude: 35.1532, longitude: 129.1187 },
  "busan-gamcheon": { latitude: 35.0975, longitude: 129.0106 },

  "paris-eiffel-tower": { latitude: 48.8584, longitude: 2.2945 },
  "paris-louvre": { latitude: 48.8606, longitude: 2.3376 },
  "paris-montmartre": { latitude: 48.8867, longitude: 2.3431 },

  "jeju-seongsan": { latitude: 33.4589, longitude: 126.9425 },
  "jeju-hyeopjae": { latitude: 33.3945, longitude: 126.2395 },
  "jeju-aewol-cafe-street": { latitude: 33.4621, longitude: 126.3097 },

  "newyork-times-square": { latitude: 40.758, longitude: -73.9855 },
  "newyork-central-park": { latitude: 40.7812, longitude: -73.9665 },
  "newyork-met-museum": { latitude: 40.7794, longitude: -73.9632 },

  "gyeongju-donggung": { latitude: 35.8346, longitude: 129.2266 },
  "gyeongju-hwangridan": { latitude: 35.8382, longitude: 129.2109 },

  "bangkok-wat-arun": { latitude: 13.7437, longitude: 100.4889 },
  "bangkok-iconsiam": { latitude: 13.7266, longitude: 100.5103 },
  "bangkok-chatuchak": { latitude: 13.7996, longitude: 100.5501 },

  "osaka-dotonbori": { latitude: 34.6687, longitude: 135.5013 },
  "osaka-usj": { latitude: 34.6654, longitude: 135.4323 },

  "singapore-marina-bay-sands": { latitude: 1.2834, longitude: 103.8607 },
  "singapore-gardens-by-the-bay": { latitude: 1.2816, longitude: 103.8636 },
  "singapore-merlion-park": { latitude: 1.2868, longitude: 103.8545 },
};

const PLACE_COORDS_BY_NAME = {
  경복궁: PLACE_COORDS_BY_SOURCE_ID["seoul-gyeongbokgung"],
  북촌한옥마을: PLACE_COORDS_BY_SOURCE_ID["seoul-bukchon"],
  "익선동 카페거리": PLACE_COORDS_BY_SOURCE_ID["seoul-ikseondong"],
  별마당도서관: PLACE_COORDS_BY_SOURCE_ID["seoul-starfield-library"],
  "N서울타워": PLACE_COORDS_BY_SOURCE_ID["seoul-namsan-tower"],
  "도쿄 스카이트리": PLACE_COORDS_BY_SOURCE_ID["tokyo-skytree"],
  센소지: PLACE_COORDS_BY_SOURCE_ID["tokyo-sensoji"],
  "시부야 스크램블 스퀘어": PLACE_COORDS_BY_SOURCE_ID["tokyo-shibuya-scramble"],
  "해운대 해수욕장": PLACE_COORDS_BY_SOURCE_ID["busan-haeundae"],
  "광안리 해수욕장": PLACE_COORDS_BY_SOURCE_ID["busan-gwangalli"],
  감천문화마을: PLACE_COORDS_BY_SOURCE_ID["busan-gamcheon"],
  에펠탑: PLACE_COORDS_BY_SOURCE_ID["paris-eiffel-tower"],
  "루브르 박물관": PLACE_COORDS_BY_SOURCE_ID["paris-louvre"],
  몽마르트르: PLACE_COORDS_BY_SOURCE_ID["paris-montmartre"],
  성산일출봉: PLACE_COORDS_BY_SOURCE_ID["jeju-seongsan"],
  "성산 일출봉": PLACE_COORDS_BY_SOURCE_ID["jeju-seongsan"],
  협재해수욕장: PLACE_COORDS_BY_SOURCE_ID["jeju-hyeopjae"],
  애월카페거리: PLACE_COORDS_BY_SOURCE_ID["jeju-aewol-cafe-street"],
  "애월 카페거리": PLACE_COORDS_BY_SOURCE_ID["jeju-aewol-cafe-street"],
  "타임스 스퀘어": PLACE_COORDS_BY_SOURCE_ID["newyork-times-square"],
  "센트럴 파크": PLACE_COORDS_BY_SOURCE_ID["newyork-central-park"],
  "메트로폴리탄 미술관": PLACE_COORDS_BY_SOURCE_ID["newyork-met-museum"],
  "동궁과 월지": PLACE_COORDS_BY_SOURCE_ID["gyeongju-donggung"],
  황리단길: PLACE_COORDS_BY_SOURCE_ID["gyeongju-hwangridan"],
  "왓 아룬": PLACE_COORDS_BY_SOURCE_ID["bangkok-wat-arun"],
  아이콘시암: PLACE_COORDS_BY_SOURCE_ID["bangkok-iconsiam"],
  "짜뚜짝 시장": PLACE_COORDS_BY_SOURCE_ID["bangkok-chatuchak"],
  도톤보리: PLACE_COORDS_BY_SOURCE_ID["osaka-dotonbori"],
  "유니버설 스튜디오 재팬": PLACE_COORDS_BY_SOURCE_ID["osaka-usj"],
  "마리나 베이 샌즈": PLACE_COORDS_BY_SOURCE_ID["singapore-marina-bay-sands"],
  "가든스 바이 더 베이": PLACE_COORDS_BY_SOURCE_ID["singapore-gardens-by-the-bay"],
  "멀라이언 파크": PLACE_COORDS_BY_SOURCE_ID["singapore-merlion-park"],
};

const PLACE_COORDS_BY_CITY = {
  서울: { latitude: 37.5665, longitude: 126.978 },
  부산: { latitude: 35.1796, longitude: 129.0756 },
  제주: { latitude: 33.4996, longitude: 126.5312 },
  경주: { latitude: 35.8562, longitude: 129.2247 },
  도쿄: { latitude: 35.6762, longitude: 139.6503 },
  오사카: { latitude: 34.6937, longitude: 135.5023 },
  파리: { latitude: 48.8566, longitude: 2.3522 },
  뉴욕: { latitude: 40.7128, longitude: -74.006 },
  방콕: { latitude: 13.7563, longitude: 100.5018 },
  싱가포르: { latitude: 1.3521, longitude: 103.8198 },
};

const normalizeLowerText = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase();

const isKoreaText = (value = "") => {
  const text = normalizeLowerText(value);

  return (
    text.includes("대한민국") ||
    text.includes("한국") ||
    text.includes("korea") ||
    text.includes("seoul") ||
    text.includes("busan") ||
    text.includes("jeju") ||
    text.includes("gyeongju") ||
    text.includes("서울") ||
    text.includes("부산") ||
    text.includes("제주") ||
    text.includes("경주")
  );
};

const isOverseasText = (value = "") => {
  const text = normalizeLowerText(value);

  return (
    text.includes("일본") ||
    text.includes("japan") ||
    text.includes("도쿄") ||
    text.includes("tokyo") ||
    text.includes("오사카") ||
    text.includes("osaka") ||
    text.includes("프랑스") ||
    text.includes("france") ||
    text.includes("파리") ||
    text.includes("paris") ||
    text.includes("미국") ||
    text.includes("usa") ||
    text.includes("new york") ||
    text.includes("뉴욕") ||
    text.includes("태국") ||
    text.includes("thailand") ||
    text.includes("방콕") ||
    text.includes("bangkok") ||
    text.includes("싱가포르") ||
    text.includes("singapore")
  );
};

const isCoordinateInKorea = ({ latitude, longitude } = {}) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 32.5 &&
    lat <= 39.5 &&
    lng >= 124 &&
    lng <= 132
  );
};

const getPlaceCoordinate = (place = {}) => {
  const latitude = toNumberOrNull(
    place.latitude,
    place.lat,
    place.y,
    place.placeLatitude,
    place.placeLat,
    place.mapY
  );

  const longitude = toNumberOrNull(
    place.longitude,
    place.lng,
    place.lon,
    place.x,
    place.placeLongitude,
    place.placeLng,
    place.placeLon,
    place.mapX
  );

  if (latitude !== null && longitude !== null) {
    return { latitude, longitude };
  }

  const sourceKey = normalizeLowerText(place.sourceId || place.id || place.placeId);
  const sourceCoordinate = PLACE_COORDS_BY_SOURCE_ID[sourceKey];

  if (sourceCoordinate) {
    return sourceCoordinate;
  }

  const name = String(
    place.name || place.title || place.placeName || place.destinationName || ""
  ).trim();

  if (PLACE_COORDS_BY_NAME[name]) {
    return PLACE_COORDS_BY_NAME[name];
  }

  const matchedNameKey = Object.keys(PLACE_COORDS_BY_NAME).find((key) => {
    return name.includes(key) || key.includes(name);
  });

  if (matchedNameKey) {
    return PLACE_COORDS_BY_NAME[matchedNameKey];
  }

  const city = String(place.city || place.region || place.destination || "").trim();

  if (PLACE_COORDS_BY_CITY[city]) {
    return PLACE_COORDS_BY_CITY[city];
  }

  const matchedCityKey = Object.keys(PLACE_COORDS_BY_CITY).find((key) => {
    return city.includes(key) || key.includes(city);
  });

  if (matchedCityKey) {
    return PLACE_COORDS_BY_CITY[matchedCityKey];
  }

  const textForCountry = [
    place.country,
    place.countryName,
    place.city,
    place.region,
    place.destination,
    place.address,
    place.desc,
  ]
    .filter(Boolean)
    .join(" ");

  if (isOverseasText(textForCountry)) {
    if (textForCountry.includes("도쿄") || /tokyo/i.test(textForCountry)) {
      return PLACE_COORDS_BY_CITY["도쿄"];
    }

    if (textForCountry.includes("오사카") || /osaka/i.test(textForCountry)) {
      return PLACE_COORDS_BY_CITY["오사카"];
    }

    if (textForCountry.includes("파리") || /paris|france/i.test(textForCountry)) {
      return PLACE_COORDS_BY_CITY["파리"];
    }

    if (textForCountry.includes("뉴욕") || /new york|usa|미국/i.test(textForCountry)) {
      return PLACE_COORDS_BY_CITY["뉴욕"];
    }

    if (textForCountry.includes("방콕") || /bangkok|thailand|태국/i.test(textForCountry)) {
      return PLACE_COORDS_BY_CITY["방콕"];
    }

    if (textForCountry.includes("싱가포르") || /singapore/i.test(textForCountry)) {
      return PLACE_COORDS_BY_CITY["싱가포르"];
    }
  }

  return DEFAULT_COORDS;
};

const getMapProviderByPlace = (place = {}, coordinate = null) => {
  const explicitProvider = normalizeLowerText(
    place.mapProvider || place.provider || place.mapType
  );

  if (explicitProvider.includes("kakao")) return "kakao";
  if (explicitProvider.includes("google")) return "google";

  const textForCountry = [
    place.country,
    place.countryName,
    place.city,
    place.region,
    place.destination,
    place.address,
    place.desc,
  ]
    .filter(Boolean)
    .join(" ");

  if (isOverseasText(textForCountry)) return "google";
  if (isKoreaText(textForCountry)) return "kakao";

  const safeCoordinate = coordinate || getPlaceCoordinate(place);

  return isCoordinateInKorea(safeCoordinate) ? "kakao" : "google";
};


const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const DEFAULT_TIME_SLOTS = [
  "09:30 AM",
  "12:30 PM",
  "03:00 PM",
  "06:30 PM",
  "08:00 PM",
];

const ClockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="schedule-time-icon"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path
      d="M12 7.5V12.5L15.5 14.5"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg
    viewBox="0 0 24 24"
    className="schedule-time-icon"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 10V7.8C8 5.7 9.7 4 11.8 4C13.9 4 15.6 5.7 15.6 7.8V10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <rect
      x="6"
      y="10"
      width="12"
      height="10"
      rx="2.5"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const RouteCompleteIcon = () => (
  <svg
    viewBox="0 0 80 80"
    width="80"
    height="80"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="40" cy="40" r="40" fill="var(--color-accent-soft)" />
    <path
      d="M39.6 20.5L42.8 29.1L51.5 32.3L42.8 35.5L39.6 44.1L36.4 35.5L27.8 32.3L36.4 29.1L39.6 20.5Z"
      fill="var(--color-primary)"
    />
    <path
      d="M53.8 34.6L55.7 39.7L60.8 41.6L55.7 43.5L53.8 48.6L51.9 43.5L46.8 41.6L51.9 39.7L53.8 34.6Z"
      fill="var(--color-primary)"
    />
    <circle cx="58" cy="56.5" r="9.5" fill="var(--color-primary)" />
    <path
      d="M54 56.5L56.8 59.3L62 53.8"
      fill="none"
      stroke="var(--color-on-primary)"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const FixPointPinIcon = () => (
  <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
    <path
      d="M12 21s-6-5.2-6-11a6 6 0 1 1 12 0c0 5.8-6 11-6 11Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <circle
      cx="12"
      cy="10"
      r="2.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
  </svg>
);

const padTime = (value) => String(value).padStart(2, "0");

const parseTimeLabel = (timeLabel = "12:30 PM") => {
  const match = String(timeLabel).match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

  if (!match) {
    return { period: "PM", hour: 12, minute: 30 };
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  return {
    period: period === "AM" ? "AM" : "PM",
    hour: hour >= 1 && hour <= 12 ? hour : 12,
    minute: minute >= 0 && minute <= 59 ? minute : 30,
  };
};

const formatTimeLabel = ({ period, hour, minute }) => {
  return `${padTime(hour)}:${padTime(minute)} ${period}`;
};

const toApiTime = (timeLabel) => {
  const { period, hour, minute } = parseTimeLabel(timeLabel);
  const hour24 = period === "AM" ? hour % 12 : (hour % 12) + 12;
  return `${padTime(hour24)}:${padTime(minute)}`;
};

const getPrevHour = (hour) => {
  return hour <= 1 ? 12 : hour - 1;
};

const getNextHour = (hour) => {
  return hour >= 12 ? 1 : hour + 1;
};

const getPrevMinute = (minute) => {
  return minute - 5 < 0 ? 55 : minute - 5;
};

const getNextMinute = (minute) => {
  return minute + 5 > 59 ? 0 : minute + 5;
};

const FixPointModal = ({
  open,
  place,
  period,
  hour,
  minute,
  isFixed,
  onChangePeriod,
  onChangeHour,
  onChangeMinute,
  onChangeFixed,
  onClose,
  onConfirm,
}) => {
  const canUsePortal = typeof document !== "undefined";
  const dialogRef = useModalFocus({
    open,
    onClose,
    lockScroll: true,
  });

  if (!open || !place || !canUsePortal) return null;

  const prevHour = getPrevHour(hour);
  const nextHour = getNextHour(hour);
  const prevMinute = getPrevMinute(minute);
  const nextMinute = getNextMinute(minute);

  return createPortal(
    <div className="fix-point-portal">
      <button
        type="button"
        className="fix-point-backdrop"
        onClick={onClose}
        aria-label="Fix Point 설정 닫기"
      />

      <div
        ref={dialogRef}
        className="fix-point-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Fix Point 설정"
        tabIndex={-1}
      >
        <div className="fix-point-icon">
          <ClockIcon />
        </div>

        <h2 className="fix-point-title">Fix Point 설정</h2>

        <div className="fix-point-place">
          <FixPointPinIcon />
          <span>{place.name}</span>
        </div>

        <div className="fix-point-period-tabs">
          <button
            type="button"
            className={period === "AM" ? "is-active" : ""}
            onClick={() => onChangePeriod("AM")}
          >
            오전
          </button>

          <button
            type="button"
            className={period === "PM" ? "is-active" : ""}
            onClick={() => onChangePeriod("PM")}
          >
            오후
          </button>
        </div>

        <div className="fix-point-time-picker">
          <div className="fix-point-time-column">
            <button
              type="button"
              className="fix-point-time-muted"
              onClick={() => onChangeHour(prevHour)}
            >
              {padTime(prevHour)}
            </button>

            <button type="button" className="fix-point-time-selected">
              {padTime(hour)}
            </button>

            <button
              type="button"
              className="fix-point-time-muted"
              onClick={() => onChangeHour(nextHour)}
            >
              {padTime(nextHour)}
            </button>
          </div>

          <span className="fix-point-time-colon">:</span>

          <div className="fix-point-time-column">
            <button
              type="button"
              className="fix-point-time-muted"
              onClick={() => onChangeMinute(prevMinute)}
            >
              {padTime(prevMinute)}
            </button>

            <button type="button" className="fix-point-time-selected">
              {padTime(minute)}
            </button>

            <button
              type="button"
              className="fix-point-time-muted"
              onClick={() => onChangeMinute(nextMinute)}
            >
              {padTime(nextMinute)}
            </button>
          </div>
        </div>

        <label className="fix-point-fixed-row">
          <span className="fix-point-fixed-text">
            <strong>이 시간에 고정하기</strong>
            <small>경로 변경 시에도 시간이 유지됩니다</small>
          </span>

          <input
            type="checkbox"
            checked={isFixed}
            onChange={(event) => onChangeFixed(event.target.checked)}
          />

          <span className="fix-point-switch" />
        </label>

        <div className="fix-point-actions">
          <button
            type="button"
            className="fix-point-cancel-button"
            onClick={onClose}
            data-modal-initial-focus
          >
            취소
          </button>

          <button
            type="button"
            className="fix-point-confirm-button"
            onClick={onConfirm}
          >
            확인
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const FavoritePlacesModal = ({
  open,
  status,
  errorMessage,
  onRetry,
  folders,
  selectedPlaceIds,
  expandedFolderIds,
  selectedDayIndex,
  selectedDates,
  onClose,
  onToggleFolder,
  onTogglePlace,
  onChangeDay,
  onConfirm,
}) => {
  const dayTabsRef = useRef(null);
  const isDayDraggingRef = useRef(false);
  const hasDayDraggedRef = useRef(false);
  const dayDragStartXRef = useRef(0);
  const dayScrollStartLeftRef = useRef(0);
  const [isDayDragging, setIsDayDragging] = useState(false);
  const dialogRef = useModalFocus({
    open,
    onClose,
    lockScroll: true,
  });

  if (!open) return null;

  const selectedCount = selectedPlaceIds.length;

  const handleDayWheel = (event) => {
    if (!dayTabsRef.current) return;

    event.preventDefault();

    const scrollAmount =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    dayTabsRef.current.scrollLeft += scrollAmount;
  };

  const handleDayMouseDown = (event) => {
    if (!dayTabsRef.current) return;

    isDayDraggingRef.current = true;
    hasDayDraggedRef.current = false;
    dayDragStartXRef.current = event.pageX;
    dayScrollStartLeftRef.current = dayTabsRef.current.scrollLeft;
    setIsDayDragging(true);
  };

  const handleDayMouseMove = (event) => {
    if (!isDayDraggingRef.current || !dayTabsRef.current) return;

    const moveX = event.pageX - dayDragStartXRef.current;

    if (Math.abs(moveX) > 3) {
      hasDayDraggedRef.current = true;
      event.preventDefault();
    }

    dayTabsRef.current.scrollLeft = dayScrollStartLeftRef.current - moveX;
  };

  const handleDayMouseUp = () => {
    isDayDraggingRef.current = false;
    setIsDayDragging(false);

    window.setTimeout(() => {
      hasDayDraggedRef.current = false;
    }, 0);
  };

  const handleDayMouseLeave = () => {
    if (!isDayDraggingRef.current) return;

    isDayDraggingRef.current = false;
    setIsDayDragging(false);

    window.setTimeout(() => {
      hasDayDraggedRef.current = false;
    }, 0);
  };

  return createPortal(
    <div className="favorite-place-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className="favorite-place-modal"
        role="dialog"
        aria-modal="true"
        aria-label="관심장소에서 추가"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="favorite-place-header">
          <h2>관심장소에서 추가</h2>

          <button
            type="button"
            className="favorite-place-close"
            onClick={onClose}
            aria-label="닫기"
            data-modal-initial-focus
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6L18 18M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="favorite-folder-list">
          {status === "loading" && <p role="status">관심장소를 불러오는 중이에요.</p>}
          {errorMessage && <div role="alert"><p>{errorMessage}</p><button type="button" onClick={onRetry}>다시 불러오기</button></div>}
          {status === "success" && folders.length === 0 && <p>저장한 폴더가 없어요.</p>}
          {folders.map((folder) => {
            const isExpanded = expandedFolderIds.includes(folder.id);

            return (
              <section key={folder.id} className="favorite-folder-section">
                <button
                  type="button"
                  className="favorite-folder-header"
                  onClick={() => onToggleFolder(folder.id)}
                  aria-expanded={isExpanded}
                >
                  <span
                    className={`favorite-folder-icon-circle ${
                      isExpanded ? "is-open" : ""
                    }`}
                  >
                    <img
                      src={isExpanded ? blueFolderIcon : darkFolderIcon}
                      alt=""
                    />
                  </span>

                  <span className="favorite-folder-title-box">
                    <strong>{folder.title}</strong>
                    <small>{folder.status === "error" ? "장소 목록 확인 필요" : `${folder.places.length}개의 장소`}</small>
                  </span>

                  <span
                    className={`favorite-folder-arrow ${
                      isExpanded ? "is-open" : ""
                    }`}
                  >
                    ⌄
                  </span>
                </button>

                {isExpanded && (
                  <div className="favorite-place-list">
                    {folder.status === "error" && <div role="alert"><p>이 폴더의 장소를 다시 확인하지 못했어요. 확인한 장소는 유지됩니다.</p><button type="button" onClick={onRetry}>장소 다시 불러오기</button></div>}
                    {folder.status === "success" && folder.places.length === 0 && <p>저장한 장소가 없어요.</p>}
                    {folder.places.map((place) => {
                      const isChecked = selectedPlaceIds.includes(
                        place.sourceId
                      );

                      return (
                        <div
                          key={place.sourceId}
                          className={`favorite-place-item ${
                            isChecked ? "is-selected" : ""
                          }`}
                        >
                          <span
                            className={`favorite-place-checkbox ${
                              isChecked ? "is-checked" : ""
                            }`}
                          >
                            {isChecked ? "✓" : ""}
                          </span>

                          <span className="place-photo-frame favorite-place-thumb"><PlacePhoto place={place}
                            src={place.thumb}
                            alt={place.name}
                            className="place-photo-frame-image"
                          /></span>

                          <span className="favorite-place-text">
                            <strong>{place.name}</strong>
                            <small>{place.desc}</small>
                          </span>
                          <button type="button" className="place-photo-card-action" aria-label={place.name} aria-pressed={isChecked} onClick={() => onTogglePlace(place.sourceId)} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="favorite-schedule-section">
          <div className="favorite-schedule-title">
            <img src={scheduleIcon} alt="" />
            <strong>일정 선택</strong>
          </div>

          <div
            ref={dayTabsRef}
            className={`favorite-day-tabs ${
              isDayDragging ? "is-dragging" : ""
            }`}
            onWheel={handleDayWheel}
            onMouseDown={handleDayMouseDown}
            onMouseMove={handleDayMouseMove}
            onMouseUp={handleDayMouseUp}
            onMouseLeave={handleDayMouseLeave}
          >
            {selectedDates.map((date, index) => (
              <button
                key={formatDateKey(date)}
                type="button"
                className={`favorite-day-tab ${
                  selectedDayIndex === index ? "is-active" : ""
                }`}
                onClick={() => {
                  if (!hasDayDraggedRef.current) {
                    onChangeDay(index);
                  }
                }}
              >
                Day {index + 1} ({formatTabDate(date)})
              </button>
            ))}
          </div>
        </div>

        <div className="favorite-modal-actions">
          <button
            type="button"
            className="favorite-cancel-button"
            onClick={onClose}
          >
            취소
          </button>

          <button
            type="button"
            className="favorite-add-button"
            onClick={onConfirm}
            disabled={selectedCount === 0}
          >
            + 일정에 추가 ({selectedCount})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const normalizeDate = (date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const createDate = (year, month, day) => {
  return normalizeDate(new Date(year, month - 1, day));
};

const formatDateKey = (date) => {
  const safeDate = date instanceof Date ? date : new Date(date);

  if (Number.isNaN(safeDate.getTime())) {
    return "";
  }

  const year = safeDate.getFullYear();
  const month = String(safeDate.getMonth() + 1).padStart(2, "0");
  const day = String(safeDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getStartPlaceDefaultMap = (dates = [], placeMap = {}) => {
  return dates.reduce((acc, date) => {
    const dateKey = formatDateKey(date);
    const firstPlace = placeMap[dateKey]?.find(place => !place.isFixedTime);

    if (firstPlace?.id) {
      acc[dateKey] = firstPlace.id;
    }

    return acc;
  }, {});
};

const moveSelectedPlaceToFirst = (places = [], selectedId) => {
  if (!selectedId) return places;

  const selectedIndex = places.findIndex((place) => place.id === selectedId);

  if (selectedIndex <= 0) return places;

  const nextPlaces = [...places];
  const [selectedPlace] = nextPlaces.splice(selectedIndex, 1);

  return [selectedPlace, ...nextPlaces];
};

const formatTabDate = (date) => {
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

const isSameDate = (a, b) => {
  return formatDateKey(a) === formatDateKey(b);
};

const getDatesInRange = (startDate, endDate) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  const from = start <= end ? start : end;
  const to = start <= end ? end : start;

  const dates = [];
  const current = new Date(from);

  while (current <= to) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

const getCalendarWeeks = (baseMonth) => {
  const year = baseMonth.getFullYear();
  const month = baseMonth.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const calendarStart = new Date(firstDayOfMonth);

  calendarStart.setDate(firstDayOfMonth.getDate() - firstDayOfMonth.getDay());
  calendarStart.setHours(0, 0, 0, 0);

  const weeks = [];

  for (let week = 0; week < 6; week++) {
    const currentWeek = [];

    for (let day = 0; day < 7; day++) {
      const cellDate = new Date(calendarStart);
      cellDate.setDate(calendarStart.getDate() + week * 7 + day);
      cellDate.setHours(0, 0, 0, 0);

      currentWeek.push({
        date: cellDate,
        isCurrentMonth: cellDate.getMonth() === month,
      });
    }

    weeks.push(currentWeek);
  }

  return weeks;
};

const getVisibleWeeks = (weeks) => {
  return weeks.filter((week) => week.some((day) => day.isCurrentMonth));
};

const createPlaceItem = (place, orderIndex = 0) => {
  const sourceId = normalizeSourceId(
    place.sourceId || place.id || place.placeId || place.name || place.title
  );
  const coordinate = getPlaceCoordinate({ ...place, sourceId });
  const mapProvider = getMapProviderByPlace({ ...place, sourceId }, coordinate);

  return {
    id: `${sourceId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    sourceId,
    originalId: place.originalId || place.id || place.placeId || null,
    placeId: place.placeId || place.id || place.originalId || null,
    destinationId: place.destinationId || null,
    name: place.name || place.title || place.placeName || "이름 없는 장소",
    desc: place.desc || place.address || place.roadAddress || "주소 정보 없음",
    city: place.city || place.region || "",
    country: place.country || "",
    mapProvider,
    thumb: place.thumb || place.imageUrl || place.thumbnailUrl || "",
    rating: place.rating || null,
    tags: place.tags || [],
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    placeType: place.placeType || place.type || "",
    timeLabel:
      place.timeLabel ||
      DEFAULT_TIME_SLOTS[orderIndex % DEFAULT_TIME_SLOTS.length],
    isFixedTime:
      typeof place.isFixedTime === "boolean" ? place.isFixedTime : false,
  };
};

const getTodayDate = () => {
  const today = new Date();
  return createDate(today.getFullYear(), today.getMonth() + 1, today.getDate());
};

const INITIAL_START_DATE = getTodayDate();
const INITIAL_END_DATE = INITIAL_START_DATE;
const INITIAL_PLACES_BY_DATE = { [formatDateKey(INITIAL_START_DATE)]: [] };

const readLocalStorageJSON = (key, fallbackValue) => {
  try {
    if (typeof window === "undefined") {
      return fallbackValue;
    }

    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallbackValue;
  } catch (error) {
    logSafeApiError(error, "RouteCreate.jsx");
    return fallbackValue;
  }
};

const getPlaceCompareId = (place) => {
  const value = place?.id ?? place?.placeId ?? place?.sourceId;
  return value === undefined || value === null ? "" : String(value);
};

const isSamePlaceId = (place, placeId) => {
  return getPlaceCompareId(place) === String(placeId);
};

const normalizeSourceId = (value) => {
  return String(value || "place")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w가-힣-]/g, "")
    .toLowerCase();
};


const normalizeIncomingRoutePlace = (place) => {
  if (!place) {
    return null;
  }

  const name =
    place.name ||
    place.title ||
    place.placeName ||
    place.place_name ||
    "이름 없는 장소";

  if (!name) {
    return null;
  }

  const originalId =
    place.id ?? place.placeId ?? place.sourceId ?? place.title ?? place.name;

  const sourceId = normalizeSourceId(
    place.sourceId || place.id || place.placeId || name
  );

  const desc =
    place.desc ||
    place.address ||
    place.roadAddress ||
    place.roadAddressName ||
    place.addressName ||
    place.address_name ||
    "주소 정보 없음";

  return {
    sourceId,
    originalId,
    placeId: place.placeId || place.id || null,
    destinationId: place.destinationId || null,
    name,
    desc,
    city: place.city || place.region || "",
    country: place.country || "대한민국",
    mapProvider: place.mapProvider || place.provider || "kakao",
    thumb: place.thumb || place.image || place.imageUrl || place.thumbnail || place.thumbnailUrl || place.photoUrl || "",
    rating: place.rating || null,
    tags: place.tags || [],
    latitude: place.latitude || place.lat || null,
    longitude: place.longitude || place.lng || null,
    placeType: place.placeType || place.type || "",
  };
};

const getIncomingRoutePlaces = (navigationState, search = "") => {
  const statePlaces = Array.isArray(navigationState?.routePlaces)
    ? navigationState.routePlaces
    : navigationState?.selectedPlace
    ? [navigationState.selectedPlace]
    : [];

  const normalizedStatePlaces = statePlaces
    .map(normalizeIncomingRoutePlace)
    .filter(Boolean);

  if (normalizedStatePlaces.length > 0) {
    return normalizedStatePlaces;
  }

  const searchParams = new URLSearchParams(search);
  const placeId = searchParams.get("placeId");

  if (!placeId) {
    return [];
  }

  const draftPlaces = readLocalStorageJSON(ROUTE_DRAFT_PLACES_KEY, []);

  const matchedDraftPlaces = Array.isArray(draftPlaces)
    ? draftPlaces.filter((place) => isSamePlaceId(place, placeId))
    : [];

  const normalizedDraftPlaces = matchedDraftPlaces
    .map(normalizeIncomingRoutePlace)
    .filter(Boolean);

  if (normalizedDraftPlaces.length > 0) {
    return normalizedDraftPlaces;
  }

  const selectedPlace = readLocalStorageJSON(ROUTE_SELECTED_PLACE_KEY, null);

  if (selectedPlace && isSamePlaceId(selectedPlace, placeId)) {
    const normalizedSelectedPlace = normalizeIncomingRoutePlace(selectedPlace);

    if (normalizedSelectedPlace) {
      return [normalizedSelectedPlace];
    }
  }

  const recentPlaces = readLocalStorageJSON(RECENT_PLACES_KEY, []);

  const recentPlace = Array.isArray(recentPlaces)
    ? recentPlaces.find((place) => isSamePlaceId(place, placeId))
    : null;

  const normalizedRecentPlace = normalizeIncomingRoutePlace(recentPlace);

  return normalizedRecentPlace ? [normalizedRecentPlace] : [];
};

const createInitialPlacesByDate = (incomingPlaces = []) => {
  const clonedPlacesByDate = JSON.parse(JSON.stringify(INITIAL_PLACES_BY_DATE));

  if (incomingPlaces.length === 0) {
    return clonedPlacesByDate;
  }

  const firstDateKey = formatDateKey(INITIAL_START_DATE);

  clonedPlacesByDate[firstDateKey] = incomingPlaces.map((place, index) =>
    createPlaceItem(place, index)
  );

  return clonedPlacesByDate;
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

const normalizeSearchPlace = (place) => {
  const name =
    place.name ||
    place.title ||
    place.placeName ||
    place.destinationName ||
    place.place_name ||
    "이름 없는 장소";

  const sourceId = normalizeSourceId(
    place.sourceId || place.placeId || place.id || place.destinationId || name
  );

  return {
    sourceId,
    originalId: place.id ?? place.placeId ?? place.destinationId ?? null,
    placeId: place.placeId ?? place.id ?? null,
    destinationId: place.destinationId ?? null,
    name,
    desc:
      place.desc ||
      place.address ||
      place.roadAddress ||
      place.location ||
      place.addressName ||
      place.address_name ||
      "주소 정보 없음",
    city: place.city || place.region || "",
    country: place.country || "대한민국",
    mapProvider: place.mapProvider || place.provider || place.mapType || "server",
    thumb:
      place.thumb ||
      place.image ||
      place.imageUrl ||
      place.thumbnail ||
      place.thumbnailUrl ||
      place.photoUrl ||
      "",
    rating: place.rating || place.score || place.avgRating || null,
    tags: place.tags || place.hashtags || [],
    latitude: place.latitude ?? place.lat ?? null,
    longitude: place.longitude ?? place.lng ?? null,
    placeType: place.placeType || place.type || "",
  };
};

const getErrorMessage = safeApiErrorMessage;

const getResponseData = (data) => {
  return data?.data || data?.trip || data?.tripPlace || data?.result || data?.response || data;
};

const getAllRoutePlaces = (savedRoute) => {
  return Object.values(savedRoute?.placesByDate || {}).flatMap((places) =>
    Array.isArray(places) ? places : []
  );
};

const toNumberOrDefault = (value, defaultValue) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : defaultValue;
};

const getNumericPlaceId = (place) => {
  const candidates = [
    place?.placeId,
    place?.originalId,
    place?.destinationId,
    place?.serverPlaceId,
  ];

  for (const value of candidates) {
    const numberValue = Number(value);

    if (Number.isSafeInteger(numberValue) && numberValue > 0) {
      return numberValue;
    }
  }

  return null;
};

const ensureServerPlaceId = async (place) => {
  const existingPlaceId = getNumericPlaceId(place);

  if (existingPlaceId) {
    return existingPlaceId;
  }

  throw new Error(
    `${place?.name || "장소"}의 서버 placeId가 없습니다. 서버 검색 결과에서 장소를 다시 선택해주세요.`
  );
};

export const validateRoutePlaces = async (savedRoute, selectedStartPlaces = {}, requestApi = api) => {
  const confirmed = new Map();
  try {
    if (!Array.isArray(savedRoute?.selectedDates) || savedRoute.selectedDates.length === 0) throw new Error("여행 날짜를 선택해 주세요.");
    let count = 0;
    let previousDate = "";
    for (const date of savedRoute.selectedDates) {
      const key = formatDateKey(date);
      if (!key) throw new Error("여행 날짜를 확인해 주세요.");
      if (previousDate && (Date.parse(key) - Date.parse(previousDate)) !== 86400000) {
        throw new Error("여행 날짜는 시작일부터 연속된 날짜로 선택해주세요.");
      }
      previousDate = key;
      const places = savedRoute.placesByDate?.[key];
      if (!Array.isArray(places)) throw new Error("선택한 장소 목록을 확인해 주세요.");
      const startId = selectedStartPlaces[key] || places[0]?.id;
      const start = places.find(place => String(place.id) === String(startId));
      if (places.length && !start) throw new Error("출발 장소를 다시 선택해 주세요.");
      if (start?.isFixedTime) throw new Error("출발 시간은 오전 10시로 제공됩니다. 이 장소의 고정 시간을 해제하거나 다른 출발 장소를 선택해 주세요.");
      for (const place of places) {
        if (!place || typeof place.name !== "string" || !place.name.trim() || place.isExample || place.isMockPlaceholder) throw new Error("실제 검색 결과나 관심장소에서 장소를 다시 선택해 주세요.");
        const id = await ensureServerPlaceId(place);
        if (!confirmed.has(id)) {
          const response = await requestApi.get(`/api/places/${id}`);
          const actual = getResponseData(response.data);
          if (Number(actual?.id ?? actual?.placeId) !== id || typeof actual?.name !== "string" || !actual.name.trim()) throw new Error("현재 환경에서 장소 정보를 확인할 수 없습니다. 장소를 다시 검색해 주세요.");
          confirmed.set(id, actual);
        }
        const normalizeName = value => value.trim().replace(/\s+/g, " ");
        if (normalizeName(confirmed.get(id).name) !== normalizeName(place.name)) throw new Error(`${place.name}의 장소 정보가 현재 조회 결과와 다릅니다. 장소를 다시 선택해 주세요.`);
        count++;
      }
    }
    if (!count) throw new Error("장소를 한 곳 이상 선택해 주세요.");
  } catch (error) {
    error.beforeWrite = true;
    throw error;
  }
};

const buildTripPayload = (savedRoute) => {
  const allPlaces = getAllRoutePlaces(savedRoute);
  const firstPlace = allPlaces[0];
  const coordinate = getPlaceCoordinate(firstPlace || {});

  const startDate = formatDateKey(savedRoute.selectedDates[0]);
  const endDate = formatDateKey(
    savedRoute.selectedDates[savedRoute.selectedDates.length - 1]
  );

  return {
    title: savedRoute.title || `${firstPlace?.name || "새로운"} 여행 일정`,
    destination:
      firstPlace?.city ||
      firstPlace?.country ||
      firstPlace?.name ||
      savedRoute.destination ||
      "서울",
    startDate,
    endDate,
    latitude: toNumberOrDefault(coordinate.latitude, DEFAULT_COORDS.latitude),
    longitude: toNumberOrDefault(
      coordinate.longitude,
      DEFAULT_COORDS.longitude
    ),
  };
};

const mergeTripResponseWithSavedRoute = (savedRoute, tripData, tripPayload) => {
  const serverId =
    tripData?.id || tripData?.tripId || tripData?.routeId || savedRoute.id;

  return {
    ...savedRoute,
    id: String(serverId),
    title: tripData?.title || tripPayload.title || savedRoute.title,
    destination:
      tripData?.destination || tripPayload.destination || savedRoute.destination,
    startDate: tripData?.startDate || tripPayload.startDate,
    endDate: tripData?.endDate || tripPayload.endDate,
    mapType: tripData?.mapType || savedRoute.mapType || "",
    routeUrl: tripData?.routeUrl || savedRoute.routeUrl || "",
    serverData: tripData,
  };
};

const getTripPlaceId = (tripPlace) => {
  const value = tripPlace?.id ?? tripPlace?.tripPlaceId;
  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0
    ? numberValue
    : null;
};

const addPlacesToTrip = async (tripId, savedRoute, record, requestApi = api) => {
  const tripPlaceMap = {};
  const addedCountByDay = {};
  const serverTripPlaceIdByLocalId = {};

  for (let dayIndex = 0; dayIndex < savedRoute.selectedDates.length; dayIndex++) {
    const day = dayIndex + 1;
    const dateKey = formatDateKey(savedRoute.selectedDates[dayIndex]);
    const dayPlaces = savedRoute.placesByDate[dateKey] || [];

    for (let placeIndex = 0; placeIndex < dayPlaces.length; placeIndex++) {
      const place = dayPlaces[placeIndex];
      const placeId = await ensureServerPlaceId(place);

      record?.(`장소 추가: ${day}일차 ${placeIndex + 1}번째`, false);
      const response = await requestApi.post(
        `${TRIPS_API}/${tripId}/places/${placeId}`,
        null,
        {
          params: {
            day,
            visitOrder: placeIndex + 1,
          },
        }
      );

      const tripPlaceData = getResponseData(response.data);
      const tripPlaceId = getTripPlaceId(tripPlaceData);

      if (!tripPlaceId) {
        throw new Error(
          `${place?.name || "장소"} 추가 응답에서 TripPlace ID를 찾지 못했습니다.`
        );
      }

      record?.(`장소 추가: ${day}일차 ${placeIndex + 1}번째`, true);
      const localPlaceKey = place.id || `${dateKey}-${placeIndex}`;

      tripPlaceMap[localPlaceKey] = tripPlaceData;
      tripPlaceMap[`tripPlace:${tripPlaceId}`] = tripPlaceData;
      tripPlaceMap[`place:${placeId}`] = tripPlaceData;

      serverTripPlaceIdByLocalId[localPlaceKey] = tripPlaceId;

      addedCountByDay[day] = (addedCountByDay[day] || 0) + 1;
    }
  }

  return {
    tripPlaceMap,
    addedCountByDay,
    serverTripPlaceIdByLocalId,
  };
};

const setStartPointsToServer = async ({
  tripId,
  savedRoute,
  selectedStartPlaces,
  tripPlaceMap,
  addedCountByDay,
  record,
  requestApi = api,
}) => {
  for (let dayIndex = 0; dayIndex < savedRoute.selectedDates.length; dayIndex++) {
    const day = dayIndex + 1;

    if (!addedCountByDay[day]) continue;

    const dateKey = formatDateKey(savedRoute.selectedDates[dayIndex]);
    const dayPlaces = savedRoute.placesByDate[dateKey] || [];
    const selectedLocalPlaceId =
      selectedStartPlaces?.[dateKey] || dayPlaces[0]?.id;

    const selectedPlace =
      dayPlaces.find(
        (place) => String(place.id) === String(selectedLocalPlaceId)
      ) || dayPlaces[0];

    if (!selectedPlace) continue;

    const localPlaceKey = selectedPlace.id || selectedLocalPlaceId;
    const tripPlaceData = tripPlaceMap[localPlaceKey];
    const tripPlaceId = getTripPlaceId(tripPlaceData);

    if (!tripPlaceId) {
      throw new Error(
        `${selectedPlace?.name || "출발 장소"}의 TripPlace ID를 찾지 못했습니다.`
      );
    }

    record?.(`출발지 설정: ${day}일차`, false);
    await requestApi.post(
      `${TRIPS_API}/${tripId}/days/${day}/places/${tripPlaceId}/start`
    );
    record?.(`출발지 설정: ${day}일차`, true);
  }
};

const updateFixedSchedulesToServer = async ({
  tripId,
  savedRoute,
  selectedStartPlaces,
  tripPlaceMap,
  record,
  requestApi = api,
}) => {
  for (let dayIndex = 0; dayIndex < savedRoute.selectedDates.length; dayIndex++) {
    const day = dayIndex + 1;
    const dateKey = formatDateKey(savedRoute.selectedDates[dayIndex]);
    const dayPlaces = savedRoute.placesByDate[dateKey] || [];
    const startLocalId = selectedStartPlaces?.[dateKey] || dayPlaces[0]?.id;

    for (const place of dayPlaces) {
      if (!place.isFixedTime || String(place.id) === String(startLocalId)) continue;

      const tripPlaceId = getTripPlaceId(tripPlaceMap[place.id]);
      if (!tripPlaceId) throw new Error("시간을 설정할 여행 장소 ID를 확인하지 못했습니다.");

      record?.(`고정 시간 설정: ${day}일차`, false);
      await requestApi.patch(
        `${TRIPS_API}/${tripId}/days/${day}/places/${tripPlaceId}/schedule`,
        {
          fixed: true,
          arrivalTime: toApiTime(place.timeLabel),
          stayDuration: Number(place.stayDuration) || 60,
          isNextDay: Boolean(place.isNextDay),
        }
      );
      record?.(`고정 시간 설정: ${day}일차`, true);
    }
  }
};

const getOptimizedPlacesByDay = async (tripId, day, requestApi) => {
  const response = await requestApi.get(`${TRIPS_API}/${tripId}/days/${day}/places`);
  return getArrayData(response.data);
};

const optimizeTripDays = async (tripId, savedRoute, addedCountByDay = {}, record, requestApi = api) => {
  const optimizedByDay = {};

  for (let dayIndex = 0; dayIndex < savedRoute.selectedDates.length; dayIndex++) {
    const day = dayIndex + 1;

    if (!addedCountByDay[day]) continue;

    record?.(`최적화: ${day}일차`, false);
    const optimizeResponse = await requestApi.post(
      `${TRIPS_API}/${tripId}/days/${day}/optimize`,
      null,
      { params: { startTime: "10:00" } }
    );

    record?.(`최적화: ${day}일차`, true);
    const optimizedPlaces = getArrayData(optimizeResponse.data);

    optimizedByDay[day] =
      optimizedPlaces.length > 0
        ? optimizedPlaces
        : await getOptimizedPlacesByDay(tripId, day, requestApi);
  }

  return optimizedByDay;
};

const mapOptimizedPlacesToSavedRoute = (
  savedRoute,
  optimizedByDay,
  serverTripPlaceIdByLocalId = {}
) => {
  const nextPlacesByDate = JSON.parse(
    JSON.stringify(savedRoute.placesByDate || {})
  );

  Object.entries(optimizedByDay).forEach(([dayString, tripPlaces]) => {
    if (!Array.isArray(tripPlaces) || tripPlaces.length === 0) return;

    const dayIndex = Number(dayString) - 1;
    const date = savedRoute.selectedDates[dayIndex];
    const dateKey = formatDateKey(date);

    if (!dateKey) return;

    const existingPlaces = nextPlacesByDate[dateKey] || [];

    nextPlacesByDate[dateKey] = tripPlaces
      .slice()
      .sort((a, b) => Number(a.visitOrder || 0) - Number(b.visitOrder || 0))
      .map((tripPlace, index) => {
        const tripPlaceId = getTripPlaceId(tripPlace);

        const matchedPlace =
          existingPlaces.find((place) => {
            const localKey = place.id;
            const localTripPlaceId = serverTripPlaceIdByLocalId[localKey];
            return (
              tripPlaceId && Number(localTripPlaceId) === Number(tripPlaceId)
            );
          }) ||
          {};

        return {
          ...matchedPlace,
          id: matchedPlace.id || `trip-place-${tripPlaceId || tripPlace.id}`,
          sourceId:
            matchedPlace.sourceId ||
            String(tripPlace.placeId || tripPlace.placeName),
          originalId: tripPlace.placeId || matchedPlace.originalId,
          placeId: tripPlace.placeId || matchedPlace.placeId,
          serverTripPlaceId: tripPlaceId,
          tripPlaceId,
          name: tripPlace.placeName || matchedPlace.name || "장소명 없음",
          desc: tripPlace.address || matchedPlace.desc || "주소 정보 없음",
          latitude: tripPlace.latitude ?? matchedPlace.latitude ?? null,
          longitude: tripPlace.longitude ?? matchedPlace.longitude ?? null,
          placeType: tripPlace.placeType || matchedPlace.placeType || "",
          visitOrder: tripPlace.visitOrder || index + 1,
          isStartPoint: Boolean(tripPlace.isStartPoint),
        };
      });
  });

  return {
    ...savedRoute,
    placesByDate: nextPlacesByDate,
  };
};

export const saveRouteToServer = async (savedRoute, startPlaceMap = {}, onProgress = () => {}, options = {}) => {
  const requestApi = createGenerationRequest(options);
  const completed = [];
  const record = (stage, success) => {
    if (success) completed.push(stage);
    onProgress({ stage, completed: [...completed] });
  };
  record("장소 확인", false);
  await validateRoutePlaces(savedRoute, startPlaceMap, requestApi);
  requestApi.check();
  record("여행 생성", false);
  let tripPayload;
  try { tripPayload = validateTripRequest(buildTripPayload(savedRoute)); }
  catch (error) { error.beforeWrite = true; throw error; }

  const tripResponse = await requestApi.post(TRIPS_API, tripPayload);
  const tripData = getResponseData(tripResponse.data);

  let serverSavedRoute = mergeTripResponseWithSavedRoute(
    savedRoute,
    tripData,
    tripPayload
  );

  const tripId = Number(tripData?.id || tripData?.tripId || serverSavedRoute.id);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    throw new Error("서버 여행 ID를 확인하지 못했습니다.");
  }
  onProgress({ tripId });
  record("여행 생성", true);
  record("장소 추가", false);
  const {
    tripPlaceMap,
    addedCountByDay,
    serverTripPlaceIdByLocalId,
  } = await addPlacesToTrip(tripId, savedRoute, record, requestApi);

  await updateFixedSchedulesToServer({
    tripId,
    savedRoute,
    selectedStartPlaces: startPlaceMap,
    tripPlaceMap,
    record,
    requestApi,
  });

  await setStartPointsToServer({
    tripId,
    savedRoute,
    selectedStartPlaces: startPlaceMap,
    tripPlaceMap,
    addedCountByDay,
    record,
    requestApi,
  });

  const optimizedByDay = await optimizeTripDays(
    tripId,
    savedRoute,
    addedCountByDay,
    record,
    requestApi
  );

  serverSavedRoute = mapOptimizedPlacesToSavedRoute(
    serverSavedRoute,
    optimizedByDay,
    serverTripPlaceIdByLocalId
  );

const optimizedTripPlaces = Object.values(optimizedByDay).flatMap((places) =>
    Array.isArray(places) ? places : []
  );

  const uniqueTripPlaces = Array.from(
    new Map(
      [...Object.values(tripPlaceMap), ...optimizedTripPlaces]
        .filter(Boolean)
        .map((tripPlace) => [
          getTripPlaceId(tripPlace) ||
            tripPlace.tripPlaceId ||
            JSON.stringify(tripPlace),
          tripPlace,
        ])
    ).values()
  );

  return {
    ...serverSavedRoute,
    serverData: {
      trip: tripData,
      tripPlaces: uniqueTripPlaces,
      optimizedByDay,
    },
  };
};

const RouteCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef(null);


  const incomingRoutePlaces = useMemo(() => {
    return getIncomingRoutePlaces(location.state, location.search);
  }, [location.state, location.search]);

  const [rangeStart, setRangeStart] = useState(INITIAL_START_DATE);
  const [rangeEnd, setRangeEnd] = useState(INITIAL_END_DATE);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [placesByDate, setPlacesByDate] = useState(() =>
    createInitialPlacesByDate(incomingRoutePlaces)
  );
  const [currentMonth, setCurrentMonth] = useState(
    new Date(INITIAL_START_DATE.getFullYear(), INITIAL_START_DATE.getMonth(), 1)
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const isSavingRoute = false;
  const [generatedRoute, setGeneratedRoute] = useState(null);
  const generation = useGenerationTask();
  const isGeneratingRoute = generation.status === "running";
  const [startPlaceErrorMessage, setStartPlaceErrorMessage] = useState("");
  const [isStartPlaceModalOpen, setIsStartPlaceModalOpen] = useState(false);
  const [startPlaceDayIndex, setStartPlaceDayIndex] = useState(0);
  const [selectedStartPlaces, setSelectedStartPlaces] = useState({});
  const [fixModalPlace, setFixModalPlace] = useState(null);
  const [fixModalDateKey, setFixModalDateKey] = useState("");
  const [fixPeriod, setFixPeriod] = useState("PM");
  const [fixHour, setFixHour] = useState(12);
  const [fixMinute, setFixMinute] = useState(30);
  const [fixIsFixed, setFixIsFixed] = useState(false);

  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false);
  const [favoriteModalDayIndex, setFavoriteModalDayIndex] = useState(0);
  const [selectedFavoritePlaceIds, setSelectedFavoritePlaceIds] = useState([]);
  const [expandedFavoriteFolderIds, setExpandedFavoriteFolderIds] = useState([

  ]);

  const selectedDates = useMemo(() => {
    return getDatesInRange(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd]);

  const selectedDateKeys = useMemo(() => {
    return new Set(selectedDates.map((date) => formatDateKey(date)));
  }, [selectedDates]);

  const calendarWeeks = useMemo(() => {
    return getCalendarWeeks(currentMonth);
  }, [currentMonth]);

  const visibleWeeks = useMemo(() => {
    return getVisibleWeeks(calendarWeeks);
  }, [calendarWeeks]);

  const activeDate = selectedDates[activeDayIndex] || selectedDates[0];
  const activeDateKey = activeDate ? formatDateKey(activeDate) : "";
  const currentPlaces = activeDate ? placesByDate[activeDateKey] || [] : [];

  const placeSearch = useRoutePlaceSearch(isSearchOpen, searchKeyword);
  const isSearching = placeSearch.status === "loading";
  const searchErrorMessage = placeSearch.status === "error" ? getErrorMessage(placeSearch.cause, "장소 검색에 실패했습니다. 다시 시도해 주세요.") : "";
  const filteredSearchResults = useMemo(() => (placeSearch.data || []).map(normalizeSearchPlace).filter(Boolean), [placeSearch.data]);
  const favoriteQuery = useFavoriteFolders(isFavoriteModalOpen);
  const favoriteFolders = useMemo(() => (favoriteQuery.data || []).map(folder => ({ ...folder, places: folder.places.map(normalizeSearchPlace).filter(Boolean) })), [favoriteQuery.data]);

  const monthTitle = `${currentMonth.getFullYear()}년 ${
    currentMonth.getMonth() + 1
  }월`;

  useEffect(() => {
    setPlacesByDate((prev) => {
      const next = {};

      selectedDates.forEach((date) => {
        const key = formatDateKey(date);
        next[key] = prev[key] || [];
      });

      return next;
    });
  }, [selectedDates]);

  useEffect(() => {
    if (activeDayIndex > selectedDates.length - 1) {
      setActiveDayIndex(0);
    }
  }, [activeDayIndex, selectedDates.length]);

  useEffect(() => {
    if (startPlaceDayIndex > selectedDates.length - 1) {
      setStartPlaceDayIndex(0);
    }
  }, [startPlaceDayIndex, selectedDates.length]);

  const handlePrevMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const handleDateClick = (clickedDate) => {
    const clicked = normalizeDate(clickedDate);
    const hasRange = !isSameDate(rangeStart, rangeEnd);

    if (hasRange) {
      setRangeStart(clicked);
      setRangeEnd(clicked);
      setActiveDayIndex(0);
      return;
    }

    if (isSameDate(clicked, rangeStart)) {
      setRangeStart(clicked);
      setRangeEnd(clicked);
      setActiveDayIndex(0);
      return;
    }

    const newStart = clicked < rangeStart ? clicked : rangeStart;
    const newEnd = clicked < rangeStart ? rangeStart : clicked;

    setRangeStart(newStart);
    setRangeEnd(newEnd);
    setActiveDayIndex(0);
  };

  const isPlaceAlreadyAdded = (place) => {
    return currentPlaces.some((item) => {
      if (item.sourceId && place.sourceId) {
        return item.sourceId === place.sourceId;
      }

      if (item.originalId && place.originalId) {
        return String(item.originalId) === String(place.originalId);
      }

      return item.name === place.name && item.desc === place.desc;
    });
  };

  const handleAddPlace = (place) => {
    if (!activeDateKey) return;

    setPlacesByDate((prev) => {
      const targetPlaces = prev[activeDateKey] || [];

      const alreadyExists = targetPlaces.some((item) => {
        if (item.sourceId && place.sourceId) {
          return item.sourceId === place.sourceId;
        }

        if (item.originalId && place.originalId) {
          return String(item.originalId) === String(place.originalId);
        }

        return item.name === place.name && item.desc === place.desc;
      });

      if (alreadyExists) return prev;

      return {
        ...prev,
        [activeDateKey]: [
          ...targetPlaces,
          createPlaceItem(place, targetPlaces.length),
        ],
      };
    });

    setSearchKeyword("");
    setIsSearchOpen(false);



  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter" || !isSearchOpen || placeSearch.status !== "success") return;

    e.preventDefault();

    const firstAvailablePlace = filteredSearchResults.find(
      (place) => !isPlaceAlreadyAdded(place)
    );

    if (firstAvailablePlace) {
      handleAddPlace(firstAvailablePlace);
    }
  };

  const handleOpenSearch = () => {
    setIsSearchOpen(true);
    searchInputRef.current?.focus();
  };

  const handleFavoritePlacesClick = () => {
    setFavoriteModalDayIndex(activeDayIndex);
    setSelectedFavoritePlaceIds([]);
    setExpandedFavoriteFolderIds(favoriteFolders.length ? [favoriteFolders[0].id] : []);
    setIsFavoriteModalOpen(true);
  };

  const handleCloseFavoriteModal = () => {
    setIsFavoriteModalOpen(false);
    setSelectedFavoritePlaceIds([]);
  };

  const handleToggleFavoriteFolder = (folderId) => {
    setExpandedFavoriteFolderIds((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleToggleFavoritePlace = (placeId) => {
    setSelectedFavoritePlaceIds((prev) =>
      prev.includes(placeId)
        ? prev.filter((id) => id !== placeId)
        : [...prev, placeId]
    );
  };

  const handleConfirmFavoritePlaces = () => {
    const targetDate = selectedDates[favoriteModalDayIndex];

    if (!targetDate) return;

    const targetDateKey = formatDateKey(targetDate);
    const allFavoritePlaces = Array.from(new Map(favoriteFolders.flatMap(folder => folder.places).map(place => [place.sourceId, place])).values());

    const placesToAdd = allFavoritePlaces.filter((place) =>
      selectedFavoritePlaceIds.includes(place.sourceId)
    );

    if (placesToAdd.length === 0) return;

    setPlacesByDate((prev) => {
      const targetPlaces = prev[targetDateKey] || [];

      const nextPlaces = placesToAdd
        .filter((place) => {
          return !targetPlaces.some((item) => {
            if (item.sourceId && place.sourceId) {
              return item.sourceId === place.sourceId;
            }

            return item.name === place.name && item.desc === place.desc;
          });
        })
        .map((place, index) =>
          createPlaceItem(place, targetPlaces.length + index)
        );

      return {
        ...prev,
        [targetDateKey]: [...targetPlaces, ...nextPlaces],
      };
    });

    setActiveDayIndex(favoriteModalDayIndex);
    handleCloseFavoriteModal();
  };

  const handleRemovePlace = (id) => {
    if (!activeDateKey) return;

    setPlacesByDate((prev) => ({
      ...prev,
      [activeDateKey]: (prev[activeDateKey] || []).filter(
        (place) => place.id !== id
      ),
    }));
  };

  const handleOpenFixModal = (place) => {
    if (!activeDateKey) return;

    const parsedTime = parseTimeLabel(place.timeLabel);

    setFixModalPlace(place);
    setFixModalDateKey(activeDateKey);
    setFixPeriod(parsedTime.period);
    setFixHour(parsedTime.hour);
    setFixMinute(parsedTime.minute);
    setFixIsFixed(
      typeof place.isFixedTime === "boolean" ? place.isFixedTime : false
    );
  };

  const handleCloseFixModal = () => {
    setFixModalPlace(null);
    setFixModalDateKey("");
    setFixIsFixed(false);
  };

  const handleConfirmFixModal = () => {
    if (!fixModalPlace || !fixModalDateKey) return;

    const nextTimeLabel = formatTimeLabel({
      period: fixPeriod,
      hour: fixHour,
      minute: fixMinute,
    });

    setPlacesByDate((prev) => ({
      ...prev,
      [fixModalDateKey]: (prev[fixModalDateKey] || []).map((place) =>
        place.id === fixModalPlace.id
          ? { ...place, timeLabel: nextTimeLabel, isFixedTime: fixIsFixed }
          : place
      ),
    }));

    handleCloseFixModal();
  };

  const handleGenerateRoute = () => {
    if (generation.status === "running") return;
    if (generation.status === "failed") {
      setIsStartPlaceModalOpen(false);
      return;
    }
    generation.reset();
    const hasAnyPlace = selectedDates.some((date) => {
      const dateKey = formatDateKey(date);
      return (placesByDate[dateKey] || []).length > 0;
    });

    if (!hasAnyPlace) {
      alert("장소를 1개 이상 추가해야 출발지를 설정할 수 있어요.");
      return;
    }

    setGeneratedRoute(null);
    setStartPlaceErrorMessage("");
    setIsCompleteModalOpen(false);
    setSelectedStartPlaces(getStartPlaceDefaultMap(selectedDates, placesByDate));
    setStartPlaceDayIndex(0);
    setIsStartPlaceModalOpen(true);
  };

  const handleCloseStartPlaceModal = () => {
    if (isGeneratingRoute) return;

    setStartPlaceErrorMessage("");
    setIsStartPlaceModalOpen(false);
  };

  const handleSelectStartPlace = (dateKey, placeId) => {
    setSelectedStartPlaces((prev) => ({ ...prev, [dateKey]: placeId }));
  };

  const buildRouteDraft = (placesSnapshot = placesByDate) => {
    const firstDate = selectedDates[0];
    const lastDate = selectedDates[selectedDates.length - 1];

    const totalPlaces = selectedDates.reduce((sum, date) => {
      const dateKey = formatDateKey(date);
      return sum + (placesSnapshot[dateKey] || []).length;
    }, 0);

    const firstDateKey = firstDate ? formatDateKey(firstDate) : "";

    const firstPlace = firstDateKey
      ? (placesSnapshot[firstDateKey] || [])[0]
      : null;

    const routeSelectedDates = selectedDates.map((date) =>
      new Date(date).toISOString()
    );
    const routePlacesByDate = JSON.parse(JSON.stringify(placesSnapshot));

    return {
      id: `route-${Date.now()}`,
      title: firstPlace
        ? `${firstPlace.name} 여행 일정`
        : `${selectedDates.length}일 여행 일정`,
      createdAt: new Date().toISOString(),
      selectedDates: routeSelectedDates,
      placesByDate: routePlacesByDate,
      thumbnail: firstPlace?.thumb || "",
      summary: {
        daysCount: selectedDates.length,
        totalPlaces,
        dateRangeText:
          firstDate && lastDate
            ? `${formatTabDate(firstDate)} ~ ${formatTabDate(lastDate)}`
            : "",
      },
    };
  };

  const handleConfirmStartPlaces = async () => {
    if (generation.status === "running" || generation.status === "failed") return;
    const reordered = selectedDates.reduce((acc, date) => {
      const key = formatDateKey(date);
      const places = acc[key] || [];
      acc[key] = moveSelectedPlaceToFirst(places, selectedStartPlaces[key] || places[0]?.id);
      return acc;
    }, { ...placesByDate });
    try {

      setStartPlaceErrorMessage("");
      const result = await generation.run((update, options) => saveRouteToServer(buildRouteDraft(reordered), selectedStartPlaces, update, options));
      if (!result) return;
      setGeneratedRoute(result);
      setPlacesByDate(result.placesByDate || reordered);
      setIsStartPlaceModalOpen(false);
      setIsCompleteModalOpen(true);
    } catch (error) {
      logSafeApiError(error, "RouteCreate.jsx");
      setIsStartPlaceModalOpen(false);
      setStartPlaceErrorMessage("일부 내용이 저장되었을 수 있어요. 중복 생성을 피하려면 일정 목록에서 저장 상태를 확인해 주세요.");
    }
  };
  const handleCloseCompleteModal = () => {
    if (isGeneratingRoute) return;
    setIsCompleteModalOpen(false);
  };
  const handleConfirmRoute = () => {
    if (!generatedRoute || generation.status !== "success") return;
    setIsCompleteModalOpen(false);
    navigate(`/route-result?id=${encodeURIComponent(generatedRoute.id)}`, { state: { savedRoute: generatedRoute } });
  };
  const handleSaveRouteLater = () => {
    if (!generatedRoute || generation.status !== "success") return;
    setIsCompleteModalOpen(false);
    navigate("/schedule");
  };
  const completeDialogRef = useModalFocus({
    open: isCompleteModalOpen,
    onClose: handleCloseCompleteModal,
    canClose: !isSavingRoute && !isGeneratingRoute,
    lockScroll: true,
  });

  return (
    <div className="route-create-page">
      <div className="route-create-screen">
        {generation.status === "running" && <p className="generation-feedback" role="status">{generation.stage} 중...</p>}
        {generation.status === "failed" && <section className="generation-feedback" role="alert">
          <h2>경로 생성을 완료하지 못했어요</h2>
          <p>중단 단계: {generation.stage}</p>
          <p>성공 응답을 확인한 작업: {generation.completed.length ? generation.completed.join(" · ") : "없음"}</p>
          {generation.tripId && <p>확인된 여행 ID: {generation.tripId} (전체 저장 완료를 의미하지 않습니다)</p>}
          <p>{generation.beforeWrite ? generation.error : "일부 내용이 저장되었을 수 있어요. 중복 생성을 피하려면 일정 목록에서 저장 상태를 확인해 주세요."}</p>
          <button type="button" onClick={() => navigate(generation.tripId ? `/route-result?id=${generation.tripId}` : "/schedule")}>저장 상태 확인</button>
          <button type="button" onClick={() => {
            if (generation.beforeWrite || window.confirm("기존 작업의 저장 여부가 불명확합니다. 일정 목록에서 확인했나요? 새로 생성하면 중복 일정이 생길 수 있습니다. 입력을 유지하고 새 작업을 준비할까요?")) {
              generation.reset(); setStartPlaceErrorMessage(""); setIsStartPlaceModalOpen(false);
            }
          }}>입력을 유지하고 새 작업 준비</button>
        </section>}
        <section className="calendar-section">
          <div className="calendar-header">
            <button
              type="button"
              className="calendar-arrow"
              onClick={handlePrevMonth}
              aria-label="이전 달"
            >
              ‹
            </button>

            <strong>{monthTitle}</strong>

            <button
              type="button"
              className="calendar-arrow"
              onClick={handleNextMonth}
              aria-label="다음 달"
            >
              ›
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {visibleWeeks.map((week, weekIndex) =>
              week.map((dayObj, dayIndex) => {
                const dateKey = formatDateKey(dayObj.date);
                const isSelected = selectedDateKeys.has(dateKey);
                const prevDay = week[dayIndex - 1];
                const nextDay = week[dayIndex + 1];

                const hasPrevSelected =
                  prevDay && selectedDateKeys.has(formatDateKey(prevDay.date));

                const hasNextSelected =
                  nextDay && selectedDateKeys.has(formatDateKey(nextDay.date));

                let rangeClass = "";

                if (isSelected) {
                  if (hasPrevSelected && hasNextSelected) {
                    rangeClass = "is-range-middle";
                  } else if (!hasPrevSelected && hasNextSelected) {
                    rangeClass = "is-range-start";
                  } else if (hasPrevSelected && !hasNextSelected) {
                    rangeClass = "is-range-end";
                  } else {
                    rangeClass = "is-range-single";
                  }
                }

                return (
                  <button
                    key={`${weekIndex}-${dateKey}`}
                    type="button"
                    className={`calendar-day ${
                      !dayObj.isCurrentMonth ? "is-muted" : ""
                    } ${isSelected ? "is-selected" : ""} ${rangeClass}`}
                    onClick={() => handleDateClick(dayObj.date)}
                  >
                    {dayObj.date.getDate()}
                  </button>
                );
              })
            )}
          </div>
        </section>

        <div className="day-tabs">
          {selectedDates.map((date, index) => (
            <button
              key={formatDateKey(date)}
              type="button"
              className={`day-tab ${
                activeDayIndex === index ? "is-active" : ""
              }`}
              onClick={() => setActiveDayIndex(index)}
            >
              Day {index + 1} ({formatTabDate(date)})
            </button>
          ))}
        </div>

        <section className="route-search-area">
          <div className="route-search-top-row">
            <div className="route-search-box">
              <svg className="route-search-icon" viewBox="0 0 30 18" width="30" height="18" aria-hidden="true">
                <circle cx="7.5" cy="7.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M11.5 11.5L16.5 16.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>

              <input
                ref={searchInputRef}
                type="text"
                placeholder="장소 검색 및 추가"
                aria-label="일정에 추가할 장소 검색"
                value={searchKeyword}
                maxLength={100}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchKeyword(e.target.value);
                  setIsSearchOpen(true);
                }}
                onKeyDown={handleSearchKeyDown}
              />
            </div>

            <button
              type="button"
              className="route-favorite-button"
              onClick={handleFavoritePlacesClick}
            >
              <img src={heartIcon} alt="" />
              <span>관심장소</span>
            </button>
          </div>

          {isSearchOpen && (
            <div className="route-search-result-list">
              {isSearching ? (
                <div className="route-search-empty">검색 중입니다.</div>
              ) : filteredSearchResults.length === 0 ? (
                <div className="route-search-empty">
                  {searchErrorMessage || (searchKeyword.trim() ? "검색 결과가 없어요." : "검색어를 입력해 주세요.")}
                  {searchErrorMessage && <button type="button" onClick={placeSearch.retry}>검색 다시 시도</button>}
                </div>
              ) : (
                <>
                  {searchErrorMessage && (
                    <div className="route-search-empty">
                      {searchErrorMessage}<button type="button" onClick={placeSearch.retry}>검색 다시 시도</button>
                    </div>
                  )}

                  {filteredSearchResults.map((place) => {
                    const alreadyAdded = isPlaceAlreadyAdded(place);

                    return (
                      <div
                        key={place.sourceId}
                        className="route-search-result-card"
                      >
                        <div className="route-search-result-text">
                          <div className="route-search-result-name">
                            {place.name}
                          </div>

                          <div className="route-search-result-desc">
                            {place.desc}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={`route-search-add-button ${
                            alreadyAdded ? "is-disabled" : ""
                          }`}
                          onClick={() => handleAddPlace(place)}
                          disabled={alreadyAdded}
                        >
                          {alreadyAdded ? "추가됨" : "추가"}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </section>

        <section className="selected-place-section">
          <div className="selected-place-header schedule-list-header">
            <h2>일정 리스트</h2>

            <span className="selected-place-count">
              {currentPlaces.length}개 장소 선택됨
            </span>
          </div>

          <div className="place-list schedule-list">
            {currentPlaces.length === 0 && (
              <div className="empty-state">아직 추가된 장소가 없어요.</div>
            )}

            {currentPlaces.map((place, index) => {
              const timeLabel =
                place.timeLabel ||
                DEFAULT_TIME_SLOTS[index % DEFAULT_TIME_SLOTS.length];

              const isFixedTime =
                typeof place.isFixedTime === "boolean"
                  ? place.isFixedTime
                  : false;

              const thumb = place.thumb;

              return (
                <div key={place.id} className="place-card schedule-card">
                  <button
                    type="button"
                    className="remove-place-button schedule-remove-button"
                    onClick={() => handleRemovePlace(place.id)}
                    aria-label={`${place.name} 삭제`}
                  >
                    ×
                  </button>

                  <div className="place-main schedule-card-main">
                    <span className="place-photo-frame schedule-place-thumb"><PlacePhoto place={place}
                      src={thumb}
                      alt={place.name}
                      className="place-photo-frame-image"
                    /></span>

                    <div className="place-text schedule-card-content">
                      <div className="place-name schedule-place-name">
                        {place.name}
                      </div>

                      <div className="place-desc schedule-place-desc">
                        {place.desc}
                      </div>

                      <div
                        className={`schedule-time-bar ${
                          isFixedTime ? "is-fixed" : ""
                        }`}
                      >
                        <div className="schedule-time-text">
                          {isFixedTime ? <LockIcon /> : <ClockIcon />}

                          <span>
                            {isFixedTime
                              ? `${timeLabel} (고정됨)`
                              : timeLabel}
                          </span>
                        </div>

                        <button
                          type="button"
                          className={`schedule-time-action ${
                            isFixedTime ? "is-edit" : "is-fix"
                          }`}
                          onClick={() => handleOpenFixModal(place)}
                        >
                          {isFixedTime ? "EDIT" : "FIX"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              type="button"
              className="add-place-button schedule-add-place-button"
              onClick={handleOpenSearch}
            >
              <span className="add-place-plus">＋</span> 장소 추가하기
            </button>
          </div>
        </section>

        <div className="route-generate-bar">
          <button
            type="button"
            className="route-generate-btn"
            onClick={handleGenerateRoute}
          >
            경로 생성하기
          </button>
        </div>
      </div>

      <FixPointModal
        open={Boolean(fixModalPlace)}
        place={fixModalPlace}
        period={fixPeriod}
        hour={fixHour}
        minute={fixMinute}
        isFixed={fixIsFixed}
        onChangePeriod={setFixPeriod}
        onChangeHour={setFixHour}
        onChangeMinute={setFixMinute}
        onChangeFixed={setFixIsFixed}
        onClose={handleCloseFixModal}
        onConfirm={handleConfirmFixModal}
      />

      <StartPlaceModal
        open={isStartPlaceModalOpen}
        selectedDates={selectedDates}
        placesByDate={placesByDate}
        activeDayIndex={startPlaceDayIndex}
        selectedStartPlaces={selectedStartPlaces}
        getDateKey={formatDateKey}
        onChangeDay={setStartPlaceDayIndex}
        onSelectPlace={handleSelectStartPlace}
        onClose={handleCloseStartPlaceModal}
        onConfirm={handleConfirmStartPlaces}
        isSubmitting={isGeneratingRoute}
        submitError={startPlaceErrorMessage}
        progressText={`${generation.stage} 중...`}
        submitBlocked={generation.status === "failed"}
      />

      <FavoritePlacesModal
        open={isFavoriteModalOpen}
        status={favoriteQuery.status}
        errorMessage={favoriteQuery.status === "error" ? getErrorMessage(favoriteQuery.cause, "관심장소를 불러오지 못했어요.") : ""}
        onRetry={favoriteQuery.retry}
        folders={favoriteFolders}
        selectedPlaceIds={selectedFavoritePlaceIds}
        expandedFolderIds={expandedFavoriteFolderIds}
        selectedDayIndex={favoriteModalDayIndex}
        selectedDates={selectedDates}
        onClose={handleCloseFavoriteModal}
        onToggleFolder={handleToggleFavoriteFolder}
        onTogglePlace={handleToggleFavoritePlace}
        onChangeDay={setFavoriteModalDayIndex}
        onConfirm={handleConfirmFavoritePlaces}
      />

      {isCompleteModalOpen && createPortal(
        <div
          className="route-complete-overlay"
          onClick={handleCloseCompleteModal}
        >
          <div
            ref={completeDialogRef}
            className="route-complete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="route-complete-title"
            aria-describedby="route-complete-description"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="route-complete-icon">
              <RouteCompleteIcon />
            </div>

            <h3 id="route-complete-title" className="route-complete-title">
              동선 제작 완료!
            </h3>

            <p id="route-complete-description" className="route-complete-desc">
              등록한 장소를 바탕으로 생성한 경로가 <br />
              생성되었습니다. <br />
              지금 바로 확인해 보세요.
            </p>

            <button
              type="button"
              className="route-complete-confirm-btn"
              onClick={handleConfirmRoute}
              disabled={isSavingRoute || isGeneratingRoute}
              data-modal-initial-focus
            >
              {isSavingRoute ? "저장 중..." : "경로 확인하기 →"}
            </button>

            <button
              type="button"
              className="route-complete-later-btn"
              onClick={handleSaveRouteLater}
              disabled={isSavingRoute || isGeneratingRoute}
            >
              {isSavingRoute ? "저장 중..." : "나중에 보기"}
            </button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default RouteCreate;
