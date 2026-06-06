import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MySchedule.css";
import api from "../api/api";

import beachImg from "../img/서비스 소개 .png";

const SCHEDULES_API = "/api/schedules";

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

const getScheduleArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.schedules)) return data.schedules;
  if (Array.isArray(data?.routes)) return data.routes;
  if (Array.isArray(data?.items)) return data.items;

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

  const dateArray = selectedDates
    .map((date) => new Date(date))
    .filter((date) => !Number.isNaN(date.getTime()));

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

  const startDate = startDateValue ? new Date(startDateValue) : null;
  const endDate = endDateValue ? new Date(endDateValue) : null;

  if (startDate && !Number.isNaN(startDate.getTime())) {
    dateArray.push(startDate);
  }

  if (endDate && !Number.isNaN(endDate.getTime())) {
    dateArray.push(endDate);
  }

  return dateArray.sort((a, b) => a.getTime() - b.getTime());
};

const getAllPlacesFromSchedule = (schedule) => {
  const placesByDate = schedule?.placesByDate || schedule?.placesByDay || {};

  const placesFromObject = Object.values(placesByDate)
    .filter(Array.isArray)
    .flat()
    .filter(Boolean);

  const placesFromArray = [
    ...(Array.isArray(schedule?.places) ? schedule.places : []),
    ...(Array.isArray(schedule?.routePlaces) ? schedule.routePlaces : []),
    ...(Array.isArray(schedule?.destinations) ? schedule.destinations : []),
  ];

  const placesFromDays = Array.isArray(schedule?.days)
    ? schedule.days
        .map((day) => day.places || day.destinations || day.items || [])
        .filter(Array.isArray)
        .flat()
    : [];

  return [...placesFromObject, ...placesFromArray, ...placesFromDays].filter(
    Boolean
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

  if (dates.length === 1) {
    return formatDateText(firstDate);
  }

  return `${formatDateText(firstDate)} - ${formatDateText(lastDate, false)}`;
};

const getScheduleDday = (schedule) => {
  const dates = getScheduleDates(schedule);

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

const getScheduleLocation = (schedule) => {
  const firstPlace = getScheduleFirstPlace(schedule);

  return (
    schedule?.location ||
    schedule?.destination ||
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

const convertScheduleToCard = (schedule) => {
  const scheduleId =
    schedule?.id || schedule?.scheduleId || schedule?.routeId || schedule?.planId;

  if (!scheduleId) {
    return null;
  }

  const dates = getScheduleDates(schedule);
  const firstDate = dates[0] || null;
  const lastDate = dates[dates.length - 1] || null;

  return {
    id: String(scheduleId),
    routeId: schedule?.routeId || schedule?.id || scheduleId,
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
    route: schedule,
    startTime: firstDate ? normalizeDateOnly(firstDate).getTime() : 0,
    endTime: lastDate ? normalizeDateOnly(lastDate).getTime() : 0,
  };
};

const getErrorMessage = (error, fallbackMessage) => {
  const data = error.response?.data;

  if (typeof data === "string") {
    return data;
  }

  return data?.message || data?.error || fallbackMessage;
};

function MySchedule() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("upcoming");
  const [scheduleList, setScheduleList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await api.get(SCHEDULES_API);
        const schedules = getScheduleArray(response.data);

        setScheduleList(
          schedules
            .map(convertScheduleToCard)
            .filter(Boolean)
            .sort((a, b) => b.startTime - a.startTime)
        );
      } catch (error) {
        console.error("내 일정 목록 조회 실패:", error);

        if (error.message.includes("Network Error")) {
          setErrorMessage("백엔드 서버 연결 또는 CORS 설정을 확인해주세요.");
          return;
        }

        setErrorMessage(
          getErrorMessage(
            error,
            "저장된 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          )
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  const { upcomingScheduleList, pastScheduleList } = useMemo(() => {
    const today = normalizeDateOnly(new Date()).getTime();

    const upcoming = [];
    const past = [];

    scheduleList.forEach((schedule) => {
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
  }, [scheduleList]);

  const currentList =
    activeTab === "upcoming" ? upcomingScheduleList : pastScheduleList;

  const handleOpenSchedule = (schedule) => {
    const routeId = schedule.routeId || schedule.id;

    navigate(`/route-result?id=${encodeURIComponent(routeId)}`, {
      state: {
        routeId,
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