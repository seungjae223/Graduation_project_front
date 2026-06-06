import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./RouteCreate.css";

import searchIcon from "../img/검색.png";
import heartIcon from "../img/파랑색 하트.png";
import scheduleIcon from "../img/파랑색 일정.png";
import blueFolderIcon from "../img/파랑색폴더.png";
import darkFolderIcon from "../img/검정색폴더.png";

import { useSavedPlaces } from "../Context/SavedPlacesContext";
import { saveRoute as saveRouteUtil } from "../utils/routeStorage";
import StartPlaceModal from "./StartPlaceModal";
import api from "../api/api";

const STORAGE_KEY = "mock_saved_route_results";
const ROUTE_STORAGE_EVENT = "mock-routes-updated";
const ROUTE_SELECTED_PLACE_KEY = "routeSelectedPlace";
const ROUTE_DRAFT_PLACES_KEY = "routeDraftPlaces";
const RECENT_PLACES_KEY = "recentPlaces";
const PLACE_SEARCH_API = "/api/places";
const TRIPS_API = "/api/trips";

const DEFAULT_COORDS = {
  latitude: 37.5665,
  longitude: 126.978,
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

const DEFAULT_TIME_SLOTS = [
  "09:30 AM",
  "12:30 PM",
  "03:00 PM",
  "06:30 PM",
  "08:00 PM",
];

const getThumb = (seed) => `https://picsum.photos/seed/${seed}/200/200`;

const persistRouteSafely = (route) => {
  try {
    if (typeof saveRouteUtil === "function") {
      saveRouteUtil(route);
    }
  } catch (error) {
    console.error("routeStorage 저장 실패:", error);
  }

  try {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    const prev = raw ? JSON.parse(raw) : [];
    const next = [route, ...prev.filter((item) => item.id !== route.id)];

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(ROUTE_STORAGE_EVENT));
  } catch (error) {
    console.error("localStorage 직접 저장 실패:", error);
  }
};

