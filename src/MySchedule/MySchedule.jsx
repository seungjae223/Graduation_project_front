import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MySchedule.css";

import beachImg from "../img/서비스 소개 .png";

const ROUTE_STORAGE_KEY = "mock_saved_route_results";
const ROUTE_STORAGE_EVENT = "mock-routes-updated";

const ChevronRightIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
    <path
      d="M9 6L15 12L9 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PlusCircleIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle
      cx="12"
      cy="12"
      r="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M12 8V16M8 12H16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
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

const readStoredRoutes = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ROUTE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("저장된 일정 읽기 실패:", error);
    return [];
  }
};

const normalizeDateOnly = (date) => {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

const getDateKey = (date) => {
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDateText = (date, withYear = true) => {
  const targetDate = new Date(date);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");

  return withYear ? `${year}.${month}.${day}` : `${month}.${day}`;
};

const getRouteDates = (route) => {
  const selectedDates = Array.isArray(route?.selectedDates)
    ? route.selectedDates
    : [];

  return selectedDates
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());
};

const getAllPlacesFromRoute = (route) => {
  const placesByDate = route?.placesByDate || {};

  return Object.values(placesByDate)
    .filter(Array.isArray)
    .flat()
    .filter(Boolean);
};

const getRouteFirstPlace = (route) => {
  const dates = getRouteDates(route);
  const placesByDate = route?.placesByDate || {};

  if (dates.length > 0) {
    const firstDateKey = getDateKey(dates[0]);
    const firstDatePlaces = placesByDate[firstDateKey];

    if (Array.isArray(firstDatePlaces) && firstDatePlaces.length > 0) {
      return firstDatePlaces[0];
    }
  }

  return getAllPlacesFromRoute(route)[0] || null;
};

const getRouteDateText = (route) => {
  const dates = getRouteDates(route);

  if (dates.length === 0) {
    return "날짜 정보 없음";
  }

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  if (dates.length === 1) {
    return formatDateText(firstDate);
  }

  return `${formatDateText(firstDate)} - ${formatDateText(lastDate, false)}`;
};

const getRouteDday = (route) => {
  const dates = getRouteDates(route);

  if (dates.length === 0) {
    return "D-Day";
  }

  const today = normalizeDateOnly(new Date());
  const firstDate = normalizeDateOnly(dates[0]);

  const diff = Math.ceil(
    (firstDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diff > 0) {
    return `D-${diff}`;
  }

  if (diff === 0) {
    return "D-Day";
  }

  return "완료";
};

const getRouteLocation = (route) => {
  const firstPlace = getRouteFirstPlace(route);

  return (
    firstPlace?.city ||
    firstPlace?.country ||
    firstPlace?.desc ||
    firstPlace?.address ||
    "여행지 정보 없음"
  );
};

const getRouteImage = (route) => {
  const firstPlace = getRouteFirstPlace(route);

  return route?.thumbnail || firstPlace?.thumb || firstPlace?.image || beachImg;
};

const convertRouteToSchedule = (route) => {
  if (!route?.id) {
    return null;
  }

  const dates = getRouteDates(route);
  const firstDate = dates[0] || null;
  const lastDate = dates[dates.length - 1] || null;

  return {
    id: String(route.id),
    dday: getRouteDday(route),
    title: route.title || "새 여행 일정",
    dateText: getRouteDateText(route),
    location: getRouteLocation(route),
    image: getRouteImage(route),
    route,
    startTime: firstDate ? normalizeDateOnly(firstDate).getTime() : 0,
    endTime: lastDate ? normalizeDateOnly(lastDate).getTime() : 0,
  };
};

function MySchedule() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [savedRoutes, setSavedRoutes] = useState(() => readStoredRoutes());

  useEffect(() => {
    const syncSavedRoutes = () => {
      setSavedRoutes(readStoredRoutes());
    };

    const handleStorageChange = (event) => {
      if (event.key === ROUTE_STORAGE_KEY || event.key === null) {
        syncSavedRoutes();
      }
    };

    syncSavedRoutes();

    window.addEventListener(ROUTE_STORAGE_EVENT, syncSavedRoutes);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(ROUTE_STORAGE_EVENT, syncSavedRoutes);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const savedScheduleList = useMemo(() => {
    return savedRoutes
      .map(convertRouteToSchedule)
      .filter(Boolean)
      .sort((a, b) => b.startTime - a.startTime);
  }, [savedRoutes]);

  const { upcomingScheduleList, pastScheduleList } = useMemo(() => {
    const today = normalizeDateOnly(new Date()).getTime();

    const upcoming = [];
    const past = [];

    savedScheduleList.forEach((schedule) => {
      if (schedule.endTime >= today) {
        upcoming.push(schedule);
      } else {
        past.push(schedule);
      }
    });

    upcoming.sort((a, b) => a.startTime - b.startTime);
    past.sort((a, b) => b.endTime - a.endTime);

    return {
      upcomingScheduleList: upcoming,
      pastScheduleList: past,
    };
  }, [savedScheduleList]);

  const currentList =
    activeTab === "upcoming" ? upcomingScheduleList : pastScheduleList;

  const handleOpenSchedule = (schedule) => {
    const routeId = schedule.route.id;

    navigate(`/route-result?id=${encodeURIComponent(routeId)}`, {
      state: {
        routeId,
        savedRoute: schedule.route,
      },
    });
  };

  const handleCreateSchedule = () => {
    navigate("/route-create");
  };

  return (
    <div className="my-schedule-page">
      <div className="my-schedule-tabs">
        <button
          type="button"
          className={`my-schedule-tab ${
            activeTab === "upcoming" ? "active" : ""
          }`}
          onClick={() => setActiveTab("upcoming")}
        >
          다가오는 일정
        </button>

        <button
          type="button"
          className={`my-schedule-tab ${
            activeTab === "past" ? "active" : ""
          }`}
          onClick={() => setActiveTab("past")}
        >
          지난 일정
        </button>
      </div>

      <div className="my-schedule-content">
        <button
          type="button"
          className="my-schedule-create-btn"
          onClick={handleCreateSchedule}
        >
          <PlusCircleIcon />
          <span>새 일정 만들기</span>
        </button>

        <div className="my-schedule-section-header">
          <h2>
            {activeTab === "upcoming" ? "다가오는 일정" : "지난 일정"}
            <span>{currentList.length}</span>
          </h2>
        </div>

        <div className="my-schedule-list">
          {currentList.map((schedule) => (
            <article
              key={schedule.id}
              className="my-schedule-card"
              onClick={() => handleOpenSchedule(schedule)}
            >
              <img
                src={schedule.image}
                alt={schedule.title}
                className="my-schedule-thumb"
              />

              <div className="my-schedule-card-body">
                <div className="my-schedule-card-top">
                  <span className="my-schedule-dday">{schedule.dday}</span>
                </div>

                <h3>{schedule.title}</h3>
                <p className="my-schedule-date">{schedule.dateText}</p>

                <div className="my-schedule-location">
                  <PinIcon />
                  <span>{schedule.location}</span>
                </div>
              </div>

              <div className="my-schedule-chevron">
                <ChevronRightIcon />
              </div>
            </article>
          ))}
        </div>

        {currentList.length === 0 && (
          <div className="my-schedule-empty">
            <p>저장된 일정이 없습니다.</p>
          </div>
        )}

        <div className="my-schedule-recommend-card">
          <h3>어디로 떠나볼까요?</h3>
          <p>너만 오면 go가 추천하는 맞춤형 여행 코스</p>
          <button type="button" onClick={() => navigate("/recommend")}>
            추천 받기
          </button>
        </div>
      </div>
    </div>
  );
}

export default MySchedule;