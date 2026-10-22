import { getApiErrorMessage as safeApiErrorMessage } from "../api/api";
import { logSafeApiError } from "../utils/safeLog";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./MySchedule.css";
import { getTripsApi } from "../api/tripApi";
import useSessionKey from "../utils/useSessionKey";
import { getAuthSnapshot } from "../utils/authState";
import useTripDeletion from "../utils/useTripDeletion";
import TripListCard from "../components/TripListCard";

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

export const getScheduleDday = (schedule, referenceDate = new Date()) => {
  const dates = getScheduleDates(schedule);

  if (dates.length === 0) return "날짜 미정";

  const today = normalizeDateOnly(referenceDate)?.getTime() || 0;
  const firstDate = normalizeDateOnly(dates[0])?.getTime() || 0;
  const lastDate =
    normalizeDateOnly(dates[dates.length - 1])?.getTime() || firstDate;

  if (today > lastDate) return "완료";
  if (today >= firstDate) return `${Math.round((today - firstDate) / 86400000) + 1}일차`;

  const diff = Math.ceil((firstDate - today) / (1000 * 60 * 60 * 24));

  if (diff > 0) return `D-${diff}`;

  return "1일차";
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
    ""
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
    photoPlace: getScheduleFirstPlace(schedule),
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
  const account = useSessionKey();
  const currentAccount = useRef(account); currentAccount.current = account;

  const [scheduleList, setScheduleList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const { deleteTrips, pendingId, busy, notice } = useTripDeletion(account, id => {
    // A focus-triggered list fetch started before DELETE must not restore a removed ticket.
    requestRef.current?.abort();
    requestRef.current = null;
    lastRefreshAt.current = Date.now();
    setIsLoading(false);
    setScheduleList(previous => previous.filter(trip => String(trip.id) !== id));
    setSelectedIds(previous => previous.filter(selected => selected !== id));
  });
  const requestRef = useRef(null);
  const mountedRef = useRef(false);
  const lastRefreshAt = useRef(0);

  const loadSchedules = useCallback(async () => {
    if (requestRef.current) return;
    const request = new AbortController();
    requestRef.current = request;
    try {
      setIsLoading(true);
      setErrorMessage("");
      const serverTrips = await getTripsApi({ signal: request.signal });
      if (!mountedRef.current || request.signal.aborted ||
          getAuthSnapshot().accountKey !== account || currentAccount.current !== account ||
          requestRef.current !== request) return;
      const scheduleMap = new Map();
      serverTrips.map(trip => convertScheduleToCard(trip, "server")).filter(Boolean)
        .forEach(card => scheduleMap.set(String(card.routeId || card.id), card));
      setScheduleList([...scheduleMap.values()]);
      lastRefreshAt.current = Date.now();
    } catch (error) {
      if (!mountedRef.current || request.signal.aborted || error?.code === "ERR_CANCELED" ||
          getAuthSnapshot().accountKey !== account || currentAccount.current !== account ||
          requestRef.current !== request) return;
      logSafeApiError(error, "MySchedule.jsx");
      if (error.message?.includes("Network Error")) {
        setErrorMessage("네트워크 연결을 확인한 뒤 다시 시도해주세요.");
      } else if (error.response?.status === 401 || error.response?.status === 403) {
        setErrorMessage("로그인 정보가 만료되었거나 권한이 없습니다. 다시 로그인해주세요.");
      } else {
        setErrorMessage(getErrorMessage(error,
          "저장된 일정을 불러오지 못했습니다. 잠시 후 다시 시도해주세요."));
      }
    } finally {
      if (requestRef.current === request) requestRef.current = null;
      if (mountedRef.current && !request.signal.aborted &&
          getAuthSnapshot().accountKey === account && currentAccount.current === account) setIsLoading(false);
    }
  }, [account]);

  useEffect(() => {
    setScheduleList([]); setErrorMessage("");
    setEditing(false); setSelectedIds([]);
    mountedRef.current = true;
    void loadSchedules();
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      requestRef.current = null;
    };
  }, [loadSchedules]);

  useEffect(() => {
    const handleFocus = () => {
      // Dialog dismissal and clicking the window must not flash the list with a fresh loader.
      if (!editing && !busy && Date.now() - lastRefreshAt.current > 30000) void loadSchedules();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadSchedules, editing, busy]);

  const { currentTrips, futureTrips, undatedTrips } = useMemo(() => {
    const today = normalizeDateOnly(new Date())?.getTime() || 0;
    const active = [], future = [], undated = [];
    scheduleList.forEach(trip => {
      if (trip.endTime && trip.endTime < today) return;
      if (!trip.startTime || !trip.endTime) { undated.push(trip); return; }
      if (trip.startTime <= today) active.push(trip); else future.push(trip);
    });
    active.sort((a,b) => a.endTime - b.endTime || a.id.localeCompare(b.id));
    future.sort((a,b) => a.startTime - b.startTime || a.id.localeCompare(b.id));
    return { currentTrips: active, futureTrips: future, undatedTrips: undated };
  }, [scheduleList]);

  const featured = currentTrips[0] || futureTrips[0] || null;
  const rest = [...currentTrips, ...futureTrips].filter(trip => trip.id !== featured?.id);
  const toggleEditing = () => {
    if (busy) return;
    setEditing(previous => !previous);
    setSelectedIds([]);
  };
  const toggleSelected = trip => {
    if (busy) return;
    const id = String(trip.id);
    setSelectedIds(previous => previous.includes(id)
      ? previous.filter(value => value !== id) : [...previous, id]);
  };
  const removeSelected = async () => {
    const eligible = [...currentTrips, ...futureTrips, ...undatedTrips]
      .filter(trip => selectedIds.includes(String(trip.id)));
    const result = await deleteTrips(eligible);
    if (result.complete) { setEditing(false); setSelectedIds([]); }
  };
  const openTrip = trip => {
    const routeId = trip.routeId || trip.id;
    navigate("/route-result?id=" + encodeURIComponent(routeId), {
      state: { routeId, tripId: routeId, scheduleId: trip.id, savedRoute: trip.route },
    });
  };
  return <main className="my-schedule-page">
    <header className="v15-schedule-heading">
      <div className="v15-schedule-heading-content">
        <p className="v15-schedule-eyebrow">MY TRIPS</p>
        <div className="v15-schedule-heading-row">
          <h1>내 여행 일정</h1>
          <button type="button" className="v15-schedule-create" aria-label="새 일정 만들기"
            title="새 일정 만들기" onClick={() => navigate("/route-create")}>＋</button>
        </div>
        <p>준비 중인 여행을 한눈에 확인하세요.</p>
      </div>
    </header>

    {errorMessage && <div className="v15-schedule-notice" role="alert">
      <p>{errorMessage}{scheduleList.length > 0 ? " 마지막으로 확인한 일정을 표시합니다." : ""}</p>
      <button type="button" onClick={loadSchedules} disabled={isLoading}>다시 불러오기</button>
    </div>}
    {notice && <p className="v15-schedule-notice" role="status">{notice}</p>}
    {isLoading && <p className="v15-schedule-substatus" role="status">
      {scheduleList.length ? "일정을 갱신하는 중..." : "저장된 일정을 불러오는 중입니다."}
    </p>}

    {featured && <section className="v15-schedule-featured" aria-label="가장 가까운 여행">
      <div className="v15-schedule-section-title">
        <h2>가장 가까운 여행</h2>
        <button type="button" className="v15-schedule-edit" aria-pressed={editing}
          disabled={busy} onClick={toggleEditing}>{editing ? "완료" : "편집"}</button>
      </div>
      <TripListCard trip={featured} featured onOpen={openTrip}
        editing={editing} selected={selectedIds.includes(String(featured.id))}
        onToggleSelected={toggleSelected} deleting={pendingId === String(featured.id)} />
    </section>}

    {rest.length > 0 && <section className="v15-schedule-other" aria-label="다른 여행 목록">
      <div className="v15-schedule-section-title"><h2>다가오는 여행</h2><span>{rest.length}개</span></div>
      <div className="v15-schedule-cards">{rest.map(trip =>
        <TripListCard key={trip.id} trip={trip} onOpen={openTrip}
          editing={editing} selected={selectedIds.includes(String(trip.id))}
          onToggleSelected={toggleSelected} deleting={pendingId === String(trip.id)} />)}
      </div>
    </section>}

    {undatedTrips.length > 0 && <section className="v15-schedule-other" aria-label="날짜 확인 필요">
      <div className="v15-schedule-section-title"><h2>날짜 확인 필요</h2>
        {!featured ? <button type="button" className="v15-schedule-edit" aria-pressed={editing}
          disabled={busy} onClick={toggleEditing}>{editing ? "완료" : "편집"}</button> : <span>{undatedTrips.length}개</span>}
      </div>
      <p className="v15-schedule-substatus">저장된 날짜가 확인되지 않은 일정을 표시합니다.</p>
      <div className="v15-schedule-cards">{undatedTrips.map(trip =>
        <TripListCard key={trip.id} trip={trip} onOpen={openTrip}
          editing={editing} selected={selectedIds.includes(String(trip.id))}
          onToggleSelected={toggleSelected} deleting={pendingId === String(trip.id)} />)}
      </div>
    </section>}

    {!isLoading && !errorMessage && !featured && undatedTrips.length === 0 &&
      <section className="v15-schedule-empty">
        <span aria-hidden="true">✈</span>
        <h2>준비 중인 여행이 없어요</h2>
        <p>저장된 일정이 없습니다.</p>
        <button type="button" onClick={() => navigate("/route-create")}>새 여행 계획하기</button>
      </section>}

    <div className={`v15-bulk-delete ${editing && selectedIds.length > 0 ? "is-visible" : ""}`}
      role="region" aria-label="선택한 여행 일정 삭제"
      aria-hidden={!(editing && selectedIds.length > 0)}
      inert={!(editing && selectedIds.length > 0)}>
      <button type="button" disabled={busy || !selectedIds.length} onClick={removeSelected}
        aria-label={`선택한 일정 ${selectedIds.length}개 삭제하기`}>
        삭제하기 <strong>{selectedIds.length}</strong>
      </button>
    </div>
    <nav className="v15-schedule-past-nav" aria-label="지난 여행 바로가기">
      <button type="button" onClick={() => navigate("/mypage/past-trips")}>
        <span className="v15-schedule-past-icon" aria-hidden="true">↺</span>
        <span><strong>지난 여행 보기</strong><small>예전에 계획했던 여행 확인하기</small></span>
        <span className="v15-schedule-past-arrow" aria-hidden="true">›</span>
      </button>
    </nav>
  </main>;
}

export default MySchedule;