const MOCK_PLACE_RESULTS = [
  {
    sourceId: "seoul-gyeongbokgung",
    name: "경복궁",
    desc: "서울특별시 종로구 사직로 161",
    city: "서울",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("seoul-gyeongbokgung"),
  },
  {
    sourceId: "seoul-bukchon",
    name: "북촌한옥마을",
    desc: "서울특별시 종로구 계동길 37",
    city: "서울",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("seoul-bukchon"),
  },
  {
    sourceId: "seoul-ikseondong",
    name: "익선동 카페거리",
    desc: "서울특별시 종로구 익선동",
    city: "서울",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("seoul-ikseondong"),
  },
  {
    sourceId: "seoul-starfield-library",
    name: "별마당도서관",
    desc: "서울특별시 강남구 영동대로 513 코엑스몰",
    city: "서울",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("seoul-starfield-library"),
  },
  {
    sourceId: "seoul-namsan-tower",
    name: "N서울타워",
    desc: "서울특별시 용산구 남산공원길 105",
    city: "서울",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("seoul-namsan-tower"),
  },
  {
    sourceId: "tokyo-skytree",
    name: "도쿄 스카이트리",
    desc: "일본 도쿄도 스미다구 오시아게 1-1-2",
    city: "도쿄",
    country: "일본",
    mapProvider: "google",
    thumb: getThumb("tokyo-skytree"),
  },
  {
    sourceId: "tokyo-sensoji",
    name: "센소지",
    desc: "일본 도쿄도 다이토구 아사쿠사 2-3-1",
    city: "도쿄",
    country: "일본",
    mapProvider: "google",
    thumb: getThumb("tokyo-sensoji"),
  },
  {
    sourceId: "tokyo-shibuya-scramble",
    name: "시부야 스크램블 스퀘어",
    desc: "일본 도쿄도 시부야구 시부야 2-24-12",
    city: "도쿄",
    country: "일본",
    mapProvider: "google",
    thumb: getThumb("tokyo-shibuya-scramble"),
  },
  {
    sourceId: "busan-haeundae",
    name: "해운대 해수욕장",
    desc: "부산광역시 해운대구 우동",
    city: "부산",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("busan-haeundae"),
  },
  {
    sourceId: "busan-gwangalli",
    name: "광안리 해수욕장",
    desc: "부산광역시 수영구 광안해변로 219",
    city: "부산",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("busan-gwangalli"),
  },
  {
    sourceId: "busan-gamcheon",
    name: "감천문화마을",
    desc: "부산광역시 사하구 감내2로 203",
    city: "부산",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("busan-gamcheon"),
  },
  {
    sourceId: "paris-eiffel-tower",
    name: "에펠탑",
    desc: "프랑스 파리 Champ de Mars, 5 Avenue Anatole France",
    city: "파리",
    country: "프랑스",
    mapProvider: "google",
    thumb: getThumb("paris-eiffel-tower"),
  },
  {
    sourceId: "paris-louvre",
    name: "루브르 박물관",
    desc: "프랑스 파리 Rue de Rivoli, 75001",
    city: "파리",
    country: "프랑스",
    mapProvider: "google",
    thumb: getThumb("paris-louvre"),
  },
  {
    sourceId: "paris-montmartre",
    name: "몽마르트르",
    desc: "프랑스 파리 75018",
    city: "파리",
    country: "프랑스",
    mapProvider: "google",
    thumb: getThumb("paris-montmartre"),
  },
  {
    sourceId: "jeju-seongsan",
    name: "성산일출봉",
    desc: "제주특별자치도 서귀포시 성산읍 성산리 1",
    city: "제주",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("jeju-seongsan"),
  },
  {
    sourceId: "jeju-hyeopjae",
    name: "협재해수욕장",
    desc: "제주특별자치도 제주시 한림읍 협재리 2497-1",
    city: "제주",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("jeju-hyeopjae"),
  },
  {
    sourceId: "jeju-aewol-cafe-street",
    name: "애월 카페거리",
    desc: "제주특별자치도 제주시 애월읍 애월리",
    city: "제주",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("jeju-aewol-cafe-street"),
  },
  {
    sourceId: "newyork-times-square",
    name: "타임스 스퀘어",
    desc: "미국 뉴욕 Manhattan, New York, NY 10036",
    city: "뉴욕",
    country: "미국",
    mapProvider: "google",
    thumb: getThumb("newyork-times-square"),
  },
  {
    sourceId: "newyork-central-park",
    name: "센트럴 파크",
    desc: "미국 뉴욕 New York, NY",
    city: "뉴욕",
    country: "미국",
    mapProvider: "google",
    thumb: getThumb("newyork-central-park"),
  },
  {
    sourceId: "newyork-met-museum",
    name: "메트로폴리탄 미술관",
    desc: "미국 뉴욕 1000 5th Ave, New York, NY 10028",
    city: "뉴욕",
    country: "미국",
    mapProvider: "google",
    thumb: getThumb("newyork-met-museum"),
  },
  {
    sourceId: "gyeongju-donggung",
    name: "동궁과 월지",
    desc: "경상북도 경주시 원화로 102",
    city: "경주",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("gyeongju-donggung"),
  },
  {
    sourceId: "gyeongju-hwangridan",
    name: "황리단길",
    desc: "경상북도 경주시 포석로 1080 일대",
    city: "경주",
    country: "대한민국",
    mapProvider: "kakao",
    thumb: getThumb("gyeongju-hwangridan"),
  },
  {
    sourceId: "bangkok-wat-arun",
    name: "왓 아룬",
    desc: "태국 방콕 Bangkok Yai, 158 Wang Doem Road",
    city: "방콕",
    country: "태국",
    mapProvider: "google",
    thumb: getThumb("bangkok-wat-arun"),
  },
  {
    sourceId: "bangkok-iconsiam",
    name: "아이콘시암",
    desc: "태국 방콕 Khlong San, 299 Charoen Nakhon Road",
    city: "방콕",
    country: "태국",
    mapProvider: "google",
    thumb: getThumb("bangkok-iconsiam"),
  },
  {
    sourceId: "bangkok-chatuchak",
    name: "짜뚜짝 시장",
    desc: "태국 방콕 Kamphaeng Phet 2 Rd, Chatuchak",
    city: "방콕",
    country: "태국",
    mapProvider: "google",
    thumb: getThumb("bangkok-chatuchak"),
  },
  {
    sourceId: "osaka-dotonbori",
    name: "도톤보리",
    desc: "일본 오사카시 주오구 도톤보리",
    city: "오사카",
    country: "일본",
    mapProvider: "google",
    thumb: getThumb("osaka-dotonbori"),
  },
  {
    sourceId: "osaka-usj",
    name: "유니버설 스튜디오 재팬",
    desc: "일본 오사카시 고노하나구 사쿠라지마 2-1-33",
    city: "오사카",
    country: "일본",
    mapProvider: "google",
    thumb: getThumb("osaka-usj"),
  },
  {
    sourceId: "singapore-marina-bay-sands",
    name: "마리나 베이 샌즈",
    desc: "싱가포르 10 Bayfront Avenue",
    city: "싱가포르",
    country: "싱가포르",
    mapProvider: "google",
    thumb: getThumb("singapore-marina-bay-sands"),
  },
  {
    sourceId: "singapore-gardens-by-the-bay",
    name: "가든스 바이 더 베이",
    desc: "싱가포르 18 Marina Gardens Drive",
    city: "싱가포르",
    country: "싱가포르",
    mapProvider: "google",
    thumb: getThumb("singapore-gardens-by-the-bay"),
  },
  {
    sourceId: "singapore-merlion-park",
    name: "멀라이언 파크",
    desc: "싱가포르 1 Fullerton Road",
    city: "싱가포르",
    country: "싱가포르",
    mapProvider: "google",
    thumb: getThumb("singapore-merlion-park"),
  },
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
    <circle cx="40" cy="40" r="40" fill="#EAF7FF" />
    <path
      d="M39.6 20.5L42.8 29.1L51.5 32.3L42.8 35.5L39.6 44.1L36.4 35.5L27.8 32.3L36.4 29.1L39.6 20.5Z"
      fill="#19A5F4"
    />
    <path
      d="M53.8 34.6L55.7 39.7L60.8 41.6L55.7 43.5L53.8 48.6L51.9 43.5L46.8 41.6L51.9 39.7L53.8 34.6Z"
      fill="#19A5F4"
    />
    <circle cx="58" cy="56.5" r="9.5" fill="#19A5F4" />
    <path
      d="M54 56.5L56.8 59.3L62 53.8"
      fill="none"
      stroke="#ffffff"
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
  if (!open || !place) return null;

  const prevHour = getPrevHour(hour);
  const nextHour = getNextHour(hour);
  const prevMinute = getPrevMinute(minute);
  const nextMinute = getNextMinute(minute);

  return (
    <div className="fix-point-overlay" onClick={onClose}>
      <div
        className="fix-point-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Fix Point 설정"
        onClick={(event) => event.stopPropagation()}
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
    </div>
  );
};

