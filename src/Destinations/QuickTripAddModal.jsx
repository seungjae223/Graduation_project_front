import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addPlaceToTripApi, getTripPlacesApi, getTripsApi } from "../api/tripApi";
import { buildLoginPath } from "../utils/authRedirect";
import { getAuthSnapshot } from "../utils/authState";
import useModalFocus from "../utils/useModalFocus";
import useMutationTask from "../utils/useMutationTask";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import "./QuickTripAddModal.css";

// Parse ISO date-only values in UTC so a user's local timezone cannot move
// an itinerary to an unintended day.
export function getTripDayCount(trip) {
  const start = trip?.startDate;
  const end = trip?.endDate;
  if (typeof start !== "string" || typeof end !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return 0;
  const from = Date.parse(`${start}T00:00:00Z`);
  const to = Date.parse(`${end}T00:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from ||
      new Date(from).toISOString().slice(0, 10) !== start ||
      new Date(to).toISOString().slice(0, 10) !== end) return 0;
  return Math.floor((to - from) / 86400000) + 1;
}

export default function QuickTripAddModal({ place, onClose }) {
  const navigate = useNavigate();
  const account = useSessionKey();
  const open = Boolean(place);
  const placeId = place?.id;
  const [tripId, setTripId] = useState("");
  const [day, setDay] = useState("");
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const key = `${account}:quick-trip:${placeId ?? "none"}`;
  const trips = useReadQuery(`${key}:trips`, signal => getTripsApi({ signal }),
    open && account !== "anonymous", () => getAuthSnapshot().accountKey === account);
  const trip = trips.data?.find(item => String(item.id) === String(tripId));
  const dayCount = getTripDayCount(trip);
  const rows = useReadQuery(`${key}:places:${tripId}`, signal => getTripPlacesApi(tripId, { signal }),
    open && Boolean(tripId), () => getAuthSnapshot().accountKey === account);
  const task = useMutationTask(`${key}:add:${tripId}:${day}`);
  const busy = task.blocked || task.status === "success";
  const focusRef = useModalFocus({ open, onClose, canClose: task.status !== "running", lockScroll: true });

  useEffect(() => { setTripId(""); setDay(""); setConfirmDuplicate(false); }, [placeId, open]);
  const dayNumber = Number(day);
  const dayIsValid = day !== "" && Number.isInteger(dayNumber) && dayNumber >= 1 && dayNumber <= dayCount;
  // Ignore records from another day and never guess a Place ID from a TripPlace ID.
  const samePlaceInDay = record => dayIsValid && Number(record.day) === dayNumber &&
    String(record.placeId) === String(placeId);
  const existingCount = dayIsValid && rows.status === "success" ? rows.data.filter(samePlaceInDay).length : 0;
  const canAdd = Boolean(trip && dayIsValid && rows.status === "success" && !busy);

  const performAdd = async () => {
    if (!canAdd) return;
    const beforeCount = existingCount;
    const order = Math.max(0, ...rows.data.filter(record => Number(record.day) === dayNumber)
      .map(record => Number(record.visitOrder) || 0)) + 1;
    setConfirmDuplicate(false);
    await task.run(
      () => addPlaceToTripApi({ tripId: trip.id, placeId, day: dayNumber, visitOrder: order }),
      async () => {
        const latest = await rows.read();
        if (!latest) throw new Error("일정 조회 실패");
        const afterCount = latest.filter(samePlaceInDay).length;
        return afterCount > beforeCount ? { confirmed: true } : { applied: false };
      },
      { failure: "장소를 일정에 추가하지 못했어요.", success: "선택한 일차에 장소를 추가했어요.",
        notApplied: "추가된 장소를 일정 목록에서 확인하지 못했어요.", refreshFailure: "추가 요청 후 목록을 확인하지 못했어요." }
    );
  };
  const requestAdd = () => {
    if (!canAdd) return;
    if (existingCount > 0) { setConfirmDuplicate(true); return; }
    void performAdd();
  };
  const goToCreate = () => navigate("/route-create");
  const dialog = (
    <section ref={focusRef} className="quick-trip-dialog" role="dialog" aria-modal="true" aria-labelledby="quick-trip-title" tabIndex={-1}>
      <header className="quick-trip-header">
        <h2 id="quick-trip-title">일정에 추가</h2>
        <button type="button" onClick={onClose} disabled={task.status === "running"} aria-label="일정 추가 닫기">×</button>
      </header>
      <div className="quick-trip-body">
        <p className="quick-trip-place">{place?.name}</p>
        {account === "anonymous" ? <p>로그인하면 여행 일정에 장소를 추가할 수 있어요.</p> : <>
          {trips.status === "loading" && <p role="status">일정을 불러오는 중...</p>}
          {trips.status === "error" && <div role="alert"><p>일정 목록을 불러오지 못했어요.</p><button type="button" onClick={trips.retry}>다시 조회</button></div>}
          {trips.status === "success" && trips.data.length === 0 && <p className="quick-trip-empty">아직 만든 일정이 없어요.</p>}
          {trips.status === "success" && trips.data.length > 0 && <>
            <label htmlFor="quick-trip-select">어느 일정에 추가할까요?</label>
            <select id="quick-trip-select" value={tripId} disabled={busy} onChange={event => {
              setTripId(event.target.value); setDay(""); setConfirmDuplicate(false);
            }}>
              <option value="">일정을 선택해 주세요</option>
              {trips.data.map(item => <option key={item.id} value={item.id}>{item.title || "이름 없는 일정"}</option>)}
            </select>
            {trip && dayCount === 0 && <p role="alert">날짜가 설정된 일정만 추가할 수 있어요.</p>}
            {trip && dayCount > 0 && <>
              <label htmlFor="quick-trip-day">몇 일차에 추가할까요?</label>
              <select id="quick-trip-day" value={day} disabled={busy} onChange={event => {
                setDay(event.target.value); setConfirmDuplicate(false);
              }}>
                <option value="">일차를 선택해 주세요</option>
                {Array.from({ length: dayCount }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}일차</option>)}
              </select>
            </>}
            {tripId && rows.status === "loading" && <p role="status">기존 일정 장소를 확인하는 중...</p>}
            {tripId && rows.status === "error" && <div role="alert"><p>일정 장소를 확인하지 못했어요.</p><button type="button" onClick={rows.retry}>다시 조회</button></div>}
            {confirmDuplicate && canAdd && <div className="quick-trip-duplicate-confirm" role="alert">
              <strong>이미 이 일차에 있는 장소예요.</strong>
              <p>같은 장소를 한 번 더 추가할까요?</p>
              <div className="quick-trip-duplicate-actions">
                <button type="button" onClick={() => setConfirmDuplicate(false)}>취소</button>
                <button type="button" onClick={performAdd}>중복 추가</button>
              </div>
            </div>}
            {task.message && <p role="status">{task.message}</p>}
            {["unknown", "refreshError"].includes(task.status) && <button type="button" onClick={task.retryRead}>일정 목록 다시 확인</button>}
          </>}
          {trips.status === "success" && <button type="button" className="quick-trip-create" onClick={goToCreate} disabled={task.status === "running"}>+ 새 일정 만들기</button>}
        </>}
      </div>
      <footer className="quick-trip-footer">
        <button type="button" onClick={onClose} disabled={task.status === "running"}>닫기</button>
        {account === "anonymous" ? <button type="button" className="quick-trip-primary" onClick={() => navigate(buildLoginPath())}>로그인</button> : <>
          {trips.data?.length > 0 && task.status !== "success" && <button type="button" className="quick-trip-primary" disabled={!canAdd || confirmDuplicate} onClick={requestAdd}>선택한 일차에 추가</button>}
          {task.status === "success" && trip && <button type="button" className="quick-trip-primary" onClick={() => navigate(`/route-result?id=${encodeURIComponent(trip.id)}`)}>일정 보기</button>}
        </>}
      </footer>
    </section>
  );
  return open ? <div className="quick-trip-overlay" role="presentation" onMouseDown={event => {
    if (event.target === event.currentTarget && task.status !== "running") onClose?.();
  }}>{dialog}</div> : null;
}
