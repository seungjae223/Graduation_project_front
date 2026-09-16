import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MySchedule.css";
import api, { getAccessToken } from "../api/api";

import beachImg from "../img/서비스 소개 .png";

const TRIPS_API = "/api/trips";

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

const getScheduleArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.trips)) return data.trips;
  if (Array.isArray(data?.tripList)) return data.tripList;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.results)) return data.results;

  if (Array.isArray(data?.data?.content)) return data.data.content;
  if (Array.isArray(data?.data?.trips)) return data.data.trips;
  if (Array.isArray(data?.data?.items)) return data.data.items;
  if (Array.isArray(data?.result?.content)) return data.result.content;

  return [];
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

const normalizeCompareText = (value) => {
  if (value === null || value === undefined) return "";

  return String(value).trim().toLowerCase();
};

const decodeJwtPayload = (token) => {
  try {
    if (!token) return null;

    const payload = token.split(".")[1];

    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );

    const decoded = atob(paddedBase64);
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((char) => {
          return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join(""),
    );

    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getStoredJSON = (storage, key) => {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const getUserObject = (data) => {
  const candidates = [
    data?.data?.user,
    data?.data?.member,
    data?.data?.userInfo,
    data?.data?.memberInfo,
    data?.data?.profile,
    data?.data,

    data?.result?.user,
    data?.result?.member,
    data?.result?.userInfo,
    data?.result?.memberInfo,
    data?.result?.profile,
    data?.result,

    data?.user,
    data?.member,
    data?.userInfo,
    data?.memberInfo,
    data?.profile,
    data,
  ];

  return (
    candidates.find((item) => {
      return item && typeof item === "object" && !Array.isArray(item);
    }) || {}
  );
};

const getUserEmailFromObject = (user = {}) => {
  const nestedUser =
    user.user ||
    user.member ||
    user.userInfo ||
    user.memberInfo ||
    user.profile ||
    {};

  return (
    user.email ||
    user.userEmail ||
    user.memberEmail ||
    user.loginEmail ||
    user.accountEmail ||
    user.emailAddress ||
    user.mail ||
    nestedUser.email ||
    nestedUser.userEmail ||
    nestedUser.memberEmail ||
    nestedUser.loginEmail ||
    nestedUser.accountEmail ||
    nestedUser.emailAddress ||
    nestedUser.mail ||
    ""
  );
};

const getUserIdFromObject = (user = {}) => {
  const nestedUser =
    user.user ||
    user.member ||
    user.userInfo ||
    user.memberInfo ||
    user.profile ||
    {};

  return (
    user.id ||
    user.userId ||
    user.memberId ||
    user.accountId ||
    nestedUser.id ||
    nestedUser.userId ||
    nestedUser.memberId ||
    nestedUser.accountId ||
    ""
  );
};

const getCurrentUserIdentity = async () => {
  const token = getAccessToken();
  const payload = decodeJwtPayload(token);

  const localUser = getStoredJSON(localStorage, "currentUser");
  const sessionUser = getStoredJSON(sessionStorage, "currentUser");

  let email =
    getUserEmailFromObject(localUser || {}) ||
    getUserEmailFromObject(sessionUser || {}) ||
    localStorage.getItem("userEmail") ||
    sessionStorage.getItem("userEmail") ||
    payload?.email ||
    payload?.userEmail ||
    payload?.memberEmail ||
    (typeof payload?.sub === "string" && payload.sub.includes("@")
      ? payload.sub
      : "") ||
    "";

  let id =
    getUserIdFromObject(localUser || {}) ||
    getUserIdFromObject(sessionUser || {}) ||
    payload?.id ||
    payload?.userId ||
    payload?.memberId ||
    payload?.accountId ||
    "";

  try {
    const response = await api.get("/api/users/me");
    const user = getUserObject(response.data);

    email = getUserEmailFromObject(user) || email;
    id = getUserIdFromObject(user) || id;
  } catch (error) {
    console.error("현재 로그인 사용자 정보 조회 실패:", error);
  }

  return {
    email: normalizeCompareText(email),
    id: normalizeCompareText(id),
  };
};

const getTripOwnerEmail = (trip = {}) => {
  return (
    trip.userEmail ||
    trip.email ||
    trip.memberEmail ||
    trip.ownerEmail ||
    trip.createdByEmail ||
    trip.writerEmail ||
    trip.user?.email ||
    trip.member?.email ||
    trip.owner?.email ||
    trip.createdBy?.email ||
    trip.writer?.email ||
    ""
  );
};

const getTripOwnerId = (trip = {}) => {
  return (
    trip.userId ||
    trip.memberId ||
    trip.ownerId ||
    trip.createdById ||
    trip.writerId ||
    trip.user?.id ||
    trip.user?.userId ||
    trip.member?.id ||
    trip.member?.memberId ||
    trip.owner?.id ||
    trip.createdBy?.id ||
    trip.writer?.id ||
    ""
  );
};

const hasTripOwnerInfo = (trip) => {
  return Boolean(getTripOwnerEmail(trip) || getTripOwnerId(trip));
};

const isMyTrip = (trip, currentUserIdentity) => {
  const currentEmail = currentUserIdentity.email;
  const currentId = currentUserIdentity.id;

  const ownerEmail = normalizeCompareText(getTripOwnerEmail(trip));
  const ownerId = normalizeCompareText(getTripOwnerId(trip));

  if (currentEmail && ownerEmail) {
    return currentEmail === ownerEmail;
  }

  if (currentId && ownerId) {
    return currentId === ownerId;
  }

  return false;
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

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string" && data.trim()) return data;

  return data?.message || data?.error || fallbackMessage;
};

function MySchedule() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [scheduleList, setScheduleList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await api.get(TRIPS_API);
      const allServerTrips = getScheduleArray(response.data);
      const currentUserIdentity = await getCurrentUserIdentity();

      const hasOwnerInfo = allServerTrips.some(hasTripOwnerInfo);

      const serverTrips =
        hasOwnerInfo && (currentUserIdentity.email || currentUserIdentity.id)
          ? allServerTrips.filter((trip) => isMyTrip(trip, currentUserIdentity))
          : allServerTrips;

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
      console.error("내 일정 목록 조회 실패:", error);
      setScheduleList([]);

      if (error.message?.includes("Network Error")) {
        setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSchedules();
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
            <p>{errorMessage}</p>
          </div>
        ) : (
          <>
            <div className="my-schedule-list">
              {currentList.map((schedule) => (
                <article
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
                <p>저장된 일정이 없습니다.</p>
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