const FavoritePlacesModal = ({
  open,
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

  return (
    <div className="favorite-place-overlay" onClick={onClose}>
      <div
        className="favorite-place-modal"
        role="dialog"
        aria-modal="true"
        aria-label="관심장소에서 추가"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="favorite-place-header">
          <h2>관심장소에서 추가</h2>

          <button
            type="button"
            className="favorite-place-close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </div>

        <div className="favorite-folder-list">
          {folders.map((folder) => {
            const isExpanded = expandedFolderIds.includes(folder.id);

            return (
              <section key={folder.id} className="favorite-folder-section">
                <button
                  type="button"
                  className="favorite-folder-header"
                  onClick={() => onToggleFolder(folder.id)}
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
                    <small>{folder.places.length}개의 장소</small>
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
                    {folder.places.map((place) => {
                      const isChecked = selectedPlaceIds.includes(
                        place.sourceId
                      );

                      return (
                        <button
                          type="button"
                          key={place.sourceId}
                          className={`favorite-place-item ${
                            isChecked ? "is-selected" : ""
                          }`}
                          onClick={() => onTogglePlace(place.sourceId)}
                        >
                          <span
                            className={`favorite-place-checkbox ${
                              isChecked ? "is-checked" : ""
                            }`}
                          >
                            {isChecked ? "✓" : ""}
                          </span>

                          <img
                            src={place.thumb}
                            alt={place.name}
                            className="favorite-place-thumb"
                          />

                          <span className="favorite-place-text">
                            <strong>{place.name}</strong>
                            <small>{place.desc}</small>
                          </span>
                        </button>
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
    </div>
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
    const firstPlace = placeMap[dateKey]?.[0];

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
  return {
    id: `${place.sourceId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    sourceId: place.sourceId,
    originalId: place.originalId || place.id || place.placeId || null,
    placeId: place.placeId || place.id || place.originalId || null,
    destinationId: place.destinationId || null,
    name: place.name,
    desc: place.desc,
    city: place.city,
    country: place.country,
    mapProvider: place.mapProvider,
    thumb: place.thumb || getThumb(place.sourceId || place.name),
    rating: place.rating || null,
    tags: place.tags || [],
    latitude: place.latitude || null,
    longitude: place.longitude || null,
    placeType: place.placeType || "",
    timeLabel:
      place.timeLabel ||
      DEFAULT_TIME_SLOTS[orderIndex % DEFAULT_TIME_SLOTS.length],
    isFixedTime:
      typeof place.isFixedTime === "boolean"
        ? place.isFixedTime
        : orderIndex === 1,
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
    console.error(`${key} 불러오기 실패:`, error);
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
    thumb:
      place.thumb ||
      place.image ||
      place.thumbnail ||
      place.thumbnailUrl ||
      getThumb(sourceId || name),
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
  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.data?.places)) return data.data.places;

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
    place.sourceId || place.id || place.placeId || place.destinationId || name
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
    mapProvider: place.mapProvider || place.provider || "server",
    thumb:
      place.thumb ||
      place.image ||
      place.imageUrl ||
      place.thumbnail ||
      place.thumbnailUrl ||
      place.photoUrl ||
      getThumb(sourceId || name),
    rating: place.rating || place.score || place.avgRating || null,
    tags: place.tags || place.hashtags || [],
    latitude: place.latitude ?? place.lat ?? null,
    longitude: place.longitude ?? place.lng ?? null,
    placeType: place.placeType || place.type || "",
  };
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

const getResponseData = (data) => {
  return data?.data || data?.trip || data?.tripPlace || data;
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

    if (Number.isInteger(numberValue) && numberValue > 0) {
      return numberValue;
    }
  }

  return null;
};

const buildTripPayload = (savedRoute) => {
  const allPlaces = getAllRoutePlaces(savedRoute);
  const firstPlace = allPlaces[0];

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
    latitude: toNumberOrDefault(firstPlace?.latitude, DEFAULT_COORDS.latitude),
    longitude: toNumberOrDefault(
      firstPlace?.longitude,
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

const addPlacesToTrip = async (tripId, savedRoute) => {
  const tripPlaceMap = {};
  const addedCountByDay = {};

  for (let dayIndex = 0; dayIndex < savedRoute.selectedDates.length; dayIndex++) {
    const day = dayIndex + 1;
    const dateKey = formatDateKey(savedRoute.selectedDates[dayIndex]);
    const dayPlaces = savedRoute.placesByDate[dateKey] || [];

    for (let placeIndex = 0; placeIndex < dayPlaces.length; placeIndex++) {
      const place = dayPlaces[placeIndex];
      const placeId = getNumericPlaceId(place);

      if (!placeId) {
        console.warn(
          "[RouteCreate] 숫자 placeId가 없어 서버 장소 추가를 건너뜁니다:",
          place
        );
        continue;
      }

      const response = await api.post(
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
      const localPlaceKey = place.id || `${dateKey}-${placeIndex}`;

      tripPlaceMap[localPlaceKey] = tripPlaceData;
      tripPlaceMap[String(placeId)] = tripPlaceData;

      addedCountByDay[day] = (addedCountByDay[day] || 0) + 1;
    }
  }

  return {
    tripPlaceMap,
    addedCountByDay,
  };
};

const setStartPointsToServer = async ({
  tripId,
  savedRoute,
  selectedStartPlaces,
  tripPlaceMap,
  addedCountByDay,
}) => {
  for (let dayIndex = 0; dayIndex < savedRoute.selectedDates.length; dayIndex++) {
    const day = dayIndex + 1;

    if (!addedCountByDay[day]) continue;

    const dateKey = formatDateKey(savedRoute.selectedDates[dayIndex]);
    const dayPlaces = savedRoute.placesByDate[dateKey] || [];
    const selectedLocalPlaceId =
      selectedStartPlaces?.[dateKey] || dayPlaces[0]?.id;

    const selectedPlace =
      dayPlaces.find((place) => place.id === selectedLocalPlaceId) ||
      dayPlaces[0];

    if (!selectedPlace) continue;

    const numericPlaceId = getNumericPlaceId(selectedPlace);

    const tripPlaceData =
      tripPlaceMap[selectedLocalPlaceId] ||
      tripPlaceMap[String(numericPlaceId)];

    const tripPlaceId = tripPlaceData?.id || tripPlaceData?.tripPlaceId;

    if (!tripPlaceId) continue;

    await api.post(
      `${TRIPS_API}/${tripId}/days/${day}/places/${tripPlaceId}/start`
    );
  }
};

const optimizeTripDays = async (tripId, savedRoute, addedCountByDay = {}) => {
  const optimizedByDay = {};

  for (let dayIndex = 0; dayIndex < savedRoute.selectedDates.length; dayIndex++) {
    const day = dayIndex + 1;

    if (!addedCountByDay[day]) continue;

    const response = await api.post(`${TRIPS_API}/${tripId}/days/${day}/optimize`);

    optimizedByDay[day] = getArrayData(response.data);
  }

  return optimizedByDay;
};

const mapOptimizedPlacesToSavedRoute = (savedRoute, optimizedByDay) => {
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
        const matchedPlace =
          existingPlaces.find((place) => {
            const localPlaceId = getNumericPlaceId(place);
            return localPlaceId && localPlaceId === Number(tripPlace.placeId);
          }) ||
          existingPlaces[index] ||
          {};

        return {
          ...matchedPlace,
          id: matchedPlace.id || `trip-place-${tripPlace.id}`,
          sourceId:
            matchedPlace.sourceId ||
            String(tripPlace.placeId || tripPlace.placeName),
          originalId: tripPlace.placeId || matchedPlace.originalId,
          placeId: tripPlace.placeId || matchedPlace.placeId,
          serverTripPlaceId: tripPlace.id,
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

const RouteCreate = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef(null);
  const { savedPlaces } = useSavedPlaces();

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
  const [serverSearchResults, setServerSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState("");
  const [hasServerSearchCompleted, setHasServerSearchCompleted] =
    useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isSavingRoute, setIsSavingRoute] = useState(false);
  const [isStartPlaceModalOpen, setIsStartPlaceModalOpen] = useState(false);
  const [startPlaceDayIndex, setStartPlaceDayIndex] = useState(0);
  const [selectedStartPlaces, setSelectedStartPlaces] = useState({});
  const [fixModalPlace, setFixModalPlace] = useState(null);
  const [fixModalDateKey, setFixModalDateKey] = useState("");
  const [fixPeriod, setFixPeriod] = useState("PM");
  const [fixHour, setFixHour] = useState(12);
  const [fixMinute, setFixMinute] = useState(30);
  const [fixIsFixed, setFixIsFixed] = useState(true);

  const [isFavoriteModalOpen, setIsFavoriteModalOpen] = useState(false);
  const [favoriteModalDayIndex, setFavoriteModalDayIndex] = useState(0);
  const [selectedFavoritePlaceIds, setSelectedFavoritePlaceIds] = useState([]);
  const [expandedFavoriteFolderIds, setExpandedFavoriteFolderIds] = useState([
    "solo",
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

  const fallbackFavoritePlaces = useMemo(
    () => [
      {
        sourceId: "favorite-seongsan",
        name: "성산 일출봉",
        desc: "자연명소 · 제주도",
        city: "제주",
        country: "대한민국",
        mapProvider: "kakao",
        thumb: getThumb("favorite-seongsan"),
      },
      {
        sourceId: "favorite-osulloc",
        name: "오설록 티 뮤지엄",
        desc: "카페/디저트 · 제주도",
        city: "제주",
        country: "대한민국",
        mapProvider: "kakao",
        thumb: getThumb("favorite-osulloc"),
      },
      {
        sourceId: "favorite-aewol",
        name: "애월 카페거리",
        desc: "카페거리 · 제주도",
        city: "제주",
        country: "대한민국",
        mapProvider: "kakao",
        thumb: getThumb("favorite-aewol"),
      },
      {
        sourceId: "favorite-gyeongbokgung",
        name: "경복궁",
        desc: "역사명소 · 서울",
        city: "서울",
        country: "대한민국",
        mapProvider: "kakao",
        thumb: getThumb("favorite-gyeongbokgung"),
      },
      {
        sourceId: "favorite-bukchon",
        name: "북촌한옥마을",
        desc: "전통마을 · 서울",
        city: "서울",
        country: "대한민국",
        mapProvider: "kakao",
        thumb: getThumb("favorite-bukchon"),
      },
    ],
    []
  );

  const normalizedSavedFavoritePlaces = useMemo(() => {
    if (!Array.isArray(savedPlaces) || savedPlaces.length === 0) {
      return fallbackFavoritePlaces;
    }

    return savedPlaces.map((place, index) => {
      const name =
        place.name ||
        place.title ||
        place.placeName ||
        place.destinationName ||
        `저장 장소 ${index + 1}`;

      const sourceId = normalizeSourceId(
        place.sourceId || place.id || place.placeId || name
      );

      return {
        sourceId,
        originalId: place.id || place.placeId || place.destinationId || null,
        placeId: place.placeId || place.id || null,
        destinationId: place.destinationId || null,
        name,
        desc:
          place.desc ||
          place.address ||
          place.roadAddress ||
          place.location ||
          place.description ||
          "저장한 장소",
        city: place.city || place.region || "",
        country: place.country || "대한민국",
        mapProvider: place.mapProvider || place.provider || "kakao",
        thumb:
          place.thumb ||
          place.image ||
          place.imageUrl ||
          place.thumbnail ||
          place.thumbnailUrl ||
          getThumb(sourceId || name),
        rating: place.rating || null,
        tags: place.tags || [],
        latitude: place.latitude || place.lat || null,
        longitude: place.longitude || place.lng || null,
        placeType: place.placeType || place.type || "",
      };
    });
  }, [savedPlaces, fallbackFavoritePlaces]);

  const favoriteFolders = useMemo(
    () => [
      {
        id: "solo",
        title: "나홀로 여행",
        places: normalizedSavedFavoritePlaces.slice(0, 3),
      },
      {
        id: "family",
        title: "가족 휴가",
        places: normalizedSavedFavoritePlaces.slice(3, 8),
      },
    ],
    [normalizedSavedFavoritePlaces]
  );

  useEffect(() => {
    if (!isSearchOpen) {
      setServerSearchResults([]);
      setSearchErrorMessage("");
      setHasServerSearchCompleted(false);
      return;
    }

    const keyword = searchKeyword.trim();

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        setSearchErrorMessage("");
        setHasServerSearchCompleted(false);

        const response = await api.get(PLACE_SEARCH_API);
        const keywordLower = keyword.toLowerCase();

        const places = getArrayData(response.data)
          .map(normalizeSearchPlace)
          .filter(Boolean)
          .filter((place) => {
            if (!keywordLower) return true;

            return [
              place.name,
              place.desc,
              place.city,
              place.country,
              place.mapProvider,
              place.placeType,
            ]
              .filter(Boolean)
              .some((value) =>
                String(value).toLowerCase().includes(keywordLower)
              );
          });

        setServerSearchResults(places.slice(0, 12));
        setHasServerSearchCompleted(true);
      } catch (error) {
        console.error("장소 검색 실패:", error);
        setHasServerSearchCompleted(true);

        if (error.message.includes("Network Error")) {
          setSearchErrorMessage(
            "백엔드 서버 연결 또는 CORS 설정을 확인해주세요."
          );
          return;
        }

        setSearchErrorMessage(
          getErrorMessage(
            error,
            "장소 검색에 실패했습니다. 기본 검색 결과를 표시합니다."
          )
        );
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [isSearchOpen, searchKeyword]);

  const filteredSearchResults = useMemo(() => {
    if (!isSearchOpen) return [];

    const keyword = searchKeyword.trim().toLowerCase();

    if (serverSearchResults.length > 0) {
      return serverSearchResults;
    }

    if (hasServerSearchCompleted && !searchErrorMessage) {
      return [];
    }

    const baseList = keyword
      ? MOCK_PLACE_RESULTS.filter((place) =>
          [place.name, place.desc, place.city, place.country, place.mapProvider]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(keyword))
        )
      : MOCK_PLACE_RESULTS;

    return baseList.slice(0, 12);
  }, [
    hasServerSearchCompleted,
    isSearchOpen,
    searchErrorMessage,
    searchKeyword,
    serverSearchResults,
  ]);

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
    setServerSearchResults([]);
    setSearchErrorMessage("");
    setHasServerSearchCompleted(false);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key !== "Enter") return;

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
    setExpandedFavoriteFolderIds(["solo"]);
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
    const allFavoritePlaces = favoriteFolders.flatMap((folder) => folder.places);

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
    setFixIsFixed(true);
  };

  const handleCloseFixModal = () => {
    setFixModalPlace(null);
    setFixModalDateKey("");
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
    const hasAnyPlace = selectedDates.some((date) => {
      const dateKey = formatDateKey(date);
      return (placesByDate[dateKey] || []).length > 0;
    });

    if (!hasAnyPlace) {
      alert("장소를 1개 이상 추가해야 출발지를 설정할 수 있어요.");
      return;
    }

    setSelectedStartPlaces(getStartPlaceDefaultMap(selectedDates, placesByDate));
    setStartPlaceDayIndex(0);
    setIsStartPlaceModalOpen(true);
  };

  const handleCloseStartPlaceModal = () => {
    setIsStartPlaceModalOpen(false);
  };

  const handleSelectStartPlace = (dateKey, placeId) => {
    setSelectedStartPlaces((prev) => ({ ...prev, [dateKey]: placeId }));
  };

  const handleConfirmStartPlaces = () => {
    const reorderedPlacesByDate = selectedDates.reduce(
      (acc, date) => {
        const dateKey = formatDateKey(date);
        const dayPlaces = acc[dateKey] || [];
        const selectedId = selectedStartPlaces[dateKey] || dayPlaces[0]?.id;

        acc[dateKey] = moveSelectedPlaceToFirst(dayPlaces, selectedId);

        return acc;
      },
      { ...placesByDate }
    );

    setPlacesByDate(reorderedPlacesByDate);
    setIsStartPlaceModalOpen(false);

    setTimeout(() => {
      setIsCompleteModalOpen(true);
    }, 50);
  };

  const handleCloseCompleteModal = () => {
    if (isSavingRoute) return;
    setIsCompleteModalOpen(false);
  };

  const buildSavedRouteMock = () => {
    const firstDate = selectedDates[0];
    const lastDate = selectedDates[selectedDates.length - 1];

    const totalPlaces = selectedDates.reduce((sum, date) => {
      const dateKey = formatDateKey(date);
      return sum + (placesByDate[dateKey] || []).length;
    }, 0);

    const firstDateKey = firstDate ? formatDateKey(firstDate) : "";

    const firstPlace = firstDateKey
      ? (placesByDate[firstDateKey] || [])[0]
      : null;

    return {
      id: `route-${Date.now()}`,
      title: firstPlace
        ? `${firstPlace.name} 여행 일정`
        : `${selectedDates.length}일 여행 일정`,
      createdAt: new Date().toISOString(),
      selectedDates: selectedDates.map((date) => new Date(date).toISOString()),
      placesByDate: JSON.parse(JSON.stringify(placesByDate)),
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

  const saveRouteToServer = async (savedRoute) => {
    const tripPayload = buildTripPayload(savedRoute);

    const tripResponse = await api.post(TRIPS_API, tripPayload);
    const tripData = getResponseData(tripResponse.data);

    let serverSavedRoute = mergeTripResponseWithSavedRoute(
      savedRoute,
      tripData,
      tripPayload
    );

    const tripId = Number(tripData?.id || tripData?.tripId || serverSavedRoute.id);

    if (!Number.isInteger(tripId) || tripId <= 0) {
      return serverSavedRoute;
    }

    const { tripPlaceMap, addedCountByDay } = await addPlacesToTrip(
      tripId,
      savedRoute
    );

    await setStartPointsToServer({
      tripId,
      savedRoute,
      selectedStartPlaces,
      tripPlaceMap,
      addedCountByDay,
    });

    const optimizedByDay = await optimizeTripDays(
      tripId,
      savedRoute,
      addedCountByDay
    );

    serverSavedRoute = mapOptimizedPlacesToSavedRoute(
      serverSavedRoute,
      optimizedByDay
    );

    const uniqueTripPlaces = Array.from(
      new Map(
        Object.values(tripPlaceMap)
          .filter(Boolean)
          .map((tripPlace) => [
            tripPlace.id || tripPlace.tripPlaceId || JSON.stringify(tripPlace),
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

  const handleConfirmRoute = async () => {
    const savedRoute = buildSavedRouteMock();

    try {
      setIsSavingRoute(true);

      const serverSavedRoute = await saveRouteToServer(savedRoute);
      persistRouteSafely(serverSavedRoute);

      setIsCompleteModalOpen(false);

      navigate(`/route-result?id=${serverSavedRoute.id}`, {
        state: { savedRoute: serverSavedRoute, selectedDates, placesByDate },
      });
    } catch (error) {
      console.error("여행 생성 실패:", error);

      if (error.message.includes("Network Error")) {
        alert("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        alert("로그인 정보가 만료되었거나 권한이 없습니다. 다시 로그인해주세요.");
      } else {
        alert(
          getErrorMessage(
            error,
            "여행 생성에 실패했습니다. 로컬에 임시 저장 후 이동합니다."
          )
        );
      }

      persistRouteSafely(savedRoute);
      setIsCompleteModalOpen(false);

      navigate(`/route-result?id=${savedRoute.id}`, {
        state: { savedRoute, selectedDates, placesByDate },
      });
    } finally {
      setIsSavingRoute(false);
    }
  };

  const handleSaveRouteLater = async () => {
    const savedRoute = buildSavedRouteMock();

    try {
      setIsSavingRoute(true);

      const serverSavedRoute = await saveRouteToServer(savedRoute);
      persistRouteSafely(serverSavedRoute);

      setIsCompleteModalOpen(false);
      alert("일정이 저장되었습니다.");
    } catch (error) {
      console.error("여행 저장 실패:", error);

      if (error.message.includes("Network Error")) {
        alert(
          "백엔드 서버 연결 또는 CORS 설정을 확인해주세요. 로컬에 임시 저장합니다."
        );
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        alert("로그인 정보가 만료되었거나 권한이 없습니다. 로컬에 임시 저장합니다.");
      } else {
        alert(
          getErrorMessage(
            error,
            "여행 저장에 실패했습니다. 로컬에 임시 저장합니다."
          )
        );
      }

      persistRouteSafely(savedRoute);
      setIsCompleteModalOpen(false);
    } finally {
      setIsSavingRoute(false);
    }
  };

  return (
    <div className="route-create-page">
      <div className="route-create-screen">
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
              <img src={searchIcon} alt="검색" className="route-search-icon" />

              <input
                ref={searchInputRef}
                type="text"
                placeholder="장소 검색 및 추가"
                value={searchKeyword}
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
                  {searchErrorMessage || "검색 결과가 없어요."}
                </div>
              ) : (
                <>
                  {searchErrorMessage && (
                    <div className="route-search-empty">
                      {searchErrorMessage}
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

              const thumb =
                place.thumb || getThumb(place.sourceId || `place-${index}`);

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
                    <img
                      src={thumb}
                      alt={place.name}
                      className="schedule-place-thumb"
                    />

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
            최적 경로 생성하기
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
      />

      <FavoritePlacesModal
        open={isFavoriteModalOpen}
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

      {isCompleteModalOpen && (
        <div
          className="route-complete-overlay"
          onClick={handleCloseCompleteModal}
        >
          <div
            className="route-complete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="route-complete-icon">
              <RouteCompleteIcon />
            </div>

            <h3 className="route-complete-title">동선 제작 완료!</h3>

            <p className="route-complete-desc">
              AI가 분석한 최적의 경로가 <br />
              생성되었습니다. <br />
              지금 바로 확인해 보세요.
            </p>

            <button
              type="button"
              className="route-complete-confirm-btn"
              onClick={handleConfirmRoute}
              disabled={isSavingRoute}
            >
              {isSavingRoute ? "저장 중..." : "경로 확인하기 →"}
            </button>

            <button
              type="button"
              className="route-complete-later-btn"
              onClick={handleSaveRouteLater}
              disabled={isSavingRoute}
            >
              {isSavingRoute ? "저장 중..." : "나중에 보기"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteCreate;