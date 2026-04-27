import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RouteCreate.css";
import searchIcon from "../img/검색.png";
import { saveRoute as saveRouteUtil } from "../utils/routeStorage";

const STORAGE_KEY = "mock_saved_route_results";
const ROUTE_STORAGE_EVENT = "mock-routes-updated";

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
  // 한국 - 서울
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

  // 해외 - 일본 도쿄
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

  // 한국 - 부산
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

  // 해외 - 프랑스 파리
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

  // 한국 - 제주
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

  // 해외 - 미국 뉴욕
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

  // 한국 - 경주
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

  // 해외 - 태국 방콕
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

  // 해외 - 일본 오사카
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

  // 해외 - 싱가포르
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

const normalizeDate = (date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const createDate = (year, month, day) => {
  return normalizeDate(new Date(year, month - 1, day));
};

const formatDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

const getVisibleWeeks = (weeks, startDate, endDate, currentMonth) => {
  const selectedDates = getDatesInRange(startDate, endDate);

  const selectedDatesInMonth = selectedDates.filter(
    (date) =>
      date.getFullYear() === currentMonth.getFullYear() &&
      date.getMonth() === currentMonth.getMonth()
  );

  if (selectedDatesInMonth.length === 0) {
    return weeks.filter((week) => week.some((day) => day.isCurrentMonth));
  }

  const lastSelectedDate =
    selectedDatesInMonth[selectedDatesInMonth.length - 1];

  const lastWeekIndex = weeks.findIndex((week) =>
    week.some((day) => isSameDate(day.date, lastSelectedDate))
  );

  if (lastWeekIndex === -1) {
    return weeks.filter((week) => week.some((day) => day.isCurrentMonth));
  }

  return weeks.slice(0, lastWeekIndex + 1);
};

const createPlaceItem = (place, orderIndex = 0) => {
  return {
    id: `${place.sourceId}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    sourceId: place.sourceId,
    name: place.name,
    desc: place.desc,
    city: place.city,
    country: place.country,
    mapProvider: place.mapProvider,
    thumb: place.thumb || getThumb(place.sourceId || place.name),
    timeLabel:
      place.timeLabel ||
      DEFAULT_TIME_SLOTS[orderIndex % DEFAULT_TIME_SLOTS.length],
    isFixedTime:
      typeof place.isFixedTime === "boolean"
        ? place.isFixedTime
        : orderIndex === 1,
  };
};

const INITIAL_START_DATE = createDate(2024, 5, 12);
const INITIAL_END_DATE = createDate(2024, 5, 14);

const INITIAL_PLACES_BY_DATE = {
  [formatDateKey(createDate(2024, 5, 12))]: [
    {
      id: "initial-1",
      sourceId: "seoul-gyeongbokgung",
      name: "경복궁",
      desc: "서울특별시 종로구 사직로 161",
      city: "서울",
      country: "대한민국",
      mapProvider: "kakao",
      thumb: getThumb("seoul-gyeongbokgung"),
      timeLabel: "09:30 AM",
      isFixedTime: false,
    },
    {
      id: "initial-2",
      sourceId: "seoul-bukchon",
      name: "북촌한옥마을",
      desc: "서울특별시 종로구 계동길 37",
      city: "서울",
      country: "대한민국",
      mapProvider: "kakao",
      thumb: getThumb("seoul-bukchon"),
      timeLabel: "12:30 PM",
      isFixedTime: true,
    },
    {
      id: "initial-3",
      sourceId: "seoul-ikseondong",
      name: "익선동 카페거리",
      desc: "서울특별시 종로구 익선동",
      city: "서울",
      country: "대한민국",
      mapProvider: "kakao",
      thumb: getThumb("seoul-ikseondong"),
      timeLabel: "03:00 PM",
      isFixedTime: false,
    },
  ],
  [formatDateKey(createDate(2024, 5, 13))]: [],
  [formatDateKey(createDate(2024, 5, 14))]: [],
};

const RouteCreate = () => {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [rangeStart, setRangeStart] = useState(INITIAL_START_DATE);
  const [rangeEnd, setRangeEnd] = useState(INITIAL_END_DATE);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [placesByDate, setPlacesByDate] = useState(INITIAL_PLACES_BY_DATE);
  const [currentMonth, setCurrentMonth] = useState(
    new Date(
      INITIAL_START_DATE.getFullYear(),
      INITIAL_START_DATE.getMonth(),
      1
    )
  );
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

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
    return getVisibleWeeks(calendarWeeks, rangeStart, rangeEnd, currentMonth);
  }, [calendarWeeks, rangeStart, rangeEnd, currentMonth]);

  const activeDate = selectedDates[activeDayIndex] || selectedDates[0];
  const activeDateKey = activeDate ? formatDateKey(activeDate) : "";
  const currentPlaces = activeDate ? placesByDate[activeDateKey] || [] : [];

  const filteredSearchResults = useMemo(() => {
    if (!isSearchOpen) return [];

    const keyword = searchKeyword.trim().toLowerCase();

    const baseList = keyword
      ? MOCK_PLACE_RESULTS.filter((place) =>
          [place.name, place.desc, place.city, place.country, place.mapProvider]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(keyword))
        )
      : MOCK_PLACE_RESULTS;

    return baseList.slice(0, 12);
  }, [isSearchOpen, searchKeyword]);

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
    if (!isCompleteModalOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isCompleteModalOpen]);

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

  const handleRemovePlace = (id) => {
    if (!activeDateKey) return;

    setPlacesByDate((prev) => ({
      ...prev,
      [activeDateKey]: (prev[activeDateKey] || []).filter(
        (place) => place.id !== id
      ),
    }));
  };

  const handleTogglePlaceFixed = (id) => {
    if (!activeDateKey) return;

    setPlacesByDate((prev) => ({
      ...prev,
      [activeDateKey]: (prev[activeDateKey] || []).map((place) =>
        place.id === id
          ? {
              ...place,
              isFixedTime: !place.isFixedTime,
            }
          : place
      ),
    }));
  };

  const handleGenerateRoute = () => {
    setIsCompleteModalOpen(true);
  };

  const handleCloseCompleteModal = () => {
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

  const handleConfirmRoute = () => {
    const savedRoute = buildSavedRouteMock();

    persistRouteSafely(savedRoute);
    setIsCompleteModalOpen(false);

    navigate(`/route-result?id=${savedRoute.id}`, {
      state: {
        savedRoute,
        selectedDates,
        placesByDate,
      },
    });
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
                  prevDay &&
                  selectedDateKeys.has(formatDateKey(prevDay.date));
                const hasNextSelected =
                  nextDay &&
                  selectedDateKeys.has(formatDateKey(nextDay.date));

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

          {isSearchOpen && (
            <div className="route-search-result-list">
              {filteredSearchResults.length === 0 ? (
                <div className="route-search-empty">검색 결과가 없어요.</div>
              ) : (
                filteredSearchResults.map((place) => {
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
                })
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
                          onClick={() => handleTogglePlaceFixed(place.id)}
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
              <span className="add-place-plus">＋</span>
              장소 추가하기
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
              AI가 분석한 최적의 경로가
              <br />
              생성되었습니다.
              <br />
              지금 바로 확인해 보세요.
            </p>

            <button
              type="button"
              className="route-complete-confirm-btn"
              onClick={handleConfirmRoute}
            >
              경로 확인하기 →
            </button>

            <button
              type="button"
              className="route-complete-later-btn"
              onClick={handleCloseCompleteModal}
            >
              나중에 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RouteCreate;