import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useReadQuery from "../utils/useReadQuery";
import useSessionKey from "../utils/useSessionKey";
import useTripDeletion from "../utils/useTripDeletion";
import { getAuthSnapshot } from "../utils/authState";
import { getTripsApi } from "../api/tripApi";
import TripListCard from "../components/TripListCard";
import "./MyPage.css";
import "./PastTrips.css";

// End-date classification does not prove that a planned journey took place.
export const getPastTrips = (trips, today = new Date()) => {
  const todayKey = [today.getFullYear(), String(today.getMonth()+1).padStart(2,"0"), String(today.getDate()).padStart(2,"0")].join("-");
  return trips.filter(trip => /^\d{4}-\d{2}-\d{2}$/.test(trip.endDate || "") && trip.endDate < todayKey)
    .sort((a,b) => b.endDate.localeCompare(a.endDate) || Number(b.id)-Number(a.id));
};
const formatDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))
  ? String(value).replace(/-/g, ".") : "날짜 정보 없음";

export default function PastTrips() {
  const navigate = useNavigate();
  const account = useSessionKey();
  const [deletedIds, setDeletedIds] = useState([]);
  const [editing, setEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const query = useReadQuery(account + ":past-trips",
    signal => getTripsApi({ signal }), account !== "anonymous",
    () => getAuthSnapshot().accountKey === account);
  const { deleteTrips, pendingId, busy, notice } = useTripDeletion(account, id => {
    setDeletedIds(previous => [...new Set([...previous, id])]);
    setSelectedIds(previous => previous.filter(selected => selected !== id));
    void query.retry();
  });
  useEffect(() => { setDeletedIds([]); setEditing(false); setSelectedIds([]); }, [account]);
  const allPastTrips = useMemo(() => query.data ? getPastTrips(query.data) : [], [query.data]);
  const visibleTrips = allPastTrips.filter(trip => !deletedIds.includes(String(trip.id)));
  const byYear = visibleTrips.reduce((groups, trip) => {
    const year = String(trip.endDate).slice(0,4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(trip);
    return groups;
  }, new Map());

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
    const chosen = visibleTrips.filter(trip => selectedIds.includes(String(trip.id)));
    const result = await deleteTrips(chosen);
    if (result.complete) { setEditing(false); setSelectedIds([]); }
  };
  const openTrip = trip => {
    navigate("/route-result?id=" + encodeURIComponent(trip.id) + "&origin=past", {
      state: { routeId: trip.id, tripId: trip.id, scheduleId: trip.id },
    });
  };

  return <main className="mypage-v14 mypage-v14-subpage v15-past-page v15-slide-in-right">
    <header className="v15-past-header">
      <p className="v15-past-eyebrow">PAST TRIPS</p>
      <h1>지난 여행</h1>
      <p>예전에 계획했던 여행을 다시 꺼내 보세요.</p>
    </header>

    <nav className="v15-past-back-nav" aria-label="내 여행 일정 바로가기">
      <button type="button" onClick={() => navigate("/schedule")}>
        <span aria-hidden="true" className="v15-past-ticket-icon">
          <svg viewBox="0 0 24 24" width="23" height="23" fill="none"
            stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2V9a3 3 0 0 0 0 6v2.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V15a3 3 0 0 0 0-6V6.5Z"/>
            <path d="M14 4.5v15" strokeDasharray="2 3"/>
          </svg></span><strong>내 여행 일정으로 돌아가기</strong>
      </button>
    </nav>

    {query.status === "loading" && !query.data && <p className="v15-past-info" role="status">지난 여행을 불러오는 중...</p>}
    {query.status === "error" && <div role="alert" className="v15-past-info">
      지난 여행을 불러오지 못했어요. <button type="button" onClick={query.retry}>다시 조회</button>
    </div>}
    {notice && <p className="v15-past-info" role="status">{notice}</p>}

    {query.data && <section aria-label="지난 여행 목록">
      <div className="v15-past-section-heading"><h2>지난 일정</h2>
        <div className="v15-past-actions">
          <span>{"총 " + visibleTrips.length + "개"}</span>
          {visibleTrips.length > 0 && <button type="button" className="v15-schedule-edit" disabled={busy}
            aria-pressed={editing} onClick={toggleEditing}>{editing ? "완료" : "편집"}</button>}
        </div>
      </div>
      {visibleTrips.length === 0 ? <div className="v15-past-empty">
        <p>표시할 지난 여행 일정이 없어요.</p>
        <button type="button" onClick={() => navigate("/schedule")}>내 여행 일정 보기</button>
      </div> : [...byYear.entries()].map(([year, trips]) => <section key={year} className="v15-past-year">
        <h3>{year + "년"}</h3>
        <div className="v15-past-cards">{trips.map(trip =>
          <TripListCard key={trip.id} past
            trip={{ ...trip, location: trip.destination || "여행지 미정",
              dday: "지난 일정", dateText: formatDate(trip.startDate) + " ~ " + formatDate(trip.endDate) }}
            onOpen={openTrip} editing={editing} selected={selectedIds.includes(String(trip.id))}
            onToggleSelected={toggleSelected} deleting={pendingId === String(trip.id)} />)}
        </div>
      </section>)}
    </section>}
    <div className={`v15-bulk-delete ${editing && selectedIds.length > 0 ? "is-visible" : ""}`}
      role="region" aria-label="선택한 지난 여행 삭제"
      aria-hidden={!(editing && selectedIds.length > 0)}
      inert={!(editing && selectedIds.length > 0)}>
      <button type="button" disabled={busy || !selectedIds.length} onClick={removeSelected}
        aria-label={`선택한 지난 여행 ${selectedIds.length}개 삭제하기`}>
        삭제하기 <strong>{selectedIds.length}</strong>
      </button>
    </div>
  </main>;
}
