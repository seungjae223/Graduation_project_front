import { getApiErrorMessage as safeApiErrorMessage } from "../api/api";
import { logSafeApiError } from "../utils/safeLog";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MySchedule.css";
import { getTripsApi } from "../api/tripApi";


import beachImg from "../img/서비스 소개 .png";



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

const isValidDate = (date) =>
  date instanceof Date && !Number.isNaN(date.getTime());

const parseDateValue = (value) => {
  if (!value) return null;

  if (value instanceof Date) {
    return isValidDate(value) ? value : null;
  }

  const text = String(value).trim();
  const dateOnlyMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    const [, year, month, day] = dateOnlyMatch;
    const parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
    return isValidDate(parsedDate) ? parsedDate : null;
  }

  const parsedDate = new Date(text);
  return isValidDate(parsedDate) ? parsedDate : null;
};

const normalizeDateOnly = (date) => {
  const parsedDate = parseDateValue(date);

  if (!parsedDate) return null;

  const nextDate = new Date(parsedDate);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
};

const getDateKey = (date) => {
  const targetDate = parseDateValue(date);

  if (!targetDate) return "";

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatDateText = (date, withYear = true) => {
  const targetDate = parseDateValue(date);

  if (!targetDate) return "날짜 정보 없음";

  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");

  return withYear ? `${year}.${month}.${day}` : `${month}.${day}`;
};

const getScheduleDates = (schedule) => {
  const selectedDates = Array.isArray(schedule?.selectedDates)
    ? schedule.selectedDates
    : Array.isArray(schedule?.dates)
    ? schedule.dates
    : Array.isArray(schedule?.travelDates)
    ? schedule.travelDates
    : [];

  const dateArray = selectedDates.map(parseDateValue).filter(Boolean);

  const startDateValue =
    schedule?.startDate ||
    schedule?.startedAt ||
    schedule?.travelStartDate ||
    schedule?.departureDate;

  const endDateValue =
    schedule?.endDate ||
    schedule?.endedAt ||
    schedule?.travelEndDate ||
    schedule?.arrivalDate;

  const startDate = parseDateValue(startDateValue);
  const endDate = parseDateValue(endDateValue);

  if (startDate) dateArray.push(startDate);
  if (endDate) dateArray.push(endDate);

  const uniqueDateMap = new Map();

  dateArray.forEach((date) => {
    const dateKey = getDateKey(date);

    if (dateKey) {
      const normalizedDate = normalizeDateOnly(date);

      if (normalizedDate) {
        uniqueDateMap.set(dateKey, normalizedDate);
      }
    }
  });

  return [...uniqueDateMap.values()].sort((a, b) => a.getTime() - b.getTime());
};

const getAllPlacesFromSchedule = (schedule) => {
  const placesByDate = schedule?.placesByDate || schedule?.placesByDay || {};

  const placesFromObject = Object.values(placesByDate)
    .filter(Array.isArray)
    .flat()
    .filter(Boolean);

  const placesFromArray = [
    ...(Array.isArray(schedule?.places) ? schedule.places : []),
    ...(Array.isArray(schedule?.tripPlaces) ? schedule.tripPlaces : []),
    ...(Array.isArray(schedule?.routePlaces) ? schedule.routePlaces : []),
    ...(Array.isArray(schedule?.destinations) ? schedule.destinations : []),
  ];

  const placesFromDays = Array.isArray(schedule?.days)
    ? schedule.days
        .map(
          (day) =>
            day.places || day.tripPlaces || day.destinations || day.items || [],
        )
        .filter(Array.isArray)
        .flat()
    : [];

  return [...placesFromObject, ...placesFromArray, ...placesFromDays].filter(
    Boolean,
  );
};

const getScheduleFirstPlace = (schedule) => {
  const dates = getScheduleDates(schedule);
  const placesByDate = schedule?.placesByDate || schedule?.placesByDay || {};

  if (dates.length > 0) {
    const firstDateKey = getDateKey(dates[0]);
    const firstDatePlaces = placesByDate[firstDateKey];

    if (Array.isArray(firstDatePlaces) && firstDatePlaces.length > 0) {
      return firstDatePlaces[0];
    }
  }

  return getAllPlacesFromSchedule(schedule)[0] || null;
};

const getScheduleDateText = (schedule) => {
  const dates = getScheduleDates(schedule);

  if (dates.length === 0) {
    return "날짜 정보 없음";
  }

  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  if (dates.length === 1 || getDateKey(firstDate) === getDateKey(lastDate)) {
    return formatDateText(firstDate);
  }

  return `${formatDateText(firstDate)} - ${formatDateText(lastDate, false)}`;
};

const getScheduleDday = (schedule) => {
  const dates = getScheduleDates(schedule);

  if (dates.length === 0) return "D-Day";

  const today = normalizeDateOnly(new Date())?.getTime() || 0;
  const firstDate = normalizeDateOnly(dates[0])?.getTime() || 0;
  const lastDate =
    normalizeDateOnly(dates[dates.length - 1])?.getTime() || firstDate;

  if (today > lastDate) return "완료";

  const diff = Math.ceil((firstDate - today) / (1000 * 60 * 60 * 24));

  if (diff > 0) return `D-${diff}`;

  return "D-Day";
};

const getScheduleLocation = (schedule) => {
  const firstPlace = getScheduleFirstPlace(schedule);

  return (
    schedule?.destination ||
    schedule?.location ||
    schedule?.city ||
    schedule?.country ||
    firstPlace?.city ||
    firstPlace?.country ||
    firstPlace?.desc ||
    firstPlace?.address ||
    firstPlace?.location ||
    "여행지 정보 없음"
  );
};

const getScheduleImage = (schedule) => {
  const firstPlace = getScheduleFirstPlace(schedule);

  return (
    schedule?.thumbnail ||
    schedule?.thumbnailUrl ||
    schedule?.image ||
    schedule?.imageUrl ||
    firstPlace?.thumb ||
    firstPlace?.thumbnail ||
    firstPlace?.thumbnailUrl ||
    firstPlace?.image ||
    firstPlace?.imageUrl ||
    beachImg
  );
};

const convertScheduleToCard = (schedule, source = "server") => {
  const scheduleId =
    schedule?.id ??
    schedule?.tripId ??
    schedule?.scheduleId ??
    schedule?.routeId ??
    schedule?.planId;

  if (scheduleId === null || scheduleId === undefined || scheduleId === "") {
    return null;
  }

  const dates = getScheduleDates(schedule);
  const firstDate = dates[0] || null;
  const lastDate = dates[dates.length - 1] || firstDate;
  const routeId =
    schedule?.id ?? schedule?.tripId ?? schedule?.routeId ?? scheduleId;

  return {
    id: String(scheduleId),
    routeId: String(routeId),
    source,
    dday: getScheduleDday(schedule),
    title:
      schedule?.title ||
      schedule?.scheduleTitle ||
      schedule?.routeTitle ||
      schedule?.name ||
      "새 여행 일정",
    dateText: getScheduleDateText(schedule),
    location: getScheduleLocation(schedule),
    image: getScheduleImage(schedule),
    route: {
      ...schedule,
      id: routeId,
      routeId,
      selectedDates:
        Array.isArray(schedule?.selectedDates) &&
        schedule.selectedDates.length > 0
          ? schedule.selectedDates
          : dates.map((date) => date.toISOString()),
    },
    startTime: firstDate ? normalizeDateOnly(firstDate)?.getTime() || 0 : 0,
    endTime: lastDate ? normalizeDateOnly(lastDate)?.getTime() || 0 : 0,
  };
};

const getErrorMessage = safeApiErrorMessage;

function MySchedule() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [scheduleList, setScheduleList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const requestRef = useRef(null);
  const mountedRef = useRef(false);
  const loadSchedules = useCallback(async () => {
    if (requestRef.current) return;
    const request = new AbortController();
    requestRef.current = request;
    try {
      setIsLoading(true);
      setErrorMessage("");

      const serverTrips = await getTripsApi({ signal: request.signal });
      if (!mountedRef.current || request.signal.aborted) return;
      const scheduleMap = new Map();

      serverTrips
        .map((trip) => convertScheduleToCard(trip, "server"))
        .filter(Boolean)
        .forEach((card) => {
          scheduleMap.set(String(card.routeId || card.id), card);
        });

      setScheduleList(
        [...scheduleMap.values()].sort((a, b) => b.startTime - a.startTime),
      );
    } catch (error) {
      if (!mountedRef.current || request.signal.aborted || error.code === "ERR_CANCELED") return;
      logSafeApiError(error, "MySchedule.jsx");
      setScheduleList([]);

      if (error.message?.includes("Network Error")) {
        setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
        return;
      }

      if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorMessage(
          "로그인 정보가 만료되었거나 권한이 없습니다. 다시 로그인해주세요.",
        );
        return;
      }

      setErrorMessage(
        getErrorMessage(
          error,
          "저장된 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
        ),
      );
    } finally {
      if (requestRef.current === request) requestRef.current = null;
      if (mountedRef.current && !request.signal.aborted) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadSchedules();
    return () => { mountedRef.current = false; requestRef.current?.abort(); requestRef.current = null; };
  }, [loadSchedules]);

  useEffect(() => {
    const handleRefreshSchedules = () => {
      loadSchedules();
    };

    window.addEventListener("focus", handleRefreshSchedules);

    return () => {
      window.removeEventListener("focus", handleRefreshSchedules);
    };
  }, [loadSchedules]);

  const { upcomingScheduleList, pastScheduleList } = useMemo(() => {
    const today = normalizeDateOnly(new Date())?.getTime() || 0;

    const upcoming = [];
    const past = [];

    scheduleList.forEach((schedule) => {
      if (!schedule.endTime || schedule.endTime >= today) {
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
  }, [scheduleList]);

  const currentList =
    activeTab === "upcoming" ? upcomingScheduleList : pastScheduleList;

  const handleOpenSchedule = (schedule) => {
    const routeId = schedule.routeId || schedule.id;

    navigate(`/route-result?id=${encodeURIComponent(routeId)}`, {
      state: {
        routeId,
        tripId: routeId,
        scheduleId: schedule.id,
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
          className={`my-schedule-tab ${activeTab === "past" ? "active" : ""}`}
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

        {isLoading ? (
          <div className="my-schedule-empty">
            <p>저장된 일정을 불러오는 중입니다.</p>
          </div>
        ) : errorMessage ? (
          <div className="my-schedule-empty">
            <p role="alert">{errorMessage}</p>
            <button type="button" onClick={loadSchedules} disabled={isLoading}>다시 불러오기</button>
          </div>
        ) : (
          <>
            <div className="my-schedule-list">
              {currentList.map((schedule) => (
                <article
                  role="button"
                  tabIndex={0}
                  onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); handleOpenSchedule(schedule); } }}
                  key={`${schedule.source}-${schedule.id}`}
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
                <p>{scheduleList.length ? (activeTab === "upcoming" ? "다가오는 일정이 없어요. 지난 일정 탭에서 확인해 주세요." : "지난 일정이 없어요. 다가오는 일정 탭에서 확인해 주세요.") : "저장된 일정이 없습니다."}</p>
              </div>
            )}
          </>
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
